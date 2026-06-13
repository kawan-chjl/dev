"""Fernet encryption for SIWC tokens at rest (TR-51). The key lives in env
(KAWAN_FERNET_KEY); a dev fallback is derived from the session secret in config."""

from cryptography.fernet import Fernet

from app.config import settings

_fernet = Fernet(settings.fernet_key_bytes)


def encrypt(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()
