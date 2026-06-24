"""Email/password auth tests — mirrors test_api.py httpx-ASGI idiom.
Register, login, session round-trips, error cases, and the no-audit-row guarantee."""

from sqlalchemy import select

from app.auth import verify_password
from app.models import AuditLog, User


# ── helpers ───────────────────────────────────────────────────────────────────

_REG = {"email": "alice@example.com", "password": "hunter42"}


async def test_register_creates_user_and_session(client, db):
    r = await client.post("/api/auth/register", json=_REG)
    assert r.status_code == 201
    assert r.json() == {"ok": True, "guest": False}

    # session should be set — /api/me must return the new user
    me = await client.get("/api/me")
    assert me.status_code == 200
    body = me.json()
    assert body["username"] == "alice"  # email local-part


async def test_register_duplicate_email_409(client):
    await client.post("/api/auth/register", json=_REG)
    r = await client.post("/api/auth/register", json=_REG)
    assert r.status_code == 409


async def test_register_short_password_422(client):
    r = await client.post("/api/auth/register", json={"email": "bob@example.com", "password": "short"})
    assert r.status_code == 422


async def test_register_invalid_email_422(client):
    r = await client.post("/api/auth/register", json={"email": "not-an-email", "password": "validpassword"})
    assert r.status_code == 422


async def test_login_success_sets_session(client):
    await client.post("/api/auth/register", json=_REG)
    # sign out first so we can test login independently
    await client.post("/api/auth/logout")

    r = await client.post("/api/auth/login", json=_REG)
    assert r.status_code == 200
    assert r.json()["ok"] is True

    me = await client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["username"] == "alice"


async def test_login_bad_password_401(client):
    await client.post("/api/auth/register", json=_REG)
    await client.post("/api/auth/logout")

    r = await client.post("/api/auth/login", json={"email": _REG["email"], "password": "wrongpassword"})
    assert r.status_code == 401


async def test_login_unknown_email_401(client):
    r = await client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "somepassword"})
    assert r.status_code == 401


async def test_password_hash_is_not_plaintext(client, db):
    await client.post("/api/auth/register", json=_REG)

    user = (await db.scalars(select(User).where(User.email == _REG["email"]))).first()
    assert user is not None
    # the hash must not equal the password itself
    assert user.password_hash != _REG["password"]
    # but argon2 should still verify it
    assert verify_password(user.password_hash, _REG["password"]) is True


async def test_email_auth_no_audit_row(client, db):
    """Register + login must not produce any AuditLog rows (TR-24: actor in user/system only;
    auth is neither — it is a user-creation event, not a hard-field mutation)."""
    await client.post("/api/auth/register", json=_REG)
    await client.post("/api/auth/logout")
    await client.post("/api/auth/login", json=_REG)

    rows = (await db.scalars(select(AuditLog))).all()
    assert rows == []
