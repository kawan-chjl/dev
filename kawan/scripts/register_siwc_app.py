"""Action item: register the backend OAuth callback on the SIWC app.

The backend now handles the callback itself, so the registered app must list
`http://localhost:5173/api/auth/siwc/callback` (+ the prod equivalent). This script
INSPECTS by default (read-only GET) and only mutates the shared app when run with
`--apply` (PATCH adds the redirect_uri; existing ones are preserved).

    cd kawan
    uv --project backend run python scripts/register_siwc_app.py           # inspect
    uv --project backend run python scripts/register_siwc_app.py --apply    # register

Needs KAWAN_CHUTES_API_KEY (team cpk_) + KAWAN_SIWC_CLIENT_ID in kawan/.env.
Reference: api.chutes.ai/idp/apps — PATCH uses app_id (UUID), not the cid_ client_id.
"""

import sys
from pathlib import Path

import httpx

_KAWAN_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_KAWAN_ROOT / "backend"))
from app.config import settings  # noqa: E402

API = settings.chutes_api_base_url
REDIRECT = settings.siwc_redirect_uri
WANT_SCOPES = settings.siwc_scopes.split()

if not settings.chutes_api_key:
    sys.exit("Set KAWAN_CHUTES_API_KEY (cpk_) in kawan/.env first.")

HEADERS = {"Authorization": f"Bearer {settings.chutes_api_key}"}


def _user_id_from_cpk(key: str) -> str:
    """cpk_<key_id>.<user_id_hex>.<secret> → UUID (hyphens at 8-4-4-4-12). Reference §user_id."""
    mid = key.split(".")[1]
    return f"{mid[:8]}-{mid[8:12]}-{mid[12:16]}-{mid[16:20]}-{mid[20:]}"


def fetch_all_apps() -> list[dict]:
    """GET /idp/apps is the public registry of ALL apps; page through everything."""
    out: list[dict] = []
    with httpx.Client(timeout=30) as client:
        page = 0
        while True:
            r = client.get(f"{API}/idp/apps", headers=HEADERS, params={"page": page, "limit": 100})
            r.raise_for_status()
            body = r.json()
            items = body.get("items", body if isinstance(body, list) else [])
            out.extend(items)
            if len(items) < 100:
                return out
            page += 1


def select_app(apps: list[dict]) -> list[dict]:
    """Prefer an explicit client_id / app_id; otherwise match every app owned by our user."""
    if settings.siwc_client_id:
        return [a for a in apps if a.get("client_id") == settings.siwc_client_id]
    if settings.siwc_app_id:
        return [a for a in apps if a.get("app_id") == settings.siwc_app_id]
    uid = _user_id_from_cpk(settings.chutes_api_key)
    print(f"Matching apps by user_id {uid} (no client_id/app_id set).")
    return [a for a in apps if a.get("user_id") == uid]


matches = select_app(fetch_all_apps())
if not matches:
    sys.exit("No matching app found. Set KAWAN_SIWC_CLIENT_ID or register one via POST /idp/apps.")
if len(matches) > 1:
    print("Multiple apps match — set KAWAN_SIWC_CLIENT_ID (or KAWAN_SIWC_APP_ID) to disambiguate:")
    for a in matches:
        print(f"  client_id={a.get('client_id')}  app_id={a.get('app_id')}  name={a.get('name')!r}")
    raise SystemExit(1)
app = matches[0]

app_id = app["app_id"]
existing = app.get("redirect_uris", [])
scopes = app.get("scopes") or app.get("allowed_scopes")
print(f"App: {app.get('name')}   app_id={app_id}")
print(f"  redirect_uris : {existing}")
print(f"  scopes        : {scopes}")
print(f"  backend callback {REDIRECT!r}: {'present' if REDIRECT in existing else 'MISSING'}")
print(f"  wanted scopes  {WANT_SCOPES}: {'ok' if scopes and set(WANT_SCOPES) <= set(scopes) else 'CHECK'}")

if "--apply" not in sys.argv:
    print("\nInspect only. Re-run with --apply to PATCH the redirect_uri + scopes.")
    raise SystemExit(0)

new_uris = sorted(set(existing) | {REDIRECT})
with httpx.Client(timeout=30) as client:
    r = client.patch(f"{API}/idp/apps/{app_id}", headers=HEADERS,
                     json={"redirect_uris": new_uris, "scopes": WANT_SCOPES})
    print("\nPATCH", r.status_code, r.text[:300])
    r.raise_for_status()
print("Done. redirect_uris now:", new_uris)
