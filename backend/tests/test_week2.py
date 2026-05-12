"""
Week 2 tests — covers:
- Input preprocessor
- JSON repair utilities
- Retry logic in scorer
- Full stack integration test (mocked LLM)
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.preprocessor import (
    fix_encoding, fix_hyphenated_linebreaks,
    normalise_whitespace, preprocess_resume_text, preprocess_jd_text,
)
from app.core.repair import extract_json_from_text, fill_missing_fields, repair_and_parse
from app.models.schemas import MatchReport, SkillGap, BulletImprovement


# ---------------------------------------------------------------------------
# Preprocessor tests
# ---------------------------------------------------------------------------

class TestPreprocessor:
    def test_fix_encoding_removes_control_chars(self):
        dirty = "Python developer\x00\x01\x08 at TechCorp"
        clean = fix_encoding(dirty)
        assert "\x00" not in clean
        assert "Python developer" in clean

    def test_fix_encoding_normalises_smart_quotes(self):
        text = "\u201cSenior Engineer\u201d with 5 years\u2019 experience"
        result = fix_encoding(text)
        assert '"Senior Engineer"' in result
        assert "years'" in result

    def test_fix_encoding_normalises_bullets(self):
        text = "\u2022 Built APIs\n\u2022 Led team"
        result = fix_encoding(text)
        assert "\u2022" not in result
        assert "Built APIs" in result

    def test_fix_hyphenated_linebreaks(self):
        text = "pro-\ngramming experience in Python"
        result = fix_hyphenated_linebreaks(text)
        assert "programming" in result
        assert "-\n" not in result

    def test_normalise_whitespace_collapses_spaces(self):
        text = "Python   developer    at   TechCorp"
        result = normalise_whitespace(text)
        assert "  " not in result

    def test_normalise_whitespace_collapses_blank_lines(self):
        text = "Section 1\n\n\n\n\nSection 2"
        result = normalise_whitespace(text)
        assert "\n\n\n" not in result
        assert "Section 1" in result
        assert "Section 2" in result

    def test_truncation_applied_at_limit(self):
        long_text = "x" * 10000
        result = preprocess_resume_text(long_text)
        assert len(result) <= 6000

    def test_short_text_not_truncated(self):
        short = "Python developer with FastAPI experience."
        result = preprocess_resume_text(short)
        assert result == short.strip()

    def test_jd_truncated_at_3000(self):
        long_jd = "y" * 5000
        result = preprocess_jd_text(long_jd)
        assert len(result) <= 3000

    def test_full_pipeline_cleans_messy_input(self):
        messy = "  Pro-\ngramming with \u2022 Python\x00\n\n\n\nFastAPI experience  "
        result = preprocess_resume_text(messy)
        assert "\x00" not in result
        assert "-\n" not in result
        assert "  " not in result


# ---------------------------------------------------------------------------
# Repair utility tests
# ---------------------------------------------------------------------------

class TestRepair:
    def test_clean_json_passes_directly(self):
        raw = '{"overall_score": 75, "score_reasoning": "Good match."}'
        result = extract_json_from_text(raw)
        assert result["overall_score"] == 75

    def test_strips_markdown_fences(self):
        raw = '```json\n{"overall_score": 80}\n```'
        result = extract_json_from_text(raw)
        assert result["overall_score"] == 80

    def test_strips_plain_fences(self):
        raw = '```\n{"overall_score": 65}\n```'
        result = extract_json_from_text(raw)
        assert result["overall_score"] == 65

    def test_extracts_json_from_preamble(self):
        raw = 'Sure! Here is my analysis:\n{"overall_score": 70, "score_reasoning": "ok"}'
        result = extract_json_from_text(raw)
        assert result["overall_score"] == 70

    def test_returns_none_for_pure_prose(self):
        raw = "The candidate is a strong match for this role based on their Python experience."
        result = extract_json_from_text(raw)
        assert result is None

    def test_fill_missing_fields_adds_defaults(self):
        partial = {"overall_score": 70, "score_reasoning": "Good."}
        filled, repaired = fill_missing_fields(partial)
        assert repaired is True
        assert "skill_gaps" in filled
        assert "strengths" in filled
        assert isinstance(filled["skill_gaps"], list)

    def test_fill_missing_fields_no_repair_if_complete(self):
        complete = {
            "overall_score": 70,
            "score_reasoning": "Good.",
            "skill_gaps": [],
            "bullet_improvements": [],
            "matched_keywords": [],
            "missing_keywords": [],
            "strengths": ["Python", "FastAPI"],
            "skills_score": 70,
            "experience_score": 70,
            "keywords_score": 70,
        }
        _, repaired = fill_missing_fields(complete)
        assert repaired is False

    def test_repair_and_parse_succeeds_on_fenced_json(self):
        raw = '```json\n{"overall_score": 72, "score_reasoning": "Good match.", "skills_score": 75, "experience_score": 70, "keywords_score": 68, "strengths": ["Python", "FastAPI"], "skill_gaps": [], "bullet_improvements": [], "matched_keywords": ["Python"], "missing_keywords": ["MLflow"]}\n```'
        data, was_repaired = repair_and_parse(raw)
        assert data["overall_score"] == 72

    def test_repair_and_parse_raises_on_pure_prose(self):
        with pytest.raises(ValueError, match="Could not extract JSON"):
            repair_and_parse("This candidate looks great for the role!")

    def test_fills_missing_bullet_reason(self):
        """Mistral sometimes omits 'reason' from bullet_improvements."""
        data = {
            "overall_score": 70,
            "score_reasoning": "Good match.",
            "skills_score": 70, "experience_score": 70, "keywords_score": 70,
            "strengths": ["Python", "FastAPI"],
            "skill_gaps": [],
            "matched_keywords": [], "missing_keywords": [],
            "bullet_improvements": [
                {"original": "Built APIs.", "improved": "Built FastAPI microservices."}
                # missing 'reason'
            ],
        }
        filled, repaired = fill_missing_fields(data)
        assert repaired is True
        assert "reason" in filled["bullet_improvements"][0]
        assert filled["bullet_improvements"][0]["reason"] != ""

    def test_fills_missing_skill_gap_importance(self):
        """LLM sometimes uses invalid importance values or omits the field."""
        data = {
            "overall_score": 70,
            "score_reasoning": "Good.",
            "skills_score": 70, "experience_score": 70, "keywords_score": 70,
            "strengths": ["Python"],
            "matched_keywords": [], "missing_keywords": [],
            "bullet_improvements": [],
            "skill_gaps": [
                {"skill": "MLflow", "suggestion": "Learn it."}
                # missing 'importance'
            ],
        }
        filled, repaired = fill_missing_fields(data)
        assert repaired is True
        assert filled["skill_gaps"][0]["importance"] == "important"


# ---------------------------------------------------------------------------
# Retry logic test
# ---------------------------------------------------------------------------

class TestRetryLogic:
    def test_retries_on_validation_error_then_succeeds(self):
        """Scorer should retry after a bad response and succeed on second attempt."""
        valid_output = {
            "overall_score": 78,
            "score_reasoning": "Strong Python skills.",
            "skills_score": 80,
            "experience_score": 75,
            "keywords_score": 72,
            "strengths": ["Python", "Docker"],
            "skill_gaps": [{"skill": "MLflow", "importance": "important", "suggestion": "Learn MLflow."}],
            "bullet_improvements": [{"original": "Worked on ML.", "improved": "Built XGBoost model.", "reason": "More specific."}],
            "matched_keywords": ["Python"],
            "missing_keywords": ["MLflow"],
        }

        call_count = 0
        def mock_invoke(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return "Sorry, I cannot complete that request."  # bad first response
            return str(valid_output).replace("'", '"')           # valid second response

        with patch("app.services.scorer.build_chain") as mock_build:
            mock_chain = MagicMock()
            mock_chain.invoke.side_effect = mock_invoke
            mock_build.return_value = mock_chain

            with patch("app.services.scorer.repair_and_parse") as mock_repair:
                # First call raises, second returns valid data
                mock_repair.side_effect = [
                    ValueError("no JSON found"),
                    (valid_output, False),
                ]
                with patch("app.services.scorer.preprocess_resume_text", side_effect=lambda x: x):
                    with patch("app.services.scorer.preprocess_jd_text", side_effect=lambda x: x):
                        from app.services.scorer import score_match
                        report, elapsed, meta = score_match("resume text", "jd text", max_retries=3)
                        assert meta["attempts"] == 2
                        assert report.overall_score == 78

    def test_exhausted_retries_raise_value_error(self):
        """After all retries fail, scorer should raise ValueError."""
        with patch("app.services.scorer.build_chain") as mock_build:
            mock_chain = MagicMock()
            mock_chain.invoke.return_value = "Pure prose, no JSON here."
            mock_build.return_value = mock_chain

            with patch("app.services.scorer.repair_and_parse") as mock_repair:
                mock_repair.side_effect = ValueError("no JSON")
                with patch("app.services.scorer.preprocess_resume_text", side_effect=lambda x: x):
                    with patch("app.services.scorer.preprocess_jd_text", side_effect=lambda x: x):
                        from app.services.scorer import score_match
                        with pytest.raises(ValueError, match="Scoring failed after"):
                            score_match("resume", "jd", max_retries=2)


# ---------------------------------------------------------------------------
# Full stack integration test
# ---------------------------------------------------------------------------

class TestIntegration:
    def test_analyse_text_endpoint_full_stack(self):
        """
        Fire a real HTTP request through the full stack with a mocked LLM.
        Tests: routing → validation → scorer → DB save → MLflow → response schema.
        """
        valid_report = {
            "overall_score": 82,
            "score_reasoning": "Strong candidate with most required skills.",
            "skills_score": 85,
            "experience_score": 80,
            "keywords_score": 78,
            "strengths": ["Python", "FastAPI", "Docker"],
            "skill_gaps": [{"skill": "LangChain", "importance": "critical", "suggestion": "Build a LangChain project."}],
            "bullet_improvements": [{"original": "Worked on APIs.", "improved": "Built FastAPI microservices.", "reason": "More specific."}],
            "matched_keywords": ["Python", "FastAPI"],
            "missing_keywords": ["LangChain", "MLflow"],
        }

        with patch("app.services.scorer.build_chain") as mock_build, \
             patch("app.services.scorer.repair_and_parse", return_value=(valid_report, False)), \
             patch("app.services.scorer.preprocess_resume_text", side_effect=lambda x: x), \
             patch("app.services.scorer.preprocess_jd_text", side_effect=lambda x: x), \
             patch("app.services.tracker.mlflow") as mock_mlflow, \
             patch("app.core.database.save_run"):

            mock_chain = MagicMock()
            mock_chain.invoke.return_value = "{}"
            mock_build.return_value = mock_chain

            mock_mlflow.start_run.return_value.__enter__ = MagicMock(return_value=None)
            mock_mlflow.start_run.return_value.__exit__ = MagicMock(return_value=False)

            from fastapi.testclient import TestClient
            from app.main import app
            client = TestClient(app)

            response = client.post("/analyse/text", json={
                "resume_text": "Python developer with 3 years FastAPI and Docker experience. " * 5,
                "job_description": "Senior ML Engineer. Required: Python, LangChain, FastAPI, Docker, MLflow.",
                "prompt_version": "v1",
                "include_semantic": False,
            })

            assert response.status_code == 200
            data = response.json()
            assert "analysis_id" in data
            assert "report" in data
            assert data["report"]["overall_score"] == 82
            assert data["prompt_version"] == "v1"
            assert data["processing_time_ms"] >= 0

    def test_analyse_text_rejects_short_resume(self):
        """Resume text under 100 chars should return HTTP 422."""
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)

        response = client.post("/analyse/text", json={
            "resume_text": "Too short.",
            "job_description": "Senior ML Engineer role requiring Python.",
            "prompt_version": "v1",
            "include_semantic": False,
        })
        assert response.status_code == 422

    def test_health_endpoint(self):
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)
        response = client.get("/analyse/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"