"""
Use Case Point (UCP) Calculation Module

Formulas:
  Actor Weight (AW):  simple=1, average=2, complex=3
  UAW = sum of all actor weights

  Use Case Weight (UCW):
    transactions <= 3  -> 5
    transactions 4-7   -> 10
    transactions >= 8  -> 15
  UUCW = sum of all use case weights

  UUCP = UAW + UUCW
  TCF = 1.0 (Technical Complexity Factor - simplified)
  ECF = 1.0 (Environmental Complexity Factor - simplified)
  UCP = UUCP * TCF * ECF
  Effort (hours) = UCP * 20
"""

import logging
from typing import List, Tuple

from app.models.schemas import (
    Actor,
    ActorBreakdown,
    ActorType,
    UseCase,
    UseCaseBreakdown,
)

logger = logging.getLogger(__name__)

# Actor complexity weight mapping
ACTOR_WEIGHTS: dict[ActorType, int] = {
    ActorType.simple: 1,
    ActorType.average: 2,
    ActorType.complex: 3,
}


def get_actor_weight(actor_type: ActorType) -> int:
    """Return the weight for a given actor complexity type."""
    return ACTOR_WEIGHTS[actor_type]


def get_use_case_weight(transactions: int) -> int:
    """Return the weight for a use case based on transaction count."""
    if transactions <= 3:
        return 5
    if transactions <= 7:
        return 10
    return 15


def calculate_uaw(actors: List[Actor]) -> int:
    """Calculate Unadjusted Actor Weight."""
    return sum(get_actor_weight(a.type) for a in actors)


def calculate_uucw(use_cases: List[UseCase]) -> int:
    """Calculate Unadjusted Use Case Weight."""
    return sum(get_use_case_weight(uc.transactions) for uc in use_cases)


def calculate_ucp(uaw: int, uucw: int, tcf: float = 1.0, ecf: float = 1.0) -> float:
    """Calculate Use Case Points."""
    uucp = uaw + uucw
    return uucp * tcf * ecf


def calculate_effort(ucp: float) -> float:
    """Calculate estimated effort in person-hours."""
    return ucp * 20


def compute(
    actors: List[Actor], use_cases: List[UseCase]
) -> Tuple[dict, List[ActorBreakdown], List[UseCaseBreakdown]]:
    """
    Perform full UCP calculation and return results with breakdowns.

    Returns:
        Tuple of (metrics dict, actor breakdowns, use case breakdowns)
    """
    uaw = calculate_uaw(actors)
    uucw = calculate_uucw(use_cases)
    tcf = 1.0
    ecf = 1.0
    ucp = calculate_ucp(uaw, uucw, tcf, ecf)
    effort = calculate_effort(ucp)

    actor_breakdowns = [
        ActorBreakdown(
            name=a.name,
            actor_type=a.type.value,
            weight=get_actor_weight(a.type),
        )
        for a in actors
    ]

    use_case_breakdowns = [
        UseCaseBreakdown(
            name=uc.name,
            transactions=uc.transactions,
            weight=get_use_case_weight(uc.transactions),
        )
        for uc in use_cases
    ]

    metrics = {
        "uaw": uaw,
        "uucw": uucw,
        "uucp": uaw + uucw,
        "tcf": tcf,
        "ecf": ecf,
        "ucp": ucp,
        "effort_hours": effort,
    }

    logger.info(
        "UCP calculation complete: UAW=%d, UUCW=%d, UCP=%.1f, Effort=%.1f hours",
        uaw,
        uucw,
        ucp,
        effort,
    )

    return metrics, actor_breakdowns, use_case_breakdowns
