"""Vehicle availability, load enquiries, matching and quotations."""

import re
from .common import (
    ApiError,
    event,
    find,
    money,
    need,
    next_id,
    now,
    number,
    pick,
    recent,
    require,
    text,
    valid_date,
)

BODIES = ("open", "closed", "flatbed", "other")
STATES = {
    "trucks": ("available", "unavailable", "booked"),
    "loads": ("new", "quoted", "booked", "closed"),
    "quotes": ("draft", "sent", "accepted", "declined"),
    "applications": ("new", "contacted", "shortlisted", "rejected"),
}


def board(db):
    today = now()[:10]
    trucks = [
        pick(
            t,
            "id origin destination bodyType feet capacityMt vehicleClass availableFrom availableUntil status",
        )
        for t in reversed(db["trucks"])
        if t["status"] == "available"
        and (not t["availableUntil"] or t["availableUntil"] >= today)
    ]
    loads = [
        pick(
            l,
            "id origin destination bodyType feet weightMt vehicleClass material loadingDate status",
        )
        for l in reversed(db["loads"])
        if l["status"] in ("new", "quoted") and l["loadingDate"] >= today
    ]
    return dict(trucks=trucks[:120], loads=loads[:100])


def submit(db, collection, b):
    kind, prefix = {
        "loads": ("load", "LOD"),
        "trucks": ("truck", "TRK"),
        "applications": ("application", "APL"),
    }[collection]

    def receipt(ref):
        return dict(
            success=True,
            reference=ref,
            type=kind,
            message="Your request has been submitted. The brokerage team will review and contact you.",
        )

    if b.get("website") or b.get("fax"):
        return receipt("RECEIVED"), 202
    require(
        b.get("consent") in (True, "yes"),
        "Please confirm permission to share these details.",
    )

    def field(key, limit):
        return text(b.get(key), limit)

    name, phone, email = (
        field("contactName", 100),
        re.sub(r"[^0-9]", "", str(b.get("phone", ""))),
        field("email", 150).lower(),
    )
    require(
        len(name) >= 2
        and 10 <= len(phone) <= 15
        and (not email or re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)),
        "Provide a contact name, valid 10–15 digit phone number, and optional valid email.",
    )
    item = dict(
        contactName=name,
        phone=phone,
        email=email,
        company=field("company", 100),
        origin=field("origin", 70),
        vehicleClass=field("vehicleClass", 30),
        feet=number(b.get("feet")),
        bodyType=field("bodyType", 30),
    )
    require(
        item["origin"] and item["bodyType"] in BODIES and 5 <= item["feet"] <= 65,
        "Enter a valid origin, vehicle body and length (5–65 feet).",
    )
    if kind == "load":
        item.update(
            destination=field("destination", 70),
            material=field("material", 140),
            loadingDate=field("loadingDate", 12),
            weightMt=number(b.get("weightMt")),
            specialInstructions=field("specialInstructions", 600),
        )
        require(
            item["destination"]
            and item["origin"].lower() != item["destination"].lower()
            and item["material"]
            and valid_date(item["loadingDate"])
            and 0.1 <= item["weightMt"] <= 70,
            "Enter a valid destination, material, loading date and weight.",
        )
    else:
        item.update(
            capacityMt=number(b.get("capacityMt")),
            availableFrom=field("availableFrom", 12),
            vehicleNo=field("vehicleNo", 24).upper(),
            notes=field("notes", 500),
        )
        require(
            0.3 <= item["capacityMt"] <= 70 and valid_date(item["availableFrom"]),
            "Enter a valid capacity and availability date.",
        )
        require(
            not item["vehicleNo"]
            or re.fullmatch(r"[A-Z0-9 -]{5,24}", item["vehicleNo"]),
            "Invalid vehicle registration.",
        )
        if kind == "truck":
            item.update(
                destination=field("destination", 70),
                availableUntil=field("availableUntil", 12),
                supplierType=(
                    "subbroker" if b.get("supplierType") == "subbroker" else "owner"
                ),
            )
            require(
                not item["availableUntil"]
                or (
                    valid_date(item["availableUntil"])
                    and item["availableUntil"] >= item["availableFrom"]
                ),
                "Provide a valid availability date range.",
            )
        else:
            item["loadId"] = field("loadId", 30)
            load = find(db, "loads", item["loadId"])
            require(
                load
                and load["status"] in ("new", "quoted")
                and load["loadingDate"] >= now()[:10],
                "This load is no longer available.",
                409,
            )
            require(
                compatible(load, item),
                "Your vehicle must meet the requested date, body, length and capacity.",
                409,
            )
            applications = db.setdefault("applications", [])
            require(
                sum(
                    a["loadId"] == load["id"] and a["phone"] == phone and recent(a)
                    for a in applications
                )
                < 2,
                "Application already received for this load.",
                429,
            )
            require(
                len(applications) <= 20000, "Applications temporarily unavailable.", 503
            )
    ref = next_id(db, collection, prefix)
    timestamp = now()
    item.update(
        id=ref,
        status="available" if kind == "truck" else "new",
        createdAt=timestamp,
        updatedAt=timestamp,
        consentAt=timestamp,
    )
    db[collection].append(item)
    event(
        db,
        kind,
        ref,
        {
            "truck": "New truck availability submitted",
            "load": "New customer load request submitted",
            "application": "Truck owner applied for " + item.get("loadId", ""),
        }[kind],
    )
    return receipt(ref), 201


