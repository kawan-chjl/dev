"""GitHub evidence adapter (spec §10.2, high trust). fetch hits the public commits
API (no auth, 60 req/h/IP — ample for the demo) and drops trivial commits
(stats.total < 3); judge runs one text LLM call relating the kept commits to the
deliverable. The verdict is a structured call the adapter owns via its own
ChutesClient — the `llm` param (contracts.LLMClient) is unused here."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

import httpx

from app.contracts import EvidenceBundle, Verdict
from app.prompts import GITHUB_JUDGE_MODELS, JUDGE_SYSTEM, VERDICT_SCHEMA

if TYPE_CHECKING:
    from app.chutes import ChutesClient
    from app.models import Commitment

_TRIVIAL_TOTAL = 3   # stats.total < 3 is trivial (spec §10.2, rule shown in UI)
_MAX_DETAIL = 5      # only fetch per-commit stats for the 5 newest (rate-limit budget)


def _first_line(message: str) -> str:
    """First line of a commit message, safe for empty/blank messages (no IndexError)."""
    lines = message.splitlines()
    return lines[0] if lines else ""


class GitHubAdapter:
    type = "github"
    trust = "high"

    def __init__(self, chutes: "ChutesClient", *, http: httpx.AsyncClient | None = None,
                 api_base: str = "https://api.github.com") -> None:
        self._chutes = chutes
        self._http = http
        self._api = api_base.rstrip("/")

    async def fetch(self, commitment: "Commitment", since: datetime | None) -> EvidenceBundle:
        cfg = commitment.evidence_config or {}
        repo = cfg.get("repo")
        if not repo:
            return EvidenceBundle(adapter="github", raw_ref={"shas": []}, items=[],
                                  summary="no repo configured")
        params = {"sha": cfg.get("branch", "main")}
        if since is not None:
            params["since"] = since.isoformat()

        owns = self._http is None
        http = self._http or httpx.AsyncClient(timeout=30)
        try:
            resp = await http.get(f"{self._api}/repos/{repo}/commits", params=params)
            if resp.status_code != 200:
                return EvidenceBundle(adapter="github", raw_ref={"shas": []}, items=[],
                                      summary=f"github {resp.status_code} for {repo}")
            commits = resp.json()
            items: list[dict] = []
            for commit in commits[:_MAX_DETAIL]:
                sha = commit["sha"]
                detail = await http.get(f"{self._api}/repos/{repo}/commits/{sha}")
                total = detail.json().get("stats", {}).get("total", 0) if detail.status_code == 200 else 0
                if total >= _TRIVIAL_TOTAL:  # drop trivial commits
                    items.append({"sha": sha[:7], "message": commit["commit"]["message"], "total": total})
        finally:
            if owns:
                await http.aclose()

        summary = (f"{len(items)} new non-trivial commit(s): "
                   + "; ".join(f"'{_first_line(i['message'])}'" for i in items)) if items \
            else "no new non-trivial commits in window"
        return EvidenceBundle(adapter="github", raw_ref={"shas": [i["sha"] for i in items]},
                              items=items, summary=summary)

    async def judge(self, commitment: "Commitment", bundle: EvidenceBundle, llm) -> Verdict:
        if not bundle.items:  # deterministic pre-check — no LLM spend (spec §10.2)
            return Verdict("unclear", 0.5, ["no new non-trivial commits in window"],
                           "Nothing fetched since the last check.",
                           "Push something non-trivial and I'll look again.")
        commit_lines = "\n".join(f"- {_first_line(i['message'])} ({i['total']} lines changed)"
                                 for i in bundle.items)
        messages = [
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content":
                f"Commitment: I will {commitment.action} {commitment.deliverable} "
                f"by {commitment.deadline:%Y-%m-%d %H:%M}.\nFetched commits:\n{commit_lines}\n"
                "Judge whether these commits show real progress toward the deliverable."},
        ]
        r = await self._chutes.structured(
            user_id=commitment.user_id, model=GITHUB_JUDGE_MODELS, messages=messages,
            schema=VERDICT_SCHEMA, schema_name="verdict", max_tokens=1024,
        )
        return Verdict(r["verdict"], r["confidence"], r["observations"], r["reasoning"],
                       r.get("follow_up_request"))
