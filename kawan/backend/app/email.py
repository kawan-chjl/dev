"""Stake + win-back email (spec A5, TR-69/TR-70). Resend HTTP API when configured;
otherwise a log-only outbox so the miss path still runs in dev. Email is only ever
used for stake + win-back, never routine check-ins (TR-70). Stake-contact PII never
touches any LLM (TR-27) — this module is the only thing that sees the address.

Returns delivery success so callers can honour TR-65 (bounce → logged + told to the
user, 'that one's on the house')."""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger("kawan.email")

# Visible in dev/tests so the miss path is inspectable without a real provider.
outbox: list[dict] = []


async def send_email(to_email: str, subject: str, body: str) -> bool:
    if not settings.resend_api_key:
        outbox.append({"to": to_email, "subject": subject, "body": body})
        logger.info("outbox (no RESEND_API_KEY): to=%s subject=%s", to_email, subject)
        return True
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.email_from, "to": [to_email], "subject": subject, "text": body},
            )
        if r.status_code >= 400:
            logger.warning("resend rejected: %s %s", r.status_code, r.text[:200])
            return False
        return True
    except httpx.HTTPError as exc:
        logger.warning("resend send failed: %s", exc)
        return False
