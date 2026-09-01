import asyncio
from time import perf_counter

from backend.app.database import InMemoryRepository
from backend.app.orchestrator import AgentSuite, AnalysisOrchestrator
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalyzeRequest,
    DemoScenario,
    MarketOutlook,
    Recommendation,
)
from backend.app.services.data import FixtureDataService


async def test_end_to_end_normal_and_personalization(orchestrator: AnalysisOrchestrator) -> None:
    conservative = await orchestrator.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    aggressive = await orchestrator.run_analysis(
        AnalyzeRequest(user_id="aggressive-demo", symbol="RELIANCE")
    )
    assert conservative.synthesis.model_dump() == aggressive.synthesis.model_dump()
    assert conservative.intelligence.recommendation == Recommendation.HOLD
    assert aggressive.intelligence.recommendation == Recommendation.CONSIDER_ENTRY
    assert len(conservative.agent_results) == 3
    assert len(conservative.decision_trace) == 6
    assert {metric.name for metric in conservative.metrics} >= {
        "technical_agent_latency",
        "fundamental_agent_latency",
        "sentiment_agent_latency",
        "total_pipeline_latency",
        "signal_agreement",
        "portfolio_concentration",
    }


async def test_degraded_sentiment_returns_safe_partial_analysis(orchestrator: AnalysisOrchestrator) -> None:
    result = await orchestrator.run_analysis(
        AnalyzeRequest(
            user_id="conservative-demo",
            symbol="RELIANCE",
            scenario=DemoScenario.DEGRADED_SENTIMENT,
        )
    )
    sentiment = next(item for item in result.agent_results if item.agent == AgentType.SENTIMENT)
    assert sentiment.status == AgentStatus.UNAVAILABLE
    assert sentiment.evidence == []
    assert result.synthesis.data_completeness == 0.8
    assert any("unavailable" in warning for warning in result.warnings)


async def test_conflict_scenario_reduces_confidence(orchestrator: AnalysisOrchestrator) -> None:
    normal = await orchestrator.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    conflict = await orchestrator.run_analysis(
        AnalyzeRequest(
            user_id="conservative-demo", symbol="RELIANCE", scenario=DemoScenario.CONFLICT
        )
    )
    assert conflict.synthesis.conflict_detected
    assert conflict.synthesis.confidence < normal.synthesis.confidence


async def test_agents_execute_concurrently() -> None:
    async def delayed(agent: AgentType) -> AgentOutput:
        started = perf_counter()
        await asyncio.sleep(0.06)
        return AgentOutput(
            agent=agent,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.NEUTRAL,
            confidence=0.6,
            latency_ms=(perf_counter() - started) * 1000,
        )

    async def technical(*args):
        return await delayed(AgentType.TECHNICAL)

    async def fundamental(*args):
        return await delayed(AgentType.FUNDAMENTAL)

    async def sentiment(*args):
        return await delayed(AgentType.SENTIMENT)

    service = AnalysisOrchestrator(
        repository=InMemoryRepository(),
        data_service=FixtureDataService(),
        agents=AgentSuite(technical=technical, fundamental=fundamental, sentiment=sentiment),
    )
    started = perf_counter()
    await service.run_analysis(AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE"))
    elapsed = perf_counter() - started
    assert elapsed < 0.15, "three 60ms agents should overlap instead of taking roughly 180ms"


async def test_agent_exception_isolated_from_pipeline() -> None:
    async def broken(*args):
        raise RuntimeError("feed failure")

    async def technical(*args):
        return AgentOutput(
            agent=AgentType.TECHNICAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.8,
            latency_ms=1,
        )

    async def fundamental(*args):
        return AgentOutput(
            agent=AgentType.FUNDAMENTAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.75,
            latency_ms=1,
        )

    service = AnalysisOrchestrator(
        repository=InMemoryRepository(),
        agents=AgentSuite(technical=technical, fundamental=fundamental, sentiment=broken),
    )
    result = await service.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    sentiment = next(item for item in result.agent_results if item.agent == AgentType.SENTIMENT)
    assert sentiment.status == AgentStatus.ERROR
    assert result.synthesis.data_completeness == 0.8


async def test_malformed_agent_output_becomes_safe_error_result() -> None:
    async def malformed(*args):
        return {"agent": "technical", "status": "success"}

    async def fundamental(*args):
        return AgentOutput(
            agent=AgentType.FUNDAMENTAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.75,
            latency_ms=1,
        )

    async def sentiment(*args):
        return AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.NEUTRAL,
            confidence=0.6,
            latency_ms=1,
        )

    service = AnalysisOrchestrator(
        repository=InMemoryRepository(),
        agents=AgentSuite(technical=malformed, fundamental=fundamental, sentiment=sentiment),
    )
    result = await service.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    technical = next(item for item in result.agent_results if item.agent == AgentType.TECHNICAL)
    assert technical.status == AgentStatus.ERROR
    assert technical.classification == AgentClassification.UNKNOWN
    assert technical.confidence == 0
    assert technical.latency_ms >= 0
    assert technical.metadata["error_type"] == "TypeError"
    assert result.synthesis.data_completeness == 0.6
    assert any("technical agent status: error" in warning.lower() for warning in result.warnings)


async def test_agent_timeout_isolated_from_pipeline() -> None:
    async def slow(*args):
        await asyncio.sleep(0.2)
        return AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.8,
            latency_ms=200,
        )

    async def technical(*args):
        return AgentOutput(
            agent=AgentType.TECHNICAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.8,
            latency_ms=1,
        )

    async def fundamental(*args):
        return AgentOutput(
            agent=AgentType.FUNDAMENTAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=0.75,
            latency_ms=1,
        )

    service = AnalysisOrchestrator(
        repository=InMemoryRepository(),
        agents=AgentSuite(technical=technical, fundamental=fundamental, sentiment=slow),
        agent_timeout_seconds=0.01,
    )
    result = await service.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    sentiment = next(item for item in result.agent_results if item.agent == AgentType.SENTIMENT)
    assert sentiment.status == AgentStatus.ERROR
    assert sentiment.classification == AgentClassification.UNKNOWN
    assert sentiment.confidence == 0
    assert sentiment.metadata["error_type"] == "TimeoutError"
    assert result.synthesis.data_completeness == 0.8


async def test_all_agents_unavailable_produces_insufficient_data_response() -> None:
    async def unavailable(agent: AgentType) -> AgentOutput:
        return AgentOutput(
            agent=agent,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=1,
            limitations=["No usable input data was available."],
        )

    async def technical(*args):
        return await unavailable(AgentType.TECHNICAL)

    async def fundamental(*args):
        return await unavailable(AgentType.FUNDAMENTAL)

    async def sentiment(*args):
        return await unavailable(AgentType.SENTIMENT)

    service = AnalysisOrchestrator(
        repository=InMemoryRepository(),
        agents=AgentSuite(technical=technical, fundamental=fundamental, sentiment=sentiment),
    )
    result = await service.run_analysis(
        AnalyzeRequest(user_id="conservative-demo", symbol="RELIANCE")
    )
    assert result.synthesis.outlook == MarketOutlook.INSUFFICIENT_DATA
    assert result.synthesis.confidence == 0
    assert result.synthesis.data_completeness == 0
    assert result.intelligence.recommendation == Recommendation.INSUFFICIENT_EVIDENCE
    assert result.decision_trace[-1].stage == "personalization"
