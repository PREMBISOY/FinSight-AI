from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, Field

from .enums import InvestmentHorizon, RiskTolerance


class InvestorProfile(BaseModel):
    user_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    risk_tolerance: RiskTolerance
    investment_horizon: InvestmentHorizon
    max_position_size: float = Field(gt=0, le=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Holding(BaseModel):
    symbol: str = Field(min_length=1)
    quantity: float = Field(ge=0)
    allocation_percent: float = Field(ge=0, le=100)


class Portfolio(BaseModel):
    user_id: str = Field(min_length=1)
    holdings: list[Holding] = Field(default_factory=list)

    def exposure_for(self, symbol: str) -> float:
        wanted = symbol.upper()
        return sum(
            holding.allocation_percent
            for holding in self.holdings
            if holding.symbol.upper() == wanted
        )

    @property
    def concentration_score(self) -> float:
        return max((holding.allocation_percent for holding in self.holdings), default=0) / 100


class UserContext(BaseModel):
    profile: InvestorProfile
    portfolio: Portfolio
    watchlist: list[str] = Field(default_factory=list)
