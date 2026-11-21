"""Transport-independent API. Hosts commit successful mutations atomically."""

import base64
import hashlib
import hmac
import json
import re
import time
from urllib.parse import urlsplit
from . import market, trips
from .common import ApiError, need, require


def b64(value):
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def dispatch(db, req):
    method, path = req["method"], req["path"].strip("/")
    headers = req.get("headers", {})
    password, secret = req.get("password", ""), req.get("secret", "")
    configured = len(password) >= 12 and len(secret) >= 32

    def reply(data, status=200, **extra):
        return dict(body=data, status=status, **extra)

    if method not in ("GET", "POST", "PATCH"):
        raise ApiError("Method not allowed", 405)
    if method != "GET" and headers.get("origin"):
        require(
            urlsplit(headers["origin"]).netloc == req["host"],
            "Cross-site requests are not accepted",
            403,
        )
    if method == "GET" and path in ("health", "config"):
        return reply(
            dict(status="ok", configured=configured)
            if path == "health"
            else dict(configured=configured, app="V.R Logistics", version=1)
        )
    require(
        configured,
        "Server not configured. Set BROKER_ADMIN_PASSWORD (12+ characters) and BROKER_SESSION_SECRET (32+ characters) on the hosting server.",
        503,
    )

    def signature(payload):
        return b64(hmac.digest(secret.encode(), payload.encode(), "sha256"))

    key = hashlib.sha256(password.encode()).hexdigest()[:16]
    cookie_opts = "; Path=/api/freight/; HttpOnly; SameSite=Strict" + (
        "; Secure" if req.get("secure") else ""
    )
    if path.startswith("admin/") and not (
        method == "POST" and path in ("admin/login", "admin/logout")
    ):
        token = re.search(
            r"(?:^|;\s*)broker_session=([^;]+)", headers.get("cookie", "")
        )
        valid = False
        if token:
            try:
                payload, sig = token[1].split(".")
                if hmac.compare_digest(signature(payload), sig):
                    session = json.loads(base64.urlsafe_b64decode(payload + "==="))
                    valid = (
                        session["role"] == "broker"
                        and session["exp"] > time.time() * 1000
                        and session["key"] == key
                    )
            except (TypeError, ValueError, KeyError, UnicodeError):
                pass
        require(valid, "Sign in to access brokerage records.", 401)
    b = {}
    if method != "GET" and path != "admin/logout":
        require(
            "application/json" in headers.get("content-type", "").lower(),
            "JSON content type required.",
            415,
        )
        raw = req.get("raw", "")
        require(
            len(raw) <= (4300000 if path.endswith("/documents") else 16000),
            "Request too large.",
            413,
        )
        try:
            b = json.loads(raw)
        except ValueError:
            raise ApiError("Malformed JSON.")
        require(isinstance(b, dict), "JSON object required.")
    if method == "POST" and path == "admin/login":
        require(
            hmac.compare_digest(str(b.get("password", "")).encode(), password.encode()),
            "Incorrect password.",
            401,
        )
        payload = b64(
            json.dumps(
                dict(role="broker", key=key, exp=int(time.time() * 1000) + 604800000)
            ).encode()
        )
        return reply(
            dict(authenticated=True),
            cookie="broker_session="
            + payload
            + "."
            + signature(payload)
            + "; Max-Age=604800"
            + cookie_opts,
        )
    if method == "POST" and path == "admin/logout":
        return reply(
            dict(success=True), cookie="broker_session=; Max-Age=0" + cookie_opts
        )
    parts = path.split("/")
    result = None
    match (method, *parts):
        case ("GET", "public", "board"):
            result = market.board(db)
        case ("POST", "public", c) if c in ("loads", "trucks", "applications"):
            result = market.submit(db, c, b)
        case ("GET", "admin", "dashboard"):
            result = market.dashboard(db)
        case ("GET", "admin", "export"):
            result = db
        case ("GET", "admin", "matches", ref):
            result = market.matches(db, ref)
        case ("POST", "admin", "quotes"):
            result = market.quote(db, b)
        case ("PATCH", "admin", c, ref, "status") if c in market.STATES:
            result = market.status(db, c, ref, b)
        case ("POST", "admin", "trips"):
            result = trips.create(db, b)
        case ("PATCH", "admin", "trips", ref, "status"):
            result = trips.advance(db, ref, b)
        case ("POST", "admin", "trips", ref, "payments"):
            result = trips.payment(db, ref, b)
        case ("PATCH", "admin", "requests", ref, "status"):
            result = trips.review(db, ref, b)
        case ("GET", "public", "trips", token):
            result = trips.driver_view(db, trips.driver_trip(db, token))
        case ("POST", "public", "trips", token, "requests"):
            result = trips.driver_request(db, trips.driver_trip(db, token), b)
        case ("POST", "public", "trips", token, "documents"):
            result = trips.upload(db, b, trips.driver_trip(db, token))
        case ("POST", "admin", "documents"):
            result = trips.upload(db, b)
        case ("GET", "admin", "documents", ref):
            return reply(None, download=need(db, "documents", ref))
        case ("GET", "public", "trips", token, "documents", ref):
            trip = trips.driver_trip(db, token)
            doc = need(db, "documents", ref)
            require(doc["tripId"] == trip["id"], "Document not found.", 404)
            return reply(None, download=doc)
        case _:
            raise ApiError("Endpoint not found.", 404)
    data, status = result if isinstance(result, tuple) else (result, 200)
    output = reply(data, status)
    if method != "GET" and status != 202:
        output["db"] = db
        if path.endswith("/documents"):
            output["upload"] = data["document"]["id"]
    return output


def handle(db, req):
    try:
        return dispatch(db, req)
    except ApiError as exc:
        return dict(status=exc.status, body=dict(error=str(exc)))
