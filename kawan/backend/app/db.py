from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import settings

# asyncpg + Supavisor transaction pooler requires prepared-statement caching disabled.
# Session pooler (5432) doesn't need it but the args are harmless there too.
# In-memory SQLite (tests) needs StaticPool so one shared connection backs the whole
# app — otherwise every connect would get a fresh, empty database. check_same_thread
# lets aiosqlite's single connection cross executor threads.
_is_memory_sqlite = settings.database_url.startswith('sqlite') and ':memory:' in settings.database_url
if settings.database_url.startswith('postgresql+asyncpg'):
    _connect_args = {'statement_cache_size': 0, 'prepared_statement_cache_size': 0}
elif _is_memory_sqlite:
    _connect_args = {'check_same_thread': False}
else:
    _connect_args = {}

_engine_kwargs: dict = {'connect_args': _connect_args}
if _is_memory_sqlite:
    _engine_kwargs['poolclass'] = StaticPool

engine = create_async_engine(settings.database_url, **_engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all models. Schema source of truth: kawan-spec.md §8.1 DDL (TR-71)."""

    # All datetime values in the app are tz-aware UTC (util.now_utc). Map them to TIMESTAMP WITH
    # TIME ZONE so Postgres/asyncpg accepts aware datetimes — naive TIMESTAMP columns raise
    # "can't subtract offset-naive and offset-aware datetimes" on insert. SQLite ignores the flag.
    type_annotation_map = {datetime: DateTime(timezone=True)}


async def get_session():
    async with SessionLocal() as session:
        yield session
