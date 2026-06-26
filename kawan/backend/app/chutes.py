# kawan/backend/app/chutes.py
"""ChutesClient — the single Chutes inference integration point (spec §9, TR-29).

OpenAI-compatible structured output over httpx: per-user Bearer token (never
X-API-Key — silently ignored by Chutes), inline failover via a comma-joined
`model` string, and one transparent refresh+retry on 401. Returns the parsed,
schema-valid dict; callers read documented keys and never write hard fields."""

from __future__ import annotations

import asyncio
import json
import re

import httpx

from app.contracts import TokenProvider


class ChutesError(RuntimeError):
    """Raised when inference fails after the single refresh+retry (spec §9.1)."""


def json_schema_format(name: str, schema: dict) -> dict:
    """OpenAI-compatible strict structured-output response_format (spec §9.2)."""
    return {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}}


def _schema_instruction(schema: dict) -> str:
    """Compact JSON-Schema reminder appended to the prompt under json_object mode."""
    return (
        "Return a single JSON object with EXACTLY these keys and no others, "
        "conforming to this JSON Schema:\n" + json.dumps(schema, separators=(",", ":"))
    )


def _extract_json(content: str) -> dict:
    """Robustly extract a JSON object from a reasoning-model content string.

    Order of operations:
    1. Strip <think>...</think> and <reasoning>...</reasoning> blocks.
    2. Strip markdown code fences (```json ... ``` or ``` ... ```).
    3. json.loads the cleaned string.
    4. Fallback: find the first balanced top-level {...} and json.loads that.
    Raises ValueError if no valid JSON object is found.
    """
    # Step 1: strip reasoning/thinking blocks (including newlines inside)
    cleaned = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL)
    cleaned = re.sub(r"<reasoning>.*?</reasoning>", "", cleaned, flags=re.DOTALL)

    # Step 2: strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*(.*?)\s*```", r"\1", cleaned, flags=re.DOTALL)

    cleaned = cleaned.strip()

    # Step 3: try direct parse
    try:
        return json.loads(cleaned)
    except ValueError:
        pass

    # Step 4: scan for the first balanced top-level {...} respecting strings/escapes
    start = cleaned.find("{")
    if start != -1:
        depth = 0
        in_string = False
        escape_next = False
        for i, ch in enumerate(cleaned[start:], start):
            if escape_next:
                escape_next = False
                continue
            if ch == "\\" and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(cleaned[start : i + 1])
                    except ValueError:
                        break

    raise ValueError("no valid JSON object found")


class ChutesClient:
    def __init__(self, token_provider: TokenProvider, *, base_url: str,
                 http: httpx.AsyncClient | None = None, timeout: float = 90.0,
                 max_5xx_retries: int = 2, retry_backoff: float = 0.5) -> None:
        self._tokens = token_provider
        self._base_url = base_url.rstrip("/")
        self._http = http  # injected in tests (MockTransport); None → one client per call
        self._timeout = timeout
        self._max_5xx_retries = max_5xx_retries  # transient upstream 5xx (e.g. gateway 502)
        self._retry_backoff = retry_backoff  # linear: backoff * attempt

    async def _post(self, http: httpx.AsyncClient, token: str, payload: dict) -> httpx.Response:
        return await http.post(
            f"{self._base_url}/chat/completions",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=self._timeout,
        )

    async def structured(self, *, user_id: str, model: str, messages: list[dict],
                         schema: dict, schema_name: str, max_tokens: int = 2048) -> dict:
        # These TEE chutes (sglang) are reasoning models; strict json_schema decoding
        # triggers an xgrammar whitespace explosion that never closes the object and
        # burns the whole token budget (slow → ReadTimeout / truncated → unparseable).
        # Fix: disable thinking + use plain json_object mode and pin the exact shape in
        # the prompt — the model stops cleanly and returns schema-valid JSON fast (TR-29).
        messages = [*messages, {"role": "system", "content": _schema_instruction(schema)}]
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
            "chat_template_kwargs": {"enable_thinking": False},
        }
        owns = self._http is None
        http = self._http or httpx.AsyncClient(timeout=self._timeout)
        try:
            token = await self._tokens.get_access_token(user_id)
            resp = await self._post(http, token, payload)
            if resp.status_code == 401:  # one transparent refresh then retry (TR-29)
                token = await self._tokens.refresh(user_id)
                resp = await self._post(http, token, payload)
            # Transient upstream 5xx (e.g. a gateway 502) — bounded linear-backoff retry.
            # 4xx are NOT retried (a client error won't fix itself); read timeouts propagate
            # raw rather than compound the latency.
            for attempt in range(1, self._max_5xx_retries + 1):
                if resp.status_code < 500:
                    break
                await asyncio.sleep(self._retry_backoff * attempt)
                resp = await self._post(http, token, payload)
            if resp.status_code != 200:
                raise ChutesError(f"chutes {resp.status_code}: {resp.text[:200]}")
            try:
                body = resp.json()
                choice = body["choices"][0]
                finish_reason = choice.get("finish_reason", "unknown")
                content = choice["message"]["content"]
                return _extract_json(content)
            except (KeyError, IndexError, TypeError) as exc:
                raise ChutesError(f"chutes malformed response: {exc}") from exc
            except ValueError as exc:
                # Content parsed but no valid JSON object found — include diagnostics
                # so the PO can paste the raw output and we see exactly what the model returned
                raw = content if isinstance(content, str) else repr(content)
                snippet = (raw[:400] + "…" + raw[-200:]) if len(raw) > 602 else raw
                raise ChutesError(
                    f"chutes unparseable content"
                    f" [finish_reason={finish_reason!r}, len={len(raw)}]:"
                    f" {snippet}"
                ) from exc
        finally:
            if owns:
                await http.aclose()
