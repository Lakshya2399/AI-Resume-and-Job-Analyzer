"""
Service: LLM match scorer — Week 2 hardened version.

Improvements over Week 1:
- Retry logic (up to 3 attempts) with exponential backoff
- repair_and_parse() salvages partial/markdown-wrapped JSON
- v3 prompt optimised for local models (Mistral, Llama)
- Tracks repair and retry counts for MLflow (resume bullet evidence)
"""

import logging
import time
from typing import Tuple

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import get_settings
from app.core.repair import repair_and_parse
from app.models.schemas import MatchReport
from app.services.preprocessor import preprocess_resume_text, preprocess_jd_text

logger = logging.getLogger(__name__)

PROMPT_TEMPLATES = {
    "v1": {
        "description": "Baseline — direct instruction with JSON schema",
        "system": """You are an expert technical recruiter and resume coach.
Analyse how well a resume matches a job description.

RULES:
- skill_gaps: identify at least 1-3 gaps. Missing tools, seniority signals, and domain experience all count.
- bullet_improvements: rewrite 1-3 actual bullets from the resume to better match the JD.
- Respond with ONLY valid JSON. No prose. No markdown fences.

JSON schema:
{{
  "overall_score": <int 0-100>,
  "score_reasoning": "<2-3 sentences>",
  "skills_score": <int 0-100>,
  "experience_score": <int 0-100>,
  "keywords_score": <int 0-100>,
  "strengths": ["<str>"],
  "skill_gaps": [{{"skill": "<str>", "importance": "critical|important|nice-to-have", "suggestion": "<str>"}}],
  "bullet_improvements": [{{"original": "<str>", "improved": "<str>", "reason": "<str>"}}],
  "matched_keywords": ["<str>"],
  "missing_keywords": ["<str>"]
}}""",
        "user": "RESUME:\n{resume_text}\n\n---\n\nJOB DESCRIPTION:\n{job_description}\n\nRespond with JSON only."
    },

    "v2": {
        "description": "Chain-of-thought — think step by step before scoring",
        "system": """You are an expert technical recruiter with 10 years of ML/data engineering hiring experience.

Before scoring, work through:
1. What are the TOP 5 required skills in the JD?
2. Which appear in the resume?
3. What seniority does the JD require vs the resume?

Then output ONLY this JSON with no markdown fences:
{{
  "overall_score": <int 0-100>,
  "score_reasoning": "<2-3 sentences>",
  "skills_score": <int 0-100>,
  "experience_score": <int 0-100>,
  "keywords_score": <int 0-100>,
  "strengths": ["<str>"],
  "skill_gaps": [{{"skill": "<str>", "importance": "critical|important|nice-to-have", "suggestion": "<str>"}}],
  "bullet_improvements": [{{"original": "<str>", "improved": "<str>", "reason": "<str>"}}],
  "matched_keywords": ["<str>"],
  "missing_keywords": ["<str>"]
}}""",
        "user": "RESUME:\n{resume_text}\n\n---\n\nJOB DESCRIPTION:\n{job_description}\n\nOutput ONLY the JSON."
    },

    "v3": {
        "description": "Local-model optimised — few-shot example for Mistral/Llama",
        "system": """You are a resume scoring assistant. Output ONLY a JSON object. No explanation. No markdown. Just JSON.

Example:
{{
  "overall_score": 72,
  "score_reasoning": "Strong Python skills but missing MLflow and LangChain experience required by the role.",
  "skills_score": 75,
  "experience_score": 70,
  "keywords_score": 68,
  "strengths": ["Strong Python background", "FastAPI and Docker experience"],
  "skill_gaps": [
    {{"skill": "LangChain", "importance": "critical", "suggestion": "Complete LangChain quickstart and add a small project to GitHub."}}
  ],
  "bullet_improvements": [
    {{"original": "Worked on ML models.", "improved": "Trained XGBoost model achieving 91% accuracy on sales forecasting task.", "reason": "Adds model name, metric, and task specificity."}}
  ],
  "matched_keywords": ["Python", "FastAPI", "Docker"],
  "missing_keywords": ["LangChain", "MLflow", "FAISS"]
}}

Now score the resume below. Output ONLY JSON.""",
        "user": "RESUME:\n{resume_text}\n\n---\n\nJOB DESCRIPTION:\n{job_description}"
    },
}


def get_llm():
    settings = get_settings()
    if settings.llm_provider == "openai":
        logger.info(f"Using OpenAI: {settings.llm_model}")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=settings.llm_model, temperature=0, api_key=settings.openai_api_key)
    else:
        logger.info(f"Using Ollama: {settings.llm_model}")
        from langchain_ollama import ChatOllama
        return ChatOllama(model=settings.llm_model, temperature=0, base_url=settings.ollama_base_url)


def build_chain(prompt_version: str = "v1"):
    if prompt_version not in PROMPT_TEMPLATES:
        raise ValueError(f"Unknown prompt version '{prompt_version}'. Available: {list(PROMPT_TEMPLATES.keys())}")
    t = PROMPT_TEMPLATES[prompt_version]
    prompt = ChatPromptTemplate.from_messages([("system", t["system"]), ("user", t["user"])])
    return prompt | get_llm() | StrOutputParser()


def score_match(
    resume_text: str,
    job_description: str,
    prompt_version: str = "v1",
    max_retries: int = 3,
) -> Tuple[MatchReport, float, dict]:
    """
    Run scoring with retry + repair.
    Returns: (MatchReport, elapsed_seconds, meta_dict)
    meta_dict has: attempts, was_repaired
    """
    chain = build_chain(prompt_version)
    start = time.time()
    last_error = None

    # Clean input before sending to LLM
    resume_text = preprocess_resume_text(resume_text)
    job_description = preprocess_jd_text(job_description)

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Scoring attempt {attempt}/{max_retries} (prompt={prompt_version})")
            raw_text = chain.invoke({
                "resume_text": resume_text,
                "job_description": job_description,
            })
            data, was_repaired = repair_and_parse(raw_text)
            report = MatchReport(**data)
            elapsed = time.time() - start
            logger.info(f"Scoring complete: score={report.overall_score}, attempt={attempt}, repaired={was_repaired}, time={elapsed:.2f}s")
            return report, elapsed, {"attempts": attempt, "was_repaired": was_repaired}

        except (ValueError, KeyError, TypeError) as e:
            last_error = e
            logger.warning(f"Attempt {attempt} failed: {e}. {'Retrying...' if attempt < max_retries else 'Exhausted.'}")
            if attempt < max_retries:
                time.sleep(attempt)

        except Exception as e:
            elapsed = time.time() - start
            logger.error(f"Scoring failed after {elapsed:.2f}s: {e}")
            raise

    elapsed = time.time() - start
    raise ValueError(f"Scoring failed after {max_retries} attempts ({elapsed:.1f}s). Last error: {last_error}")
