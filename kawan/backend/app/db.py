from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all models. Schema source of truth: kawan-spec.md §8.1 DDL (TR-71)."""


async def get_session():
    async with SessionLocal() as session:
        yield session
