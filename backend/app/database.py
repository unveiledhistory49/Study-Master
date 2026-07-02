from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Use the database URL from settings but resolve the path for SQLite
DATABASE_URL = settings.DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency that provides an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables in the database."""
    from app.models import (
        User, Subject, Topic, Concept, ConceptPrerequisite,
        StudentProfile, StudySession, ChatMessage, Conversation
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            from sqlalchemy import text
            # Add conversation_id to chat_messages if it doesn't exist. Ignored if it already exists or if using sqlite (since sqlite syntax varies)
            if not str(engine.url).startswith("sqlite"):
                await conn.execute(text("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE;"))
        except Exception:
            pass


async def close_db():
    """Dispose of the engine."""
    await engine.dispose()
