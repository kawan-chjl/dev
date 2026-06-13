"""Test harness: a temp SQLite file, schema recreated per test, a guest-authenticated
HTTP client, and a bare DB session for unit tests. No network, no scheduler start."""

import os
import pathlib
import tempfile

_TMP = pathlib.Path(tempfile.gettempdir()) / "kawan_test.db"
os.environ.setdefault("KAWAN_DATABASE_URL", f"sqlite+aiosqlite:///{_TMP}")
os.environ.setdefault("KAWAN_SESSION_SECRET", "test-secret-please-change")
os.environ.setdefault("KAWAN_CHUTES_API_KEY", "")

import httpx  # noqa: E402
import pytest_asyncio  # noqa: E402


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
