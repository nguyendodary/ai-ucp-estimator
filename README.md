# AI-Powered UCP Estimator

AI-powered Use Case Point (UCP) estimation for software requirements. Upload a requirements file (`.pdf`, `.docx`, `.txt`) or paste text, and the system extracts actors/use cases with an LLM, calculates UCP metrics, and shows dashboard insights with exportable reporting.

## Key Features

- **File Parsing**: Support for PDF, DOCX, and TXT requirement documents
- **AI-Powered Extraction**: LLM-based extraction of actors and use cases from requirements
- **UCP Calculation**: Complete UCP metrics including `UAW`, `UUCW`, `TCF`, `ECF`, `UCP`, and `effort_hours`
- **Semantic Inference**: Auto-detection of technical and environmental complexity factors with semantic keyword matching
- **Under-Estimation Guard**: Validation to prevent under-estimation of complex systems (blockchain, AI/ML, real-time, high concurrency)
- **Modern UI**: Beautiful, responsive interface built with React, TailwindCSS, and shadcn/ui
- **Project History**: Persistent storage of analysis results with SQLite database
- **PDF Export**: Backend-generated PDF reports with project name and detailed metrics
- **Delete Functionality**: Remove unwanted projects from history
- **Dynamic AI Prompts**: Configurable AI instructions via `skills.md` with hot-reload
- **Fallback AI Models**: Automatic fallback to backup models if primary model fails

## Tech Stack

### Frontend
- React 18 with modern hooks
- TailwindCSS for styling
- shadcn/ui component library
- Lucide React for icons
- Axios for API communication
- Chart.js for visualization

### Backend
- FastAPI with Pydantic for validation
- Uvicorn ASGI server
- SQLAlchemy ORM with SQLite
- OpenAI-compatible API client (OpenRouter)
- ReportLab for PDF generation
- PyPDF2 and python-docx for document parsing

### Infrastructure
- Docker and Docker Compose for containerization
- Volume mounting for dynamic configuration

## Quick Start

### 1) Configure environment variables

Create `.env` from the template:

```bash
cp .env.example .env
```

Set values in `.env`:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=google/gemma-4-26b-a4b-it:free
OPENAI_BASE_URL=https://openrouter.ai/api/v1
LOG_LEVEL=INFO
```

### 2) Run with Docker (recommended)

```bash
docker compose up --build
```

Access:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8000](http://localhost:8000)
- API docs: [http://localhost:8000/docs](http://localhost:8000)

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
Analyzes requirement text or file input and returns UCP metrics.

### `POST /api/analyze/manual`
Manual analysis with pre-defined actors and use cases.

### `GET /api/projects`
List all saved projects with summary metrics.

### `GET /api/projects/{project_id}`
Get detailed project information including actors, use cases, and metrics.

### `DELETE /api/projects/{project_id}`
Delete a project and all related data.

### `GET /api/projects/{project_id}/export/pdf`
Export a project analysis as a PDF report with project name.

## PDF Report Export

From the result dashboard or project history, click **Export PDF Report** to generate an A4 report containing:

1. Project title with exact project name
2. Summary metrics table (UAW, UUCW, TCF, ECF, UCP, Effort Hours)
3. Breakdown tables for actors and use cases
4. Creation timestamp

## Customizing AI Behavior

The AI extraction behavior is controlled by `skills.md` at the project root. This file defines:

- Actor classification rules (simple, average, complex)
- Use case complexity determination
- Transaction counting rules
- TCF (Technical Complexity Factor) keyword detection
- ECF (Environmental Complexity Factor) keyword detection
- Under-estimation guard rules
- Output formatting requirements

The `skills.md` file is dynamically loaded by the backend on each AI call, so changes take effect immediately without rebuilding.

## Security and Sensitive Files

- Never commit real secrets (API keys, tokens, certificates, local credentials)
- Use `.env.example` for safe placeholders only
- Keep your real `.env` and secret material local; ignore patterns are defined in `.gitignore`

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── ai/              # AI service with fallback models
│   │   ├── core/            # Configuration and settings
│   │   ├── models/          # Database models and schemas
│   │   ├── repositories/    # Data access layer
│   │   ├── services/        # Business logic (calculator, PDF, analysis)
│   │   ├── main.py          # FastAPI application entry
│   │   └── routes.py        # API endpoints
│   ├── data/                # SQLite database storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (cards, charts, tables, ui)
│   │   ├── pages/           # Page components (Dashboard, History, NewAnalysis)
│   │   ├── lib/             # Utility functions
│   │   ├── api.js           # API client
│   │   └── App.js           # Main application component
│   ├── package.json
│   └── Dockerfile
├── skills.md                # AI prompt instructions (dynamic)
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT
