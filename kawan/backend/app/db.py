from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# asyncpg + Supavisor transaction pooler requires prepared-statement caching disabled.
# Session pooler (5432) doesn't need it but the args are harmless there too.
# SQLite path gets no extra args — aiosqlite doesn't accept them.
_connect_args = (
    {'statement_cache_size': 0, 'prepared_statement_cache_size': 0}
    if settings.database_url.startswith('postgresql+asyncpg')
    else {}
)

engine = create_async_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all models. Schema source of truth: kawan-spec.md §8.1 DDL (TR-71)."""


async def get_session():
    async with SessionLocal() as session:
        yield session
