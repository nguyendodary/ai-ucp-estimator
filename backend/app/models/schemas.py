import json
from enum import Enum
from typing import Any, List, Union

from pydantic import BaseModel, Field, field_validator


class ActorType(str, Enum):
    simple = "simple"
    average = "average"
    complex = "complex"


class Actor(BaseModel):
    name: str = Field(..., min_length=1, description="Actor name")
    type: ActorType = Field(..., description="Actor complexity classification")
    weight: int = Field(0, description="Actor weight")

    @field_validator("type", mode="before")
    @classmethod
    def normalize_actor_type(cls, v: Any) -> str:
        if not isinstance(v, str):
            return v
        v = v.lower().strip()
        # Map common non-standard terms to valid types
        mapping = {
            "primary": "average",      # Normal human users (Customer, User)
            "internal": "average",     # Internal users
            "external": "simple",      # External systems (Email, Notification)
            "third-party": "simple",   # Third party integrations
            "admin": "complex",        # Admin/Manager with control privileges
            "system": "complex",       # Complex system integrations
            "user": "average",         # Standard user
            "customer": "average",     # Customer
            "guest": "simple",         # Guest user
        }
        if v in mapping:
            return mapping[v]
        return v


class UseCase(BaseModel):
    name: str = Field(..., min_length=1, description="Use case name")
    transactions: int = Field(
        ..., ge=1, description="Number of transactions in the use case"
    )
    complexity: str = Field("simple", description="Use case complexity (simple|average|complex)")
    weight: int = Field(0, description="Use case weight")

    @field_validator("transactions", mode="before")
    @classmethod
    def handle_transaction_list(cls, v: Any) -> int:
        if isinstance(v, list):
            # If AI sends a list of steps, the count of steps is the transaction count
            return len(v)
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                # If it's a string that's not a number, maybe it's a single step?
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
        # If uucp is missing or zero, compute it from uaw + uucw
        data = info.data
        uaw = data.get("uaw", 0)
        uucw = data.get("uucw", 0)
        return uaw + uucw

    @field_validator("ucp", mode="before")
    @classmethod
    def compute_ucp_if_missing(cls, v: Any, info) -> float:
        if v is not None and v != 0:
            return v
        data = info.data
        uucp = data.get("uucp", 0)
        tcf = data.get("tcf", 1.0)
        ecf = data.get("ecf", 1.0)
        return uucp * tcf * ecf


class AIExtractionResult(BaseModel):
    """Structured result from AI extraction."""

    reasoning_log: Union[str, List[Any]] = Field(..., description="Chain-of-thought reasoning for each Use Case")
    actors: List[Actor] = Field(default_factory=list)
    use_cases: List[UseCase] = Field(default_factory=list)
    metrics: AIExtractionMetrics = Field(
        default_factory=AIExtractionMetrics,
        description="Optional AI metrics (backend recalculates authoritative metrics)",
    )

    @field_validator("reasoning_log", mode="before")
    @classmethod
    def convert_reasoning_log_to_string(cls, v: Any) -> str:
        if isinstance(v, list):
            # Convert list of objects or strings to a single formatted string
            parts = []
            for item in v:
                if isinstance(item, dict):
                    parts.append(json.dumps(item, indent=2))
                else:
                    parts.append(str(item))
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


class AnalysisResponse(BaseModel):
    """Response body for the /analyze endpoint."""

    reasoning_log: str
    actors: List[Actor]
    use_cases: List[UseCase]
    uaw: float
    uucw: float
    uucp: float
    tcf: float
    ecf: float
    ucp: float
    effort_hours: float
    tcf_triggers: List[str] = Field(default_factory=list)


class ActorBreakdown(BaseModel):
    name: str
    actor_type: str
    weight: int


class UseCaseBreakdown(BaseModel):
    name: str
    transactions: int
    weight: int


class DetailResponse(BaseModel):
    """Detailed breakdown response for frontend charts."""

    reasoning_log: str
    actors: List[ActorBreakdown]
    use_cases: List[UseCaseBreakdown]
    uaw: float
    uucw: float
    uucp: float
    tcf: float
    ecf: float
    ucp: float
    effort_hours: float
    tcf_triggers: List[str] = Field(default_factory=list)
