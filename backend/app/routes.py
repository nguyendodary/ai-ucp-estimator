import logging
import traceback
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ai.ai_service import ai_service
from app.models.schemas import (
    AnalysisResponse,
    DetailResponse,
)
from app.services import calculator
from app.services.parser import parse_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Analyze software requirements and compute UCP estimation.

    Accepts either raw text or an uploaded file (PDF, DOCX, TXT).
    """
    raw_text: str = ""

    # Determine input source
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

    # AI extraction
    try:
        extraction = await ai_service.extract(raw_text)
    except ValueError as e:
        logger.error("AI extraction failed: %s", e)
        raise HTTPException(status_code=502, detail=f"AI processing error: {e}") from e
    except Exception as e:
        logger.error("Unexpected error during AI extraction: %s", e)
        raise HTTPException(
            status_code=500, detail="Internal error during AI processing"
        ) from e

    # UCP calculation
    metrics, actor_breakdowns, uc_breakdowns = calculator.compute(
        extraction.actors, extraction.use_cases
    )

    return AnalysisResponse(
        actors=extraction.actors,
        use_cases=extraction.use_cases,
        **metrics,
    )


@router.post("/analyze/detail", response_model=DetailResponse)
async def analyze_detail(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Analyze requirements and return detailed breakdown for charts.
    """
    raw_text: str = ""

    if file is not None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="File must have a name")
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
        extraction = await ai_service.extract(raw_text)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI processing error: {e}") from e
    except Exception as e:
        logger.error("Unexpected error during AI extraction: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500, detail="Internal error during AI processing"
        ) from e

    # AI extraction
    try:
        extraction = await ai_service.extract(raw_text)
    except ValueError as e:
        logger.error("AI extraction failed: %s", e)
        raise HTTPException(status_code=502, detail=f"AI processing error: {e}") from e
    except Exception as e:
        logger.error("Unexpected error during AI extraction: %s\n%s", e, traceback.format_exc())
        raise HTTPException(
            status_code=500, detail="Internal error during AI processing"
        ) from e

    # UCP calculation
    metrics, actor_breakdowns, uc_breakdowns = calculator.compute(
        extraction.actors, extraction.use_cases
    )

    return DetailResponse(
        actors=actor_breakdowns,
        use_cases=uc_breakdowns,
        **metrics,
    )
