from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import perf_counter
from uuid import uuid4

from backend.app.agents.fundamental import run_fundamental_analysis
from backend.app.agents.sentiment import run_sentiment_analysis
from backend.app.agents.technical import run_technical_analysis
from backend.app.database import Repository, build_repository
from backend.app.personalization import personalize
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    AnalysisMetric,
    AnalysisResponse,
    AnalyzeRequest,
    DecisionTraceStep,
    DocumentChunk,
    MarketData,
    NewsItem,
)
from backend.app.services.data import DataNotFoundError, DataService, build_data_service
from backend.app.services.gemini import InsightGenerator, build_insight_generator
from backend.app.synthesis import synthesize


logger = logging.getLogger(__name__)

TechnicalAgent = Callable[[str, MarketData, AnalysisContext], Awaitable[AgentOutput]]
FundamentalAgent = Callable[[str, str, AnalysisContext, list[DocumentChunk]], Awaitable[AgentOutput]]
SentimentAgent = Callable[[str, list[NewsItem], AnalysisContext], Awaitable[AgentOutput]]


@dataclass(frozen=True, slots=True)
class AgentSuite:
    technical: TechnicalAgent = run_technical_analysis
    fundamental: FundamentalAgent = run_fundamental_analysis
    sentiment: SentimentAgent = run_sentiment_analysis


