"""SIWC auth + guest + email/password endpoints (spec §7.5). The backend handles
the OAuth callback directly and only ever sets an HttpOnly session cookie — tokens
stay server-side. Email/password is a PO-authorized spec deviation (see CONTEXT.md)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app import auth
from app.config import settings
from app.db import get_session
from app.deps import current_user
from app.models import User
from app.schemas import LoginIn, RegisterIn

router = APIRouter(prefix="/auth")


@router.api_route("/siwc/login", methods=["GET", "POST"])
async def siwc_login(request: Request):
    # A browser navigates here (GET link) or the SPA POSTs; 303 → the IdP authorize URL
    # is always fetched with GET (a 307 would re-issue the method to the IdP and break it).
    return RedirectResponse(auth.build_authorize_url(request), status_code=303)


@router.get("/siwc/callback")
async def siwc_callback(request: Request, code: str = "", state: str = "", db: AsyncSession = Depends(get_session)):
    await auth.handle_callback(request, code, state, db)
    return RedirectResponse(settings.frontend_post_login_redirect, status_code=303)


@router.post("/siwc/refresh")
async def siwc_refresh(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    await auth.refresh_tokens(db, user)
    return {"ok": True}


@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.post("/guest")
async def guest(request: Request, db: AsyncSession = Depends(get_session)):
    """Visibly-labelled cpk_ fallback (TR-53). Never the demoed path."""
    await auth.ensure_guest_user(db)
    request.session["user_id"] = auth.GUEST_USER_ID
    return {"ok": True, "guest": True}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, request: Request, db: AsyncSession = Depends(get_session)):
    """Create an email/password user and auto-login (no separate verify step — hackathon scope).
    409 on duplicate email; 422 on validation failure (short password, bad email).
    Security note: email verification and rate-limiting are known gaps; flag for post-hackathon."""
    try:
        user = await auth.create_email_user(db, body.email, body.password)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
    request.session["user_id"] = user.id
    return {"ok": True, "guest": False}


@router.post("/login")
async def login(body: LoginIn, request: Request, db: AsyncSession = Depends(get_session)):
    """Verify email/password and set the session cookie. 401 on bad credentials."""
    user = await auth.get_user_by_email(db, body.email)
    if user is None or user.password_hash is None or not auth.verify_password(user.password_hash, body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong email or password")
    request.session["user_id"] = user.id
    return {"ok": True, "guest": False}
