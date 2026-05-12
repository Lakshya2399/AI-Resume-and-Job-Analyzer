"""
Week 3 tests: FAISS semantic similarity layer.

Tests the embedding pipeline, FAISS index, cosine scoring,
and divergence detection without requiring Ollama or any LLM.
"""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock

from app.services.embeddings import build_faiss_index, score_divergence
from app.models.schemas import SemanticResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_fake_embeddings(n: int, dim: int = 384) -> np.ndarray:
    """Create unit-normalised random embeddings for testing."""
    rng = np.random.default_rng(42)
    vecs = rng.random((n, dim)).astype("float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / norms


# ---------------------------------------------------------------------------
# FAISS index tests
# ---------------------------------------------------------------------------

class TestFaissIndex:
    def test_index_builds_with_correct_size(self):
        embeddings = make_fake_embeddings(10)
        index = build_faiss_index(embeddings)
        assert index.ntotal == 10

    def test_search_returns_k_results(self):
        embeddings = make_fake_embeddings(20)
        index = build_faiss_index(embeddings)
        query = make_fake_embeddings(1)
        similarities, indices = index.search(query, k=5)
        assert similarities.shape == (1, 5)
        assert indices.shape == (1, 5)

    def test_search_returns_valid_indices(self):
        n = 15
        embeddings = make_fake_embeddings(n)
        index = build_faiss_index(embeddings)
        query = make_fake_embeddings(1)
        _, indices = index.search(query, k=5)
        for idx in indices[0]:
            assert 0 <= idx < n

    def test_identical_vector_scores_highest(self):
        """Querying with a vector that exists in the index should return it as #1."""
        embeddings = make_fake_embeddings(10)
        index = build_faiss_index(embeddings)
        query = embeddings[3:4]
        similarities, indices = index.search(query, k=1)
        assert indices[0][0] == 3
        assert abs(similarities[0][0] - 1.0) < 1e-4

    def test_similarity_scores_between_0_and_1(self):
        """Unit-normalised vectors should give IP scores in [0, 1]."""
        embeddings = make_fake_embeddings(10)
        index = build_faiss_index(embeddings)
        query = make_fake_embeddings(1)
        similarities, _ = index.search(query, k=5)
        for s in similarities[0]:
            assert -0.01 <= s <= 1.01  # allow tiny float error


# ---------------------------------------------------------------------------
# embed_texts tests (mocked model)
# ---------------------------------------------------------------------------

class TestEmbedTexts:
    def test_output_shape(self):
        fake = make_fake_embeddings(3)
        with patch("app.services.embeddings._get_model") as mock_fn:
            m = MagicMock()
            m.encode.return_value = fake
            mock_fn.return_value = m
            from app.services.embeddings import embed_texts
            result = embed_texts(["a", "b", "c"])
        assert result.shape == (3, 384)

    def test_output_dtype_is_float32(self):
        fake = make_fake_embeddings(2)
        with patch("app.services.embeddings._get_model") as mock_fn:
            m = MagicMock()
            m.encode.return_value = fake
            mock_fn.return_value = m
            from app.services.embeddings import embed_texts
            result = embed_texts(["a", "b"])
        assert result.dtype == np.float32


# ---------------------------------------------------------------------------
# semantic_match_score tests (mocked embeddings)
# ---------------------------------------------------------------------------

class TestSemanticMatchScore:
    def _mock_embed(self, texts):
        return make_fake_embeddings(len(texts))

    def test_returns_required_keys(self):
        with patch("app.services.embeddings.embed_texts", side_effect=self._mock_embed):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Python developer with FastAPI experience. " * 10,
                job_description="Senior ML Engineer. Python required.",
            )
        assert "semantic_score" in result
        assert "raw_cosine" in result
        assert "top_resume_chunks" in result
        assert "interpretation" in result

    def test_score_in_valid_range(self):
        with patch("app.services.embeddings.embed_texts", side_effect=self._mock_embed):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Python developer. " * 20,
                job_description="Python engineer needed.",
            )
        assert 0 <= result["semantic_score"] <= 100

    def test_top_chunks_max_3(self):
        with patch("app.services.embeddings.embed_texts", side_effect=self._mock_embed):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Python developer. " * 30,
                job_description="Python engineer needed.",
            )
        assert len(result["top_resume_chunks"]) <= 3

    def test_top_chunks_are_strings(self):
        with patch("app.services.embeddings.embed_texts", side_effect=self._mock_embed):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Data scientist. " * 20,
                job_description="ML Engineer role.",
            )
        assert all(isinstance(c, str) for c in result["top_resume_chunks"])

    def test_short_resume_handled(self):
        """A resume shorter than chunk_size should not crash."""
        with patch("app.services.embeddings.embed_texts", side_effect=self._mock_embed):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Short resume.",
                job_description="Python engineer role.",
            )
        assert 0 <= result["semantic_score"] <= 100

    def test_identical_embeddings_give_perfect_score(self):
        """When all embeddings are identical, cosine sim = 1.0, score = 100."""
        fixed = make_fake_embeddings(1)

        def always_same(texts):
            return np.repeat(fixed, len(texts), axis=0)

        with patch("app.services.embeddings.embed_texts", side_effect=always_same):
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(
                resume_text="Python developer. " * 20,
                job_description="Python engineer needed.",
            )
        assert result["semantic_score"] >= 95

    def test_identical_texts_high_score(self):
        """Same text for resume and JD should yield a high semantic score (mocked)."""
        same_text = "Python ML engineer with LangChain and FastAPI. " * 10
        with patch("app.services.embeddings._get_model") as mock_fn:
            identical_vec = np.ones(384, dtype="float32")
            m = MagicMock()
            m.encode.return_value = np.stack([identical_vec] * 10)
            mock_fn.return_value = m
            from app.services.embeddings import semantic_match_score
            result = semantic_match_score(same_text, same_text)
        assert result["semantic_score"] >= 90


