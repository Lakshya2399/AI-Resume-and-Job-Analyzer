# Architecture — AI Resume & Job Match Analyzer

## System overview

The system is a full-stack application with four independently containerised services that communicate over a Docker bridge network. All user data stays local — no resume content is sent to external APIs when using the default Ollama configuration.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Docker network: bridge                          │
│                                                                         │
│  ┌─────────────────┐     HTTP      ┌──────────────────────────────────┐ │
│  │  frontend        │ ──────────▶  │         backend (FastAPI)        │ │
│  │  React + Vite    │  :8000        │                                  │ │
│  │  nginx (prod)    │◀──────────── │  POST /analyse/upload            │ │
│  │  :5173 / :80     │              │  POST /analyse/text              │ │
│  └─────────────────┘              │  GET  /analyse/history           │ │
│                                   │  GET  /analyse/history/{id}      │ │
│                                   │  GET  /analyse/metrics           │ │
│                                   │  GET  /analyse/health            │ │
│                                   └──────────┬───────────────────────┘ │
│                                              │                         │
│                          ┌───────────────────┼──────────────────┐      │
│                          │                   │                  │      │
│                          ▼                   ▼                  ▼      │
│                 ┌─────────────┐    ┌──────────────┐   ┌─────────────┐ │
│                 │   ollama     │    │    mlflow    │   │   sqlite    │ │
│                 │  Mistral 7B │    │  :5000        │   │  local file │ │
│                 │  :11434     │    │  exp tracking │   │  run history│ │
│                 └─────────────┘    └──────────────┘   └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Request lifecycle

Every `POST /analyse/upload` request flows through 9 distinct stages:

```
1. HTTP layer (FastAPI)
   ├── Validate file type (.pdf only → HTTP 400 if not)
   ├── Validate form fields (Pydantic → HTTP 422 if invalid)
   └── Inject SQLite session via Depends(get_session)

2. PDF parsing (parser.py)
   ├── pypdf extracts text page by page
   ├── Raises ValueError if 0 text extracted (scanned PDF) → HTTP 422
   └── RecursiveCharacterTextSplitter → overlapping chunks (500 chars, 50 overlap)

3. Input preprocessing (preprocessor.py)
   ├── fix_encoding()           — NFC normalisation, smart quotes, bullet chars
   ├── fix_hyphenated_linebreaks() — PDF column artefacts
   ├── normalise_whitespace()   — collapse runs of spaces/blank lines
   └── truncate()               — resume ≤6000 chars, JD ≤3000 chars

4. Concurrent execution (asyncio.gather)
   ├── Task A: LLM scorer (scorer.py)
   │   ├── Build LangChain chain: ChatPromptTemplate | LLM | StrOutputParser
   │   ├── LLM = ChatOllama (Mistral) or ChatOpenAI per .env config
   │   ├── Invoke chain → raw string
   │   ├── repair_and_parse() → validated dict
   │   │   ├── Strategy 1: direct JSON parse
   │   │   ├── Strategy 2: strip markdown fences
   │   │   └── Strategy 3: extract outermost {} block
   │   ├── fill_missing_fields() → patch absent/invalid sub-fields
   │   ├── MatchReport(**data) → Pydantic validation
   │   └── Retry up to 3× with 1s/2s/3s backoff on any exception
   │
   └── Task B: Semantic scorer (embeddings.py)
       ├── _get_model() @lru_cache — load all-MiniLM-L6-v2 once
       ├── Embed resume chunks + JD → 384-dim unit vectors
       ├── FAISS FlatIP index over chunk embeddings
       ├── Query with JD vector → top-5 chunks by cosine similarity
       └── Score = mean(top-5 similarities) × 100

5. Divergence detection (embeddings.py)
   ├── |LLM score − semantic score| < 12  → "aligned"
   ├── 12–24 gap                          → "moderate_divergence"
   └── ≥ 25 gap                           → "high_divergence" + explanation

6. Persist to SQLite (database.py)
   └── save_run() → AnalysisRun row with all scores, full report JSON

7. Log to MLflow (tracker.py)
   └── log_analysis_run() → metrics + params per run
       (wrapped in try/except — never crashes the response)

8. Rate limit check (slowapi)
   └── 10 requests/min per IP → HTTP 429 if exceeded

9. Response serialisation
   └── AnalysisResponse (Pydantic) → JSON → HTTP 200
```

---

## Data models

### MatchReport (core LLM output)

```python
MatchReport
├── overall_score:        int (0–100)
├── score_reasoning:      str
├── skills_score:         int (0–100)
├── experience_score:     int (0–100)
├── keywords_score:       int (0–100)
├── strengths:            List[str] (2–8 items)
├── skill_gaps:           List[SkillGap]
│   └── SkillGap: skill, importance (critical|important|nice-to-have), suggestion
├── bullet_improvements:  List[BulletImprovement]
│   └── BulletImprovement: original, improved, reason
├── matched_keywords:     List[str]
└── missing_keywords:     List[str]
```

### SemanticResult (FAISS output)

