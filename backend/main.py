from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from database import DB_PATH, init_db
from models import HealthResponse
from routers import alerts, ingest, metrics, prompts, traces, ws as ws_router

STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="CortexAI — Observability & Monitoring",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All API routes under /api/* — must be registered BEFORE the static-files mount.
app.include_router(ingest.router,  prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(traces.router,  prefix="/api")
app.include_router(prompts.router, prefix="/api")
app.include_router(alerts.router,  prefix="/api")
app.include_router(ws_router.router)   # /ws/live-feed — no /api prefix


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health():
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            cursor = await db.execute("SELECT COUNT(*) FROM traces")
            row = await cursor.fetchone()
            traces_count = row[0] if row else 0
        db_status = "ok"
    except Exception:
        db_status = "error"
        traces_count = 0
    return HealthResponse(status="ok", db=db_status, traces_count=traces_count)


# Dev mode: no built frontend — redirect root to API docs.
if not STATIC_DIR.exists():
    @app.get("/", include_in_schema=False)
    async def root():
        return RedirectResponse(url="/api/docs")

# Production mode (Docker / `npm run build` + uvicorn):
# 1. Serve /assets/* (hashed JS/CSS) as true static files.
# 2. Serve index.html for every other GET path so React Router handles SPA navigation.
#    This MUST be registered after all /api/* routes so those take priority.
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:  # noqa: ARG001
        return FileResponse(str(STATIC_DIR / "index.html"))
