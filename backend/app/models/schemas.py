import json
from enum import Enum
from typing import Any, List, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── Enums ────────────────────────────────────────────────────────────────────


class ActorType(str, Enum):
    simple = "simple"
    average = "average"
    complex = "complex"


# ── Internal AI-layer schemas (not exposed in Swagger responses) ─────────────


class Actor(BaseModel):
    name: str = Field(..., min_length=1, description="Actor name")
    type: ActorType = Field(..., description="Actor complexity classification")
    weight: int = Field(0, description="Computed weight (1 / 2 / 3)")

    @field_validator("type", mode="before")
    @classmethod
    def normalize_actor_type(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v
        v = v.lower().strip()
        mapping = {
            "primary": "average",
            "internal": "average",
            "external": "simple",
            "third-party": "simple",
            "admin": "complex",
            "system": "complex",
            "user": "average",
            "customer": "average",
            "guest": "simple",
        }
        return mapping.get(v, v)


class UseCase(BaseModel):
    name: str = Field(..., min_length=1, description="Use case name")
    description: str = Field("", description="Use case description")
    transactions: int = Field(..., ge=1, description="Number of atomic transactions")
    complexity: str = Field("simple", description="simple | average | complex")
    weight: int = Field(0, description="Computed weight (5 / 10 / 15)")

    @field_validator("complexity", mode="before")
    @classmethod
    def normalize_complexity(cls, v: Any) -> str:
        if not isinstance(v, str):
            return "average"
        v = v.lower().strip()
        return v if v in {"simple", "average", "complex"} else "average"

    @field_validator("transactions", mode="before")
    @classmethod
    def handle_transaction_list(cls, v: Any) -> int:
        if isinstance(v, list):
            return len(v)
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return 1
        return v


class AIExtractionMetrics(BaseModel):
    uaw: float = 0.0
    uucw: float = 0.0
    uucp: float = 0.0
    tcf: float = 1.0
    ecf: float = 1.0
    ucp: float = 0.0

    @field_validator("uucp", mode="before")
    @classmethod
    def compute_uucp_if_missing(cls, v: Any, info) -> float:
        if v is not None and v != 0:
            return v
        data = info.data
        return data.get("uaw", 0) + data.get("uucw", 0)

    @field_validator("ucp", mode="before")
    @classmethod
    def compute_ucp_if_missing(cls, v: Any, info) -> float:
        if v is not None and v != 0:
            return v
        data = info.data
        return data.get("uucp", 0) * data.get("tcf", 1.0) * data.get("ecf", 1.0)


class AIExtractionResult(BaseModel):
    """Structured result from AI extraction (internal use only)."""

    reasoning_log: Union[str, List[Any]] = Field(
        ..., description="Chain-of-thought reasoning for each use case"
    )
    actors: List[Actor] = Field(default_factory=list)
    use_cases: List[UseCase] = Field(default_factory=list)
    metrics: AIExtractionMetrics = Field(default_factory=AIExtractionMetrics)

    @field_validator("reasoning_log", mode="before")
    @classmethod
    def convert_reasoning_log_to_string(cls, v: Any) -> str:
        if isinstance(v, list):
            parts = [
                json.dumps(item, indent=2) if isinstance(item, dict) else str(item)
                for item in v
            ]
            return "\n".join(parts)
        return str(v)

    @field_validator("actors")
    @classmethod
    def actors_not_empty(cls, v: List[Actor]) -> List[Actor]:
        if not v:
            raise ValueError("At least one actor must be identified")
        return v

    @field_validator("use_cases")
    @classmethod
    def use_cases_not_empty(cls, v: List[UseCase]) -> List[UseCase]:
        if not v:
            raise ValueError("At least one use case must be identified")
        return v


class AnalysisRequest(BaseModel):
    """Request body for the /analyze endpoint."""

    text: str | None = Field(None, min_length=10, description="Raw requirement text")


# ── Public API schemas (appear in Swagger) ───────────────────────────────────


class AnalysisMetrics(BaseModel):
    """All seven UCP metrics computed by the backend calculator."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "uaw": 11,
                "uucw": 95,
                "uucp": 106,
                "tcf": 1.02,
                "ecf": 1.04,
                "ucp": 112.27,
                "effort_hours": 2245.4,
            }
        }
    )

    uaw: float = Field(
        ...,
        description="Unadjusted Actor Weight — sum of all actor weights (Simple=1, Average=2, Complex=3)",
    )
    uucw: float = Field(
        ...,
        description="Unadjusted Use Case Weight — sum of all use-case weights (Simple=5, Average=10, Complex=15)",
    )
    uucp: float = Field(..., description="Unadjusted Use Case Points = UAW + UUCW")
    tcf: float = Field(
        ...,
        description="Technical Complexity Factor = 0.6 + (0.01 × TF). Baseline ≈ 0.99 (all T-factors = 3)",
    )
    ecf: float = Field(
        ...,
        description="Environmental Complexity Factor = 1.0 + ((EF − 24) × 0.02). Baseline = 1.00",
    )
    ucp: float = Field(..., description="Use Case Points = UUCP × TCF × ECF")
    effort_hours: float = Field(
        ..., description="Estimated effort in person-hours = UCP × 20"
    )


class ActorBreakdown(BaseModel):
    """A single actor extracted from the requirements."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"name": "Customer", "actor_type": "average", "weight": 2}
        }
    )

    name: str = Field(..., description="Actor name as identified in the requirements")
    actor_type: ActorType = Field(
        ..., description="Complexity classification: simple | average | complex"
    )
    weight: int = Field(
        ..., description="Weight assigned by the UCP method (1 / 2 / 3)"
    )


