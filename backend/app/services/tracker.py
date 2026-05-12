"""Service: MLflow experiment tracking — Week 3 updated."""

import logging
from typing import Optional
import mlflow
from app.core.config import get_settings
from app.models.schemas import MatchReport

logger = logging.getLogger(__name__)


def setup_mlflow():
    settings = get_settings()
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    try:
        mlflow.set_experiment(settings.mlflow_experiment_name)
        logger.info(f"MLflow tracking to: {settings.mlflow_tracking_uri}")
    except Exception as e:
        logger.error(f"MLflow setup failed — runs will not be tracked: {e}")
        logger.error("Fix: delete mlflow.db and restart, or set MLFLOW_TRACKING_URI=./mlruns in .env")


def log_analysis_run(
    analysis_id: str,
    prompt_version: str,
    llm_model: str,
    report: MatchReport,
    processing_time_ms: int,
    malformed: bool = False,
    attempts: int = 1,
    was_repaired: bool = False,
    semantic_score: Optional[int] = None,
    divergence_pts: Optional[int] = None,
):
    try:
        with mlflow.start_run(run_name=f"analysis-{analysis_id[:8]}"):
            mlflow.log_params({
                "prompt_version": prompt_version,
                "llm_model": llm_model,
                "analysis_id": analysis_id,
            })
            metrics = {
                "overall_score":          report.overall_score,
                "skills_score":           report.skills_score,
                "experience_score":       report.experience_score,
                "keywords_score":         report.keywords_score,
                "processing_time_ms":     processing_time_ms,
                "skill_gaps_count":       len(report.skill_gaps),
                "missing_keywords_count": len(report.missing_keywords),
                "matched_keywords_count": len(report.matched_keywords),
                "malformed_response":     int(malformed),
                "attempts":               attempts,
                "was_repaired":           int(was_repaired),
            }
            # Week 3: log semantic scores when available
            if semantic_score is not None:
                metrics["semantic_score"] = semantic_score
            if divergence_pts is not None:
                metrics["divergence_pts"] = divergence_pts

            mlflow.log_metrics(metrics)
            mlflow.set_tags({"prompt_version": prompt_version, "environment": "development"})

        logger.info(f"MLflow run logged for {analysis_id[:8]}")
    except Exception as e:
        logger.warning(f"MLflow logging failed (non-fatal): {e}")
        logger.warning("To fix: delete mlflow.db and restart, or set MLFLOW_TRACKING_URI=./mlruns in .env")