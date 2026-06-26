"""ChutesClient: structured-output harness — offline via httpx.MockTransport."""

import json

import httpx
import pytest

from app.chutes import ChutesClient, ChutesError, _extract_json

_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {"ok": {"type": "boolean"}},
    "required": ["ok"],
}


class _Tokens:
    def __init__(self):
        self.calls: list[str] = []
        self.refreshed = 0

    async def get_access_token(self, user_id: str) -> str:
        self.calls.append(user_id)
        return "cpk_initial"

    async def refresh(self, user_id: str) -> str:
        self.refreshed += 1
        return "cpk_fresh"


def _client(handler, tokens):
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return ChutesClient(tokens, base_url="https://llm.chutes.ai/v1", http=http), http


async def test_structured_returns_parsed_content_and_sends_bearer():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["body"] = json.loads(request.content)
        content = json.dumps({"ok": True})
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    tokens = _Tokens()
    client, http = _client(handler, tokens)
    try:
        out = await client.structured(
            user_id="u1", model="m1,m2", messages=[{"role": "user", "content": "hi"}],
            schema=_SCHEMA, schema_name="probe",
        )
    finally:
        await http.aclose()

    assert out == {"ok": True}
    assert seen["url"].endswith("/chat/completions")
    assert seen["auth"] == "Bearer cpk_initial"
    assert seen["body"]["model"] == "m1,m2"  # inline failover passed through verbatim
    # json_object mode + thinking disabled avoids the sglang xgrammar whitespace explosion
    assert seen["body"]["response_format"] == {"type": "json_object"}
    assert seen["body"]["chat_template_kwargs"] == {"enable_thinking": False}
    # the schema is pinned in an appended system message instead of strict decoding
    assert seen["body"]["messages"][-1]["role"] == "system"
    assert "JSON Schema" in seen["body"]["messages"][-1]["content"]


async def test_structured_refreshes_once_on_401_then_retries():
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(401, json={"detail": "Invalid or expired token"})
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"ok": True})}}]})

    tokens = _Tokens()
    client, http = _client(handler, tokens)
    try:
        out = await client.structured(
            user_id="u1", model="m1", messages=[{"role": "user", "content": "hi"}],
            schema=_SCHEMA, schema_name="probe",
        )
    finally:
        await http.aclose()

    assert out == {"ok": True}
    assert tokens.refreshed == 1 and calls["n"] == 2


async def test_structured_raises_on_non_200_after_retry():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="upstream boom")

    client, http = _client(handler, _Tokens())
    try:
        with pytest.raises(ChutesError):
            await client.structured(
                user_id="u1", model="m1", messages=[{"role": "user", "content": "hi"}],
                schema=_SCHEMA, schema_name="probe",
            )
    finally:
        await http.aclose()


async def test_structured_wraps_malformed_response_in_chutes_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"unexpected": "shape"})  # no choices[]

    client, http = _client(handler, _Tokens())
    try:
        with pytest.raises(ChutesError):
            await client.structured(
                user_id="u1", model="m1", messages=[{"role": "user", "content": "hi"}],
                schema=_SCHEMA, schema_name="probe",
            )
    finally:
        await http.aclose()


# ---------------------------------------------------------------------------
# _extract_json unit tests (no HTTP — exercise the helper directly)
# ---------------------------------------------------------------------------

def test_extract_json_clean_passthrough():
    """Regression: clean JSON string passes through unchanged."""
    assert _extract_json('{"ok": true}') == {"ok": True}


def test_extract_json_markdown_fenced():
    """```json-fenced content is unwrapped before parsing."""
    content = '```json\n{"ok": true}\n```'
    assert _extract_json(content) == {"ok": True}


def test_extract_json_think_prefixed():
    """<think>...</think> block is stripped; remaining JSON is parsed."""
    content = "<think>\nI need to think carefully.\n</think>\n\n{\"ok\": true}"
    assert _extract_json(content) == {"ok": True}


def test_extract_json_reasoning_prefixed():
    """<reasoning>...</reasoning> block is stripped; remaining JSON is parsed."""
    content = "<reasoning>step by step</reasoning>{\"ok\": false}"
    assert _extract_json(content) == {"ok": False}


def test_extract_json_brace_scan_fallback():
    """Balanced-brace scan extracts an object embedded in non-JSON prose."""
    content = 'Here is my answer: {"ok": true} (end)'
    assert _extract_json(content) == {"ok": True}


def test_extract_json_raises_on_genuinely_unparseable():
    """Totally unparseable content raises ValueError."""
    with pytest.raises(ValueError, match="no valid JSON object found"):
        _extract_json("this is not json at all, I give up")


# ---------------------------------------------------------------------------
# ChutesClient integration: unparseable content → diagnostic ChutesError
# ---------------------------------------------------------------------------

async def test_structured_raises_diagnostic_on_unparseable_content():
    """Unparseable content → ChutesError containing finish_reason and a raw snippet."""
    raw_content = "Sorry, I cannot output JSON right now. " + ("x" * 600)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "choices": [{"finish_reason": "stop", "message": {"content": raw_content}}]
        })

    client, http = _client(handler, _Tokens())
    try:
        with pytest.raises(ChutesError) as exc_info:
            await client.structured(
                user_id="u1", model="m1", messages=[{"role": "user", "content": "hi"}],
                schema=_SCHEMA, schema_name="probe",
            )
    finally:
        await http.aclose()

    msg = str(exc_info.value)
    assert "finish_reason='stop'" in msg
    assert "len=" in msg
    # snippet: first 400 chars present, ellipsis present, last 200 chars present
    assert raw_content[:20] in msg
    assert "…" in msg


async def test_structured_owns_and_closes_its_client_when_none_injected(monkeypatch):
    # Production path: http=None → ChutesClient builds and closes its own AsyncClient.
    real_async_client = httpx.AsyncClient

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"ok": True})}}]})

    created = []

    def _factory(*args, **kwargs):
        client = real_async_client(transport=httpx.MockTransport(handler))
        created.append(client)
        return client

    monkeypatch.setattr(httpx, "AsyncClient", _factory)
    client = ChutesClient(_Tokens(), base_url="https://llm.chutes.ai/v1")  # no http injected
    out = await client.structured(
        user_id="u1", model="m1", messages=[{"role": "user", "content": "hi"}],
        schema=_SCHEMA, schema_name="probe",
    )
    assert out == {"ok": True}
    assert created and created[0].is_closed  # owns=True path closed its client
