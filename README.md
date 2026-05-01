# UCP Estimation — AI-Powered Use Case Point Estimator

An end-to-end web application that automates **Use Case Point (UCP)** effort estimation. Upload a requirements document (PDF, DOCX, TXT) or paste free text, and an LLM extracts actors and use cases, classifies their complexity, and computes the full UCP metric chain — UAW → UUCW → UUCP → TCF → ECF → UCP → Effort Hours.

---

## Features

### Analysis
- **AI Extraction** — paste SRS text or upload a PDF/DOCX/TXT file; the LLM identifies every actor and use case, counts atomic transactions, applies the under-estimation guard, and writes a reasoning log
- **Manual Mode** — define actors and use cases directly via a structured form without invoking the AI
- **Authoritative Recalculation** — AI-provided weights are discarded; the backend recomputes every metric from scratch to guarantee correctness
- **Auto TCF/ECF** — Technical and Environmental Complexity Factors are derived automatically by scanning the AI reasoning log for ~60 domain-specific keywords (real-time, oauth, kafka, gdpr, kubernetes, …), eliminating the need for manual T1–T13 / E1–E8 surveys
- **Under-estimation Guard** — when complexity signals are detected (blockchain, ML/AI, financial precision, high concurrency, real-time), all use cases are raised to a minimum of _Average_ complexity

### Results & Editing
- **Live metric cards** — UAW, UUCW, UUCP, TCF, ECF, UCP, and Effort Hours update the moment you change a classification
- **Inline editing** — toggle edit mode on any result to change actor types or use-case complexities via dropdowns; all downstream metrics recalculate client-side instantly
- **Decision notes** — click 💬 on any actor or use-case row to expand an amber textarea and document the rationale behind a classification choice
- **Completion estimate card** — enter team size and hours/day; Working Days, Working Weeks, and an estimated completion date (Mon–Fri only) recalculate in real time

### History
- **Searchable project list** — every successful estimation is persisted automatically
- **Edit from history** — the ✏ Edit button opens any saved project directly in editing mode
- **PDF export** — generates an A4 PDF report with actors table, use-cases table, and full metrics summary

### Infrastructure
- **Dark mode** — system preference detected on first load; persisted to `localStorage`
- **Collapsible sidebar** — works on desktop and mobile
- **Swagger UI** — interactive API documentation at `/docs`, ReDoc at `/redoc`
- **Fallback model chain** — if the primary LLM is rate-limited or unavailable, up to 6 backup models are tried automatically
- **Response caching** — identical requirement texts skip the LLM call (SHA-256 keyed, 1-hour TTL)
- **Hot-reload AI prompt** — edit `skills.md` at the project root; changes are picked up on the next API call without rebuilding

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React | 18.3 |
| Frontend | Tailwind CSS | 3.4 |
| Frontend | Recharts | 2.13 |
| Frontend | Lucide React | 0.451 |
| Frontend | Axios | 1.7 |
| Backend | FastAPI | 0.115 |
| Backend | Uvicorn | 0.34 |
| Backend | Pydantic v2 | 2.10 |
| Backend | SQLAlchemy | 2.0 |
| Backend | PyPDF2 | 3.0 |
| Backend | python-docx | 1.1 |
| Backend | ReportLab | 4.2 |
| AI | OpenAI SDK (async) | 1.59 |
| AI | Tenacity | 9.0 |
| AI gateway | OpenRouter | — |
| Database | SQLite | 3 |
| Infrastructure | Docker + Compose | 26 / v2 |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose v2)
- An [OpenRouter](https://openrouter.ai/) API key (free tier available)

### 1. Clone and configure

```bash
git clone <repo-url>
cd ucp-estimation
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-or-v1-...   # your OpenRouter key
OPENAI_MODEL=google/gemma-4-26b-a4b-it:free
OPENAI_BASE_URL=https://openrouter.ai/api/v1
LOG_LEVEL=INFO
```

> **Tip:** The system defaults to the free-tier `google/gemma-4-26b-a4b-it` model. Any OpenAI-compatible endpoint works — substitute your own base URL and model name if preferred.

### 2. Start

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| REST API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

First build takes a few minutes; subsequent starts are fast.

### 3. Stop

```bash
docker compose down
```

---

## Running Without Docker

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

> When running outside Docker, set `REACT_APP_API_URL` explicitly — the default empty value relies on the Docker-internal webpack proxy.

---

## UCP Formula Reference

```
Actor weights   Simple = 1 · Average = 2 · Complex = 3
Use-case weights  Simple (1–3 tx) = 5 · Average (4–7 tx) = 10 · Complex (≥8 tx) = 15

UAW  = Σ actor weights
UUCW = Σ use-case weights
UUCP = UAW + UUCW

TCF  = 0.6 + (0.01 × TF)          TF = Σ T1..T13  (baseline all-3 → TCF ≈ 0.99)
ECF  = 1.0 + ((EF − 24) × 0.02)   EF = Σ E1..E8   (baseline all-3 → ECF = 1.00)

UCP    = UUCP × TCF × ECF
Effort = UCP × 20  (person-hours)
```

TCF and ECF are raised above their baselines automatically when the AI reasoning log contains matching keywords (e.g. `real-time`, `jwt`, `oauth`, `kafka`, `gdpr`, `kubernetes`).

---

## AI Models

| Priority | Model | Provider | Context |
|---|---|---|---|
| Primary | `google/gemma-4-26b-a4b-it:free` | Google | 262 k |
| Fallback 1 | `moonshotai/kimi-k2.5` | Moonshot AI | 256 k |
| Fallback 2 | `z-ai/glm-4.5-air:free` | Z.ai | 131 k |
| Fallback 3 | `minimax/minimax-m2.5:free` | MiniMax | 196 k |
| Fallback 4 | `meta-llama/llama-3.3-70b-instruct:free` | Meta | 65 k |
| Fallback 5 | `google/gemma-4-31b-it:free` | Google | 262 k |

The fallback chain respects a 230-second total budget. Each model call is capped at 65 seconds; if a model returns a 429 the system waits 2 seconds before trying the next one.

---

## API Reference

Full interactive documentation is available in Swagger UI at **http://localhost:8000/docs**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/analyze` | AI extraction from text or file upload |
| `POST` | `/api/analyze/manual` | UCP calculation from manually supplied actors and use cases |
| `GET` | `/api/projects` | List all saved projects (summary) |
| `GET` | `/api/projects/{id}` | Full project detail — actors, use cases, metrics |
| `GET` | `/api/projects/{id}/export/pdf` | Download PDF report |
| `DELETE` | `/api/projects/{id}` | Delete project and all related data |
| `GET` | `/health` | Service health check |

---

## Customising AI Behaviour

The AI extraction prompt is stored in **`skills.md`** at the project root and is loaded fresh on every API call — no rebuild required.

The file defines:

- Actor classification rules (Simple / Average / Complex) with interaction-complexity criteria and worked examples
- Use-case transaction counting rules — what counts as one transaction (auth step, business-rule check, external API call, DB write, notification, audit log write, …)
- Complexity tiers mapped from transaction counts (1–3 → Simple, 4–7 → Average, ≥8 → Complex)
- Under-estimation guard — mandatory minimum complexity when complex-system signals are present
- Required keyword phrases for TCF/ECF detection that the AI must include verbatim in the `reasoning_log`
- Output schema and formatting constraints

---

## Project Structure

```
ucp-estimation/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   └── ai_service.py          # LLM client · fallback chain · JSON repair · cache
│   │   ├── core/
│   │   │   ├── cache.py               # SHA-256 keyed in-memory cache (1-hour TTL)
│   │   │   ├── config.py              # Pydantic settings (env vars)
│   │   │   └── logging_config.py      # Structured logging setup
│   │   ├── models/
│   │   │   ├── db.py                  # SQLAlchemy ORM models + schema migration
│   │   │   └── schemas.py             # Pydantic request/response schemas
│   │   ├── repositories/
│   │   │   └── project_repository.py  # DB CRUD operations
│   │   ├── services/
│   │   │   ├── analysis_service.py    # AI orchestration + project persistence
│   │   │   ├── calculator.py          # UCP formula engine · TCF/ECF keyword detection
│   │   │   ├── parser.py              # PDF / DOCX / TXT text extraction
│   │   │   └── pdf_service.py         # ReportLab PDF report generation
│   │   ├── main.py                    # FastAPI app · OpenAPI metadata · CORS
│   │   └── routes.py                  # All API endpoints
│   ├── data/
│   │   └── ucp_estimation.db          # SQLite database (auto-created)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── cards/
│   │   │   │   ├── ChartCard.jsx          # Wrapper card for charts
│   │   │   │   ├── EstimationDetailsCard.jsx  # Team size · completion date calculator
│   │   │   │   ├── StatCard.jsx           # Single metric card
│   │   │   │   └── UcpBreakdownCard.jsx   # Step-by-step formula breakdown
│   │   │   ├── charts/
│   │   │   │   └── WeightsCharts.jsx      # Actor/use-case weight bar charts
│   │   │   ├── input/
│   │   │   │   ├── ActorsUseCasesPanel.jsx # Manual entry form
│   │   │   │   └── FileDropzone.jsx        # Drag-and-drop file upload
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx            # Collapsible navigation
│   │   │   │   └── Topbar.jsx             # Top bar with dark mode toggle
│   │   │   ├── tables/
│   │   │   │   └── DataTable.jsx          # Actors/use-cases table (read-only + editable)
│   │   │   └── ui/
│   │   │       ├── badge.jsx              # Complexity badge
│   │   │       ├── button.jsx             # Button variants
│   │   │       └── card.jsx               # Card container
│   │   ├── lib/
│   │   │   └── utils.js                   # cn() Tailwind class merger
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx          # Analytics snapshot of latest project
│   │   │   ├── HistoryPage.jsx            # Searchable project list + detail view
│   │   │   └── NewAnalysisPage.jsx        # AI/manual estimation + editable results
│   │   ├── api.js                         # Axios client (proxied through webpack)
│   │   ├── App.js                         # Root component · routing · dark mode
│   │   ├── index.css                      # Tailwind base + custom shadows
│   │   └── index.js                       # React entry point
│   ├── package.json                       # proxy → http://backend:8000
│   ├── tailwind.config.js
│   └── Dockerfile
├── skills.md                              # AI system prompt (hot-reloaded)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | _(required)_ | API key for OpenRouter (or any OpenAI-compatible provider) |
| `OPENAI_MODEL` | `google/gemma-4-26b-a4b-it:free` | Primary LLM model identifier |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` | Base URL of the LLM gateway |
| `LOG_LEVEL` | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

> All variables are read from the `.env` file at the project root. The backend also accepts them as regular environment variables (the `.env` file takes lower precedence).

---

## Security

- **Never commit real secrets.** The `.env` file is listed in `.gitignore`. Use `.env.example` for placeholder documentation only.
- The backend CORS policy is currently set to `allow_origins=["*"]` — suitable for local development. Restrict origins before any public deployment.
- The SQLite database (`backend/data/ucp_estimation.db`) is volume-mounted and persisted locally. Back it up before wiping the Docker volume.

---

## License

MIT
