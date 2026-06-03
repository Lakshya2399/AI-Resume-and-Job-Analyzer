# Portfolio — AI Resume & Job Match Analyzer

**A production-grade GenAI system built across 8 weeks.**
Python · LangChain · FastAPI · FAISS · React · Docker · MLflow

GitHub: `github.com/YOUR_USERNAME/ai-resume-analyzer`

---

## What it does

Upload a resume PDF and a job description. The system returns:
- An **overall match score** (0–100) with plain-English reasoning
- **Skill gaps** ordered by importance with concrete actions
- **Bullet rewrites** — takes weak resume bullets and rewrites them to match the JD
- A **semantic similarity score** from an independent FAISS + embedding pipeline
- A **divergence flag** when the two signals disagree, with an explanation of why

---

## Why it's a real engineering project, not a tutorial

Most GenAI portfolio projects wrap an API and call it a day. This project has three things those don't:

**1. Measured quality.** Evaluated against a 20-pair human-labelled ground truth dataset. The few-shot prompt (v3) achieves 78.9% agreement within 10 points of human evaluators — a 24.7% MAE improvement over the baseline prompt. That's a number you can defend in an interview.

**2. Production resilience.** A 3-strategy JSON repair layer catches malformed LLM responses before Pydantic validation. Repair rate of 26% on Mistral 7B with zero hard failures. Without it, ~30% of requests fail outright on local models.

**3. MLOps thinking.** Three prompt templates versioned separately in MLflow. Every analysis run logs scores, latency, repair rate, and prompt version. You can open the MLflow UI and see which prompt version is winning over time.

---

## Technical highlights

### Concurrent scoring
LLM scoring and FAISS semantic similarity run simultaneously via `asyncio.gather()` + `ThreadPoolExecutor`. Without concurrency: ~32s. With: ~30s — the two signals run in parallel, not sequentially.

### JSON repair pipeline
Local LLMs return malformed JSON on ~26% of requests. The repair layer (`repair.py`) tries three strategies before giving up:
1. Direct `json.loads()` parse
2. Strip markdown fences (`\`\`\`json ... \`\`\``)
3. Find the outermost `{}` block via regex

Then `fill_missing_fields()` patches missing sub-fields (e.g. `bullet.reason` absent from response) and truncates over-length lists to schema limits.

### Prompt versioning with MLflow
Three prompt templates (baseline, chain-of-thought, few-shot) are tracked as separate MLflow parameters. Every eval run logs MAE, within-10 accuracy, tier F1, and Pearson r per prompt. The comparison table is reproducible — running `python -m evaluation.evaluate` regenerates it against the ground truth dataset.

### Evaluation results (Mistral 7B, 2026-05-14)

| Prompt | MAE ↓ | Within-10% ↑ | Tier F1 ↑ | Latency ↓ |
|--------|-------|--------------|-----------|-----------|
| v1 baseline | 10.83 | 72.2% | 0.756 | 12.6s |
| v2 chain-of-thought | 10.35 | 70.0% | **0.839** | 11.7s |
| v3 few-shot (default) | **8.16** | **78.9%** | 0.658 | **10.1s** |

Known limitation: all three prompts show upward bias on clearly unqualified candidates (overestimating by 25–28pts). This is a known LLM calibration issue — worth raising rather than hiding.

---

## Stack decisions (and why)

| Choice | Rationale |
|--------|-----------|
| **Ollama + Mistral 7B** | Zero API cost during development — the entire 8-week build cost $0 in LLM fees |
| **FAISS FlatIP** (not approximate) | Resume chunk counts are small (<50) — approximate indexing adds complexity with no speed benefit at this scale |
| **SQLite via SQLAlchemy** | Zero infrastructure for a portfolio project; swappable to Postgres by changing one env variable |
| **slowapi rate limiting** | Prevents Ollama from being overwhelmed by concurrent requests; demonstrates production thinking |
| **asyncio.gather + ThreadPoolExecutor** | FastAPI is async; FAISS and LLM calls are blocking — executor pattern is the correct bridge without changing the service functions |
| **Pydantic for LLM output** | Schema enforcement at the boundary between LLM and application code; validation errors become retries, not crashes |

---

## Project structure

```
resume-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/analyse.py         routes, rate limiting, concurrent dispatch
│   │   ├── core/
│   │   │   ├── config.py          pydantic-settings, lru_cache
│   │   │   ├── database.py        SQLite, run history
│   │   │   └── repair.py          3-strategy JSON repair + field patching
│   │   ├── models/schemas.py      MatchReport, SemanticResult, AnalysisResponse
│   │   ├── services/
│   │   │   ├── embeddings.py      FAISS + MiniLM-L6-v2
│   │   │   ├── parser.py          PDF → text → chunks
│   │   │   ├── preprocessor.py    unicode, whitespace, truncation
│   │   │   ├── scorer.py          LangChain chain, prompts, retry
│   │   │   └── tracker.py         MLflow
│   │   └── main.py                app boot, CORS, rate limiter
│   ├── evaluation/
│   │   ├── ground_truth.json      20-pair labelled dataset
│   │   ├── metrics.py             MAE, within-N, F1, Pearson
│   │   └── evaluate.py            runner + MLflow logging
│   └── tests/                     87 tests, all mocked
└── frontend/
    └── src/
        ├── App.jsx                routing (landing → analyse → history)
        ├── components/
        │   ├── LandingPage.jsx    marketing page with live eval data
        │   ├── UploadForm.jsx     drag-drop upload
        │   ├── ResultPanel.jsx    score ring, gaps, bullet rewrites
        │   └── HistoryTab.jsx     run list + detail drawer
        └── utils.jsx
```

---

## What I'd do next

1. **Calibration fix for weak candidates** — fine-tune the scoring prompt with few examples of correctly scored non-technical candidates. The systematic overestimation on weak matches is the highest-priority quality issue.
2. **Streaming response** — stream the LLM output token by token to the frontend instead of waiting for the full response. Would make the 10s latency feel much faster.
3. **Azure deployment** — infrastructure is fully written (Container Apps + GitHub Actions CI/CD). Held back to keep the portfolio project cost-free.
4. **Ground truth expansion** — 20 pairs is a starting point. 100 pairs across more domains (design, finance, marketing) would make the evaluation more robust.

---

## Interview talking points

**On structured output:**
> "The interesting engineering challenge was getting a local LLM to produce consistent, structured JSON instead of prose. I used Pydantic with a 3-strategy repair layer — if the model wraps the JSON in markdown fences, or returns it embedded in an explanation, the repair layer extracts it anyway. I got malformed response failures down to near zero."

**On the evaluation:**
> "I built a ground truth dataset and measured all three prompts against it. The few-shot prompt hit 78.9% agreement within 10 points of human scores — but the chain-of-thought was better at tier classification, 85% accuracy vs 74%. So the right prompt depends on what you're optimising for, and that's exactly the kind of decision MLflow tracking helps you make."

**On the known limitation:**
> "I noticed all three prompts over-score clearly unqualified candidates — sometimes by 25 points. A marketing manager applying for a backend role scored 40 when the human label was 22. That's a calibration problem worth calling out. I documented it in the README rather than hiding it."
