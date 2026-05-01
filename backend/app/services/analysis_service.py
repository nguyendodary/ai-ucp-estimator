from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from app.ai.ai_service import ai_service
from app.models.db import SessionLocal
from app.models.schemas import (
    Actor,
    AnalysisMetrics,
    AnalysisResponse,
    ManualAnalysisRequest,
    UseCase,
)
from app.repositories.project_repository import create_project_with_analysis
from app.services import calculator

# Ordered patterns: most specific first
_NAME_PATTERNS = [
    # "Project Name: XYZ" / "System: XYZ" / "Application Name: XYZ" etc.
    r"(?:project(?:\s+name)?|system(?:\s+name)?|application(?:\s+name)?|app(?:\s+name)?|product(?:\s+name)?|solution(?:\s+name)?)\s*[:\-–]\s*(.+?)(?:\n|$)",
    # Markdown h1:  "# Title"
    r"^#\s+(.+?)(?:\n|$)",
    # "Title: XYZ" or "Name: XYZ"
    r"(?:^|\n)(?:title|name)\s*[:\-–]\s*(.+?)(?:\n|$)",
    # "XYZ System Requirements" / "XYZ Application Spec" near start of text
    r"^\s*(.{5,60}?)\s+(?:System|Application|App|Platform|Software|Portal|Service)\b",
]


def extract_project_name_from_text(text: str) -> Optional[str]:
    """
    Extract a likely project name from the first 2 000 characters of a
    requirements document using heuristic regex patterns.
    Returns None when no recognisable name is found.
    """
    snippet = text[:2000]
    for pattern in _NAME_PATTERNS:
        match = re.search(pattern, snippet, re.IGNORECASE | re.MULTILINE)
        if match:
            name = match.group(1).strip()
            # Strip trailing punctuation and normalise whitespace
            name = re.sub(r"[.,:;!?]+$", "", name).strip()
            name = re.sub(r"\s+", " ", name)
            if 3 <= len(name) <= 120:
                return name
    return None


def _default_project_name() -> str:
    return f"Analysis {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"


async def analyze_text(
    *,
    raw_text: str,
    project_name: Optional[str] = None,
) -> AnalysisResponse:
    extraction = await ai_service.extract(raw_text)

    # reasoning_log is always str at runtime (the validator coerces it),
    # but the union type annotation requires an explicit cast here.
    metrics_dict, actor_breakdowns, use_case_breakdowns = calculator.compute(
        extraction.actors,
        extraction.use_cases,
        str(extraction.reasoning_log),
    )

    metrics = AnalysisMetrics(**metrics_dict)

    # Detect project name from text if the caller did not provide one
    detected_name = extract_project_name_from_text(raw_text)
    final_name = project_name or detected_name or _default_project_name()

    response = AnalysisResponse(
        project_name=final_name,
        actors=actor_breakdowns,
        use_cases=use_case_breakdowns,
        metrics=metrics,
    )

    session = SessionLocal()
    try:
        _ = create_project_with_analysis(
            session=session,
            project_name=final_name,
            actors=response.actors,
            use_cases=response.use_cases,
            metrics=response.metrics,
        )
    finally:
        session.close()
    return response


def analyze_manual(
    *,
    request: ManualAnalysisRequest,
    project_name: Optional[str] = None,
) -> AnalysisResponse:
    actors: list[Actor] = [
        Actor(name=a.name, type=a.type, weight=0) for a in request.actors
    ]
    use_cases: list[UseCase] = []
    for uc in request.use_cases:
        use_cases.append(
            UseCase(
                name=uc.name,
                description=uc.description,
                transactions=uc.transactions or 1,
                complexity=uc.complexity,
                weight=0,
            )
        )

    metrics_dict, actor_breakdowns, use_case_breakdowns = calculator.compute(
        actors=actors,
        use_cases=use_cases,
        reasoning_log="",
    )

    metrics = AnalysisMetrics(**metrics_dict)

    final_name = project_name or request.project_name or _default_project_name()

    response = AnalysisResponse(
        project_name=final_name,
        actors=actor_breakdowns,
        use_cases=use_case_breakdowns,
        metrics=metrics,
    )

    session = SessionLocal()
    try:
        _ = create_project_with_analysis(
            session=session,
            project_name=final_name,
            actors=response.actors,
            use_cases=response.use_cases,
            metrics=response.metrics,
        )
    finally:
        session.close()
    return response
