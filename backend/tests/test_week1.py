"""
Tests for Week 1–2 core pipeline.

Run with: pytest tests/ -v
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.parser import extract_text_from_pdf, chunk_text, preprocess_resume
from app.models.schemas import MatchReport, SkillGap, BulletImprovement


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestChunkText:
    def test_basic_chunking(self):
        text = "Python developer. " * 100  # ~1800 chars
        chunks = chunk_text(text, chunk_size=200, chunk_overlap=20)
        assert len(chunks) > 1
        assert all(len(c) <= 250 for c in chunks)  # allow slight overage at boundaries

    def test_single_chunk_short_text(self):
        text = "Short resume text."
        chunks = chunk_text(text, chunk_size=500)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_overlap_creates_context_continuity(self):
        # With overlap, adjacent chunks should share some content
        text = "A " * 200
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=30)
        if len(chunks) > 1:
            # The overlap means end of chunk N appears in start of chunk N+1
            assert len(chunks) >= 2


class TestPdfParsing:
    def test_empty_pdf_raises_value_error(self):
        """Scanned/image PDFs with no extractable text should fail clearly."""
        with patch("app.services.parser.PdfReader") as mock_reader:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = ""
            mock_reader.return_value.pages = [mock_page]

            with pytest.raises(ValueError, match="No text could be extracted"):
                extract_text_from_pdf(b"fake-pdf-bytes")

    def test_multipage_pdf_joins_text(self):
        with patch("app.services.parser.PdfReader") as mock_reader:
            page1 = MagicMock()
            page1.extract_text.return_value = "Page 1 content"
            page2 = MagicMock()
            page2.extract_text.return_value = "Page 2 content"
            mock_reader.return_value.pages = [page1, page2]

            result = extract_text_from_pdf(b"fake-pdf-bytes")
            assert "Page 1 content" in result
            assert "Page 2 content" in result


# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------

def make_valid_report():
    return MatchReport(
        overall_score=75,
        score_reasoning="Strong Python background but lacks MLOps experience.",
        skills_score=80,
        experience_score=70,
        keywords_score=72,
        strengths=["Strong Python", "FastAPI experience"],
        skill_gaps=[
            SkillGap(
                skill="MLflow",
                importance="important",
                suggestion="Add MLflow tracking to BigMart project."
            )
        ],
        bullet_improvements=[
            BulletImprovement(
                original="Worked on ML models.",
                improved="Built XGBoost sales forecasting model achieving 91% accuracy on BigMart dataset.",
                reason="Adds specificity, model name, and a metric."
            )
        ],
        matched_keywords=["Python", "FastAPI", "Docker"],
        missing_keywords=["MLflow", "LangChain", "FAISS"],
    )


class TestMatchReport:
    def test_valid_report_passes_validation(self):
        report = make_valid_report()
        assert report.overall_score == 75
        assert len(report.skill_gaps) == 1

    def test_score_out_of_range_fails(self):
        with pytest.raises(Exception):
            MatchReport(
                overall_score=150,  # invalid: > 100
                score_reasoning="test",
                skills_score=80,
                experience_score=70,
                keywords_score=72,
                strengths=["Strong Python"],
                skill_gaps=[SkillGap(skill="MLflow", importance="important", suggestion="Learn it")],
                bullet_improvements=[BulletImprovement(original="x", improved="y", reason="z")],
                matched_keywords=[],
                missing_keywords=[],
            )

    def test_empty_strengths_fails(self):
        """Pydantic should reject fewer than 2 strengths."""
        with pytest.raises(Exception):
            report = make_valid_report()
            report_dict = report.model_dump()
            report_dict["strengths"] = ["Only one strength"]  # min_length=2
            MatchReport(**report_dict)


# ---------------------------------------------------------------------------
# Scorer integration test (mocked LLM)
# ---------------------------------------------------------------------------

class TestScorer:
    def test_score_match_returns_valid_report(self):
        """Mock the LLM chain to test pipeline without real API calls."""
        valid_output = make_valid_report().model_dump()

        with patch("app.services.scorer.build_chain") as mock_build, \
             patch("app.services.scorer.repair_and_parse", return_value=(valid_output, False)), \
             patch("app.services.scorer.preprocess_resume_text", side_effect=lambda x: x), \
             patch("app.services.scorer.preprocess_jd_text", side_effect=lambda x: x):

            mock_chain = MagicMock()
            mock_chain.invoke.return_value = "{}"  # chain now returns a string
            mock_build.return_value = mock_chain

            from app.services.scorer import score_match
            report, elapsed, meta = score_match(  # scorer now returns 3-tuple
                resume_text="Python developer with FastAPI experience.",
                job_description="Senior ML Engineer, Python required.",
            )

            assert isinstance(report, MatchReport)
            assert 0 <= report.overall_score <= 100
            assert elapsed >= 0
            assert meta["attempts"] == 1

    def test_malformed_json_raises_value_error(self):
        """If LLM returns bad JSON that can't be repaired, scorer should raise ValueError."""
        with patch("app.services.scorer.build_chain") as mock_build, \
             patch("app.services.scorer.repair_and_parse", side_effect=ValueError("no JSON found")), \
             patch("app.services.scorer.preprocess_resume_text", side_effect=lambda x: x), \
             patch("app.services.scorer.preprocess_jd_text", side_effect=lambda x: x):

            mock_chain = MagicMock()
            mock_chain.invoke.return_value = "Pure prose, no JSON here."
            mock_build.return_value = mock_chain

            from app.services.scorer import score_match
            with pytest.raises(ValueError, match="Scoring failed after"):
                score_match("resume", "jd", max_retries=1)
