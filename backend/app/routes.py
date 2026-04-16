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
from app.repositories.project_repository import delete_project, get_project_detail, list_projects
from app.services.analysis_service import analyze_manual, analyze_text
from app.services.parser import parse_file
from app.services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    project_name: Optional[str] = Form(None),
):
    """
    Analyze software requirements (text or file) and compute UCP.

    Returns minimal results only (no `reasoning_log`).
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
        raise HTTPException(status_code=400, detail="Provide either 'text' or 'file' input")

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
        logger.error("Unexpected error during analysis: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal error during AI processing: {type(e).__name__}: {str(e)}",
        ) from e


@router.post("/analyze/detail", response_model=AnalysisResponse)
async def analyze_detail(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    # Backwards-compatible alias for older frontend calls.
    return await analyze(text=text, file=file)


@router.post("/analyze/manual", response_model=AnalysisResponse)
async def analyze_manual_endpoint(payload: ManualAnalysisRequest = Body(...)):
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


@router.get("/projects", response_model=list[ProjectSummary])
def projects_list():
    session = SessionLocal()
    try:
        return list_projects(session=session)
    finally:
        session.close()


@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)
def projects_get(project_id: int):
    session = SessionLocal()
    try:
        detail = get_project_detail(project_id=project_id, session=session)
        if not detail:
            raise HTTPException(status_code=404, detail="Project not found")
        return detail
    finally:
        session.close()


@router.get("/projects/{project_id}/export/pdf")
def export_project_pdf(project_id: int):
    """Export a project analysis as a PDF report."""
    session = SessionLocal()
    try:
        detail = get_project_detail(project_id=project_id, session=session)
        if not detail:
            raise HTTPException(status_code=404, detail="Project not found")
        
        pdf_buffer = pdf_service.generate_pdf(
            project_name=detail.name,
            created_at=detail.created_at,
            actors=[{"name": a.name, "actor_type": a.actor_type, "weight": a.weight} for a in detail.actors],
            use_cases=[{"name": uc.name, "complexity": uc.complexity, "transactions": "", "weight": uc.weight} for uc in detail.use_cases],
            metrics={
                "uaw": detail.metrics.uaw,
                "uucw": detail.metrics.uucw,
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
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    finally:
        session.close()


@router.delete("/projects/{project_id}")
def delete_project_endpoint(project_id: int):
    """Delete a project and all its related data."""
    session = SessionLocal()
    try:
        success = delete_project(project_id=project_id, session=session)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"message": "Project deleted successfully"}
    finally:
        session.close()

