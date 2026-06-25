import base64
import hashlib
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_KAWAN_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """App configuration. Values come from environment / <kawan-root>/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=_KAWAN_ROOT / ".env", env_prefix="KAWAN_")

    database_url: str = "sqlite+aiosqlite:///./kawan.db"
    frontend_origin: str = "http://localhost:5173"
    # Where the backend sends the browser after a completed SIWC login (V3 home).
    frontend_post_login_redirect: str = "http://localhost:5173/"
    # APScheduler cron jobs (cadence) and the demo run in the team's local time (MYT).
    app_tz: str = "Asia/Kuala_Lumpur"
    # AI backend: 'stub' (deterministic, offline — default + tests) or 'chutes'
    # (real TEE inference). The demo/prod env sets KAWAN_AI_BACKEND=chutes.
    ai_backend: str = "stub"

    # Chutes / SIWC — fill in from the team vault, never commit real values
    chutes_inference_base_url: str = "https://llm.chutes.ai/v1"  # OpenAI-compatible inference (TR-29)
    chutes_api_base_url: str = "https://api.chutes.ai"  # IdP + /users/me (reference: api.chutes.ai/idp/*)
    chutes_api_key: str = ""  # team cpk_ token — guest mode + app registration only (TR-50/TR-53)
    siwc_client_id: str = ""
    siwc_client_secret: str = ""
    siwc_app_id: str = ""
    # Backend-handled callback, proxied via vite in dev (ADR: callback flow). Re-register on the cid_ app.
    siwc_redirect_uri: str = "http://localhost:5173/api/auth/siwc/callback"
    siwc_scopes: str = "openid profile chutes:invoke"  # canonical set (spec §9.4, reference)
    session_secret: str = "dev-only-change-me"
    fernet_key: str = ""  # token-at-rest key; if unset, derived from session_secret (dev only)

    # Cross-origin cookie settings. Defaults keep local dev working (SameSite=lax, not Secure).
    # In prod (Vercel→Render direct-WS): KAWAN_COOKIE_SAMESITE=none + KAWAN_COOKIE_SECURE=true.
    cookie_samesite: str = "lax"
    cookie_secure: bool = False

    # Web Push (VAPID) — server-side send is Lane B; the service worker is Lane D
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:kawan@example.com"

    # Stake + win-back email (Resend HTTP API; falls back to a log-only outbox when unset)
    resend_api_key: str = ""
    email_from: str = "Kawan <kawan@example.com>"

    @property
    def idp_authorize_url(self) -> str:
        return f"{self.chutes_api_base_url}/idp/authorize"

    @property
    def idp_token_url(self) -> str:
        return f"{self.chutes_api_base_url}/idp/token"

    @property
    def idp_userinfo_url(self) -> str:
        return f"{self.chutes_api_base_url}/idp/userinfo"

    @property
    def users_me_url(self) -> str:
        return f"{self.chutes_api_base_url}/users/me"

    @property
    def fernet_key_bytes(self) -> bytes:
        """A valid 32-byte urlsafe-base64 Fernet key. Dev fallback derives deterministically
        from session_secret so tokens survive restarts without a configured key."""
        if self.fernet_key:
            return self.fernet_key.encode()
        return base64.urlsafe_b64encode(hashlib.sha256(self.session_secret.encode()).digest())


settings = Settings()
