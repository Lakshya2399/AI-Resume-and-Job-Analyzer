from pydantic import BaseModel, Field
from typing import List, Optional


class SkillGap(BaseModel):
    skill: str = Field(description="The missing or underdeveloped skill")
    importance: str = Field(description="'critical' | 'important' | 'nice-to-have'")
    suggestion: str = Field(description="Concrete action to address this gap")


class BulletImprovement(BaseModel):
    original: str = Field(description="The original resume bullet point")
    improved: str = Field(description="Rewritten bullet with stronger impact and keywords")
    reason: str = Field(description="Why this change improves the match")


class MatchReport(BaseModel):
    """Structured LLM output — enforced via Pydantic validation."""
    overall_score: int = Field(ge=0, le=100, description="Overall match 0-100")
    score_reasoning: str = Field(description="2-3 sentence explanation")
    skills_score: int = Field(ge=0, le=100)
    experience_score: int = Field(ge=0, le=100)
    keywords_score: int = Field(ge=0, le=100)
    strengths: List[str] = Field(min_length=2, max_length=8)
    skill_gaps: List[SkillGap] = Field(default_factory=list, max_length=6)
    bullet_improvements: List[BulletImprovement] = Field(default_factory=list, max_length=3)
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)


class SemanticResult(BaseModel):
    """Week 3: FAISS + sentence-transformers similarity results."""
    semantic_score: int = Field(ge=0, le=100, description="Cosine similarity scaled to 0-100")
    raw_cosine: float = Field(description="Raw cosine similarity value")
    interpretation: str = Field(description="Plain English label for the score")
    top_resume_chunks: List[str] = Field(description="Top 3 resume chunks most similar to the JD")
    divergence_flag: str = Field(description="aligned | moderate_divergence | high_divergence")
    divergence_note: str = Field(description="Explanation of gap between LLM and semantic scores")
    divergence_pts: int = Field(description="Absolute difference between LLM and semantic scores")


class AnalysisRequest(BaseModel):
    """API request — resume text + job description."""
    resume_text: str = Field(min_length=100)
    job_description: str = Field(min_length=50)
    prompt_version: str = Field(default="v1")
    include_semantic: bool = Field(default=True, description="Run semantic similarity (adds ~1-2s)")


class AnalysisResponse(BaseModel):
    """Full API response."""
    analysis_id: str
    report: MatchReport
    semantic: Optional[SemanticResult] = None
    prompt_version: str
    llm_model: str
    processing_time_ms: int