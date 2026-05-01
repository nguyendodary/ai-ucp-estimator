import logging
import traceback
from typing import Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.models.db import SessionLocal
from app.models.schemas import (
    AnalysisResponse,
    ManualAnalysisRequest,
    ProjectDetailResponse,
    ProjectSummary,
)
from app.repositories.project_repository import (
    delete_project,
    get_project_detail,
    list_projects,
)
from app.services.analysis_service import analyze_manual, analyze_text
from app.services.parser import parse_file
from app.services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

# No global tag on the router — tags are set per-route so Swagger groups them correctly.
router = APIRouter(prefix="/api")

# ── Shared error response documentation ─────────────────────────────────────
_400 = {"description": "Bad request — invalid input or missing required fields."}
_404 = {"description": "Not found — the requested project does not exist."}
_500 = {"description": "Internal server error — unexpected failure during processing."}


# ════════════════════════════════════════════════════════════════════════════
# AI ANALYSIS
# ════════════════════════════════════════════════════════════════════════════


@router.post(
    "/analyze",
    tags=["AI Analysis"],
    response_model=AnalysisResponse,
    summary="Analyze requirements via AI (text or file upload)",
    response_description="Computed UCP metrics with extracted actors and use cases.",
    responses={400: _400, 500: _500},
)
async def analyze(
    text: Optional[str] = Form(
        None,
        description=(
            "Raw requirements text (SRS, User Stories, feature descriptions). "
            "Minimum 10 characters. Either `text` or `file` must be provided."
        ),
        examples=[
            "Users can register with email and password. Admins manage accounts. "
            "The system sends a welcome email via SendGrid on successful registration."
        ],
    ),
    file: Optional[UploadFile] = File(
        None,
        description="Requirements document to upload. Supported formats: PDF, DOCX, DOC, TXT.",
    ),
    project_name: Optional[str] = Form(
        None,
        description=(
            "Human-readable project name. If omitted, the backend attempts to detect one "
            "from the requirements text; otherwise a timestamped default is used."
        ),
        examples=["E-Commerce Platform", "Hospital Management System"],
    ),
):
    """
    **Primary analysis endpoint.** Accepts either a raw text body or an uploaded file.

    Processing pipeline:
    1. If a file is provided it is parsed to plain text (PDF → PyPDF2, DOCX → python-docx).
    2. The text is sent to an LLM with a chain-of-thought UCP prompt.
    3. The LLM returns structured JSON (actors + use cases + reasoning log).
    4. The backend validates, normalises, and **authoritatively recalculates** all metrics —
       AI-supplied weights are discarded.
    5. TCF and ECF are derived from ~60 keyword signals in the reasoning log.
    6. The result is persisted and returned.

    ⏱ **Timeout:** allow up to 5 minutes — the system tries up to 6 LLM models with
    automatic fallback if the primary is rate-limited or unavailable.
    """
    raw_text: str = ""

    if file is not None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File must have a name")
        logger.info("Processing uploaded file: %s", file.filename)
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        raw_text = parse_file(file_bytes, file.filename)
    elif text is not None:
        raw_text = text.strip()
    else:
        raise HTTPException(
            status_code=400, detail="Provide either 'text' or 'file' input"
        )

    if len(raw_text) < 10:
        raise HTTPException(
            status_code=400,
            detail="Input text is too short. Provide at least 10 characters of requirements.",
        )

    try:
        return await analyze_text(raw_text=raw_text, project_name=project_name)
    except ValueError as e:
        logger.error("Analysis validation failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(
            "Unexpected error during analysis: %s\n%s", e, traceback.format_exc()
        )
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during AI processing: {type(e).__name__}: {str(e)}",
        ) from e


