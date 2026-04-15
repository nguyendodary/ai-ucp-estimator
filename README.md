# AI-Powered UCP Estimator

AI-powered Use Case Point (UCP) estimation for software requirements.  
Upload a requirements file (`.pdf`, `.docx`, `.txt`) or paste text, and the system extracts actors/use cases with an LLM, calculates UCP metrics, and shows dashboard insights with exportable reporting.

## Key Features

- File parsing for PDF, DOCX, and TXT requirements.
- LLM-based extraction of actors and use cases.
- UCP calculation with `UAW`, `UUCW`, `UUCP`, `TCF`, `ECF`, `UCP`, and `effort_hours`.
- Auto-detected technical triggers (`tcf_triggers`) from reasoning text.
- Frontend dashboard with metric cards, breakdown tables, and charts.
- PDF report export from dashboard (`jspdf` + `jspdf-autotable`).
- Docker Compose support for local full-stack startup.

## Tech Stack

- Frontend: React 18, Axios, Chart.js, jsPDF, jspdf-autotable
- Backend: FastAPI, Pydantic, Uvicorn
- Parsing: PyPDF2, python-docx
- AI client: OpenAI-compatible API endpoint
- Infra: Docker, Docker Compose

## Quick Start

### 1) Configure environment variables

Create `.env` from the template:

```bash
cp .env.example .env
```

Set values in `.env`:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=grok-2-1212
OPENAI_BASE_URL=https://api.x.ai/v1
LOG_LEVEL=INFO
```

### 2) Run with Docker (recommended)

```bash
docker compose up --build
```

Access:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3) Run locally (without Docker)

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (new terminal):

```bash
cd frontend
npm install
npm start
```

## API Overview

### `POST /api/analyze`

Analyzes requirement text or file input and returns:

- `reasoning_log`
- `actors`
- `use_cases`
- `uaw`, `uucw`, `uucp`, `tcf`, `ecf`, `ucp`, `effort_hours`
- `tcf_triggers`

### `GET /health`

Basic health check endpoint.

## PDF Report Export

From the result dashboard, click **Export PDF Report** to generate an A4 report containing:

1. Summary metrics table (`UAW`, `UUCW`, `TCF`, `ECF`, `Final UCP`, `Effort Hours`)
2. Breakdown tables for actors and use cases
3. Technical justifications from auto-detected `tcf_triggers`

## Security and Sensitive Files

- Never commit real secrets (API keys, tokens, certificates, local credentials).
- Use `.env.example` for safe placeholders only.
- Keep your real `.env` and secret material local; ignore patterns are defined in `.gitignore`.

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   ├── main.py
│   │   └── routes.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT
