"""Small shared helpers. All app timestamps are timezone-aware UTC; SQLite stores
naive values, so reads are re-stamped as UTC at the boundary (see as_utc)."""

import uuid
from datetime import datetime, timezone


def new_id() -> str:
    """Postgres-portable string PK (spec §8.1 uses TEXT ids, not a DB UUID type)."""
    return uuid.uuid4().hex


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime | None) -> datetime | None:
    """Treat a naive datetime (as SQLite returns) as UTC; pass aware datetimes through."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def to_jsonable(value):
    """Make a value safe for a JSON column (audit_log old/new): datetimes → ISO 8601."""
    return value.isoformat() if isinstance(value, datetime) else value
