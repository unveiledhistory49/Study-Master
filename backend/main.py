import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import init_db, close_db
from app.seed import seed_database
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
    await seed_database()
    logger.info("Database initialized and seeded.")
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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(concepts.router)
app.include_router(profile.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "StudyMaster"}


# SPA Static Hosting
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Let API routes 404 naturally if unmatched
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found")

        file_path = frontend_dist / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "name": "StudyMaster API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs",
        }
