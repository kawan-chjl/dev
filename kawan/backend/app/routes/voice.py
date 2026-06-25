"""D1 — Piper TTS endpoint.

POST /api/voice/tts
  Request: TtsIn { text: str, persona: Literal['kawan','adik','cik_maid'] }
  Auth: current_user-scoped (session cookie)
  Response:
    200 audio/wav — Piper synthesized audio
    204 No Content — Piper not configured / voice model missing (prod / Render free tier)
    422 — validation error (unknown persona, text too long)

Graceful degradation contract: this endpoint NEVER returns 5xx due to a missing Piper
installation. If piper-tts is not installed, or voice models are missing, or synthesis
fails for any expected reason, the response is 204 so the frontend falls back to WebSpeech.

Per-persona voice table (backend is single source of truth — frontend sends only `persona`):
  kawan    → en_US-lessac-medium   (warm, measured)
  adik     → en_US-libritts-high   (lighter, higher pitch)
  cik_maid → en_GB-alba-medium     (brisker, British accent for playful tone)

Voice model storage:
  Files: <KAWAN_PIPER_VOICES_DIR>/<voice_name>.onnx  +  <voice_name>.onnx.json
  Default dir: kawan/backend/voices/  (gitignored)
  Override: set KAWAN_PIPER_VOICES_DIR in environment.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, field_validator

from app.config import settings
from app.deps import current_user
from app.models import User

log = logging.getLogger(__name__)

router = APIRouter()

# ── Per-persona voice mapping (single source of truth) ──────────────────────
# Keys match the _VALID_PERSONAS tuple in schemas.py.
_PERSONA_VOICE: dict[str, str] = {
    'kawan': 'en_US-lessac-medium',
    'adik': 'en_US-libritts-high',
    'cik_maid': 'en_GB-alba-medium',
}

_MAX_TEXT = 2000  # characters; generous for a single companion line


class TtsIn(BaseModel):
    text: str
    persona: Literal['kawan', 'adik', 'cik_maid']

    @field_validator('text')
    @classmethod
    def _text_bounded(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('text must not be empty')
        if len(v) > _MAX_TEXT:
            raise ValueError(f'text must be {_MAX_TEXT} characters or fewer')
        return v


def _voices_dir() -> Path:
    """Return the configured (or default) voices directory."""
    override = getattr(settings, 'piper_voices_dir', None)
    if override:
        return Path(override)
    # Default: kawan/backend/voices/ (two levels up from app/)
    return Path(__file__).resolve().parents[2] / 'voices'


def _synthesize(text: str, voice_name: str) -> bytes | None:
    """Attempt Piper synthesis. Returns WAV bytes on success, None on any expected failure.

    Imports piper lazily so the backend boots fine without piper-tts installed.
    Returns None (not raises) when:
      - piper-tts package is not installed
      - voice model files are missing
      - synthesis produces empty output
    """
    try:
        # Lazy import — piper-tts is an OPTIONAL dependency (not in pyproject.toml core deps).
        from piper.voice import PiperVoice  # type: ignore[import-not-found]
    except ImportError:
        log.debug('piper-tts not installed; returning 204')
        return None

    voices_dir = _voices_dir()
    model_path = voices_dir / f'{voice_name}.onnx'
    config_path = voices_dir / f'{voice_name}.onnx.json'

    if not model_path.exists() or not config_path.exists():
        log.debug('Piper voice model missing for %s; returning 204', voice_name)
        return None

    try:
        voice = PiperVoice.load(str(model_path), config_path=str(config_path))
        buf = io.BytesIO()
        with _wav_writer(buf, voice.config.sample_rate) as wav_out:
            voice.synthesize(text, wav_out)
        wav_bytes = buf.getvalue()
        if not wav_bytes:
            return None
        return wav_bytes
    except Exception as exc:
        # Any unexpected synthesis error → degrade gracefully (never 5xx)
        log.warning('Piper synthesis failed: %s', exc)
        return None


def _wav_writer(buf: io.BytesIO, sample_rate: int):
    """Context manager that writes a RIFF WAV header + PCM16 samples into buf."""
    import contextlib
    import struct
    import wave

    @contextlib.contextmanager
    def _ctx():
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit PCM
            wf.setframerate(sample_rate)
            yield wf

    return _ctx()


@router.post('/voice/tts')
async def tts(body: TtsIn, _user: User = Depends(current_user)) -> Response:
    """Synthesize companion reply text to WAV audio via Piper.

    Returns 200 audio/wav on success, 204 No Content when Piper is unavailable
    (so the frontend can fall back to WebSpeech without a network error).
    """
    voice_name = _PERSONA_VOICE[body.persona]
    wav_bytes = _synthesize(body.text, voice_name)

    if wav_bytes is None:
        return Response(status_code=204)

    return Response(content=wav_bytes, media_type='audio/wav')
