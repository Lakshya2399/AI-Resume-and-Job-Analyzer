# Changelog

All notable changes to the AI Resume & Job Match Analyzer are documented here.

---

## [0.8.0] — Week 8 — Polish & Portfolio

### Added
- `ARCHITECTURE.md` — complete system design document with request lifecycle, data models, concurrency model, and evaluation framework documentation
- `CHANGELOG.md` — structured history of all development phases
- `PORTFOLIO.md` — single-document portfolio summary for recruiters and LinkedIn
- `docs/` directory for architecture diagrams and supplementary documentation
- `.gitignore` — production-grade, covers Python, Node, Docker, secrets, OS files
- `evaluation/results/.gitkeep` — tracks results directory without committing generated files
- Landing page (`LandingPage.jsx`) — full dark-theme marketing page with hero, pipeline diagram, live evaluation results with prompt selector, tech stack, and CTA sections

### Changed
- `App.jsx` — landing page is now the initial view; logo/title navigates back to landing
- `README.md` — final version with real evaluation results, architecture diagram, complete project structure, and all 8 weeks marked

---

## [0.7.0] — Week 7 — CI/CD & Containerisation

### Added
- `.github/workflows/ci.yml` — runs 87 tests + ruff lint + frontend build check on every push
- `.github/workflows/deploy.yml` — builds and pushes Docker images to Azure Container Registry, deploys to Azure Container Apps on merge to main
- `frontend/Dockerfile` — 2-stage build: Node builder → nginx production server
- `frontend/nginx.conf` — SPA routing, `/analyse` proxy to backend, static asset caching
- `docker-compose.prod.yml` — production compose using ACR images (no live-reload volumes)
- `.env.production.example` — production environment template
- `DEPLOY.md` — step-by-step Azure setup guide (resource group, ACR, Container Apps, GitHub secrets)

### Changed
- `backend/Dockerfile` — non-root user (`appuser`), health check, 2 uvicorn workers
- `docker-compose.yml` — fixed ollama service name resolution; added frontend service

---

## [0.6.0] — Week 6 — Evaluation Framework

### Added
- `evaluation/ground_truth.json` — 20-pair human-labelled dataset (strong/moderate/weak match pairs)
- `evaluation/metrics.py` — pure metric functions: MAE, within-N accuracy, tier F1, Pearson r
- `evaluation/evaluate.py` — evaluation runner: all 3 prompts × 20 pairs, MLflow logging, JSON/CSV output
- `evaluation/__init__.py`
- `tests/test_week6.py` — 25 tests covering all metric functions

### Results (Mistral 7B, 2026-05-14)
- v3 few-shot: MAE 8.16, within-10 accuracy 78.9%, Pearson r 0.916
- v2 chain-of-thought: macro F1 0.839, tier accuracy 85.0%
- v1 baseline: lowest repair rate (11.1%), Pearson r 0.929

---

## [0.5.0] — Week 5 — React Frontend

### Added
- `frontend/` — full React 18 + Vite application
- `frontend/src/App.jsx` — root component with analyse/history tab routing
- `frontend/src/styles.js` — all CSS variables and class definitions
- `frontend/src/utils.jsx` — scoreColor, scoreLabel, importanceBadge, formatDate helpers
- `frontend/src/components/ScoreRing.jsx` — animated SVG score ring + dimension bars
- `frontend/src/components/ResultPanel.jsx` — full analysis output renderer; exports ReportBody for reuse
- `frontend/src/components/UploadForm.jsx` — drag-and-drop PDF upload with double-upload fix
- `frontend/src/components/HistoryTab.jsx` — run history list + slide-in detail drawer via `/history/{id}`
- `frontend/package.json`, `vite.config.js`, `index.html`, `main.jsx`
- `frontend/src/components/LandingPage.jsx` — dark-theme landing page (added Week 8)

### Fixed
- CORS: `vite.config.js` proxy + `API = ""` removes direct `localhost:8000` calls
- File input double-upload: `e.target.value = ""` reset + `display:none` input + blur-before-click

---

## [0.4.0] — Week 4 — Full Backend

### Added
- `GET /analyse/metrics` — aggregate stats (total runs, avg scores, prompt breakdown)
- `GET /analyse/history/{analysis_id}` — full stored report for a single run
- Rate limiting via `slowapi` — 10 requests/min per IP, returns HTTP 429
- `_run_analysis()` shared function — eliminates duplication between upload and text endpoints

### Changed
- `app/main.py` — wired slowapi limiter state and exception handler
- `app/api/analyse.py` — `@limiter.limit("10/minute")` on both POST endpoints; `Request` param added
- `requirements.txt` — added `slowapi`

---

## [0.3.0] — Week 3 — Semantic Similarity

### Added
- `app/services/embeddings.py` — FAISS FlatIP index, sentence-transformers all-MiniLM-L6-v2, semantic scoring pipeline
- `score_divergence()` — compares LLM vs semantic score, flags gaps ≥12pts and ≥25pts
- `SemanticResult` Pydantic model — semantic_score, raw_cosine, interpretation, divergence fields
- `tests/test_week3.py` — 26 tests for FAISS, embeddings, divergence detection
- `asyncio.gather()` concurrency — LLM and FAISS run simultaneously via ThreadPoolExecutor

### Changed
- `AnalysisResponse` — added optional `semantic: SemanticResult` field
- `app/api/analyse.py` — `include_semantic` parameter; concurrent task dispatch
- `app/core/database.py` — added semantic columns (nullable)

---

## [0.2.0] — Week 2 — Robustness

### Added
- `app/services/preprocessor.py` — fix_encoding, fix_hyphenated_linebreaks, normalise_whitespace, truncate
- `app/core/repair.py` — 3-strategy JSON extraction + fill_missing_fields with sub-field patching
- `app/core/database.py` — SQLite via SQLAlchemy, AnalysisRun model, save_run/get_history/get_run_by_id
- `GET /analyse/history` endpoint
- Retry logic in `scorer.py` — 3 attempts with 1s/2s/3s backoff
- `tests/test_week2.py` — 26 tests; added sub-field repair tests after production bug

### Changed
- `scorer.py` — preprocessor runs before chain.invoke(); inline truncation removed
- `schemas.py` — relaxed skill_gaps/bullet_improvements min_length; strengths max raised to 8
- `repair.py` — LIST_CAPS truncation prevents over-long list validation failures
- `tracker.py` — switched MLflow backend to SQLite; improved error logging
- `conftest.py` — in-memory DB initialisation for integration tests

---

## [0.1.0] — Week 1 — Core Pipeline

### Added
- `app/main.py` — FastAPI app, CORS, lifespan hook
- `app/core/config.py` — Pydantic Settings reading from .env
- `app/models/schemas.py` — MatchReport, SkillGap, BulletImprovement, AnalysisRequest, AnalysisResponse
- `app/services/parser.py` — pypdf extraction, RecursiveCharacterTextSplitter chunking
- `app/services/scorer.py` — LangChain chain, 3 prompt templates (v1/v2/v3), StrOutputParser
- `app/services/tracker.py` — MLflow logging per analysis run
- `app/api/analyse.py` — POST /analyse/upload, POST /analyse/text, GET /analyse/health
- `tests/test_week1.py` — 10 tests
- `backend/Dockerfile`, `docker-compose.yml`, `requirements.txt`, `.env.example`
- `backend/pytest.ini` — pythonpath = . fix for module resolution
