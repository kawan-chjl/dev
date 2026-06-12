"""Spike S1: SIWC round-trip (kawan-spec.md §12.2, Q1/Q4).

Flow: print authorize URL -> catch callback on :5173 -> PKCE token exchange ->
one gemma completion with the OAuth token against llm. AND lm. hosts ->
results to /tmp/s1_result.json. Human then verifies billing in the dashboard.
"""

import base64
import hashlib
import json
import secrets
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

import httpx

sys.path.insert(0, "backend")
from app.config import settings  # noqa: E402

VERIFIER = secrets.token_urlsafe(64)[:100]
CHALLENGE = base64.urlsafe_b64encode(hashlib.sha256(VERIFIER.encode()).digest()).rstrip(b"=").decode()
STATE = secrets.token_urlsafe(16)

env = dict(
    line.split("=", 1)
    for line in open(".env").read().splitlines()
    if "=" in line and not line.startswith("#")
)
CLIENT_ID = env["KAWAN_SIWC_CLIENT_ID"]
CLIENT_SECRET = env.get("KAWAN_SIWC_CLIENT_SECRET", "")

auth_url = "https://api.chutes.ai/idp/authorize?" + urllib.parse.urlencode({
    "response_type": "code",
    "client_id": CLIENT_ID,
    "redirect_uri": settings.siwc_redirect_uri,
    "scope": "chutes:invoke account:read",
    "state": STATE,
    "code_challenge": CHALLENGE,
    "code_challenge_method": "S256",
})
print(f"\n=== OPEN THIS IN YOUR BROWSER ===\n{auth_url}\n", flush=True)

result: dict = {}


class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" not in q:
            self.send_response(404)
            self.end_headers()
            return
        result["code"] = q["code"][0]
        result["state_ok"] = q.get("state", [""])[0] == STATE
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>Kawan S1: code captured - return to the terminal.</h1>")

    def log_message(self, *a):
        pass


server = HTTPServer(("127.0.0.1", 5173), CallbackHandler)
server.timeout = 600
print("Waiting up to 10 min for the OAuth callback on :5173 ...", flush=True)
while "code" not in result:
    server.handle_request()
server.server_close()
print(f"Code captured (state_ok={result['state_ok']}). Exchanging ...", flush=True)

tok = httpx.post("https://api.chutes.ai/idp/token", timeout=60, data={
    "grant_type": "authorization_code",
    "code": result["code"],
    "redirect_uri": settings.siwc_redirect_uri,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "code_verifier": VERIFIER,
})
print("token endpoint:", tok.status_code, flush=True)
tok_body = tok.json()
access = tok_body.get("access_token")
out = {"token_exchange": tok.status_code, "has_refresh": "refresh_token" in tok_body, "hosts": {}}

if access:
    H = {"Authorization": f"Bearer {access}"}
    for host in ["llm.chutes.ai", "lm.chutes.ai"]:
        try:
            r = httpx.post(f"https://{host}/v1/chat/completions", headers=H, timeout=120, json={
                "model": "google/gemma-4-31B-turbo-TEE",
                "messages": [{"role": "user", "content": "Reply with the word KAWAN"}],
                "max_tokens": 10,
            })
            content = r.json()["choices"][0]["message"]["content"] if r.status_code == 200 else r.text[:150]
            out["hosts"][host] = {"status": r.status_code, "reply": content}
        except Exception as e:  # noqa: BLE001 - spike: record any failure verbatim
            out["hosts"][host] = {"status": "error", "reply": str(e)}
    ui = httpx.get("https://api.chutes.ai/idp/userinfo", headers=H, timeout=30)
    out["userinfo"] = {"status": ui.status_code, "keys": list(ui.json().keys()) if ui.status_code == 200 else ui.text[:120]}
    me = httpx.get("https://api.chutes.ai/users/me", headers=H, timeout=30)
    out["users_me_with_oauth_token"] = me.status_code  # Q4: does chutes:invoke authorize balance display?
else:
    out["error"] = tok_body

json.dump(out, open("/tmp/s1_result.json", "w"), indent=2)
print(json.dumps(out, indent=2), flush=True)
