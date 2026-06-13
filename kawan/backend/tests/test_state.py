"""B4 state machine: final-verdict resolution, grace spending a skip-day, and the
success_patterns write on terminal outcomes (spec §5.3)."""

from datetime import timedelta

from sqlalchemy import func, select

from app import state
from app.models import Commitment, SuccessPattern, User
from app.util import new_id, now_utc


async def _seed(db, **kw) -> Commitment:
    u = User(id=new_id(), username="t", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="a", deliverable="d",
                   deadline=now_utc() + timedelta(hours=1), status="verifying", **kw)
    db.add(c)
    await db.commit()
    return c


async def _outcomes(db, commitment_id) -> int:
    return await db.scalar(
        select(func.count()).select_from(SuccessPattern).where(SuccessPattern.commitment_id == commitment_id)
    )


async def test_pass_completes(db):
    c = await _seed(db)
    assert await state.apply_final_verdict(db, c, "pass") == "completed"
    assert c.status == "completed"
    assert await _outcomes(db, c.id) == 1


async def test_fail_enters_grace_then_misses(db):
    c = await _seed(db, skip_days_total=1)
    assert await state.apply_final_verdict(db, c, "fail") == "grace"
    assert c.status == "grace" and c.skip_days_used == 1
    # the grace re-check failing is terminal
    assert await state.apply_final_verdict(db, c, "unclear") == "missed"
    assert c.status == "missed"
    assert await _outcomes(db, c.id) == 1


async def test_fail_without_skipday_misses(db):
    c = await _seed(db, skip_days_total=0)
    assert await state.apply_final_verdict(db, c, "fail") == "missed"
    assert c.status == "missed"


async def test_grace_expiry_misses(db):
    c = await _seed(db, skip_days_total=1)
    await state.apply_final_verdict(db, c, "fail")  # → grace
    assert await state.grace_expire(db, c) == "missed"
    assert c.status == "missed"
