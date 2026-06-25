"""D1 — TTS endpoint tests.

All tests MUST pass without piper-tts installed (the default CI / test state).

Assertions:
  - POST /api/voice/tts returns 204 when Piper/models are absent (graceful degradation)
  - Returns 422 on unknown persona
  - Returns 422 on over-long text
  - Returns 422 on empty text
  - Returns 401 without a session (auth-gated)
"""


async def test_tts_no_piper_returns_204(client):
    """With no piper install / no voice models, the endpoint degrades to 204 (never 500)."""
    r = await client.post('/api/voice/tts', json={'text': 'Hello there', 'persona': 'kawan'})
    # 204 means Piper unavailable; 200 means Piper ran and produced audio.
    # Both are valid; 5xx is never acceptable.
    assert r.status_code in (200, 204), f'Unexpected status {r.status_code}: {r.text}'


async def test_tts_unknown_persona_returns_422(client):
    r = await client.post('/api/voice/tts', json={'text': 'Hi', 'persona': 'unknown_persona'})
    assert r.status_code == 422


async def test_tts_over_long_text_returns_422(client):
    r = await client.post('/api/voice/tts', json={'text': 'x' * 2001, 'persona': 'kawan'})
    assert r.status_code == 422


async def test_tts_empty_text_returns_422(client):
    r = await client.post('/api/voice/tts', json={'text': '   ', 'persona': 'adik'})
    assert r.status_code == 422


async def test_tts_requires_auth(client):
    """Endpoint is auth-gated: a fresh client with no session gets 401."""
    import httpx
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as unauthenticated:
        r = await unauthenticated.post('/api/voice/tts', json={'text': 'Hello', 'persona': 'kawan'})
    assert r.status_code == 401


async def test_tts_all_valid_personas(client):
    """All three personas are accepted (may return 200 or 204 depending on Piper install)."""
    for persona in ('kawan', 'adik', 'cik_maid'):
        r = await client.post('/api/voice/tts', json={'text': 'Testing voice', 'persona': persona})
        assert r.status_code in (200, 204), f'persona={persona}: unexpected {r.status_code}'
