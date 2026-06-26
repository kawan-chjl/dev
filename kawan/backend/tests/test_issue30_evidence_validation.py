"""Issue #30 — evidence upload validation: content-type guard + 8 MB cap."""

from datetime import timedelta

from app.util import now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _active_commitment_id(client) -> str:
    r = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "d", "deadline": _future()},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    r = await client.post(f"/api/commitments/{cid}/start")
    assert r.status_code == 200
    return cid


async def test_wrong_content_type_rejected(client):
    cid = await _active_commitment_id(client)
    r = await client.post(
        f"/api/commitments/{cid}/evidence",
        files={"file": ("doc.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert r.status_code == 415


async def test_oversized_upload_rejected(client):
    cid = await _active_commitment_id(client)
    big = b"\x89PNG\r\n" + b"x" * (8 * 1024 * 1024 + 1)  # 8 MB + 1 byte
    r = await client.post(
        f"/api/commitments/{cid}/evidence",
        files={"file": ("big.png", big, "image/png")},
    )
    assert r.status_code == 413


async def test_valid_small_image_accepted(client, monkeypatch):
    """A valid PNG within the size limit reaches judge_upload (stubbed)."""
    import app.pipeline as pipeline_mod
    from app.models import Evidence

    async def _fake_judge(db, commitment, meta, image_b64):
        ev = Evidence(commitment_id=commitment.id, adapter="screenshot",
                      verdict="pass", confidence=0.9, reasoning="looks good")
        db.add(ev)
        await db.commit()
        return ev

    monkeypatch.setattr(pipeline_mod, "judge_upload", _fake_judge)

    cid = await _active_commitment_id(client)
    small_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    r = await client.post(
        f"/api/commitments/{cid}/evidence",
        files={"file": ("shot.png", small_png, "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["verdict"] == "pass"
