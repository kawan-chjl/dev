"""The single place Lane C swaps stubs for real implementations (ADR-0001).
Everything downstream imports the adapters / LLM / token provider from here, so the
hand-off is one file. While stubbed, these are also the deterministic demo levers."""

from app.auth import AuthTokenProvider
from app.contracts import EvidenceAdapter, LLMClient, TokenProvider
from app.stubs import StubGitHubAdapter, StubLLMClient, StubScreenshotAdapter

ADAPTERS: dict[str, EvidenceAdapter] = {
    "github": StubGitHubAdapter(),
    "screenshot": StubScreenshotAdapter(),
}
LLM: LLMClient = StubLLMClient()
TOKENS: TokenProvider = AuthTokenProvider()


def adapter_for(evidence_type: str) -> EvidenceAdapter:
    return ADAPTERS[evidence_type]
