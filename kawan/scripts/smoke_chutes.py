"""C5 activation gate: validate every configured Chutes model id against the LIVE
catalog before flipping KAWAN_AI_BACKEND=chutes.

The persona/judge model ids in app/personas.py + app/prompts.py are only as good as
the live platform. This script fetches GET /v1/models (the documented source of
truth — do NOT trust the `-TEE` name suffix; read the capability fields), then
asserts the three properties the demo actually depends on:

  • the id is in the live catalog;
  • it advertises `structured_outputs` (the whole app speaks strict json-schema);
  • judges run in a TEE (confidential_compute), and the VISION judge accepts `image`
    input (the screenshot beat sends a data-URI).

It also lists the live TEE catalog with capabilities so you can pick a text anchor
+ a vision anchor if a swap is ever needed. Exits non-zero on any failure — wire it
into activation / CI.

    cd kawan
    uv --project backend run python scripts/smoke_chutes.py          # validate + list
    uv --project backend run python scripts/smoke_chutes.py --json    # raw catalog dump

Needs KAWAN_CHUTES_API_KEY (team cpk_) in kawan/.env. Read-only; bills nothing.
Reference: docs/reference/chutes-llms.md (§ List live models).
"""

import sys
from pathlib import Path

import httpx

_KAWAN_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_KAWAN_ROOT / "backend"))
from app.config import settings  # noqa: E402
from app.personas import PERSONAS  # noqa: E402
from app.prompts import GITHUB_JUDGE_MODELS, JUDGE_MODELS  # noqa: E402

if not settings.chutes_api_key:
    sys.exit("Set KAWAN_CHUTES_API_KEY (cpk_) in kawan/.env first.")

MODELS_URL = f"{settings.chutes_inference_base_url}/models"
HEADERS = {"Authorization": f"Bearer {settings.chutes_api_key}"}


def bare_ids(routing: str) -> list[str]:
    """A routing string is 'a,b,c' or 'a,b,c:latency' — return the bare model ids."""
    return [part.split(":")[0].strip() for part in routing.split(",") if part.strip()]


def fetch_models() -> list[dict]:
    r = httpx.get(MODELS_URL, headers=HEADERS, timeout=30)
    r.raise_for_status()
    body = r.json()
    return body.get("data", body if isinstance(body, list) else [])


models = fetch_models()

if "--json" in sys.argv:
    import json

    print(json.dumps(models, indent=2)[:12000])
    raise SystemExit(0)

by_id = {m.get("id"): m for m in models}
tee_ids = {m.get("id") for m in models if m.get("confidential_compute")}


def features(mid: str) -> set[str]:
    return set((by_id.get(mid) or {}).get("supported_features") or [])


def input_modalities(mid: str) -> set[str]:
    return set((by_id.get(mid) or {}).get("input_modalities") or [])


print(f"Live catalog: {len(models)} models, {len(tee_ids)} TEE (confidential_compute=true).")
print(f"Endpoint: {MODELS_URL}\n")

print("TEE models  (img=accepts image · so=structured_outputs):")
for m in sorted((m for m in models if m.get("confidential_compute")), key=lambda m: m.get("id") or ""):
    img = "img" if "image" in (m.get("input_modalities") or []) else "   "
    so = "so" if "structured_outputs" in (m.get("supported_features") or []) else "  "
    print(f"  [{img} {so}]  {m.get('id')}   ←   {m.get('root')}")
print()

# (label, ids, require_tee, require_vision). structured_outputs is required everywhere.
configured: list[tuple[str, list[str], bool, bool]] = []
for pid, p in PERSONAS.items():
    configured.append((f"persona:{pid}", bare_ids(p.chat_models), False, False))
configured.append(("judge:vision  (JUDGE_MODELS)", bare_ids(JUDGE_MODELS), True, True))
configured.append(("judge:github  (GITHUB_JUDGE_MODELS)", bare_ids(GITHUB_JUDGE_MODELS), True, False))

failures: list[str] = []
print("Validation  (live · structured_outputs · TEE-if-judge · image-if-vision):")
for label, ids, require_tee, require_vision in configured:
    for mid in ids:
        problems = []
        if mid not in by_id:
            problems.append("not in catalog")
        else:
            if "structured_outputs" not in features(mid):
                problems.append("no structured_outputs")
            if require_tee and mid not in tee_ids:
                problems.append("not confidential_compute")
            if require_vision and "image" not in input_modalities(mid):
                problems.append("no image input")
        print(f"  [{'ok ' if not problems else 'FAIL'}] {label:30} {mid}  {' · '.join(problems)}")
        failures.extend(problems and [f"{label} {mid}: {', '.join(problems)}"] or [])

if failures:
    print(f"\n{len(failures)} problem(s). Pick replacements from the TEE catalog above,")
    print("update app/personas.py + app/prompts.py, and re-run. (Activation gate: FAILING.)")
    raise SystemExit(1)
print("\nAll configured models are live, structured-output capable, judges TEE, vision judge")
print("multimodal. Safe to flip KAWAN_AI_BACKEND=chutes.")
