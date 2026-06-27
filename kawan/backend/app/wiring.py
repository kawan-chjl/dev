"""The single place Lane C swaps stubs for real implementations (ADR-0001).
KAWAN_AI_BACKEND selects 'stub' (deterministic demo levers + offline tests, default)
or 'chutes' (real TEE inference). Everything downstream imports ADAPTERS / LLM /
TOKENS from here, so the hand-off is one file."""

from app.auth import AuthTokenProvider
from app.config import settings
from app.contracts import EvidenceAdapter, LLMClient, TokenProvider

TOKENS: TokenProvider = AuthTokenProvider()


def _build() -> tuple[dict[str, EvidenceAdapter], LLMClient]:
    if settings.ai_backend == "stub":
        from app.stubs import StubFileAdapter, StubGitHubAdapter, StubLLMClient, StubScreenshotAdapter
        return ({"github": StubGitHubAdapter(), "screenshot": StubScreenshotAdapter(),
                 "file": StubFileAdapter()}, StubLLMClient())

    # Real Chutes-backed Lane C (imported lazily so the stub path never imports it).
    from app.adapters.file import FileAdapter
    from app.adapters.github import GitHubAdapter
    from app.adapters.screenshot import ScreenshotAdapter
    from app.chutes import ChutesClient
    from app.llm.client import ChutesLLMClient, db_persona_resolver

    chutes = ChutesClient(TOKENS, base_url=settings.chutes_inference_base_url)
    adapters: dict[str, EvidenceAdapter] = {
        "github": GitHubAdapter(chutes),
        "screenshot": ScreenshotAdapter(chutes),
        "file": FileAdapter(chutes),
    }
    return adapters, ChutesLLMClient(chutes, db_persona_resolver)


ADAPTERS, LLM = _build()


def adapter_for(evidence_type: str) -> EvidenceAdapter:
    return ADAPTERS[evidence_type]