```python
SemanticResult
├── semantic_score:     int (0–100)
├── raw_cosine:         float
├── interpretation:     str
├── top_resume_chunks:  List[str]
├── divergence_flag:    str (aligned|moderate_divergence|high_divergence)
├── divergence_note:    str
└── divergence_pts:     int
```

### AnalysisRun (SQLite row)

```python
AnalysisRun
├── analysis_id:        str (UUID)
├── created_at:         datetime
├── prompt_version:     str (v1|v2|v3)
├── llm_model:          str
├── overall_score:      int
├── skills_score:       int
├── experience_score:   int
├── keywords_score:     int
├── processing_time_ms: int
├── score_reasoning:    str
├── report_json:        str (full MatchReport serialised)
├── semantic_score:     int (nullable)
├── semantic_raw_cosine: str (nullable)
├── divergence_flag:    str (nullable)
└── divergence_pts:     int (nullable)
```

---

## Prompt versioning

Three templates in `scorer.py`, each tracked as a separate MLflow parameter:

| Version | Strategy | Best for | Repair rate | Latency |
|---------|----------|----------|-------------|---------|
| v1 | Direct instruction + JSON schema | Fast baseline | 11.1% | 12.6s |
| v2 | Chain-of-thought reasoning | Tier classification | 45.0% | 11.7s |
| v3 | Few-shot example | Score precision (default) | 26.3% | 10.1s |

Changing the default prompt: set `prompt_version=v2` in the request body, or change the default in `UploadForm.jsx`.

---

## JSON repair pipeline

Local LLMs (Mistral, Llama) frequently return malformed responses. The repair layer in `repair.py` handles this before Pydantic validation:

```
LLM raw string
      │
      ▼
extract_json_from_text()
      ├── Try 1: json.loads(raw)
      ├── Try 2: strip ```json ... ``` fences, then parse
      ├── Try 3: find outermost { } block with regex, then parse
      └── Return None if all fail → retry the whole LLM call

      │ (if dict extracted)
      ▼
fill_missing_fields()
      ├── Inject defaults for missing top-level fields
      ├── Patch bullet_improvements items missing 'reason'
      ├── Patch skill_gaps items with invalid 'importance'
      └── Truncate over-length lists to schema max

      │
      ▼
MatchReport(**data)  ← Pydantic validates final output
```

---

## Evaluation framework

Located in `backend/evaluation/`. Measures LLM scoring quality against human labels.

```
ground_truth.json          — 20 resume+JD pairs, human_score per pair
      │
      ▼
evaluate.py                — runner: score all pairs × all prompts
      │
      ├── score_one()      — calls score_match(), catches errors
      ├── run_prompt_eval() — 20 pairs per prompt, collects results
      ├── log_to_mlflow()  — logs metrics under 'resume-analyzer-eval' experiment
      └── save_results()   — writes JSON + CSV to evaluation/results/
      │
      ▼
metrics.py                 — pure functions, no dependencies
      ├── mean_absolute_error()
      ├── within_n_accuracy()   ← primary resume metric
      ├── tier_accuracy()
      ├── tier_f1()             ← per-tier precision/recall/F1
      └── pearson_correlation()
```

**Results (Mistral 7B, measured 2026-05-14):**

| Prompt | MAE | Within-10% | Macro F1 | Pearson r |
|--------|-----|------------|----------|-----------|
| v1 | 10.83 | 72.2% | 0.756 | 0.929 |
| v2 | 10.35 | 70.0% | 0.839 | 0.806 |
| v3 | **8.16** | **78.9%** | 0.658 | 0.916 |

---

## Concurrency model

```python
# Both blocking tasks run in a ThreadPoolExecutor
# asyncio.gather() awaits them simultaneously

_executor = ThreadPoolExecutor(max_workers=2)

llm_task = loop.run_in_executor(_executor,
    lambda: score_match(resume_text, jd, prompt_version))

semantic_task = loop.run_in_executor(_executor,
    lambda: semantic_match_score(resume_text, jd))

(report, elapsed, meta), semantic_raw = await asyncio.gather(
    llm_task, semantic_task)
```

Without concurrency: ~32s (LLM 30s + FAISS 2s sequential)
With concurrency: ~30s (max of both, not sum)

---

## Configuration reference

All configuration is read from `.env` via `app/core/config.py` (Pydantic Settings with `@lru_cache`).

| Variable | Local default | Docker override |
|----------|--------------|-----------------|
| `LLM_PROVIDER` | `ollama` | same |
| `LLM_MODEL` | `mistral` | same |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `http://ollama:11434` |
| `MLFLOW_TRACKING_URI` | `./mlruns` | `http://mlflow:5000` |
| `MLFLOW_EXPERIMENT_NAME` | `resume-analyzer` | same |

---

## Test coverage

```
87 tests across 4 files — all mocked, no real LLM or network calls required

test_week1.py  (10) — PDF parsing, text chunking, Pydantic schema validation, scorer pipeline
test_week2.py  (26) — preprocessor edge cases, JSON repair strategies, retry logic, HTTP integration
test_week3.py  (26) — FAISS index construction, embedding pipeline, semantic scoring, divergence
test_week6.py  (25) — MAE, within-N accuracy, tier F1, Pearson r, full_report contract
```

Run with: `cd backend && pytest tests/ -v`
