from __future__ import annotations

from abc import ABC, abstractmethod
import logging
from typing import Any

import httpx

from backend.app.core.config import Settings, settings
from backend.app.schemas import (
    AnalysisResponse,
    Holding,
    InvestmentHorizon,
    InvestorProfile,
    Portfolio,
    RiskTolerance,
)


logger = logging.getLogger(__name__)


class Repository(ABC):
    @abstractmethod
    async def get_profile(self, user_id: str) -> InvestorProfile: ...

    @abstractmethod
    async def get_portfolio(self, user_id: str) -> Portfolio: ...

    @abstractmethod
    async def get_watchlist(self, user_id: str) -> list[str]: ...

    @abstractmethod
    async def save_analysis(self, analysis: AnalysisResponse) -> None: ...

    @abstractmethod
    async def get_analysis(self, analysis_id: str) -> AnalysisResponse: ...


class InMemoryRepository(Repository):
    """Deterministic local fallback and test repository."""

    def __init__(self) -> None:
        self.profiles = {
            "conservative-demo": InvestorProfile(
                user_id="conservative-demo",
                display_name="Conservative Priya",
                risk_tolerance=RiskTolerance.CONSERVATIVE,
                investment_horizon=InvestmentHorizon.LONG,
                max_position_size=15,
            ),
            "aggressive-demo": InvestorProfile(
                user_id="aggressive-demo",
                display_name="Aggressive Arjun",
                risk_tolerance=RiskTolerance.AGGRESSIVE,
                investment_horizon=InvestmentHorizon.SHORT,
                max_position_size=20,
            ),
        }
        self.portfolios = {
            "conservative-demo": Portfolio(
                user_id="conservative-demo",
                holdings=[
                    Holding(symbol="RELIANCE", quantity=42, allocation_percent=25),
                    Holding(symbol="TCS", quantity=15, allocation_percent=18),
                    Holding(symbol="HDFCBANK", quantity=30, allocation_percent=14),
                ],
            ),
            "aggressive-demo": Portfolio(
                user_id="aggressive-demo",
                holdings=[
                    Holding(symbol="RELIANCE", quantity=8, allocation_percent=5),
                    Holding(symbol="TCS", quantity=12, allocation_percent=12),
                    Holding(symbol="INFY", quantity=20, allocation_percent=10),
                ],
            ),
        }
        self.watchlists = {
            "conservative-demo": ["RELIANCE", "TCS", "HDFCBANK"],
            "aggressive-demo": ["RELIANCE", "TCS", "INFY"],
        }
        self.analyses: dict[str, AnalysisResponse] = {}

    async def get_profile(self, user_id: str) -> InvestorProfile:
        try:
            return self.profiles[user_id].model_copy(deep=True)
        except KeyError as exc:
            raise KeyError(f"Unknown user: {user_id}") from exc

    async def get_portfolio(self, user_id: str) -> Portfolio:
        try:
            return self.portfolios[user_id].model_copy(deep=True)
        except KeyError as exc:
            raise KeyError(f"Unknown user: {user_id}") from exc

    async def get_watchlist(self, user_id: str) -> list[str]:
        if user_id not in self.watchlists:
            raise KeyError(f"Unknown user: {user_id}")
        return list(self.watchlists[user_id])

    async def save_analysis(self, analysis: AnalysisResponse) -> None:
        self.analyses[analysis.analysis_id] = analysis.model_copy(deep=True)

    async def get_analysis(self, analysis_id: str) -> AnalysisResponse:
        try:
            return self.analyses[analysis_id].model_copy(deep=True)
        except KeyError as exc:
            raise KeyError(f"Unknown analysis: {analysis_id}") from exc


