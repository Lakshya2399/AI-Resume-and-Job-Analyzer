"""
Service: Semantic similarity via FAISS + sentence-transformers.

Week 3 goal: compute a cosine similarity score between the resume
and job description as a SECOND signal alongside the LLM score.

Why two signals?
- LLM score  = qualitative, reasoning-based (~30s, uses context)
- Semantic   = deterministic, fast (~0.5s), purely embedding-based
- When they diverge >20 pts that's worth flagging — it becomes a
  concrete talking point in your Week 6 eval story.

Architecture:
1. Chunk the resume into overlapping windows
2. Embed all chunks with all-MiniLM-L6-v2 (384-dim, ~80MB, local)
3. Build a FAISS FlatIP index over the chunk embeddings
4. Query the index with the JD embedding to find top-k chunks
5. Score = mean similarity of top-k, scaled 0-100

Model: all-MiniLM-L6-v2
- 22M params, runs on CPU, downloads once to ~/.cache/huggingface
- No API key, no cost, deterministic
"""

import logging
import numpy as np
import faiss
from functools import lru_cache
from typing import List

logger = logging.getLogger(__name__)

TOP_K = 5


@lru_cache(maxsize=1)
def _get_model():
    """
    Load the embedding model once, cache forever.
    lru_cache(maxsize=1) means the model loads on first call
    and is reused for every subsequent request.
    """
    from sentence_transformers import SentenceTransformer
    logger.info("Loading embedding model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    logger.info("Embedding model ready.")
    return model


def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Embed a list of strings -> float32 array of shape (N, 384).
    Normalised to unit length so dot product == cosine similarity.
    """
    model = _get_model()
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return embeddings.astype("float32")


def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
    """
    Build a FAISS inner-product index from pre-normalised embeddings.

    FlatIP = exact (no approximation) inner product search.
    Because embeddings are unit-normalised, IP == cosine similarity.
    For a resume (< 50 chunks), exact search is fast enough.

    Args:
        embeddings: float32 array of shape (N, dim)
    Returns:
        FAISS index ready for .search()
    """
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    logger.debug(f"FAISS index built: {index.ntotal} vectors, dim={dim}")
    return index


def semantic_match_score(resume_text: str, job_description: str) -> dict:
    """
    Full semantic similarity pipeline.

    Steps:
    1. Chunk resume into overlapping windows
    2. Embed all chunks + JD
    3. Build FAISS index over chunk embeddings
    4. Query index with JD vector -> top-k chunks
    5. Score = mean of top-k similarities, scaled 0-100

    Returns dict with:
        semantic_score     : int 0-100
        raw_cosine         : float (mean of top-k cosine sims)
        top_resume_chunks  : List[str] -- top 3 most-relevant resume chunks
        interpretation     : str -- plain English label
    """
    from app.services.parser import chunk_text

    chunks = chunk_text(resume_text, chunk_size=300, chunk_overlap=40)
    if not chunks:
        chunks = [resume_text[:500]]
    logger.info(f"Semantic scoring: {len(chunks)} resume chunks")

    jd_embedding = embed_texts([job_description])[0]
    chunk_embeddings = embed_texts(chunks)

    index = build_faiss_index(chunk_embeddings)

    k = min(TOP_K, len(chunks))
    jd_vec = jd_embedding.reshape(1, -1)
    similarities, indices = index.search(jd_vec, k)

    top_similarities = similarities[0].tolist()
    top_indices = indices[0].tolist()

    mean_cosine = float(np.mean(top_similarities))
    clamped = max(0.0, min(1.0, mean_cosine))
    semantic_score = int(round(clamped * 100))

    if semantic_score >= 75:
        interpretation = "Strong semantic overlap -- vocabulary and topics align well"
    elif semantic_score >= 55:
        interpretation = "Moderate overlap -- some shared vocabulary, gaps present"
    elif semantic_score >= 35:
        interpretation = "Weak overlap -- resume and JD use different terminology"
    else:
        interpretation = "Low overlap -- resume may be in a different domain"

    top_chunks = [chunks[i] for i in top_indices[:3]]

    logger.info(
        f"Semantic score: {semantic_score}/100 "
        f"(cosine={mean_cosine:.3f}, top_k={k}, chunks={len(chunks)})"
    )

    return {
        "semantic_score": semantic_score,
        "raw_cosine": round(mean_cosine, 4),
        "top_resume_chunks": top_chunks,
        "interpretation": interpretation,
    }


def score_divergence(llm_score: int, semantic_score: int) -> dict:
    """
    Compare LLM score vs semantic score and flag large divergences.

    A big gap is informative:
    - LLM high, semantic low: resume uses right buzzwords but content is thin
    - LLM low, semantic high: good content but missing JD-specific keywords
    """
    diff = abs(llm_score - semantic_score)

    if diff >= 25:
        flag = "high_divergence"
        if llm_score > semantic_score:
            note = (
                f"LLM ({llm_score}) scores higher than semantic ({semantic_score}) "
                f"by {diff} pts. Resume may use JD keywords but lack demonstrated depth."
            )
        else:
            note = (
                f"Semantic ({semantic_score}) scores higher than LLM ({llm_score}) "
                f"by {diff} pts. Resume has strong content but may be missing key JD vocabulary."
            )
    elif diff >= 12:
        flag = "moderate_divergence"
        note = f"Scores differ by {diff} pts -- worth reviewing both signals before deciding."
    else:
        flag = "aligned"
        note = f"Both signals agree (diff={diff} pts). High confidence in the overall score."

    return {
        "divergence_flag": flag,
        "divergence_note": note,
        "divergence_pts": diff,
    }
