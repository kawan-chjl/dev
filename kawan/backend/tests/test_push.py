"""Tests for push routes: GET /push/vapid-public-key (D3)."""


async def test_vapid_public_key_returns_200(client):
    r = await client.get("/api/push/vapid-public-key")
    assert r.status_code == 200


async def test_vapid_public_key_shape(client):
    r = await client.get("/api/push/vapid-public-key")
    body = r.json()
    assert "vapid_public_key" in body
    # Default in tests is an empty string (no key configured)
    assert isinstance(body["vapid_public_key"], str)


async def test_vapid_public_key_no_auth_required():
    """The endpoint must be publicly accessible — no session cookie needed."""
    import httpx

    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/push/vapid-public-key")
    assert r.status_code == 200
    assert "vapid_public_key" in r.json()
