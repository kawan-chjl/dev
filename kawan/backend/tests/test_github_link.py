"""GitHub-link submission: paste a repo URL -> fetch recent commits -> judge.
Per docs/po-decisions.md: accept repo URL only (not PR/commit) for now.
The configured-repo cadence path (GitHubAdapter.fetch with evidence_config) is
unchanged; these tests cover only the new paste-URL path."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from app.adapters.github import GitHubAdapter, fetch_repo_url


class _Commitment:
    user_id = "u1"
    action = "ship"
    deliverable = "portfolio"
    deadline = datetime(2026, 7, 1, 18, 0, tzinfo=timezone.utc)
    evidence_config = {"repo": "o/r", "branch": "main"}


class _FakeChutes:
    def __init__(self, result):
        self.result = result
        self.calls = []

    async def structured(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


_PASS_RESULT = {
    "verdict": "pass",
    "confidence": 0.85,
    "observations": ["recent commit relates to deliverable"],
    "reasoning": "commits show real progress",
    "follow_up_request": None,
}

_SHA = "a" * 40


def _repo_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path == "/repos/owner/repo/commits":
        return httpx.Response(200, json=[
            {"sha": _SHA, "commit": {"message": "feat: add portfolio page"}},
        ])
    if path == f"/repos/owner/repo/commits/{_SHA}":
        return httpx.Response(200, json={"sha": _SHA, "stats": {"total": 20},
                                         "commit": {"message": "feat: add portfolio page"}})
    return httpx.Response(404)


def _make_adapter(fake, handler=_repo_handler):
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GitHubAdapter(fake, http=http), http


# ── parse_github_repo_url ───────────────────────────────────────────────────

def test_parse_valid_repo_url():
    from app.adapters.github import parse_github_repo_url
    assert parse_github_repo_url("https://github.com/owner/repo") == "owner/repo"
    assert parse_github_repo_url("https://github.com/owner/repo/") == "owner/repo"
    assert parse_github_repo_url("https://github.com/owner/repo.git") == "owner/repo"


def test_parse_invalid_url_returns_none():
    from app.adapters.github import parse_github_repo_url
    assert parse_github_repo_url("not-a-url") is None
    assert parse_github_repo_url("https://gitlab.com/owner/repo") is None
    assert parse_github_repo_url("https://github.com/owner") is None  # only owner, no repo
    assert parse_github_repo_url("") is None


# ── fetch_repo_url ──────────────────────────────────────────────────────────

async def test_fetch_repo_url_returns_commits():
    fake = _FakeChutes({})
    adapter, http = _make_adapter(fake)
    try:
        bundle = await fetch_repo_url(adapter, "https://github.com/owner/repo", _Commitment())
    finally:
        await http.aclose()
    assert len(bundle.items) == 1
    assert bundle.items[0]["message"] == "feat: add portfolio page"


async def test_fetch_repo_url_malformed_returns_unclear_bundle():
    """A malformed URL must return an empty bundle, not raise."""
    fake = _FakeChutes({})
    adapter, http = _make_adapter(fake)
    try:
        bundle = await fetch_repo_url(adapter, "not-a-github-url", _Commitment())
    finally:
        await http.aclose()
    assert bundle.items == []
    assert "invalid" in bundle.summary.lower() or "not a github" in bundle.summary.lower()


async def test_fetch_repo_url_non_github_returns_unclear_bundle():
    fake = _FakeChutes({})
    adapter, http = _make_adapter(fake)
    try:
        bundle = await fetch_repo_url(adapter, "https://gitlab.com/owner/repo", _Commitment())
    finally:
        await http.aclose()
    assert bundle.items == []


async def test_fetch_repo_url_github_404_returns_empty_bundle():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    fake = _FakeChutes({})
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = GitHubAdapter(fake, http=http)
    try:
        bundle = await fetch_repo_url(adapter, "https://github.com/owner/missing-repo", _Commitment())
    finally:
        await http.aclose()
    assert bundle.items == []


# ── full round-trip: fetch_repo_url + judge ─────────────────────────────────

async def test_github_link_judge_pass():
    fake = _FakeChutes(_PASS_RESULT)
    adapter, http = _make_adapter(fake)
    try:
        bundle = await fetch_repo_url(adapter, "https://github.com/owner/repo", _Commitment())
        verdict = await adapter.judge(_Commitment(), bundle, None)
    finally:
        await http.aclose()
    assert verdict.verdict == "pass"
    assert fake.calls[0]["schema_name"] == "verdict"


async def test_github_link_no_commits_returns_unclear():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/repos/owner/empty/commits":
            return httpx.Response(200, json=[])
        return httpx.Response(404)

    fake = _FakeChutes({})  # must NOT be called
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = GitHubAdapter(fake, http=http)
    try:
        bundle = await fetch_repo_url(adapter, "https://github.com/owner/empty", _Commitment())
        verdict = await adapter.judge(_Commitment(), bundle, None)
    finally:
        await http.aclose()
    assert verdict.verdict == "unclear"
    assert fake.calls == []


# ── cadence path (evidence_config.repo) is unchanged ────────────────────────

async def test_existing_cadence_fetch_unaffected():
    """The original fetch(commitment, since) path still works."""
    fake = _FakeChutes({})

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/repos/o/r/commits":
            return httpx.Response(200, json=[
                {"sha": _SHA, "commit": {"message": "cadence commit"}},
            ])
        if request.url.path == f"/repos/o/r/commits/{_SHA}":
            return httpx.Response(200, json={"sha": _SHA, "stats": {"total": 10},
                                             "commit": {"message": "cadence commit"}})
        return httpx.Response(404)

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    adapter = GitHubAdapter(fake, http=http)
    try:
        bundle = await adapter.fetch(_Commitment(), None)
    finally:
        await http.aclose()
    assert len(bundle.items) == 1
    assert bundle.items[0]["message"] == "cadence commit"


# ── HTTP route tests ─────────────────────────────────────────────────────────

async def test_github_link_route_malformed_url(client):
    rc = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "portfolio", "deadline": "2099-01-01T00:00:00Z"},
    )
    assert rc.status_code == 201
    cid = rc.json()["id"]
    r = await client.post(f"/api/commitments/{cid}/evidence/github-link",
                          json={"url": "not-a-url"})
    assert r.status_code == 422  # friendly validation error
    body = r.json()
    assert "github" in str(body).lower() or "invalid" in str(body).lower()


async def test_github_link_route_non_github_url(client):
    rc = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "portfolio", "deadline": "2099-01-01T00:00:00Z"},
    )
    cid = rc.json()["id"]
    r = await client.post(f"/api/commitments/{cid}/evidence/github-link",
                          json={"url": "https://gitlab.com/owner/repo"})
    assert r.status_code == 422
