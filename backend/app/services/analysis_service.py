from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.ai.ai_service import ai_service
from app.models.schemas import (
    Actor,
    AnalysisMetrics,
    AnalysisResponse,
    ManualAnalysisRequest,
    UseCase,
)
from app.services import calculator

from app.models.db import SessionLocal
from app.repositories.project_repository import create_project_with_analysis


def _default_project_name() -> str:
    return f"Analysis {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"


async def analyze_text(
    *,
    raw_text: str,
    project_name: Optional[str] = None,
) -> AnalysisResponse:
    extraction = await ai_service.extract(raw_text)

    metrics_dict, actor_breakdowns, use_case_breakdowns = calculator.compute(
        extraction.actors,
        extraction.use_cases,
        extraction.reasoning_log,
    )

    metrics = AnalysisMetrics(**metrics_dict)
    response = AnalysisResponse(
        actors=actor_breakdowns,
        use_cases=use_case_breakdowns,
        metrics=metrics,
    )

    session = SessionLocal()
    try:
        # project is intentionally not returned; keep frontend response minimal
        _ = create_project_with_analysis(
            session=session,
            project_name=project_name or _default_project_name(),
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
    response = AnalysisResponse(
        actors=actor_breakdowns,
        use_cases=use_case_breakdowns,
        metrics=metrics,
    )

    session = SessionLocal()
    try:
        _ = create_project_with_analysis(
            session=session,
            project_name=project_name or request.project_name or _default_project_name(),
            actors=response.actors,
            use_cases=response.use_cases,
            metrics=response.metrics,
        )
    finally:
        session.close()
    return response

