from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator

from .enums import AgentClassification, AgentStatus, AgentType


class Signal(BaseModel):
    name: str = Field(min_length=1)
    value: str | int | float | bool
    interpretation: str = Field(min_length=1)
    source: str = Field(min_length=1)


class Evidence(BaseModel):
    source_name: str = Field(min_length=1)
    source_type: str = Field(min_length=1)
    excerpt: str = Field(min_length=1)
    url: str | None = None
    page: int | None = Field(default=None, ge=1)
    chunk_id: str | None = None
    relevance_score: float | None = Field(default=None, ge=0, le=1)
    synthetic: bool = False


class AgentOutput(BaseModel):
    agent: AgentType
    status: AgentStatus
    classification: AgentClassification
    confidence: float = Field(ge=0, le=1)
    signals: list[Signal] = Field(default_factory=list)
    reasoning: list[str] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    latency_ms: float = Field(ge=0)
    limitations: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def enforce_failure_contract(self) -> "AgentOutput":
        if self.status in {AgentStatus.UNAVAILABLE, AgentStatus.ERROR}:
            if self.classification != AgentClassification.UNKNOWN:
                raise ValueError("unavailable/error agents must classify as UNKNOWN")
            if self.confidence != 0:
                raise ValueError("unavailable/error agents must have zero confidence")
        if self.status == AgentStatus.SUCCESS and self.classification == AgentClassification.UNKNOWN:
            raise ValueError("successful agents cannot classify as UNKNOWN")
        return self
