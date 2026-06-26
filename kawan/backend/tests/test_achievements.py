"""B6 (ADR-0004): behavioral achievements are awarded on the verified-win path,
idempotently, distinct from the A7 title milestones, and surfaced for A10."""

from datetime import timedelta

from sqlalchemy import func, select

from app import achievements, state
from app.models import Achievement, Commitment, User
from app.util import new_id, now_utc


async def _user(db) -> User:
    u = User(id=new_id(), username="u", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    return u


async def _commit(db, u, *, hours=1, status="verifying", **kw) -> Commitment:
    c = Commitment(user_id=u.id, action="a", deliverable="d",
                   deadline=now_utc() + timedelta(hours=hours), status=status, **kw)
    db.add(c)
    await db.commit()
    return c


async def _codes(db, user_id) -> set[str]:
    return set((await db.scalars(select(Achievement.code).where(Achievement.user_id == user_id))).all())


async def test_first_clean_screenshot_win_awards_badges(db):
    u = await _user(db)
    c = await _commit(db, u, hours=1, evidence_type="screenshot", skip_days_used=0)  # 1h out → not early
    assert await state.apply_final_verdict(db, c, "pass") == "completed"
    assert await _codes(db, u.id) == {"first_win", "clean_win", "screenshot_win"}


async def test_early_bird_only_when_far_from_deadline(db):
    u = await _user(db)
    c = await _commit(db, u, hours=72, evidence_type="github")  # >24h → early_bird; github → not screenshot
    await state.apply_final_verdict(db, c, "pass")
    codes = await _codes(db, u.id)
    assert "early_bird" in codes and "screenshot_win" not in codes


async def test_comeback_after_a_miss(db):
    u = await _user(db)
    miss = await _commit(db, u, evidence_type="github", skip_days_total=0)  # no grace → real miss
    assert await state.apply_final_verdict(db, miss, "fail") == "missed"
    win = await _commit(db, u, evidence_type="github")
    await state.apply_final_verdict(db, win, "pass")
    assert "comeback" in await _codes(db, u.id)


async def test_on_fire_after_three_in_a_row(db):
    u = await _user(db)
    for _ in range(3):
        c = await _commit(db, u, evidence_type="github")
        await state.apply_final_verdict(db, c, "pass")
    assert "on_fire" in await _codes(db, u.id)


async def test_award_is_idempotent(db):
    u = await _user(db)
    c = await _commit(db, u, evidence_type="screenshot")
    await state.apply_final_verdict(db, c, "pass")
    n_before = await db.scalar(select(func.count()).select_from(Achievement).where(Achievement.user_id == u.id))
    await achievements.award(db, c)  # run the award path a second time
    await db.commit()
    n_after = await db.scalar(select(func.count()).select_from(Achievement).where(Achievement.user_id == u.id))
    assert n_after == n_before  # unique(user_id, code) + skip-existing → no duplicates


async def test_achievements_endpoint_full_catalog_locked_by_default(client):
    body = (await client.get("/api/me/achievements")).json()
    assert len(body) == len(achievements.CATALOG)
    assert all(set(item) == {"code", "label", "description", "earned", "awarded_at"} for item in body)
    assert all(item["earned"] is False and item["awarded_at"] is None for item in body)


async def test_achievements_endpoint_reflects_earned(client, db):
    from app.auth import GUEST_USER_ID
    db.add(Achievement(user_id=GUEST_USER_ID, code="first_win"))
    await db.commit()
    body = (await client.get("/api/me/achievements")).json()
    fw = next(i for i in body if i["code"] == "first_win")
    assert fw["earned"] is True and fw["awarded_at"] is not None
