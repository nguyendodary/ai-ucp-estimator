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

USE_CASE_WEIGHTS: dict[str, int] = {
    "simple": 5,
    "average": 10,
    "complex": 15,
}

ACTOR_FORCE_AVERAGE_NAMES = {"citizen", "customer", "end-user", "end user"}

TCF_KEYWORD_RULES = {
    "T2": {
        "keywords": ["real-time", "real time", "sub-second", "<200ms", "sub 200ms", "performance", "instant", "fast response", "fast"],
        "score": 5,
        "label": "Performance Requirements",
    },
    "T4": {
        "keywords": ["bigdecimal", "decimal", "precision", "financial integrity", "audit trail", "tiering logic", "machine learning", "ai", "analytics", "algorithm", "heavy calculation"],
        "score": 5,
        "label": "Complex Processing",
    },
    "T7": {
        "keywords": ["blockchain", "external ledger", "api integration", "external system", "interoperability", "distributed ledger"],
        "score": 5,
        "label": "Interoperability",
    },
    "T10": {
        "keywords": ["race condition", "locking", "atomic", "multi-session", "thread-safe", "concurrent", "high traffic", "millions of users", "scale"],
        "score": 5,
        "label": "High Concurrency/Traffic",
    },
    "T6": {
        "keywords": ["kubernetes", "docker", "auto-scaling", "autoscaling", "microservices", "cloud-native", "cloud native"],
        "score": 5,
        "label": "Installability/Deployment Complexity",
    },
    "T3": {
        "keywords": ["responsive", "multi-language", "multilanguage", "i18n", "accessibility"],
        "score": 5,
        "label": "End-User Efficiency",
    },
    "T9": {
        "keywords": ["security", "gdpr", "encryption", "pci", "pci-dss", "biometric", "secure login", "otp", "2fa", "two-factor"],
        "score": 5,
        "label": "Security/Compliance",
    },
}

ECF_KEYWORD_RULES = {
    "E1": {
        "keywords": ["real-time", "real time", "financial systems", "sub-second", "performance", "instant", "fast response"],
        "score": 5,
        "label": "Process Familiarity/Performance Critical",
    },
    "E6": {
        "keywords": ["encryption", "ledger integrity", "pci-dss", "security", "gdpr", "pci", "biometric", "secure login", "otp", "2fa"],
        "score": 5,
        "label": "Security Expertise/Constraints",
    },
    "E7": {
        "keywords": ["high traffic", "millions of users", "concurrency", "concurrent", "scale", "peak"],
        "score": 5,
        "label": "High-Load Operations",
    },
    "E8": {
        "keywords": ["remote", "distributed team", "high turnover"],
        "score": 5,
        "label": "Personnel Stability/Distributed Environment",
    },
    "E3": {
        "keywords": ["experienced", "senior team", "expert team"],
        "score": 5,
        "label": "Analyst Capability/Experience",
    },
}


def get_actor_weight(actor_type: ActorType) -> int:
    """Return the weight for a given actor complexity type."""
    return ACTOR_WEIGHTS[actor_type]


def get_use_case_weight(complexity: str) -> int:
    """Return the weight for a use case based on complexity type."""
    return USE_CASE_WEIGHTS.get(complexity.lower(), 10)


def normalize_actor_type(name: str, actor_type: ActorType) -> ActorType:
    """Force specific business actor names to average complexity."""
    if name.strip().lower() in ACTOR_FORCE_AVERAGE_NAMES:
        return ActorType.average
    return actor_type


def detect_tcf_triggers(reasoning_log: str) -> tuple[float, List[str]]:
    """
    Detect TCF factor triggers from reasoning keywords and calculate TCF.
    Formula: TCF = 0.6 + (0.01 * TF), where TF is sum of T1..T13 scores.
    """
    reasoning = (reasoning_log or "").lower()
    # Requested baseline: all technical factors default to 3.
    technical_factors = {f"T{i}": 3 for i in range(1, 14)}
    triggers: List[str] = []

    for factor_code, rule in TCF_KEYWORD_RULES.items():
        matched_keywords = [kw for kw in rule["keywords"] if kw in reasoning]
        if matched_keywords:
            technical_factors[factor_code] = rule["score"]
            triggers.append(
                f"{factor_code}={rule['score']} ({rule['label']}): {', '.join(matched_keywords)}"
            )

    tf_total = sum(technical_factors.values())
    # TCF baseline with all 3s: 0.6 + 0.01 * 39 = 0.99 (~1.0)
    tcf = 0.6 + (0.01 * tf_total)
    return tcf, triggers


def detect_ecf_triggers(reasoning_log: str) -> tuple[float, List[str]]:
    """
    Detect ECF factor triggers from reasoning keywords and calculate ECF.
    Baseline: all E1..E8 factors default to 3.
    Calibration keeps baseline near 1.0 and lets complex projects rise toward 1.1-1.2.
    """
    reasoning = (reasoning_log or "").lower()
    environmental_factors = {f"E{i}": 3 for i in range(1, 9)}
    triggers: List[str] = []

    for factor_code, rule in ECF_KEYWORD_RULES.items():
        matched_keywords = [kw for kw in rule["keywords"] if kw in reasoning]
        if matched_keywords:
            environmental_factors[factor_code] = rule["score"]
            triggers.append(
                f"{factor_code}={rule['score']} ({rule['label']}): {', '.join(matched_keywords)}"
            )

    ef_total = sum(environmental_factors.values())
    # Calibrated ECF:
    # - baseline EF=24 => ECF=1.00
    # - each +1 EF adds +0.02, allowing complex projects to trend to ~1.1-1.2
    ecf = 1.0 + ((ef_total - 24) * 0.02)
    return ecf, triggers