# ---------------------------------------------------------------------------
# Divergence detection tests
# ---------------------------------------------------------------------------

class TestScoreDivergence:
    def test_aligned_when_close(self):
        assert score_divergence(75, 72)["divergence_flag"] == "aligned"

    def test_aligned_at_boundary(self):
        assert score_divergence(70, 59)["divergence_flag"] == "aligned"

    def test_moderate_divergence(self):
        result = score_divergence(80, 65)
        assert result["divergence_flag"] == "moderate_divergence"
        assert result["divergence_pts"] == 15

    def test_high_divergence(self):
        result = score_divergence(90, 60)
        assert result["divergence_flag"] == "high_divergence"
        assert result["divergence_pts"] == 30

    def test_divergence_note_explains_llm_higher(self):
        result = score_divergence(llm_score=90, semantic_score=50)
        note = result["divergence_note"].lower()
        assert any(word in note for word in ["depth", "keywords", "vocabulary"])

    def test_divergence_note_explains_semantic_higher(self):
        result = score_divergence(llm_score=50, semantic_score=85)
        note = result["divergence_note"].lower()
        assert any(word in note for word in ["vocabulary", "keywords", "content"])

    def test_zero_difference_is_aligned(self):
        result = score_divergence(75, 75)
        assert result["divergence_flag"] == "aligned"
        assert result["divergence_pts"] == 0

    def test_returns_all_required_keys(self):
        result = score_divergence(70, 70)
        assert all(k in result for k in ["divergence_flag", "divergence_note", "divergence_pts"])

    def test_max_difference(self):
        result = score_divergence(100, 0)
        assert result["divergence_flag"] == "high_divergence"
        assert result["divergence_pts"] == 100


# ---------------------------------------------------------------------------
# SemanticResult schema validation
# ---------------------------------------------------------------------------

class TestSemanticResultSchema:
    def test_valid_semantic_result(self):
        result = SemanticResult(
            semantic_score=68,
            raw_cosine=0.68,
            interpretation="Moderate overlap",
            top_resume_chunks=["chunk 1", "chunk 2"],
            divergence_flag="aligned",
            divergence_note="Both signals agree.",
            divergence_pts=5,
        )
        assert result.semantic_score == 68
        assert result.divergence_flag == "aligned"

    def test_score_out_of_range_fails(self):
        with pytest.raises(Exception):
            SemanticResult(
                semantic_score=120,
                raw_cosine=0.5,
                interpretation="test",
                top_resume_chunks=[],
                divergence_flag="aligned",
                divergence_note="test",
                divergence_pts=0,
            )

    def test_divergence_result_feeds_into_schema(self):
        """score_divergence output maps directly into SemanticResult fields."""
        div = score_divergence(80, 55)  # 25pt gap = high_divergence (>= 25 threshold)
        result = SemanticResult(
            semantic_score=55,
            raw_cosine=0.55,
            interpretation="Moderate overlap",
            top_resume_chunks=["Python experience"],
            divergence_flag=div["divergence_flag"],
            divergence_note=div["divergence_note"],
            divergence_pts=div["divergence_pts"],
        )
        assert result.divergence_flag == "high_divergence"
        assert result.divergence_pts == 25