class SupabaseRepository(Repository):
    """Small PostgREST adapter; no Supabase-specific SDK is required."""

    def __init__(self, url: str, key: str, timeout: float = 10.0) -> None:
        self.base_url = f"{url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": key,
            "Content-Type": "application/json",
        }
        # Opaque sb_secret_* keys authenticate through the apikey header. A
        # legacy service_role JWT additionally belongs in Authorization.
        if not key.startswith("sb_secret_"):
            self.headers["Authorization"] = f"Bearer {key}"
        self.timeout = timeout

    async def _get_rows(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/{table}", headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def _insert(self, table: str, payload: object) -> None:
        headers = {**self.headers, "Prefer": "return=minimal"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/{table}", headers=headers, json=payload)
            response.raise_for_status()

    async def get_profile(self, user_id: str) -> InvestorProfile:
        rows = await self._get_rows("investor_profiles", {"user_id": f"eq.{user_id}", "select": "*"})
        if not rows:
            raise KeyError(f"Unknown user: {user_id}")
        return InvestorProfile.model_validate(rows[0])

    async def get_portfolio(self, user_id: str) -> Portfolio:
        rows = await self._get_rows(
            "portfolio_holdings", {"user_id": f"eq.{user_id}", "select": "symbol,quantity,allocation_percent"}
        )
        return Portfolio(user_id=user_id, holdings=[Holding.model_validate(row) for row in rows])

    async def get_watchlist(self, user_id: str) -> list[str]:
        rows = await self._get_rows("watchlists", {"user_id": f"eq.{user_id}", "select": "symbol"})
        return [row["symbol"] for row in rows]

    async def save_analysis(self, analysis: AnalysisResponse) -> None:
        payload = analysis.model_dump(mode="json")
        await self._insert(
            "analyses",
            {
                "id": analysis.analysis_id,
                "user_id": analysis.investor_profile.user_id,
                "symbol": analysis.symbol,
                "query": analysis.query,
                "scenario": analysis.scenario.value,
                "overall_classification": analysis.synthesis.outlook.value,
                "overall_confidence": analysis.synthesis.confidence,
                "recommendation": analysis.intelligence.recommendation.value,
                "risk_score": analysis.intelligence.risk_score,
                "llm_provider": analysis.ai_insight.provider,
                "llm_model": analysis.ai_insight.model,
                "llm_status": analysis.ai_insight.status,
                "llm_grounded": analysis.ai_insight.grounded,
                "payload": payload,
                "created_at": analysis.created_at.isoformat(),
            },
        )
        await self._insert(
            "agent_results",
            [
                {
                    "analysis_id": analysis.analysis_id,
                    "agent_type": result.agent.value,
                    "status": result.status.value,
                    "classification": result.classification.value,
                    "confidence": result.confidence,
                    "reasoning": result.reasoning,
                    "signals": [signal.model_dump(mode="json") for signal in result.signals],
                    "evidence": [item.model_dump(mode="json") for item in result.evidence],
                    "latency_ms": result.latency_ms,
                }
                for result in analysis.agent_results
            ],
        )
        await self._insert(
            "analysis_metrics",
            [
                {
                    "analysis_id": analysis.analysis_id,
                    "metric_name": metric.name,
                    "metric_value": metric.value,
                    "unit": metric.unit,
                }
                for metric in analysis.metrics
            ],
        )
        evidence_rows = [
            {
                "analysis_id": analysis.analysis_id,
                "agent_type": result.agent.value,
                "source_name": evidence.source_name,
                "source_type": evidence.source_type,
                "page": evidence.page,
                "chunk_id": evidence.chunk_id,
                "excerpt": evidence.excerpt,
                "relevance_score": evidence.relevance_score,
                "synthetic": evidence.synthetic,
            }
            for result in analysis.agent_results
            for evidence in result.evidence
        ]
        if evidence_rows:
            await self._insert("evidence", evidence_rows)

    async def get_analysis(self, analysis_id: str) -> AnalysisResponse:
        rows = await self._get_rows("analyses", {"id": f"eq.{analysis_id}", "select": "payload"})
        if not rows:
            raise KeyError(f"Unknown analysis: {analysis_id}")
        return AnalysisResponse.model_validate(rows[0]["payload"])


def build_repository(config: Settings = settings) -> Repository:
    if config.has_supabase:
        return SupabaseRepository(config.supabase_url, config.supabase_key)
    if config.supabase_url or config.supabase_key:
        logger.warning(
            "supabase_configuration_incomplete",
            extra={
                "has_url": bool(config.supabase_url),
                "has_server_key": bool(config.supabase_key),
            },
        )
    return InMemoryRepository()
