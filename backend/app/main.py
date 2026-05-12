"""FastAPI entrypoint. Run with: uvicorn app.main:app --reload"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.api.analyse import router as analyse_router, limiter
from app.services.tracker import setup_mlflow
from app.core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Resume Analyzer API...")
    setup_mlflow()
    init_db()
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="AI Resume & Job Match Analyzer",
    description="LLM-powered resume scoring with semantic similarity and MLflow tracking.",
    version="0.4.0",
    lifespan=lifespan,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyse_router)


@app.get("/")
def root():
    return {"message": "Resume Analyzer API v0.4.0", "docs": "/docs", "health": "/analyse/health"}
