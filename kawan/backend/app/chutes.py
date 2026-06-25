# kawan/backend/app/chutes.py
"""ChutesClient — the single Chutes inference integration point (spec §9, TR-29).

OpenAI-compatible structured output over httpx: per-user Bearer token (never
X-API-Key — silently ignored by Chutes), inline failover via a comma-joined
`model` string, and one transparent refresh+retry on 401. Returns the parsed,
schema-valid dict; callers read documented keys and never write hard fields."""

from __future__ import annotations

import json

import httpx

from app.contracts import TokenProvider


class ChutesError(RuntimeError):
    """Raised when inference fails after the single refresh+retry (spec §9.1)."""


def json_schema_format(name: str, schema: dict) -> dict:
    """OpenAI-compatible strict structured-output response_format (spec §9.2)."""
    return {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}}


class ChutesClient:
    def __init__(self, token_provider: TokenProvider, *, base_url: str,
                 http: httpx.AsyncClient | None = None, timeout: float = 60.0) -> None:
        self._tokens = token_provider
        self._base_url = base_url.rstrip("/")
        self._http = http  # injected in tests (MockTransport); None → one client per call
        self._timeout = timeout

    async def _post(self, http: httpx.AsyncClient, token: str, payload: dict) -> httpx.Response:
        return await http.post(
            f"{self._base_url}/chat/completions",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=self._timeout,
        )

    async def structured(self, *, user_id: str, model: str, messages: list[dict],
                         schema: dict, schema_name: str, max_tokens: int = 2048) -> dict:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "response_format": json_schema_format(schema_name, schema),
        }
        owns = self._http is None
        http = self._http or httpx.AsyncClient(timeout=self._timeout)
        try:
            token = await self._tokens.get_access_token(user_id)
            resp = await self._post(http, token, payload)
            if resp.status_code == 401:  # one transparent refresh then retry (TR-29)
                token = await self._tokens.refresh(user_id)
                resp = await self._post(http, token, payload)
            if resp.status_code != 200:
                raise ChutesError(f"chutes {resp.status_code}: {resp.text[:200]}")
            try:
                content = resp.json()["choices"][0]["message"]["content"]
                return json.loads(content)
            except (KeyError, IndexError, TypeError, ValueError) as exc:
                # malformed body or truncated/non-JSON content (e.g. reasoning-model
                # max_tokens cutoff) — surface as ChutesError like every other failure
                raise ChutesError(f"chutes malformed response: {exc}") from exc
        finally:
            if owns:
                await http.aclose()