def calculate_uaw(actors: List[Actor]) -> int:
    """Calculate Unadjusted Actor Weight."""
    return sum(get_actor_weight(a.type) for a in actors)


def calculate_uucw(use_cases: List[UseCase]) -> int:
    """Calculate Unadjusted Use Case Weight."""
    return sum(get_use_case_weight(uc.complexity) for uc in use_cases)


def validate_under_estimation_guard(reasoning_log: str, use_cases: List[UseCase]) -> tuple[bool, List[str]]:
    """
    Validate against under-estimation guard rules from skills.md.
    
    If reasoning_log contains keywords for complex systems (real-time, blockchain, 
    AI/ML, BigDecimal precision, high concurrency), then:
    - Minimum complexity MUST be average
    - High probability MUST be complex
    
    Returns (is_valid, warnings) where warnings contains use case names that violate the rules.
    """
    reasoning = (reasoning_log or "").lower()
    
    # Keywords that indicate complex systems (from updated skills.md)
    complex_system_keywords = [
        "real-time", "real time", "sub-200ms", "sub 200ms", "event-driven",
        "blockchain", "ledger", "on-chain", "distributed ledger",
        "machine learning", "ai", "analytics", "bigdecimal", "decimal", "precision",
        "race condition", "locking", "atomic", "thread-safe", "concurrency",
        "high traffic", "millions of users", "scale",
    ]
    
    has_complex_system = any(kw in reasoning for kw in complex_system_keywords)
    
    if not has_complex_system:
        return True, []
    
    warnings = []
    for uc in use_cases:
        complexity = uc.complexity.lower()
        if complexity == "simple":
            warnings.append(
                f"Use case '{uc.name}' marked as 'simple' but system appears complex "
                f"(detected complex system keywords). Consider upgrading to 'average' or 'complex'."
            )
    
    return len(warnings) == 0, warnings


def calculate_ucp(uaw: int, uucw: int, tcf: float = 1.0, ecf: float = 1.0) -> float:
    """Calculate Use Case Points."""
    uucp = uaw + uucw
    return uucp * tcf * ecf


def calculate_effort(ucp: float) -> float:
    """Calculate estimated effort in person-hours."""
    return ucp * 20


def compute(
    actors: List[Actor],
    use_cases: List[UseCase],
    reasoning_log: str = "",
) -> Tuple[dict, List[ActorBreakdown], List[UseCaseBreakdown]]:
    """
    Perform authoritative UCP calculation in backend.
    Ignores AI-provided weights/metrics and recalculates everything.

    Returns:
        Tuple of (metrics dict, actor breakdowns, use case breakdowns)
    """
    normalized_actors: List[Actor] = []
    for actor in actors:
        forced_type = normalize_actor_type(actor.name, actor.type)
        normalized_actors.append(
            Actor(name=actor.name, type=forced_type, weight=get_actor_weight(forced_type))
        )

    normalized_use_cases: List[UseCase] = []
    for uc in use_cases:
        complexity = uc.complexity.lower()
        if complexity not in USE_CASE_WEIGHTS:
            complexity = "average"
        normalized_use_cases.append(
            UseCase(
                name=uc.name,
                transactions=uc.transactions,
                complexity=complexity,
                description=uc.description,
                weight=get_use_case_weight(complexity),
            )
        )

    uaw = calculate_uaw(normalized_actors)
    uucw = calculate_uucw(normalized_use_cases)
    tcf, _ = detect_tcf_triggers(reasoning_log)
    ecf, _ = detect_ecf_triggers(reasoning_log)
    ucp = calculate_ucp(uaw, uucw, tcf, ecf)
    effort = calculate_effort(ucp)

    # Validate against under-estimation guard rules
    is_valid, warnings = validate_under_estimation_guard(reasoning_log, normalized_use_cases)
    if not is_valid:
        for warning in warnings:
            logger.warning(f"Under-estimation guard: {warning}")

    actor_breakdowns = [
        ActorBreakdown(name=a.name, actor_type=a.type, weight=get_actor_weight(a.type))
        for a in normalized_actors
    ]

    use_case_breakdowns = [
        UseCaseBreakdown(
            name=uc.name,
            description=uc.description,
            complexity=uc.complexity,
            weight=get_use_case_weight(uc.complexity),
        )
        for uc in normalized_use_cases
    ]

    metrics = {
        "uaw": uaw,
        "uucw": uucw,
        "tcf": tcf,
        "ecf": ecf,
        "ucp": ucp,
        "effort_hours": effort,
    }

    logger.info(
        "UCP calculation complete: UAW=%d, UUCW=%d, TCF=%.3f, UCP=%.1f, Effort=%.1f hours",
        uaw,
        uucw,
        tcf,
        ucp,
        effort,
    )

    return metrics, actor_breakdowns, use_case_breakdowns
