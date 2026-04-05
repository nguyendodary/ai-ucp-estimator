from enum import Enum
from typing import List

from pydantic import BaseModel, Field, field_validator


class ActorType(str, Enum):
    simple = "simple"
    average = "average"
    complex = "complex"


class Actor(BaseModel):
    name: str = Field(..., min_length=1, description="Actor name")
    type: ActorType = Field(..., description="Actor complexity classification")


class UseCase(BaseModel):
    name: str = Field(..., min_length=1, description="Use case name")
    transactions: int = Field(
        ..., ge=1, description="Number of transactions in the use case"
    )


class AIExtractionResult(BaseModel):
    """Structured result from AI extraction."""

    actors: List[Actor] = Field(default_factory=list)
    use_cases: List[UseCase] = Field(default_factory=list)

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

    actors: List[Actor]
    use_cases: List[UseCase]
    uaw: float
    uucw: float
    uucp: float
    tcf: float
    ecf: float
    ucp: float
    effort_hours: float


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

    actors: List[ActorBreakdown]
    use_cases: List[UseCaseBreakdown]
    uaw: float
    uucw: float
    uucp: float
    tcf: float
    ecf: float
    ucp: float
    effort_hours: float
