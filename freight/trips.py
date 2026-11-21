"""Trip lifecycle, driver requests, settlement and private evidence."""

import base64
import binascii
import re
import secrets
import uuid
from .common import event, find, money, need, next_id, now, pick, recent, require, text

STAGES = (
    "assigned",
    "loaded",
    "in_transit",
    "delivered",
    "pod_submitted",
    "pod_accepted",
    "closed",
)


def create(db, b):
    quote = find(db, "quotes", b.get("quoteId"))
    require(
        quote and quote["status"] == "accepted",
        "An accepted quotation is required before creating a trip.",
        409,
    )
    existing = find(db, "trips", quote["id"], "quoteId")
    if existing:
        return dict(trip=existing, existing=True), 201
    vehicle = need(db, "trucks", quote["truckId"])
    trip = dict(
        id=next_id(db, "trips", "TRIP"),
        quoteId=quote["id"],
        **pick(quote, "truckId loadId"),
        vehicleNo=text(b.get("vehicleNo") or vehicle["vehicleNo"], 30),
        status="assigned",
        token=secrets.token_urlsafe(28),
        customerReceived=0,
        truckerPaid=0,
        paymentHistory=[],
        history=[
            dict(
                at=now(),
                status="assigned",
                note="Trip created from accepted quotation.",
            )
        ],
        createdAt=now(),
        updatedAt=now()
    )
    db.setdefault("trips", []).append(trip)
    event(db, "trip", trip["id"], "Trip created and driver link issued")
    return dict(trip=trip, existing=False), 201


def advance(db, ref, b):
    trip = need(db, "trips", ref)
    stage = b.get("status")
    require(stage in STAGES, "Invalid trip status.")
    require(
        STAGES.index(stage) == STAGES.index(trip["status"]) + 1,
        "Complete trip stages in order.",
        409,
    )
    if stage == "pod_submitted":
        require(
            any(
                d["tripId"] == ref and d["kind"] == "pod"
                for d in db.get("documents", [])
            ),
            "POD document must be uploaded before marking submitted.",
            409,
        )
    if stage == "closed":
        q = need(db, "quotes", trip["quoteId"])
        require(
            trip["customerReceived"] >= q["customerRate"]
            and trip["truckerPaid"] >= q["truckerRate"],
            "Both customer receipts and trucker payments must be fully reconciled before closing.",
            409,
        )
    trip.update(status=stage, updatedAt=now())
    trip["history"].append(dict(at=now(), status=stage, note=text(b.get("note"), 300)))
    event(db, "trip", ref, "Stage updated: " + stage)
    return dict(trip=trip)


def payment(db, ref, b):
    trip = need(db, "trips", ref)
    quote = need(db, "quotes", trip["quoteId"])
    amount, side = money(b.get("amount")), b.get("side")
    require(
        side in ("customer", "trucker") and amount > 0,
        "Select a payment side and a positive amount.",
    )
    total, paid = (
        ("customerRate", "customerReceived")
        if side == "customer"
        else ("truckerRate", "truckerPaid")
    )
    require(
        amount <= quote[total] - trip[paid],
        "Amount exceeds outstanding freight balance.",
        409,
    )
    trip[paid] += amount
    trip["paymentHistory"].append(
        dict(
            id=str(uuid.uuid4()),
            at=now(),
            side=side,
            amount=amount,
            reference=text(b.get("reference"), 100),
        )
    )
    trip["updatedAt"] = now()
    event(
        db,
        "payment",
        ref,
        ("Customer receipt" if side == "customer" else "Trucker payment") + " recorded",
    )
    return dict(trip=trip)


def driver_trip(db, token):
    trip = find(db, "trips", token, "token")
    require(trip, "Trip access link is invalid.", 404)
    return trip


def driver_view(db, trip):
    load = need(db, "loads", trip["loadId"])
    info = dict(
        **pick(trip, "id status vehicleNo"),
        **pick(load, "origin destination material weightMt loadingDate"),
        companyPhone="+917738103505",
        customer=load.get("company") or "Transporter"
    )

    def related(collection, fields):
        return [
            pick(r, fields) for r in db.get(collection, []) if r["tripId"] == trip["id"]
        ]

    return dict(
        trip=info,
        documents=related("documents", "id kind name mime size createdAt"),
        requests=related(
            "requests",
            "id type status amount location reason estimatedResumeAt createdAt notes",
        ),
    )


