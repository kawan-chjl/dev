"""Issue #31 — idempotent push subscriptions + dead-sub pruning."""

from sqlalchemy import func, select

from app import push as push_mod
from app.models import PushSubscription


async def _guest_user_id(db) -> str:
    from app.auth import ensure_guest_user
    return (await ensure_guest_user(db)).id


async def test_duplicate_subscribe_does_not_create_duplicate_row(db):
    """Re-subscribing with the same endpoint must UPSERT, not INSERT a second row."""
    user_id = await _guest_user_id(db)
    sub = {"endpoint": "https://push.example.com/sub/abc", "keys": {"auth": "a", "p256dh": "b"}}

    await push_mod.save_subscription(db, user_id, sub)
    await push_mod.save_subscription(db, user_id, sub)  # second call with same endpoint

    count = await db.scalar(
        select(func.count()).select_from(PushSubscription)
        .where(PushSubscription.endpoint == sub["endpoint"])
    )
    assert count == 1


async def test_upsert_updates_keys_on_re_subscribe(db):
    """Re-subscribing with the same endpoint but new keys updates the stored row."""
    user_id = await _guest_user_id(db)
    endpoint = "https://push.example.com/sub/update-me"
    sub_v1 = {"endpoint": endpoint, "keys": {"auth": "old", "p256dh": "old"}}
    sub_v2 = {"endpoint": endpoint, "keys": {"auth": "new", "p256dh": "new"}}

    await push_mod.save_subscription(db, user_id, sub_v1)
    await push_mod.save_subscription(db, user_id, sub_v2)

    row = await db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    assert row is not None
    assert row.subscription["keys"]["auth"] == "new"


async def test_dead_subscription_pruned_on_delivery(db, monkeypatch):
    """push_to_user must delete a subscription when the push service returns 404/410."""
    from app.config import settings
    monkeypatch.setattr(settings, "vapid_private_key", "fake-key")
    monkeypatch.setattr(settings, "vapid_subject", "mailto:test@example.com")

    user_id = await _guest_user_id(db)
    endpoint = "https://push.example.com/sub/gone"
    sub = {"endpoint": endpoint, "keys": {"auth": "a", "p256dh": "b"}}
    db.add(PushSubscription(user_id=user_id, endpoint=endpoint, subscription=sub))
    await db.commit()

    # Patch _send_one so it reports the subscription as gone (is_gone=True).
    # asyncio.to_thread runs _send_one in a thread; patch the module-level function
    # so the thread picks up the mock.
    monkeypatch.setattr(push_mod, "_send_one", lambda sub, headline, url="/home": (False, True))

    await push_mod.push_to_user(db, user_id, "test headline")

    count = await db.scalar(
        select(func.count()).select_from(PushSubscription)
        .where(PushSubscription.endpoint == endpoint)
    )
    assert count == 0
