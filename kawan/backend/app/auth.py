"""Sign in with Chutes (SIWC) — OAuth2 Authorization Code + PKCE S256 against
api.chutes.ai/idp/* (spec §9.4, TR-49/76; host confirmed by the platform reference
and the S1 spike). The backend handles the callback directly; tokens are encrypted
at rest (Fernet) and never reach the browser. Inference bills to the signed-in user
(TR-52): app/auth.AuthTokenProvider hands Lane C's Chutes client a fresh token.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import timedelta

import httpx
from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crypto import decrypt, encrypt
from app.db import SessionLocal
from app.models import User
from app.util import now_utc

GUEST_USER_ID = "guest"
_REFRESH_SKEW = timedelta(seconds=60)


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:100]  # 43–128 chars (TR-76)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def build_authorize_url(request: Request) -> str:
    """Stash verifier+state in the (pre-auth) session, return the IdP authorize URL."""
    verifier, challenge = _pkce_pair()
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    request.session["code_verifier"] = verifier
    params = {
        "response_type": "code",
        "client_id": settings.siwc_client_id,
        "redirect_uri": settings.siwc_redirect_uri,
        "scope": settings.siwc_scopes,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    return str(httpx.URL(settings.idp_authorize_url, params=params))


async def handle_callback(request: Request, code: str, state: str, db: AsyncSession) -> User:
    if not state or state != request.session.pop("oauth_state", None):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "state mismatch")
    verifier = request.session.pop("code_verifier", None)
    if not verifier:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "missing PKCE verifier")

    async with httpx.AsyncClient(timeout=60) as client:
        tok = await client.post(settings.idp_token_url, data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.siwc_redirect_uri,
            "client_id": settings.siwc_client_id,
            "client_secret": settings.siwc_client_secret,
            "code_verifier": verifier,
        })
        if tok.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"token exchange failed: {tok.text[:200]}")
        body = tok.json()
        if "access_token" not in body or "refresh_token" not in body:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "token response missing tokens")
        info = await client.get(settings.idp_userinfo_url,
                                headers={"Authorization": f"Bearer {body['access_token']}"})
        if info.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "userinfo failed")
        claims = info.json()

    uid = claims.get("user_id") or claims.get("sub")
    if not uid:  # never attach a session to a synthesized "None" user
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "userinfo missing subject")
    uid = str(uid)
    username = claims.get("username") or claims.get("preferred_username") or claims.get("name") or uid
    user = await _upsert_user(db, uid, username, body)
    request.session["user_id"] = uid
    return user


async def _upsert_user(db: AsyncSession, uid: str, username: str, token_body: dict) -> User:
    expiry = now_utc() + timedelta(seconds=int(token_body.get("expires_in", 3600)))
    user = await db.get(User, uid)
    if user is None:
        user = User(id=uid, username=username, access_token="", refresh_token="", token_expiry=expiry)
        db.add(user)
    user.username = username
    user.access_token = encrypt(token_body["access_token"])
    user.refresh_token = encrypt(token_body["refresh_token"])
    user.token_expiry = expiry
    await db.commit()
    return user


async def refresh_tokens(db: AsyncSession, user: User) -> str:
    """Exchange the stored refresh token for a fresh access token (TR-54)."""
    async with httpx.AsyncClient(timeout=60) as client:
        tok = await client.post(settings.idp_token_url, data={
            "grant_type": "refresh_token",
            "refresh_token": decrypt(user.refresh_token),
            "client_id": settings.siwc_client_id,
            "client_secret": settings.siwc_client_secret,
        })
    if tok.status_code != 200:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "refresh failed — re-auth required")
    body = tok.json()
    user.access_token = encrypt(body["access_token"])
    if body.get("refresh_token"):
        user.refresh_token = encrypt(body["refresh_token"])
    user.token_expiry = now_utc() + timedelta(seconds=int(body.get("expires_in", 3600)))
    await db.commit()
    return body["access_token"]


async def access_token_for(db: AsyncSession, user: User) -> str:
    """Decrypt; refresh first if within the expiry skew (TR-29)."""
    if user.id == GUEST_USER_ID:
        return settings.chutes_api_key  # guest inference uses the team cpk_ key (TR-53)
    from app.util import as_utc
    if as_utc(user.token_expiry) <= now_utc() + _REFRESH_SKEW:
        return await refresh_tokens(db, user)
    return decrypt(user.access_token)


async def ensure_guest_user(db: AsyncSession) -> User:
    user = await db.get(User, GUEST_USER_ID)
    if user is None:
        user = User(id=GUEST_USER_ID, username="Guest (cpk_)", persona="kawan",
                    access_token="", refresh_token="", token_expiry=now_utc() + timedelta(days=3650))
        db.add(user)
        await db.commit()
    return user


class AuthTokenProvider:
    """Implements contracts.TokenProvider for Lane C's Chutes client. Opens its own
    DB sessions so the client can fetch/refresh a user token without a request scope."""

    async def get_access_token(self, user_id: str) -> str:
        async with SessionLocal() as db:
            user = await db.get(User, user_id)
            if user is None:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
            return await access_token_for(db, user)

    async def refresh(self, user_id: str) -> str:
        async with SessionLocal() as db:
            user = await db.get(User, user_id)
            if user is None:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
            return await refresh_tokens(db, user)
