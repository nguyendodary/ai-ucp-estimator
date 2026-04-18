from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.db import AnalysisResult, Actor, Project, SessionLocal, UseCase
from app.models.schemas import AnalysisMetrics, ActorBreakdown, ProjectDetailResponse, ProjectSummary, UseCaseBreakdown


def create_project_with_analysis(
    *,
    session: Session,
    project_name: str,
    actors: List[ActorBreakdown],
    use_cases: List[UseCaseBreakdown],
    metrics: AnalysisMetrics,
) -> Project:
    project = Project(name=project_name)
    session.add(project)
    session.flush()  # assign project.id

    for a in actors:
        session.add(
            Actor(
                project_id=project.id,
                name=a.name,
                type=a.actor_type.value,
                weight=a.weight,
            )
        )

    for uc in use_cases:
        session.add(
            UseCase(
                project_id=project.id,
                name=uc.name,
                description=uc.description,
                complexity=uc.complexity,
                weight=uc.weight,
            )
        )

    session.add(
        AnalysisResult(
            project_id=project.id,
            uaw=metrics.uaw,
            uucw=metrics.uucw,
            uucp=metrics.uucp,
            tcf=metrics.tcf,
            ecf=metrics.ecf,
            ucp=metrics.ucp,
            effort_hours=metrics.effort_hours,
        )
    )

    session.commit()
    session.refresh(project)
    return project


def list_projects(*, session: Session) -> List[ProjectSummary]:
    projects = (
        session.query(Project)
        .order_by(Project.created_at.desc())
        .all()
    )

    summaries: List[ProjectSummary] = []
    for p in projects:
        if not p.analysis_result:
            continue
        summaries.append(
            ProjectSummary(
                id=p.id,
                name=p.name,
                created_at=p.created_at.isoformat(),
                metrics=AnalysisMetrics(
                    uaw=p.analysis_result.uaw,
                    uucw=p.analysis_result.uucw,
                    uucp=p.analysis_result.uucp,
                    tcf=p.analysis_result.tcf,
                    ecf=p.analysis_result.ecf,
                    ucp=p.analysis_result.ucp,
                    effort_hours=p.analysis_result.effort_hours,
                ),
            )
        )

    return summaries


def get_project_detail(*, project_id: int, session: Session) -> Optional[ProjectDetailResponse]:
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project or not project.analysis_result:
        return None

    actors = [
        ActorBreakdown(name=a.name, actor_type=a.type, weight=a.weight)
        for a in sorted(project.actors, key=lambda x: x.id)
    ]

    use_cases = [
        UseCaseBreakdown(
            name=uc.name,
            description=uc.description or "",
            complexity=uc.complexity,
            weight=uc.weight,
        )
        for uc in sorted(project.use_cases, key=lambda x: x.id)
    ]

    metrics = AnalysisMetrics(
        uaw=project.analysis_result.uaw,
        uucw=project.analysis_result.uucw,
        uucp=project.analysis_result.uucp,
        tcf=project.analysis_result.tcf,
        ecf=project.analysis_result.ecf,
        ucp=project.analysis_result.ucp,
        effort_hours=project.analysis_result.effort_hours,
    )

    return ProjectDetailResponse(
        id=project.id,
        name=project.name,
        created_at=project.created_at.isoformat(),
        actors=actors,
        use_cases=use_cases,
        metrics=metrics,
    )


def delete_project(*, project_id: int, session: Session) -> bool:
    """Delete a project and all its related data (actors, use cases, analysis result)."""
    project = session.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    # Delete related entities (cascade should handle this, but explicit delete is safer)
    session.query(Actor).filter(Actor.project_id == project_id).delete()
    session.query(UseCase).filter(UseCase.project_id == project_id).delete()
    session.query(AnalysisResult).filter(AnalysisResult.project_id == project_id).delete()
    
    # Delete the project
    session.delete(project)
    session.commit()
    return True

