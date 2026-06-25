"""SIWC auth + guest endpoints (spec §7.5). The backend handles the OAuth callback
directly and only ever sets an HttpOnly session cookie — tokens stay server-side."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import auth
from app.config import settings
from app.db import get_session
from app.deps import current_user
from app.models import User

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


