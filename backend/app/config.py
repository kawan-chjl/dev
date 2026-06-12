from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """App configuration. Values come from environment / <repo-root>/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=_REPO_ROOT / ".env", env_prefix="KAWAN_")

    database_url: str = "sqlite+aiosqlite:///./kawan.db"
    frontend_origin: str = "http://localhost:5173"

    # Chutes / SIWC — fill in from the team vault, never commit real values
    chutes_inference_base_url: str = "https://llm.chutes.ai/v1"
    chutes_api_key: str = ""  # team cpk_ token (dev/spikes); user SIWC tokens replace this per-request in prod
    siwc_client_id: str = ""
    siwc_redirect_uri: str = "http://localhost:5173/auth/callback"
    session_secret: str = "dev-only-change-me"


settings = Settings()
