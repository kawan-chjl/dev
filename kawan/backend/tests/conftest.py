"""Test harness: an in-memory SQLite DB, schema recreated per test, a guest-authenticated
HTTP client, and a bare DB session for unit tests. No network, no scheduler start."""

import os

# Force an in-memory SQLite DB for tests, overriding any exported KAWAN_DATABASE_URL.
# In-memory (StaticPool, see app/db.py) leaves no file to collide on at teardown — the
# old shared /tmp file flaked with "disk I/O error" — and cannot WIPE a real
# Postgres/Supabase database if the dev/prod URL ever leaks into the environment.
os.environ["KAWAN_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ.setdefault("KAWAN_SESSION_SECRET", "test-secret-please-change")
os.environ.setdefault("KAWAN_CHUTES_API_KEY", "")

import httpx  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402


@pytest.fixture(autouse=True)
def _isolate_external_creds(monkeypatch):
    """Force email + Telegram into their no-op/outbox paths so tests never depend on real
    credentials that may live in the dev .env: a set KAWAN_RESEND_API_KEY would make
    send_email hit the network, and a set bot token would make /link report configured.
    Tests that need a channel "on" monkeypatch it back explicitly. (Keeps the harness's
    "no network" guarantee even after the Resend/Telegram ops were configured locally.)"""
    from app.config import settings
    monkeypatch.setattr(settings, "resend_api_key", "")
    monkeypatch.setattr(settings, "telegram_bot_token", "")
    monkeypatch.setattr(settings, "telegram_bot_username", "")


@pytest_asyncio.fixture(autouse=True)
async def _schema():
    import app.models  # noqa: F401 - register tables
    from app.db import Base, engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    from app.db import SessionLocal
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    from app.main import app
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/auth/guest")  # establish a session cookie (no OAuth network)
        yield ac