def compatible(load, truck):
    return (
        truck["capacityMt"] >= load["weightMt"]
        and truck["feet"] >= load["feet"]
        and (load["bodyType"] == "other" or truck["bodyType"] == load["bodyType"])
        and truck["availableFrom"] <= load["loadingDate"]
        and (
            not truck.get("availableUntil")
            or truck["availableUntil"] >= load["loadingDate"]
        )
    )


def score(load, truck):
    if truck["status"] != "available" or not compatible(load, truck):
        return -1
    a, b = load["origin"].lower().strip(), truck["origin"].lower().strip()
    origin_bonus = 40 if a == b else 16 if a in b or b in a else 0
    return (
        40
        + origin_bonus
        + 12 * (truck["destination"].lower() == load["destination"].lower())
        + 6 * (truck["feet"] == load["feet"])
        + 2 * (truck["capacityMt"] - load["weightMt"] < 2)
    )


def matches(db, ref):
    load = need(db, "loads", ref)
    result = [dict(t, matchScore=s) for t in db["trucks"] if (s := score(load, t)) >= 0]
    return dict(load=load, matches=sorted(result, key=lambda t: -t["matchScore"]))


def dashboard(db):
    result = {
        k: sorted(db.get(k, []), key=lambda r: r["createdAt"], reverse=True)
        for k in (
            "loads",
            "trucks",
            "quotes",
            "trips",
            "requests",
            "documents",
            "applications",
        )
    }
    accepted = [q for q in db["quotes"] if q["status"] == "accepted"]
    result.update(
        events=db["events"][-70:][::-1],
        summary=dict(
            openLoads=sum(l["status"] in ("new", "quoted") for l in db["loads"]),
            availableTrucks=sum(t["status"] == "available" for t in db["trucks"]),
            pendingApplications=sum(
                a["status"] == "new" for a in result["applications"]
            ),
            activeQuotes=sum(q["status"] in ("draft", "sent") for q in db["quotes"]),
            confirmed=len(accepted),
            expectedSpread=sum(q["customerRate"] - q["truckerRate"] for q in accepted),
        ),
    )
    return result


def quote(db, b):
    load, truck = need(db, "loads", b.get("loadId")), need(
        db, "trucks", b.get("truckId")
    )
    customer, owner = money(b.get("customerRate")), money(b.get("truckerRate"))
    require(
        customer >= owner > 0 and valid_date(b.get("validUntil")),
        "Provide valid rates and quotation validity date.",
    )
    require(
        load["status"] != "closed" and score(load, truck) >= 0,
        "Selected vehicle or load is unavailable.",
        409,
    )
    q = dict(
        id=next_id(db, "quotes", "QTE"),
        loadId=load["id"],
        truckId=truck["id"],
        customerRate=customer,
        truckerRate=owner,
        validUntil=b["validUntil"],
        terms=text(b.get("terms"), 900),
        notes=text(b.get("notes"), 500),
        status="draft",
        createdAt=now(),
        updatedAt=now(),
    )
    db["quotes"].append(q)
    load.update(status="quoted", updatedAt=now())
    event(db, "quote", q["id"], f"Quote drafted for {load['id']} with {truck['id']}")
    digits = str(customer)
    groups = [digits[-3:]]
    for end in range(len(digits) - 3, 0, -2):
        groups.insert(0, digits[max(0, end - 2) : end])
    message = "\n".join(
        [
            f"FREIGHT QUOTATION — {q['id']}",
            f"Reference: {load['id']}",
            f"From: {load['origin']}",
            f"To: {load['destination']}",
            f"Material: {load['material']}",
            f"Required truck: {load['feet']} ft / {load['weightMt']} MT ({load['bodyType']})",
            f"Loading date: {load['loadingDate']}",
            "Our freight quote: INR " + ",".join(groups),
            f"Rate validity: {q['validUntil']}",
            "Included / excluded charges: "
            + (q["terms"] or "To be confirmed in writing"),
            "Remarks: " + (q["notes"] or "—"),
            "Subject to vehicle availability and final written acceptance.",
        ]
    )
    return (
        dict(
            quote=q,
            customer=dict(
                name=load["contactName"], **pick(load, "company email phone")
            ),
            message=message,
        ),
        201,
    )


def status(db, collection, ref, b):
    state = b.get("status")
    require(state in STATES[collection], "Invalid status.")
    record = need(db, collection, ref)
    old = record["status"]
    if collection == "quotes":
        require(
            state
            in {"draft": ("sent", "declined"), "sent": ("accepted", "declined")}.get(
                old, ()
            ),
            "Invalid quote status transition.",
            409,
        )
        if state == "accepted":
            load, truck = need(db, "loads", record["loadId"]), need(
                db, "trucks", record["truckId"]
            )
            require(
                load["status"] != "closed"
                and truck["status"] == "available"
                and not any(
                    q["status"] == "accepted"
                    and (q["loadId"] == load["id"] or q["truckId"] == truck["id"])
                    for q in db["quotes"]
                ),
                "Load or vehicle already booked or unavailable.",
                409,
            )
            for row in (load, truck):
                row.update(status="booked", updatedAt=now())
    if collection == "trucks":
        require(
            old != "booked" or state == "booked",
            "A booked truck cannot be released manually.",
            409,
        )
    if collection == "loads" and state == "booked":
        require(
            any(q["status"] == "accepted" and q["loadId"] == ref for q in db["quotes"]),
            "Load requires an accepted quotation before booking.",
            409,
        )
    if collection == "applications":
        record["reviewNote"] = text(b.get("note"), 400)
    record.update(status=state, updatedAt=now())
    event(db, collection[:-1], ref, "Status changed to " + state)
    return {"application" if collection == "applications" else "record": record}