class UseCaseBreakdown(BaseModel):
    """A single use case extracted from the requirements."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Order Placement",
                "description": "User selects items, confirms payment, and receives a confirmation email.",
                "complexity": "complex",
                "weight": 15,
            }
        }
    )

    name: str = Field(
        ..., description="Use case name as identified in the requirements"
    )
    description: str = Field(
        ...,
        description="One-sentence description of the use case's purpose and outcome",
    )
    complexity: str = Field(
        ...,
        description="Complexity tier: simple (1–3 tx) | average (4–7 tx) | complex (≥8 tx)",
    )
    weight: int = Field(
        ..., description="Weight assigned by the UCP method (5 / 10 / 15)"
    )


class AnalysisResponse(BaseModel):
    """Complete UCP estimation result returned after any analysis run."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_name": "E-Commerce Platform",
                "actors": [
                    {"name": "Customer", "actor_type": "average", "weight": 2},
                    {"name": "Admin", "actor_type": "complex", "weight": 3},
                    {"name": "Payment Gateway", "actor_type": "average", "weight": 2},
                    {"name": "Email Service", "actor_type": "simple", "weight": 1},
                    {"name": "Inventory System", "actor_type": "complex", "weight": 3},
                ],
                "use_cases": [
                    {
                        "name": "User Registration",
                        "description": "Register with email/password.",
                        "complexity": "average",
                        "weight": 10,
                    },
                    {
                        "name": "Order Placement",
                        "description": "Place order with payment.",
                        "complexity": "complex",
                        "weight": 15,
                    },
                    {
                        "name": "Product Catalogue Browse",
                        "description": "Browse product listings.",
                        "complexity": "simple",
                        "weight": 5,
                    },
                ],
                "metrics": {
                    "uaw": 11,
                    "uucw": 30,
                    "uucp": 41,
                    "tcf": 1.02,
                    "ecf": 1.04,
                    "ucp": 43.49,
                    "effort_hours": 869.9,
                },
            }
        }
    )

    project_name: str | None = Field(
        None, description="Project name (auto-detected from text or set by the caller)"
    )
    actors: List[ActorBreakdown] = Field(
        ..., description="Ordered list of extracted actors with computed weights"
    )
    use_cases: List[UseCaseBreakdown] = Field(
        ..., description="Ordered list of extracted use cases with computed weights"
    )
    metrics: AnalysisMetrics = Field(..., description="All seven UCP metrics")


# ── Manual input schemas ─────────────────────────────────────────────────────


class ManualActorInput(BaseModel):
    """A single actor supplied by the caller in manual mode."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "Customer", "type": "average"}}
    )

    name: str = Field(
        ...,
        min_length=1,
        description="Actor name (e.g. 'Customer', 'Admin', 'Payment Gateway')",
    )
    type: ActorType = Field(
        ...,
        description="Complexity: simple (external API) | average (human user) | complex (stateful system)",
    )


class ManualUseCaseInput(BaseModel):
    """A single use case supplied by the caller in manual mode."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Order Placement",
                "description": "User selects items, confirms payment, and receives confirmation.",
                "complexity": "complex",
            }
        }
    )

    name: str = Field(..., min_length=1, description="Use case name")
    description: str = Field(
        "", description="Short description of the use case's goal and outcome"
    )
    complexity: str = Field(
        ..., description="simple (1–3 tx) | average (4–7 tx) | complex (≥8 tx)"
    )
    transactions: int | None = Field(
        None,
        ge=1,
        description="Optional explicit transaction count (defaults to 1 if omitted)",
    )

    @field_validator("complexity", mode="before")
    @classmethod
    def normalize_complexity(cls, v: Any) -> str:
        if not isinstance(v, str):
            return "average"
        v = v.lower().strip()
        if v not in {"simple", "average", "complex"}:
            raise ValueError("complexity must be one of: simple, average, complex")
        return v


