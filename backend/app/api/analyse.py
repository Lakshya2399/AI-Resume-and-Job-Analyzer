"""
API Router: /analyse — Week 4 updated.

Week 4 additions:
- Rate limiting via slowapi (10 analyses/min per IP)
- GET /analyse/{analysis_id} — full run detail
- GET /analyse/metrics — aggregate stats across all runs
- Richer /history response including semantic + divergence fields
"""

import uuid
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import AnalysisResponse, AnalysisRequest, SemanticResult
from app.services.parser import preprocess_resume
from app.services.scorer import score_match
from app.services.embeddings import semantic_match_score, score_divergence
from app.services.tracker import log_analysis_run
from app.core.database import get_session, save_run, get_history, get_run_by_id, AnalysisRun
from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyse", tags=["analyse"])

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)

# Thread pool for running blocking (CPU/IO) tasks off the async event loop
_executor = ThreadPoolExecutor(max_workers=2)


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/metrics")
def metrics(db: Session = Depends(get_session)):
    """
    Aggregate statistics across all stored runs.
    Powers the dashboard header cards in the React frontend.
    """
    runs = db.query(AnalysisRun).all()
    if not runs:
        return {
            "total_runs": 0,
            "avg_overall_score": None,
            "avg_processing_time_ms": None,
            "avg_semantic_score": None,
            "repair_rate_pct": None,
            "prompt_version_breakdown": {},
        }

    total = len(runs)
    avg_score = round(sum(r.overall_score for r in runs) / total, 1)
    avg_time = round(sum(r.processing_time_ms for r in runs) / total)
    semantic_runs = [r for r in runs if r.semantic_score is not None]
    avg_semantic = round(sum(r.semantic_score for r in semantic_runs) / len(semantic_runs), 1) if semantic_runs else None

    prompt_breakdown = {}
    for r in runs:
        prompt_breakdown[r.prompt_version] = prompt_breakdown.get(r.prompt_version, 0) + 1

    return {
        "total_runs": total,
        "avg_overall_score": avg_score,
        "avg_processing_time_ms": avg_time,
        "avg_semantic_score": avg_semantic,
        "prompt_version_breakdown": prompt_breakdown,
    }


@router.get("/history")
def history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_session),
):
    """Return recent analysis runs, newest first. Includes semantic fields."""
    runs: List[AnalysisRun] = get_history(db, limit=limit, offset=offset)
    return [
        {
            "analysis_id":        r.analysis_id,
            "created_at":         r.created_at,
            "prompt_version":     r.prompt_version,
            "llm_model":          r.llm_model,
            "overall_score":      r.overall_score,
            "skills_score":       r.skills_score,
            "experience_score":   r.experience_score,
            "keywords_score":     r.keywords_score,
            "processing_time_ms": r.processing_time_ms,
            "semantic_score":     r.semantic_score,
            "divergence_flag":    r.divergence_flag,
            "divergence_pts":     r.divergence_pts,
        }
        for r in runs
    ]


@router.get("/history/{analysis_id}")
def history_detail(analysis_id: str, db: Session = Depends(get_session)):
    """Return full stored report JSON for a single past run."""
    run = get_run_by_id(db, analysis_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {analysis_id} not found.")
    import json
    return {
        "analysis_id":        run.analysis_id,
        "created_at":         run.created_at,
        "prompt_version":     run.prompt_version,
        "llm_model":          run.llm_model,
        "overall_score":      run.overall_score,
        "skills_score":       run.skills_score,
        "experience_score":   run.experience_score,
        "keywords_score":     run.keywords_score,
        "processing_time_ms": run.processing_time_ms,
        "score_reasoning":    run.score_reasoning,
        "report":             json.loads(run.report_json),
        "semantic_score":     run.semantic_score,
        "semantic_raw_cosine": run.semantic_raw_cosine,
        "divergence_flag":    run.divergence_flag,
        "divergence_pts":     run.divergence_pts,
    }


@router.post("/upload", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyse_pdf(
    request: Request,
    resume_pdf: UploadFile = File(...),
    job_description: str = Form(...),
    prompt_version: str = Form(default="v1"),
    include_semantic: bool = Form(default=True),
    db: Session = Depends(get_session),
):
    if not resume_pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await resume_pdf.read()
    try:
        parsed = preprocess_resume(pdf_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    analysis_id = str(uuid.uuid4())
    return await _run_analysis(
        analysis_id, parsed["full_text"], job_description,
        prompt_version, include_semantic, db
    )


@router.post("/text", response_model=AnalysisResponse)
@limiter.limit("10/minute")
async def analyse_text(
    request: Request,
    body: AnalysisRequest,
    db: Session = Depends(get_session),
):
    analysis_id = str(uuid.uuid4())
    return await _run_analysis(
        analysis_id, body.resume_text, body.job_description,
        body.prompt_version, body.include_semantic, db
    )


async def _run_analysis(analysis_id, resume_text, job_description,
                        prompt_version, include_semantic, db):
    """
    Run LLM scoring and semantic similarity concurrently.
    Both are blocking functions run in a thread pool and awaited together
    with asyncio.gather — saving ~1-2s on every request.
    """
    settings = get_settings()
    loop = asyncio.get_event_loop()

    llm_task = loop.run_in_executor(
        _executor,
        lambda: score_match(resume_text, job_description, prompt_version)
    )

    if include_semantic:
        semantic_task = loop.run_in_executor(
            _executor,
            lambda: semantic_match_score(resume_text, job_description)
        )
        try:
            (report, elapsed, meta), semantic_raw = await asyncio.gather(
                llm_task, semantic_task
            )
        except ValueError as e:
            raise HTTPException(status_code=502, detail=str(e))
    else:
        try:
            report, elapsed, meta = await llm_task
        except ValueError as e:
            raise HTTPException(status_code=502, detail=str(e))
        semantic_raw = None

    processing_time_ms = int(elapsed * 1000)

    semantic_result = None
    if semantic_raw:
        divergence = score_divergence(report.overall_score, semantic_raw["semantic_score"])
        semantic_result = SemanticResult(
            semantic_score=semantic_raw["semantic_score"],
            raw_cosine=semantic_raw["raw_cosine"],
            interpretation=semantic_raw["interpretation"],
            top_resume_chunks=semantic_raw["top_resume_chunks"],
            divergence_flag=divergence["divergence_flag"],
            divergence_note=divergence["divergence_note"],
            divergence_pts=divergence["divergence_pts"],
        )

    try:
        save_run(db, analysis_id, prompt_version, settings.llm_model,
                 report, processing_time_ms, semantic=semantic_result)
    except Exception as e:
        logger.warning(f"DB save failed (non-fatal): {e}")

    log_analysis_run(
        analysis_id=analysis_id,
        prompt_version=prompt_version,
        llm_model=settings.llm_model,
        report=report,
        processing_time_ms=processing_time_ms,
        attempts=meta["attempts"],
        was_repaired=meta["was_repaired"],
        semantic_score=semantic_result.semantic_score if semantic_result else None,
        divergence_pts=semantic_result.divergence_pts if semantic_result else None,
    )

    return AnalysisResponse(
        analysis_id=analysis_id,
        report=report,
        semantic=semantic_result,
        prompt_version=prompt_version,
        llm_model=settings.llm_model,
        processing_time_ms=processing_time_ms,
    )

