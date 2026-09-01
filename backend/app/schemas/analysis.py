from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator

from .agent import AgentOutput
from .enums import MarketOutlook, Recommendation, RiskLevel
from .user import InvestorProfile, Portfolio


class DemoScenario(str, Enum):
    NORMAL = "normal"
    DEGRADED_SENTIMENT = "degraded_sentiment"
    CONFLICT = "conflict"


class PricePoint(BaseModel):
    timestamp: datetime
    close: float = Field(gt=0)
    volume: float = Field(ge=0)


class MarketData(BaseModel):
    symbol: str
    current_price: float = Field(gt=0)
    currency: str = "INR"
    observed_at: datetime
    source: str
    synthetic: bool = False
    history: list[PricePoint] = Field(min_length=2)


class NewsItem(BaseModel):
    id: str
    symbol: str
    headline: str
    summary: str
    source_name: str
    published_at: datetime
    url: str | None = None
    synthetic: bool = False


class DocumentChunk(BaseModel):
    chunk_id: str
    symbol: str
    source_name: str
    source_type: str
    text: str
    page: int | None = Field(default=None, ge=1)
    url: str | None = None
    synthetic: bool = False


class AnalysisContext(BaseModel):
    user_id: str
    profile: InvestorProfile
    portfolio: Portfolio
    scenario: DemoScenario = DemoScenario.NORMAL


class AnalyzeRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    symbol: str = Field(
        min_length=1,
        max_length=20,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$",
    )
    query: str = Field(
        default="What do the latest financial evidence and outlook imply?",
        min_length=1,
        max_length=1000,
    )
    scenario: DemoScenario = DemoScenario.NORMAL

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("user_id", "query")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be blank")
        return stripped


class AgentContribution(BaseModel):
    agent: str
    base_weight: float = Field(ge=0, le=1)
    classification_score: float = Field(ge=-1, le=1)
    confidence: float = Field(ge=0, le=1)
    weighted_score: float = Field(ge=-1, le=1)
    included: bool


class SynthesisResult(BaseModel):
    outlook: MarketOutlook
    market_score: float = Field(ge=-1, le=1)
    confidence: float = Field(ge=0, le=1)
    agreement_score: float = Field(ge=0, le=1)
    data_completeness: float = Field(ge=0, le=1)
    conflict_detected: bool
    contributions: list[AgentContribution]
    reasoning: list[str]
    limitations: list[str]


class PersonalizedIntelligence(BaseModel):
    recommendation: Recommendation
    risk_level: RiskLevel
    risk_score: float = Field(ge=0, le=1)
    portfolio_exposure_percent: float = Field(ge=0, le=100)
    reasons: list[str]
    disclaimer: str = "Prototype investment intelligence, not financial advice."


class ResearchCitation(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    url: HttpUrl


class AIInsight(BaseModel):
    status: str = Field(pattern="^(success|unavailable|error)$")
    provider: str = "google"
    model: str
    grounded: bool = False
    summary: str = ""
    profile_specific_guidance: list[str] = Field(default_factory=list)
    key_risks: list[str] = Field(default_factory=list)
    citations: list[ResearchCitation] = Field(default_factory=list)
    latency_ms: float = Field(default=0, ge=0)
    limitation: str | None = None


class AnalysisMetric(BaseModel):
    name: str
    value: float
    unit: str
    measured: bool = True


class DecisionTraceStep(BaseModel):
    stage: str
    title: str
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    analysis_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    symbol: str
    query: str = "What do the latest financial evidence and outlook imply?"
    scenario: DemoScenario = DemoScenario.NORMAL
    market_data: MarketData
    investor_profile: InvestorProfile
    portfolio: Portfolio
    watchlist: list[str]
    agent_results: list[AgentOutput]
    synthesis: SynthesisResult
    intelligence: PersonalizedIntelligence
    ai_insight: AIInsight = Field(
        default_factory=lambda: AIInsight(
            status="unavailable",
            model="unknown",
            limitation="This stored analysis predates Gemini insight metadata.",
        )
    )
    decision_trace: list[DecisionTraceStep]
    metrics: list[AnalysisMetric]
    warnings: list[str] = Field(default_factory=list)