class ManualAnalysisRequest(BaseModel):
    """Request body for POST /api/analyze/manual."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "project_name": "E-Commerce Platform",
                "actors": [
                    {"name": "Customer", "type": "average"},
                    {"name": "Admin", "type": "complex"},
                    {"name": "Payment Gateway", "type": "simple"},
                ],
                "use_cases": [
                    {
                        "name": "User Registration",
                        "description": "Register with email and password; welcome email sent.",
                        "complexity": "average",
                    },
                    {
                        "name": "Order Placement",
                        "description": "Select items, confirm payment, receive confirmation.",
                        "complexity": "complex",
                    },
                    {
                        "name": "Product Catalogue Browse",
                        "description": "Browse and filter the product catalogue.",
                        "complexity": "simple",
                    },
                ],
            }
        }
    )

    project_name: str | None = Field(
        None, min_length=1, description="Optional project name"
    )
    actors: List[ManualActorInput] = Field(
        ..., description="List of actors (at least one required)"
    )
    use_cases: List[ManualUseCaseInput] = Field(
        ..., description="List of use cases (at least one required)"
    )

    @field_validator("actors")
    @classmethod
    def actors_not_empty(cls, v: List[ManualActorInput]) -> List[ManualActorInput]:
        if not v:
            raise ValueError("At least one actor is required")
        return v

    @field_validator("use_cases")
    @classmethod
    def use_cases_not_empty(
        cls, v: List[ManualUseCaseInput]
    ) -> List[ManualUseCaseInput]:
        if not v:
            raise ValueError("At least one use case is required")
        return v


# ── Project history schemas ──────────────────────────────────────────────────


class ProjectSummary(BaseModel):
    """Summary row returned by GET /api/projects."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 42,
                "name": "E-Commerce Platform",
                "created_at": "2025-04-18T14:32:00",
                "metrics": {
                    "uaw": 11,
                    "uucw": 95,
                    "uucp": 106,
                    "tcf": 1.02,
                    "ecf": 1.04,
                    "ucp": 112.27,
                    "effort_hours": 2245.4,
                },
            }
        }
    )

    id: int = Field(..., description="Unique project ID")
    name: str = Field(..., description="Project name")
    created_at: str = Field(..., description="ISO-8601 creation timestamp")
    metrics: AnalysisMetrics = Field(..., description="Top-level UCP metrics")


class ProjectDetailResponse(BaseModel):
    """Full project detail returned by GET /api/projects/{project_id}."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 42,
                "name": "E-Commerce Platform",
                "created_at": "2025-04-18T14:32:00",
                "actors": [
                    {"name": "Customer", "actor_type": "average", "weight": 2},
                    {"name": "Admin", "actor_type": "complex", "weight": 3},
                    {"name": "Payment Gateway", "actor_type": "simple", "weight": 1},
                ],
                "use_cases": [
                    {
                        "name": "User Registration",
                        "description": "Register and send welcome email.",
                        "complexity": "average",
                        "weight": 10,
                    },
                    {
                        "name": "Order Placement",
                        "description": "Select items, pay, confirm.",
                        "complexity": "complex",
                        "weight": 15,
                    },
                ],
                "metrics": {
                    "uaw": 6,
                    "uucw": 25,
                    "uucp": 31,
                    "tcf": 1.02,
                    "ecf": 1.04,
                    "ucp": 32.88,
                    "effort_hours": 657.7,
                },
            }
        }
    )

    id: int = Field(..., description="Unique project ID")
    name: str = Field(..., description="Project name")
    created_at: str = Field(..., description="ISO-8601 creation timestamp")
    actors: List[ActorBreakdown] = Field(
        ..., description="All actors with computed weights"
    )
    use_cases: List[UseCaseBreakdown] = Field(
        ..., description="All use cases with computed weights"
    )
    metrics: AnalysisMetrics = Field(..., description="All seven UCP metrics")