def driver_request(db, trip, b):
    require(trip["status"] != "closed", "This trip is already closed.", 409)
    kind = b.get("type")
    require(kind in ("payment", "halt"), "Choose a payment or halt request.")
    location, reason = text(b.get("location"), 100), text(b.get("reason"), 500)
    amount = money(b.get("amount")) if kind == "payment" else 0
    require(
        kind != "halt" or (len(location) >= 2 and len(reason) >= 3),
        "Enter the current location and reason for stopping.",
    )
    require(
        kind != "payment" or 0 < amount <= 20000000, "Enter a valid requested amount."
    )
    records = db.setdefault("requests", [])
    require(
        sum(r["tripId"] == trip["id"] and recent(r) for r in records) < 12,
        "Too many requests for this trip today.",
        429,
    )
    record = dict(
        id="REQ-" + uuid.uuid4().hex[:8].upper(),
        tripId=trip["id"],
        type=kind,
        status="pending",
        amount=amount,
        location=location if kind == "halt" else "",
        reason=reason if kind == "halt" else "",
        estimatedResumeAt=text(b.get("estimatedResumeAt"), 60),
        notes=text(b.get("notes"), 500),
        createdAt=now(),
        updatedAt=now(),
    )
    records.append(record)
    event(db, "request", record["id"], kind + " request for " + trip["id"])
    return dict(reference=record["id"], request=record), 201


def review(db, ref, b):
    record = need(db, "requests", ref)
    state = b.get("status")
    require(state in ("approved", "rejected", "resolved"), "Invalid request status.")
    require(
        state
        in {"pending": ("approved", "rejected"), "approved": ("resolved",)}.get(
            record["status"], ()
        ),
        "Request cannot move to this status.",
        409,
    )
    record.update(status=state, reviewNote=text(b.get("note"), 300), updatedAt=now())
    event(db, "request", ref, "Broker marked request " + state)
    return dict(request=record)


def upload(db, b, trip=None):
    driver = trip is not None
    if not driver and b.get("tripId"):
        trip = need(db, "trips", b["tripId"])
    truck_id = trip["truckId"] if trip else need(db, "trucks", b.get("truckId"))["id"]
    mime, kind, name = (
        text(b.get("mime"), 70).lower(),
        text(b.get("kind"), 30),
        re.sub(r'[/\\"]', "_", text(b.get("name"), 120)),
    )
    signatures = {
        "application/pdf": b"%PDF-",
        "image/png": bytes.fromhex("89504e470d0a1a0a"),
        "image/jpeg": bytes.fromhex("ffd8ff"),
        "image/webp": b"RIFF",
    }
    require(
        mime in signatures
        and kind in ("pod", "loading", "unloading", "vehicle", "clearance", "other")
        and len(name) >= 3,
        "Choose a supported file and document category.",
    )
    encoded = b.get("base64")
    require(
        isinstance(encoded, str) and 0 < len(encoded) <= 4 * 1024 * 1024,
        "Maximum file size is 3 MB.",
        413,
    )
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        require(False, "Invalid file encoding.", 413)
    require(
        raw.startswith(signatures[mime])
        and (mime != "image/webp" or raw[8:12] == b"WEBP")
        and (mime != "image/jpeg" or len(raw) > 3),
        "Invalid file content or unsupported file type.",
        415,
    )
    docs = db.setdefault("documents", [])
    require(len(docs) <= 20000, "Document limit reached.", 507)
    doc = dict(
        id="DOC-" + str(uuid.uuid4()),
        tripId=trip["id"] if trip else "",
        truckId=truck_id,
        kind=kind,
        name=name,
        mime=mime,
        size=len(raw),
        submittedBy="trucker" if driver else "broker",
        createdAt=now(),
    )
    docs.append(doc)
    event(
        db,
        "document",
        doc["id"],
        kind + " evidence received for " + (doc["tripId"] or truck_id),
    )
    return dict(document=doc), 201
