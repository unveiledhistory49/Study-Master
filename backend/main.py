import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, close_db
from app.api import auth, subjects, topics, concepts, profile, chat
from app.services.ai_service import ai_service
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting StudyMaster API...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down StudyMaster API...")
    await ai_service.close()
    await close_db()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="StudyMaster API",
    description="AI-powered learning platform for UTME exam preparation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(concepts.router)
app.include_router(profile.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {
        "name": "StudyMaster API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
