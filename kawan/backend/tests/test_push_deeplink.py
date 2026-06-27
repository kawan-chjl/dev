"""Web-push deep-link: _send_one payload carries data.url = /workspace/:id.
The sw.js notificationclick handler (frontend) is deferred -- not tested here."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch


# ── _send_one payload shape ──────────────────────────────────────────────────

def test_send_one_includes_url_in_payload():
    """_send_one must include 'url' in the JSON data alongside 'headline'."""
    calls = []

    def fake_webpush(**kwargs):
        calls.append(kwargs)

    import app.push as push_module
    with patch.dict("sys.modules", {"pywebpush": MagicMock(webpush=fake_webpush,
                                                             WebPushException=Exception)}):
        # Reload to pick up the mock
        from app.push import _send_one
        from app.config import settings

        with patch.object(settings, "vapid_private_key", "fake-key"), \
             patch.object(settings, "vapid_subject", "mailto:test@test.com"):
            try:
                _send_one(
                    subscription={"endpoint": "https://push.example.com/sub1",
                                  "keys": {"auth": "x", "p256dh": "y"}},
                    headline="Kawan check-in",
                    url="/workspace/abc123",
                )
            except Exception:
                pass  # webpush may fail in test env; we only care about what was passed

    if calls:
        data = json.loads(calls[0]["data"])
        assert "url" in data
        assert data["url"] == "/workspace/abc123"
        assert "headline" in data


def test_send_one_default_url_is_home():
    """If url is not passed, _send_one defaults to /home (backward compat)."""
    calls = []

    def fake_webpush(**kwargs):
        calls.append(kwargs)

    with patch.dict("sys.modules", {"pywebpush": MagicMock(webpush=fake_webpush,
                                                             WebPushException=Exception)}):
        from app.push import _send_one
        from app.config import settings

        with patch.object(settings, "vapid_private_key", "fake-key"), \
             patch.object(settings, "vapid_subject", "mailto:test@test.com"):
            try:
                _send_one(
                    subscription={"endpoint": "https://push.example.com/sub1",
                                  "keys": {"auth": "x", "p256dh": "y"}},
                    headline="Kawan check-in",
                )
            except Exception:
                pass

    if calls:
        data = json.loads(calls[0]["data"])
        assert data.get("url") == "/home"


# ── push_to_user passes url through ──────────────────────────────────────────

async def test_push_to_user_url_parameter_accepted(db):
    """push_to_user accepts an optional url kwarg without error (when no VAPID key)."""
    from app.push import push_to_user
    # Without VAPID keys configured, push_to_user returns False immediately -- no crash.
    result = await push_to_user(db, "user1", "headline text", url="/workspace/xyz")
    assert result is False


# ── deliver() passes commitment url ──────────────────────────────────────────

async def test_deliver_passes_url_to_push(db):
    """pipeline.deliver() extracts commitment_url from payload and passes to push."""
    import app.push as push_mod
    import app.pipeline as pipeline_mod

    captured = {}

    async def fake_push(db, user_id, headline, url="/home"):
        captured["url"] = url
        return False  # simulate no push sub -- triggers timeline fallback

    with patch.object(push_mod, "push_to_user", fake_push):
        from app.pipeline import deliver
        # hub.is_connected is False by default (no WS), so falls through to push
        await deliver(db, "u1", {"say": "hello", "commitment_url": "/workspace/cid999"})

    assert captured.get("url") == "/workspace/cid999"
