"""GitHubAdapter: trivial-commit filter (stats.total < 3 dropped) and verdict mapping.
Offline — GitHub via MockTransport, the judge LLM via a fake ChutesClient."""

from datetime import datetime, timezone

import httpx

from app.adapters.github import GitHubAdapter


class _Commitment:
    user_id = "u1"
    action = "ship"
    deliverable = "portfolio"
    deadline = datetime(2026, 7, 1, 18, 0, tzinfo=timezone.utc)
    evidence_config = {"repo": "o/r", "branch": "main"}


class _NoCfg(_Commitment):
    evidence_config = None


class _FakeChutes:
    def __init__(self, result):
        self.result = result
        self.calls = []

    async def structured(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


_BIG = "a" * 40
_SMALL = "b" * 40


def _gh_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/repos/o/r/commits":
        return httpx.Response(200, json=[
            {"sha": _BIG, "commit": {"message": "feat: real feature"}},
            {"sha": _SMALL, "commit": {"message": "fix typo"}},
        ])
    if path == f"/repos/o/r/commits/{_BIG}":
        return httpx.Response(200, json={"sha": _BIG, "stats": {"total": 50},
                                         "commit": {"message": "feat: real feature"}})
    if path == f"/repos/o/r/commits/{_SMALL}":
        return httpx.Response(200, json={"sha": _SMALL, "stats": {"total": 1},
                                         "commit": {"message": "fix typo"}})
    return httpx.Response(404)


def _adapter(fake):
    http = httpx.AsyncClient(transport=httpx.MockTransport(_gh_handler))
    return GitHubAdapter(fake, http=http), http


async def test_fetch_drops_trivial_commits():
    adapter, http = _adapter(_FakeChutes({}))
    try:
        bundle = await adapter.fetch(_Commitment(), None)
    finally:
        await http.aclose()
    assert len(bundle.items) == 1
    assert bundle.items[0]["total"] == 50  # the 1-line (trivial) commit was filtered out


async def test_fetch_without_repo_returns_empty_bundle():
    adapter, http = _adapter(_FakeChutes({}))
    try:
        bundle = await adapter.fetch(_NoCfg(), None)
    finally:
        await http.aclose()
    assert bundle.items == []


async def test_judge_maps_llm_verdict():
    fake = _FakeChutes({"verdict": "pass", "confidence": 0.9,
                        "observations": ["commit 'feat: real feature' builds the portfolio page"],
                        "reasoning": "non-trivial commit relates to the deliverable",
                        "follow_up_request": None})
    adapter, http = _adapter(fake)
    try:
        bundle = await adapter.fetch(_Commitment(), None)
        verdict = await adapter.judge(_Commitment(), bundle, None)
    finally:
        await http.aclose()
    assert verdict.verdict == "pass" and verdict.confidence == 0.9
    assert fake.calls[0]["schema_name"] == "verdict"


async def test_judge_unclear_when_no_commits():
    fake = _FakeChutes({})  # must NOT be called
    adapter, http = _adapter(fake)
    try:
        bundle = await adapter.fetch(_NoCfg(), None)
        verdict = await adapter.judge(_NoCfg(), bundle, None)
    finally:
        await http.aclose()
    assert verdict.verdict == "unclear"
    assert fake.calls == []  # deterministic pre-check, no LLM spend


async def test_fetch_handles_empty_commit_message():
    # A commit with an empty message must not crash _first_line (regression: IndexError).
    sha = "c" * 40

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/repos/o/r/commits":
            return httpx.Response(200, json=[{"sha": sha, "commit": {"message": ""}}])
        if request.url.path == f"/repos/o/r/commits/{sha}":
            return httpx.Response(200, json={"sha": sha, "stats": {"total": 40}, "commit": {"message": ""}})
        return httpx.Response(404)

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = GitHubAdapter(_FakeChutes({}), http=http)
    try:
        bundle = await adapter.fetch(_Commitment(), None)
    finally:
        await http.aclose()
    assert len(bundle.items) == 1 and bundle.items[0]["total"] == 40
    assert "''" in bundle.summary  # empty first line rendered, no crash