class AnalysisOrchestrator:
    def __init__(
        self,
        repository: Repository,
        data_service: DataService | None = None,
        agents: AgentSuite | None = None,
        insight_generator: InsightGenerator | None = None,
        agent_timeout_seconds: float = 5.0,
    ) -> None:
        self.repository = repository
        self.data_service = data_service or build_data_service()
        self.agents = agents or AgentSuite()
        self.insight_generator = insight_generator or build_insight_generator()
        self.agent_timeout_seconds = agent_timeout_seconds

    @staticmethod
    async def _safe_agent(
        expected_agent: AgentType,
        operation: Awaitable[AgentOutput],
        timeout_seconds: float,
    ) -> AgentOutput:
        started = perf_counter()
        try:
            result = await asyncio.wait_for(operation, timeout=timeout_seconds)
            if not isinstance(result, AgentOutput):
                raise TypeError(
                    f"Agent contract mismatch: expected AgentOutput, received {type(result).__name__}"
                )
            if result.agent != expected_agent:
                raise ValueError(
                    f"Agent contract mismatch: expected {expected_agent.value}, received {result.agent.value}"
                )
            return result
        except Exception as exc:  # boundary intentionally catches teammate implementation failures
            return AgentOutput(
                agent=expected_agent,
                status=AgentStatus.ERROR,
                classification=AgentClassification.UNKNOWN,
                confidence=0,
                latency_ms=round((perf_counter() - started) * 1000, 3),
                limitations=[f"Agent execution failed safely: {type(exc).__name__}."],
                metadata={"error_type": type(exc).__name__},
            )

    async def run_analysis(self, request: AnalyzeRequest) -> AnalysisResponse:
        pipeline_started = perf_counter()
        profile, portfolio, watchlist = await asyncio.gather(
            self.repository.get_profile(request.user_id),
            self.repository.get_portfolio(request.user_id),
            self.repository.get_watchlist(request.user_id),
        )

        raw_market, raw_news, raw_documents = await asyncio.gather(
            self.data_service.market_data(request.symbol),
            self.data_service.news_items(request.symbol),
            self.data_service.document_chunks(request.symbol),
            return_exceptions=True,
        )
        if isinstance(raw_market, Exception):
            if isinstance(raw_market, DataNotFoundError):
                raise raw_market
            raise DataNotFoundError(f"Market data unavailable for {request.symbol}") from raw_market
        if raw_market.symbol.upper() != request.symbol:
            raise DataNotFoundError(
                f"Market dataset symbol mismatch for {request.symbol}; received {raw_market.symbol}."
            )

        input_warnings: list[str] = []
        news_items: list[NewsItem]
        documents: list[DocumentChunk]
        if isinstance(raw_news, Exception):
            news_items = []
            input_warnings.append("News input could not be loaded; sentiment may be unavailable.")
        else:
            news_items = [item for item in raw_news if item.symbol.upper() == request.symbol]
            if len(news_items) != len(raw_news):
                input_warnings.append("News items for other symbols were excluded from analysis.")
            if any(item.synthetic for item in news_items):
                input_warnings.append("News uses a labeled synthetic fallback because live items were unavailable.")
            elif any(item.source_name.endswith("(stale cache)") for item in news_items):
                input_warnings.append("News uses an expired cached snapshot because the live provider was unavailable.")
        if isinstance(raw_documents, Exception):
            documents = []
            input_warnings.append("Financial documents could not be loaded; fundamental analysis may be unavailable.")
        else:
            documents = [item for item in raw_documents if item.symbol.upper() == request.symbol]
            if len(documents) != len(raw_documents):
                input_warnings.append("Document chunks for other symbols were excluded from analysis.")
            if any(item.synthetic for item in documents):
                input_warnings.append(
                    "Financial statements use a labeled synthetic fallback because live statements were unavailable."
                )
            elif any(item.source_name.endswith("(stale cache)") for item in documents):
                input_warnings.append(
                    "Financial statements use an expired cached snapshot because the live provider was unavailable."
                )

        context = AnalysisContext(
            user_id=request.user_id,
            profile=profile,
            portfolio=portfolio,
            scenario=request.scenario,
        )
        technical_coro = self.agents.technical(request.symbol, raw_market, context)
        fundamental_coro = self.agents.fundamental(request.symbol, request.query, context, documents)
        sentiment_coro = self.agents.sentiment(request.symbol, news_items, context)
        agent_results = await asyncio.gather(
            self._safe_agent(AgentType.TECHNICAL, technical_coro, self.agent_timeout_seconds),
            self._safe_agent(AgentType.FUNDAMENTAL, fundamental_coro, self.agent_timeout_seconds),
            self._safe_agent(AgentType.SENTIMENT, sentiment_coro, self.agent_timeout_seconds),
        )

        synthesis = synthesize(list(agent_results))
        intelligence = personalize(synthesis, profile, portfolio, request.symbol)
        ai_insight = await self.insight_generator.generate(
            symbol=request.symbol,
            query=request.query,
            market_data=raw_market,
            profile=profile,
            portfolio=portfolio,
            agent_results=list(agent_results),
            synthesis=synthesis,
            intelligence=intelligence,
        )
        total_latency_ms = (perf_counter() - pipeline_started) * 1000
        metrics = [
            *[
                AnalysisMetric(
                    name=f"{result.agent.value}_agent_latency",
                    value=result.latency_ms,
                    unit="ms",
                )
                for result in agent_results
            ],
            AnalysisMetric(name="total_pipeline_latency", value=round(total_latency_ms, 3), unit="ms"),
            AnalysisMetric(name="gemini_latency", value=ai_insight.latency_ms, unit="ms"),
            AnalysisMetric(name="signal_agreement", value=synthesis.agreement_score, unit="ratio"),
            AnalysisMetric(name="data_completeness", value=synthesis.data_completeness, unit="ratio"),
            AnalysisMetric(
                name="portfolio_concentration",
                value=portfolio.concentration_score,
                unit="ratio",
            ),
        ]

        warnings = list(input_warnings)
        for result in agent_results:
            if result.status != AgentStatus.SUCCESS:
                warnings.append(f"{result.agent.value.title()} agent status: {result.status.value}.")
        if synthesis.conflict_detected:
            warnings.append("Specialist signals conflict; final confidence was reduced.")
        if raw_market.synthetic:
            warnings.append("Market data is a labeled synthetic Sprint 1 fixture, not a live quote.")
        elif raw_market.source.endswith(":stale_cache"):
            warnings.append(
                "The live market provider was unavailable; the most recent expired cached snapshot was used."
            )
        if ai_insight.status != "success":
            warnings.append(ai_insight.limitation or "Gemini insight is unavailable.")
        elif ai_insight.limitation:
            warnings.append(ai_insight.limitation)

        decision_trace = [
            DecisionTraceStep(
                stage="inputs",
                title="Market and investor context loaded",
                summary=f"Loaded {request.symbol} at {raw_market.current_price:.2f} {raw_market.currency} for {profile.display_name}.",
                details={
                    "source": raw_market.source,
                    "synthetic": raw_market.synthetic,
                    "risk_tolerance": profile.risk_tolerance.value,
                    "portfolio_exposure_percent": portfolio.exposure_for(request.symbol),
                },
            ),
            *[
                DecisionTraceStep(
                    stage=f"agent:{result.agent.value}",
                    title=f"{result.agent.value.title()} agent {result.status.value}",
                    summary=f"{result.classification.value} at {result.confidence:.1%} confidence.",
                    details={
                        "signals": [signal.model_dump(mode="json") for signal in result.signals],
                        "reasoning": result.reasoning,
                        "evidence_count": len(result.evidence),
                        "latency_ms": result.latency_ms,
                        "limitations": result.limitations,
                    },
                )
                for result in agent_results
            ],
            DecisionTraceStep(
                stage="synthesis",
                title="Evidence-weighted synthesis",
                summary=f"{synthesis.outlook.value} at {synthesis.confidence:.1%} confidence.",
                details={
                    "market_score": synthesis.market_score,
                    "agreement_score": synthesis.agreement_score,
                    "data_completeness": synthesis.data_completeness,
                    "conflict_detected": synthesis.conflict_detected,
                },
            ),
            DecisionTraceStep(
                stage="personalization",
                title="Investor-specific risk adjustment",
                summary=f"{intelligence.recommendation.value} with {intelligence.risk_level.value} risk.",
                details={
                    "risk_score": intelligence.risk_score,
                    "portfolio_exposure_percent": intelligence.portfolio_exposure_percent,
                    "reasons": intelligence.reasons,
                },
            ),
            DecisionTraceStep(
                stage="gemini",
                title=f"Gemini research enrichment {ai_insight.status}",
                summary=(
                    ai_insight.summary
                    if ai_insight.summary
                    else (ai_insight.limitation or "No Gemini explanation was produced.")
                ),
                details={
                    "provider": ai_insight.provider,
                    "model": ai_insight.model,
                    "grounded": ai_insight.grounded,
                    "citation_count": len(ai_insight.citations),
                    "latency_ms": ai_insight.latency_ms,
                },
            ),
        ]

        response = AnalysisResponse(
            analysis_id=str(uuid4()),
            symbol=request.symbol,
            query=request.query,
            scenario=request.scenario,
            market_data=raw_market,
            investor_profile=profile,
            portfolio=portfolio,
            watchlist=watchlist,
            agent_results=list(agent_results),
            synthesis=synthesis,
            intelligence=intelligence,
            ai_insight=ai_insight,
            decision_trace=decision_trace,
            metrics=metrics,
            warnings=warnings,
        )
        try:
            await self.repository.save_analysis(response)
        except Exception as exc:  # persistence should not erase an otherwise useful analysis
            response.warnings.append(f"Analysis persistence failed safely: {type(exc).__name__}.")
            logger.warning(
                "analysis_persistence_failed",
                extra={"analysis_id": response.analysis_id, "error_type": type(exc).__name__},
            )
        logger.info(
            "analysis_completed",
            extra={
                "analysis_id": response.analysis_id,
                "symbol": response.symbol,
                "user_id": request.user_id,
                "scenario": request.scenario.value,
                "outlook": response.synthesis.outlook.value,
                "recommendation": response.intelligence.recommendation.value,
                "pipeline_latency_ms": round(total_latency_ms, 3),
            },
        )
        return response


def build_orchestrator(repository: Repository | None = None) -> AnalysisOrchestrator:
    return AnalysisOrchestrator(repository=repository or build_repository())