@router.post(
    "/analyze/detail",
    tags=["AI Analysis"],
    response_model=AnalysisResponse,
    summary="[Deprecated] Alias for POST /api/analyze",
    response_description="Identical response to POST /api/analyze.",
    responses={400: _400, 500: _500},
    deprecated=True,
)
async def analyze_detail(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    **Deprecated backwards-compatible alias.** Use `POST /api/analyze` instead.

    This endpoint forwards all parameters to `/api/analyze` unchanged.
    """
    return await analyze(text=text, file=file)


@router.post(
    "/analyze/manual",
    tags=["AI Analysis"],
    response_model=AnalysisResponse,
    summary="Run UCP estimation from manually defined actors and use cases",
    response_description="Computed UCP metrics for the supplied actors and use cases.",
    responses={400: _400, 500: _500},
)
async def analyze_manual_endpoint(payload: ManualAnalysisRequest = Body(...)):
    """
    **Manual estimation mode.** No AI is involved — the caller supplies the actor and
    use-case list directly as structured JSON.

    The backend:
    - Validates and normalises all complexity labels.
    - Computes actor weights (Simple=1, Average=2, Complex=3).
    - Computes use-case weights (Simple=5, Average=10, Complex=15).
    - Runs the full UAW → UUCW → UUCP → TCF → ECF → UCP → Effort pipeline.
    - Persists the result.

    Use this endpoint when you already know your actors and use cases and just need
    the UCP numbers, or when testing the calculator independently of the AI.
    """
    try:
        return analyze_manual(request=payload, project_name=payload.project_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(
            "Unexpected error during manual analysis: %s\n%s", e, traceback.format_exc()
        )
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during manual analysis: {type(e).__name__}: {str(e)}",
        ) from e


# ════════════════════════════════════════════════════════════════════════════
# PROJECTS
# ════════════════════════════════════════════════════════════════════════════


@router.get(
    "/projects",
    tags=["Projects"],
    response_model=list[ProjectSummary],
    summary="List all saved project analyses",
    response_description="Array of project summaries ordered by creation date (newest first).",
    responses={500: _500},
)
def projects_list():
    """
    Return a summary list of every persisted project.

    Each entry includes the project `id`, `name`, `created_at` timestamp, and the
    top-level UCP metrics (UAW, UUCW, UUCP, TCF, ECF, UCP, effort hours).

    Use the `id` to fetch full actor/use-case detail via `GET /api/projects/{project_id}`.
    """
    session = SessionLocal()
    try:
        return list_projects(session=session)
    finally:
        session.close()


@router.get(
    "/projects/{project_id}",
    tags=["Projects"],
    response_model=ProjectDetailResponse,
    summary="Get full detail for a single project",
    response_description="Complete project data including actors, use cases, and metrics.",
    responses={404: _404, 500: _500},
)
def projects_get(project_id: int):
    """
    Fetch the complete analysis for one project by its numeric `id`.

    The response includes:
    - `name` and `created_at`
    - Full `actors` list with names, types, and computed weights
    - Full `use_cases` list with names, descriptions, complexities, and weights
    - All seven computed metrics (UAW, UUCW, UUCP, TCF, ECF, UCP, effort hours)
    """
    session = SessionLocal()
    try:
        detail = get_project_detail(project_id=project_id, session=session)
        if not detail:
            raise HTTPException(status_code=404, detail="Project not found")
        return detail
    finally:
        session.close()


@router.get(
    "/projects/{project_id}/export/pdf",
    tags=["Projects"],
    summary="Export a project analysis as a PDF report",
    response_description="Binary PDF file as an attachment download.",
    responses={
        200: {
            "content": {"application/pdf": {}},
            "description": "PDF report file ready for download.",
        },
        404: _404,
        500: _500,
    },
)
def export_project_pdf(project_id: int):
    """
    Generate and stream a formatted PDF report for the specified project.

    The PDF contains:
    - Project name and creation timestamp
    - Actors table (name · type · weight)
    - Use-cases table (name · complexity · weight)
    - Full UCP metrics summary

    The response is streamed as `application/pdf` with a
    `Content-Disposition: attachment` header so browsers trigger a file download.
    """
    session = SessionLocal()
    try:
        detail = get_project_detail(project_id=project_id, session=session)
        if not detail:
            raise HTTPException(status_code=404, detail="Project not found")

        pdf_buffer = pdf_service.generate_pdf(
            project_name=detail.name,
            created_at=detail.created_at,
            actors=[
                {"name": a.name, "actor_type": a.actor_type, "weight": a.weight}
                for a in detail.actors
            ],
            use_cases=[
                {
                    "name": uc.name,
                    "complexity": uc.complexity,
                    "transactions": "",
                    "weight": uc.weight,
                }
                for uc in detail.use_cases
            ],
            metrics={
                "uaw": detail.metrics.uaw,
                "uucw": detail.metrics.uucw,
                "uucp": detail.metrics.uucp,
                "tcf": detail.metrics.tcf,
                "ecf": detail.metrics.ecf,
                "ucp": detail.metrics.ucp,
                "effort_hours": detail.metrics.effort_hours,
            },
        )

        filename = f"{detail.name.replace(' ', '_')}_ucp_report.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    finally:
        session.close()


@router.delete(
    "/projects/{project_id}",
    tags=["Projects"],
    summary="Delete a project and all its data",
    response_description="Confirmation message.",
    responses={404: _404, 500: _500},
)
def delete_project_endpoint(project_id: int):
    """
    Permanently delete a project and all associated actors, use cases, and metrics.

    ⚠️ This action is **irreversible**. The project cannot be recovered after deletion.
    """
    session = SessionLocal()
    try:
        success = delete_project(project_id=project_id, session=session)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    finally:
        session.close()
