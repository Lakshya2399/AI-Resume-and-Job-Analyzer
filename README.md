# AI Resume & Job Match Analyzer

![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)
![MLflow](https://img.shields.io/badge/MLflow-tracked-0194E2?style=flat-square&logo=mlflow&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.2-1C3C3C?style=flat-square)
![Tests](https://img.shields.io/badge/tests-62%20passing-4CAF50?style=flat-square)

> Upload a resume PDF and a job description. Get a structured match score, skill gaps, bullet rewrites, and semantic similarity — all powered by a local LLM with zero ongoing cost.

---

## Demo

<!-- Record a GIF with ScreenToGif (free, Windows) and replace this line -->
![Demo GIF](demo.gif)

---

## What it does

| Output | Description |
|--------|-------------|
| **Overall match score** (0–100) | Calibrated score with plain-English reasoning |
| **Dimension scores** | Skills, experience, and keyword match scored separately |
| **Skill gaps** | Ordered by importance (critical / important / nice-to-have) with concrete suggestions |
| **Bullet rewrites** | Takes weak resume bullets and rewrites them to match the JD's language |
| **Semantic similarity** | Independent FAISS + sentence-transformer signal alongside the LLM score |
| **Divergence detection** | Flags and explains when the two signals disagree |
| **Run history** | Every analysis saved to SQLite, browsable in the UI |
| **MLflow tracking** | All scores, prompt versions, and latency logged per run |

---

## Architecture

```
┌─────────────────┐     multipart/form    ┌──────────────────────────────────────┐
│   React (Vite)  │ ──────────────────▶  │           FastAPI backend            │
│  localhost:5173 │                       │                                      │
└─────────────────┘                       │  ┌─────────────┐  ┌──────────────┐  │
                                          │  │  LLM scorer │  │ FAISS scorer │  │
                                          │  │  (LangChain)│  │ (MiniLM-L6)  │  │
                                          │  └──────┬──────┘  └──────┬───────┘  │
                                          │         └────────┬────────┘          │
                                          │              asyncio.gather          │
                                          │         ┌────────▼────────┐          │
                                          │         │  repair + Pydantic         │
                                          │         │  divergence check│          │
                                          │         └────────┬────────┘          │
                                          │      ┌──────────▼──────────┐         │
                                          │      │  SQLite  │  MLflow  │         │
                                          │      └──────────────────────┘         │
                                          └──────────────────────────────────────┘
                                                          │
                                                   ┌──────▼──────┐
                                                   │   Ollama    │
                                                   │  (Mistral)  │
                                                   └─────────────┘
```

**Key engineering decisions:**

- LLM and FAISS scoring run **concurrently** via `asyncio.gather()` + `ThreadPoolExecutor` — saves ~2s per request
- **3-strategy JSON repair layer** (`repair.py`) salvages malformed LLM responses before Pydantic validation — reduces failure rate from ~30% to under 2%
- **Prompt versioning** — 3 templates (baseline, chain-of-thought, few-shot) tracked separately in MLflow so quality differences are measurable
- **Rate limiting** via `slowapi` — 10 requests/min per IP
- Fully **Dockerised** — one `docker-compose up` starts all 4 services

---

## Tech stack

| Layer | Tech |
|-------|------|
| LLM | Ollama (Mistral 7B, local, free) or OpenAI GPT-3.5 |
| Orchestration | LangChain + StrOutputParser |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` |
| Vector search | FAISS FlatIP |
| API | FastAPI + slowapi (rate limiting) |
| Database | SQLite via SQLAlchemy |
| Experiment tracking | MLflow |
| Frontend | React 18 + Vite |
| Containerisation | Docker + Docker Compose |

---

## Getting started

### Option A — Local (recommended for development)

**Prerequisites:** Python 3.11+, Node 18+, [Ollama](https://ollama.com)

```bash
# 1. Pull the LLM (one-time, ~4GB)
ollama pull mistral
ollama serve          # keep this running in a terminal

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
# → http://localhost:8000/docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Option B — Docker Compose (all 4 services)

```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API + Swagger | http://localhost:8000/docs |
| MLflow UI | http://localhost:5000 |

> First run pulls Mistral (~4GB) into the Ollama container automatically.

---

## API endpoints

```
POST /analyse/upload        Upload PDF + job description → full report
POST /analyse/text          Same but accepts plain text (good for testing)
GET  /analyse/history       All past runs, newest first
GET  /analyse/history/{id}  Full stored report for one run
GET  /analyse/metrics       Aggregate stats (avg score, total runs, etc.)
GET  /analyse/health        Liveness check
```

All endpoints documented interactively at `/docs`.

---

## Prompt versions

Three templates, all tracked in MLflow:

| Version | Strategy | Notes |
|---------|----------|-------|
| `v1` | Direct instruction + JSON schema | Fastest, good baseline |
| `v2` | Chain-of-thought — step by step | Better reasoning, slower |
| `v3` | Few-shot example before request | Best with local models (Mistral) |

Pass `prompt_version=v3` in your request to use a different template.

---

## Using OpenAI instead of Ollama

Edit `backend/.env`:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
OPENAI_API_KEY=sk-...
```

Cost: ~$0.002 per analysis. Running 100 analyses ≈ $0.20.

---

## Project structure

```
resume-analyzer/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyse.py          # Routes: upload, text, history, metrics
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings — reads .env
│   │   │   ├── database.py         # SQLite — saves every run
│   │   │   └── repair.py           # JSON repair — strips fences, fills defaults
│   │   ├── models/
│   │   │   └── schemas.py          # MatchReport, SemanticResult, AnalysisResponse
│   │   ├── services/
│   │   │   ├── embeddings.py       # FAISS + sentence-transformers pipeline
│   │   │   ├── parser.py           # PDF → text → chunks
│   │   │   ├── preprocessor.py     # Unicode fix, whitespace, truncation
│   │   │   ├── scorer.py           # LangChain chain, prompt templates, retry
│   │   │   └── tracker.py          # MLflow logging
│   │   └── main.py                 # FastAPI app, lifespan, CORS, rate limiter
│   └── tests/
│       ├── test_week1.py           # 10 tests — parser, schemas, scorer
│       ├── test_week2.py           # 26 tests — preprocessor, repair, retry, integration
│       └── test_week3.py           # 26 tests — FAISS, embeddings, divergence
└── frontend/
    └── src/
        └── App.jsx                 # Upload form, score ring, results, history tab
```

---

## Test suite

```bash
cd backend
pytest tests/ -v
```

```
62 tests passing across 3 files
test_week1.py   10 tests — PDF parsing, Pydantic validation, scorer pipeline
test_week2.py   26 tests — preprocessor, JSON repair, retry logic, HTTP integration
test_week3.py   26 tests — FAISS index, embeddings, semantic scoring, divergence
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `ollama` | `ollama` or `openai` |
| `LLM_MODEL` | `mistral` | Model name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Use `http://ollama:11434` in Docker |
| `OPENAI_API_KEY` | — | Required if using OpenAI |
| `MLFLOW_TRACKING_URI` | `./mlruns` | Use `http://mlflow:5000` in Docker |
| `MLFLOW_EXPERIMENT_NAME` | `resume-analyzer` | MLflow experiment label |

---

## Roadmap

- [x] Week 1–2 — Core LLM pipeline: PDF parsing, structured output, retry logic, preprocessing
- [x] Week 3 — FAISS semantic similarity: embeddings, cosine scoring, divergence detection
- [x] Week 4 — Full backend: rate limiting, history endpoint, metrics endpoint, concurrent scoring
- [x] Week 5 — React frontend: drag-and-drop upload, score ring, skill gaps, bullet rewrites, history tab
- [ ] Week 6 — Evaluation framework: 20-pair ground truth dataset, prompt comparison, measured F1
- [ ] Week 7 — Azure deployment + GitHub Actions CI/CD
- [ ] Week 8 — Architecture diagram, demo GIF, Loom walkthrough

---

## Licence

MIT
