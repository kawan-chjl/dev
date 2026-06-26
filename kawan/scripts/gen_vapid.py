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

# Confirm the installed pywebpush/py_vapid actually loads this key. A missing py_vapid
# is just a skipped advisory; a LOAD failure means the key is bad — abort before printing
# deployable env vars that app/push.py would then fail on at runtime.
note = ""
try:
    from py_vapid import Vapid01
except ModuleNotFoundError:
    note = "  (py_vapid not installed — self-check skipped)"
else:
    Vapid01.from_string(private_key=private_key)  # raises -> aborts; no bad keys printed
    note = "  (verified loadable by py_vapid)"

print(f"# VAPID keypair for Kawan Web Push{note}")
print("# Set all three in Render (backend env) AND kawan/.env (local dev), then redeploy.\n")
print(f"KAWAN_VAPID_PUBLIC_KEY={public_key}")
print(f"KAWAN_VAPID_PRIVATE_KEY={private_key}")
print("# KAWAN_VAPID_SUBJECT may be any contact mailto: or https URL")
print("KAWAN_VAPID_SUBJECT=mailto:you@yourdomain.com\n")
print("# The frontend fetches the public key at runtime via GET /api/push/vapid-public-key")
print("# (no rebuild needed). app/push.py activates once the private key is present; with no")
print("# keys it silently no-ops, so leaving these unset is safe.")
