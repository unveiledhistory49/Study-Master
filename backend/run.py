"""Run the StudyMaster FastAPI server."""
import os
import uvicorn

if __name__ == "__main__":
    reload_server = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=reload_server,
    )
