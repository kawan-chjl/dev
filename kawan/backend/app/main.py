from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app import models  # noqa: F401 - registers all tables on Base.metadata before create_all
from app import scheduler as sched
from app.config import settings
from app.db import Base, engine
from app.routes import auth, commitments, me, push, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev convenience until proper migrations land.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sched.start()
    await sched.rebuild_from_db()  # restart resilience: jobs rebuilt from DB (TR-15)
    try:
        yield
    finally:
        sched.shutdown()


app = FastAPI(title="Kawan API", lifespan=lifespan)

# SessionMiddleware: HttpOnly signed cookie carrying user_id only (tokens stay server-side).
# same_site/https_only come from settings so local dev stays lax/insecure while prod uses
# none/secure (required for the cross-origin direct-WS handshake from Vercel to Render).
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    same_site=settings.cookie_samesite,
    https_only=settings.cookie_secure,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


for _router in (auth.router, commitments.router, me.router, push.router):
    app.include_router(_router, prefix="/api")
app.include_router(ws.router)  # WS at /ws (vite proxies it unprefixed)
