import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.models.db import init_db
from app.routes import router

# Initialize logging at application startup
setup_logging()
logger = logging.getLogger(__name__)

# ── OpenAPI tag groups ───────────────────────────────────────────────────────
TAGS_METADATA = [
    {
        "name": "AI Analysis",
        "description": (
            "Submit software requirements (plain text, PDF, DOCX, or TXT) and receive a "
            "fully computed UCP estimation. The AI extracts actors and use cases, counts "
            "transactions, applies the under-estimation guard, and writes a reasoning log "
            "that the backend uses to derive TCF and ECF automatically."
        ),
    },
    {
        "name": "Projects",
        "description": (
            "Retrieve, inspect, export, and delete saved project analyses. "
            "Every successful estimation is persisted automatically."
        ),
    },
    {
        "name": "System",
        "description": "Health-check and API root endpoints.",
    },
]

_DESCRIPTION = """
## AI-Powered Use Case Point (UCP) Estimation API

Automate software effort estimation by combining the structured
**Use Case Point (UCP)** methodology with **Large Language Model (LLM)** analysis.

---

### UCP at a Glance

| Concept | Values | Weight |
|---|---|---|
| **Actor** — Simple | External system, fire-and-forget (SMTP, Webhook) | 1 |
| **Actor** — Average | Human user or stateless request-response API | 2 |
| **Actor** — Complex | Stateful workflow, async finality, ERP/ML pipeline | 3 |
| **Use Case** — Simple | 1–3 transactions | 5 |
| **Use Case** — Average | 4–7 transactions | 10 |
| **Use Case** — Complex | ≥ 8 transactions | 15 |

**Core formula**

```
UAW  = Σ actor weights
UUCW = Σ use-case weights
UUCP = UAW + UUCW
TCF  = 0.6 + (0.01 × TF)    # TF = Σ T1..T13 scores  (baseline ≈ 0.99)
ECF  = 1.0 + ((EF − 24) × 0.02)  # EF = Σ E1..E8 scores  (baseline = 1.00)
UCP  = UUCP × TCF × ECF
Effort (person-hours) = UCP × 20
```

TCF and ECF are derived **automatically** from keyword signals in the AI reasoning log —
no manual T/E-factor survey required.

---

### Supported Input Formats

| Mode | Endpoint | Format |
|---|---|---|
| AI extraction | `POST /api/analyze` | Plain text, PDF, DOCX, TXT |
| Manual entry  | `POST /api/analyze/manual` | JSON body |

---

### Notes
- AI analysis endpoints may take **up to 5 minutes** — the system tries up to 6 LLM
  models with automatic fallback if the primary is unavailable.
- Results are **persisted automatically**; use the Projects endpoints to retrieve them.
- The `reasoning_log` field is used internally for TCF/ECF detection and is not
  included in the API response.
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    init_db()
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title="UCP Estimation API",
    version=settings.app_version,
    description=_DESCRIPTION,
    openapi_tags=TAGS_METADATA,
    # Swagger UI tunables
    swagger_ui_parameters={
        "defaultModelsExpandDepth": 2,  # expand schema models by default
        "defaultModelExpandDepth": 3,
        "docExpansion": "list",  # show all operations collapsed-to-list
        "filter": True,  # enable the search/filter bar
        "tryItOutEnabled": True,  # pre-enable "Try it out" on every operation
    },
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure stable error responses."""
    logger.exception("Unhandled error occurred: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "type": type(exc).__name__,
        },
    )


# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get(
    "/",
    tags=["System"],
    summary="API root",
    response_description="Welcome message and docs link",
)
async def root():
    """Return a welcome message and the URL of the interactive documentation."""
    return {
        "message": "UCP Estimation API",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
    }


@app.get(
    "/health",
    tags=["System"],
    summary="Health check",
    response_description="Service health status",
)
async def health_check():
    """Confirm the API is running and return the current version."""
    return {"status": "ok", "version": settings.app_version}
