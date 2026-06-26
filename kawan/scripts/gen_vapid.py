"""D3 ops: generate a VAPID keypair for Web Push and print the env vars the backend
reads. Web Push stays dark until these are set; once set, delivery lights up for the
Settings opt-in (NOT a scripted demo beat — in-app + email is the X-NOTIF baseline).

    cd kawan
    uv --project backend run python scripts/gen_vapid.py

Then paste the three values into Render (backend service env) AND kawan/.env (local dev)
and redeploy. The keypair is the universal VAPID format (same as npm
`web-push generate-vapid-keys`): base64url raw private value + base64url uncompressed
public point — exactly what app/push.py (pywebpush) and the service worker expect.
"""

import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


priv = ec.generate_private_key(ec.SECP256R1())
private_key = b64url(priv.private_numbers().private_value.to_bytes(32, "big"))
public_key = b64url(priv.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint))

# Best-effort: confirm the installed pywebpush/py_vapid actually loads this private key.
note = ""
try:
    from py_vapid import Vapid01

    Vapid01.from_string(private_key=private_key)
    note = "  (verified loadable by py_vapid)"
except Exception as exc:  # noqa: BLE001 - self-check is advisory; the format is still standard
    note = f"  (skipped py_vapid self-check: {type(exc).__name__})"

print(f"# VAPID keypair for Kawan Web Push{note}")
print("# Set all three in Render (backend env) AND kawan/.env (local dev), then redeploy.\n")
print(f"KAWAN_VAPID_PUBLIC_KEY={public_key}")
print(f"KAWAN_VAPID_PRIVATE_KEY={private_key}")
print("KAWAN_VAPID_SUBJECT=mailto:you@yourdomain.com   # any contact mailto: or https URL\n")
print("# The frontend fetches the public key at runtime via GET /api/push/vapid-public-key")
print("# (no rebuild needed). app/push.py activates once the private key is present; with no")
print("# keys it silently no-ops, so leaving these unset is safe.")
