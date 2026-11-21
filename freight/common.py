"""Shared validation and record helpers for the freight API."""

import math
import re
import uuid
from datetime import date, datetime, timedelta, timezone


class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def require(condition, message, status=400):
    if not condition:
        raise ApiError(message, status)


def text(value, limit=120):
    return re.sub(r"[<>\x00-\x1f]", "", str(value or "").strip())[:limit]


def number(value):
    try:
        n = float(value)
        return int(n) if n.is_integer() else n
    except (ValueError, TypeError, OverflowError):
        return math.nan


def money(value):
    n = number(value)
    require(math.isfinite(n) and n > 0, "Enter a positive amount.")
    return math.floor(n + 0.5)


def valid_date(value):
    try:
        return date.fromisoformat(value).isoformat() == value
    except (ValueError, TypeError):
        return False


def now():
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def recent(item):
    return item["createdAt"] > (
        datetime.now(timezone.utc) - timedelta(days=1)
    ).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def find(db, collection, ref, field="id"):
    return next((r for r in db.get(collection, []) if r.get(field) == ref), None)


def need(db, collection, ref):
    record = find(db, collection, ref)
    require(record is not None, "Record not found.", 404)
    return record


def next_id(db, collection, prefix):
    counters = db["counters"]
    counters[collection] = counters.get(collection, 0) + 1
    return f"{prefix}-{counters[collection]:05d}"


def event(db, kind, ref, description):
    db["events"].append(
        dict(
            id=str(uuid.uuid4()), type=kind, ref=ref, description=description, at=now()
        )
    )
    del db["events"][:-600]


def pick(record, keys):
    return {k: record.get(k, "") for k in keys.split()}


def new_db():
    return dict(
        version=1,
        counters=dict(trucks=0, loads=0, quotes=0),
        trucks=[],
        loads=[],
        quotes=[],
        events=[],
    )
