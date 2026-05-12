"""
Database: SQLite via SQLAlchemy.
Week 3: adds semantic score columns and get_run_by_id().
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)
Base = declarative_base()


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    analysis_id         = Column(String, primary_key=True)
    created_at          = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    prompt_version      = Column(String, nullable=False)
    llm_model           = Column(String, nullable=False)
    overall_score       = Column(Integer, nullable=False)
    skills_score        = Column(Integer, nullable=False)
    experience_score    = Column(Integer, nullable=False)
    keywords_score      = Column(Integer, nullable=False)
    processing_time_ms  = Column(Integer, nullable=False)
    score_reasoning     = Column(Text, nullable=False)
    report_json         = Column(Text, nullable=False)
    # Week 3: semantic scores (nullable — user can opt out with include_semantic=False)
    semantic_score      = Column(Integer, nullable=True)
    semantic_raw_cosine = Column(String, nullable=True)
    divergence_flag     = Column(String, nullable=True)
    divergence_pts      = Column(Integer, nullable=True)


_engine = None
_SessionLocal = None


def init_db(db_path: str = "resume_analyzer.db"):
    global _engine, _SessionLocal
    _engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)
    logger.info(f"Database ready: {db_path}")


def get_session():
    if _SessionLocal is None:
        raise RuntimeError("Database not initialised. Call init_db() first.")
    session = _SessionLocal()
    try:
        yield session
    finally:
        session.close()


def save_run(session, analysis_id: str, prompt_version: str, llm_model: str,
             report, processing_time_ms: int, semantic=None):
    run = AnalysisRun(
        analysis_id=analysis_id,
        prompt_version=prompt_version,
        llm_model=llm_model,
        overall_score=report.overall_score,
        skills_score=report.skills_score,
        experience_score=report.experience_score,
        keywords_score=report.keywords_score,
        processing_time_ms=processing_time_ms,
        score_reasoning=report.score_reasoning,
        report_json=report.model_dump_json(),
        semantic_score=semantic.semantic_score if semantic else None,
        semantic_raw_cosine=str(round(semantic.raw_cosine, 4)) if semantic else None,
        divergence_flag=semantic.divergence_flag if semantic else None,
        divergence_pts=semantic.divergence_pts if semantic else None,
    )
    session.add(run)
    session.commit()
    logger.info(f"Saved run {analysis_id[:8]} to database.")
    return run


def get_run_by_id(session, analysis_id: str):
    return session.query(AnalysisRun).filter(AnalysisRun.analysis_id == analysis_id).first()


def get_history(session, limit: int = 20, offset: int = 0):
    return (
        session.query(AnalysisRun)
        .order_by(AnalysisRun.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )