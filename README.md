# AI-Powered Use Case Point (UCP) Estimator

An AI-powered system that automatically analyzes software requirements documents and produces Use Case Point (UCP) effort estimates. Upload a requirements file (PDF, DOCX, TXT) or paste raw text — the system uses a large language model to extract actors and use cases, classifies their complexity, and returns a full UCP breakdown with visual charts.

## Features

- **File upload** — supports PDF, DOCX, and TXT requirements documents
- **Text input** — paste requirements directly into the UI
- **AI extraction** — uses OpenAI-compatible LLMs to identify actors, use cases, and their complexity (Simple / Average / Complex)
- **UCP calculation** — computes UAW, UUCW, UUCP, TCF, ECF, and final UCP
- **Interactive dashboard** — metric cards, detailed breakdown tables, and Chart.js visualizations
- **Docker-ready** — one-command deployment with `docker compose`

## Architecture

```
┌──────────────┐          ┌──────────────┐
│   Frontend   │  HTTP    │   Backend    │
│   (React)    │─────────>│  (FastAPI)   │
│   :3000      │          │   :8000      │
└──────────────┘          └──────┬───────┘
                                 │
                          ┌──────▼───────┐
                          │  LLM API     │
                          │ (OpenRouter) │
                          └──────────────┘
```

### Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Chart.js, Axios           |
| Backend    | FastAPI, Pydantic, Uvicorn          |
| AI         | OpenAI SDK (OpenRouter compatible)  |
| Parsing    | PyPDF2, python-docx                 |
| Deployment | Docker, Docker Compose              |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI-compatible API key (OpenRouter, OpenAI, etc.)

### 1. Clone the repository

```bash
git clone https://github.com/nguyendodary/ai-ucp-estimator.git
cd ai-ucp-estimation
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://openrouter.ai/api/v1   # optional — for OpenRouter
LOG_LEVEL=INFO
```

### 3. Choose a run option

You can run the project either **locally** (requires Python and Node.js installed) or **with Docker** (requires Docker installed). Pick one:

---

#### Option A — Run Locally

Start the backend and frontend separately on your machine.

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (open a new terminal)

```bash
cd frontend
npm install
npm start
```

---

#### Option B — Run with Docker

Build and run both services with a single command.

```bash
docker compose up --build
```

---

### 4. Open the app

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

## API Reference

### `POST /api/analyze`

Analyzes requirements and returns UCP metrics.

**Request** (multipart form):

| Field  | Type   | Description                        |
|--------|--------|------------------------------------|
| text   | string | Raw requirements text (optional)   |
| file   | file   | PDF / DOCX / TXT file (optional)   |

**Response:**

```json
{
  "actors": [
    { "name": "Customer", "weight": 1, "complexity": "Simple" }
  ],
  "use_cases": [
    { "name": "Login", "weight": 5, "complexity": "Average" }
  ],
  "uaw": 3,
  "uucw": 15,
  "uucp": 18,
  "tcf": 1.0,
  "ecf": 1.0,
  "ucp": 18.0
}
```

### `POST /api/analyze/detail`

Same as above but returns per-actor and per-use-case detailed breakdowns for chart rendering.

### `GET /health`

Health check endpoint.

## UCP Methodology

The system follows the standard Use Case Point method:

1. **Unadjusted Actor Weight (UAW)** — actors classified as Simple (1), Average (2), or Complex (3)
2. **Unadjusted Use Case Weight (UUCW)** — use cases classified as Simple (5), Average (10), or Complex (15)
3. **Unadjusted Use Case Points (UUCP)** — UAW + UUCW
4. **Technical Complexity Factor (TCF)** — default 1.0
5. **Environmental Complexity Factor (ECF)** — default 1.0
6. **Final UCP** — UUCP x TCF x ECF

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── ai/ai_service.py        # LLM prompt & extraction
│   │   ├── core/                   # config, cache, logging
│   │   ├── models/schemas.py       # Pydantic models
│   │   ├── services/
│   │   │   ├── parser.py           # PDF / DOCX / TXT parsing
│   │   │   └── calculator.py       # UCP computation
│   │   ├── routes.py               # FastAPI endpoints
│   │   └── main.py                 # App entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── components/             # React UI components
│   │   ├── App.js
│   │   └── api.js                  # Axios API client
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## License

MIT
