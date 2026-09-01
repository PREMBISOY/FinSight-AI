from backend.app.agents.fundamental import run_fundamental_analysis
from backend.app.agents.sentiment import run_sentiment_analysis
from backend.app.agents.technical import run_technical_analysis
from backend.app.database import InMemoryRepository
from backend.app.schemas import (
    AgentClassification,
    AgentStatus,
    AnalysisContext,
    DemoScenario,
)
from backend.app.services.data import FixtureDataService


async def _context(scenario: DemoScenario = DemoScenario.NORMAL) -> AnalysisContext:
    repository = InMemoryRepository()
    return AnalysisContext(
        user_id="conservative-demo",
        profile=await repository.get_profile("conservative-demo"),
        portfolio=await repository.get_portfolio("conservative-demo"),
        scenario=scenario,
    )


async def test_technical_agent_returns_measured_structured_signals() -> None:
    data = FixtureDataService()
    result = await run_technical_analysis(
        "RELIANCE", await data.market_data("RELIANCE"), await _context()
    )
    assert result.status in {AgentStatus.SUCCESS, AgentStatus.DEGRADED}
    assert result.classification == AgentClassification.BULLISH
    assert {signal.name for signal in result.signals} >= {"price_momentum", "volume_ratio"}
    assert result.latency_ms >= 0


async def test_fundamental_agent_retrieves_attributed_chunks() -> None:
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth cash flow operating outlook",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.BULLISH
    assert len(result.evidence) >= 2
    assert all(item.chunk_id and item.source_name for item in result.evidence)
    assert all(item.synthetic for item in result.evidence)


async def test_sentiment_agent_returns_neutral_for_mixed_news() -> None:
    data = FixtureDataService()
    result = await run_sentiment_analysis(
        "RELIANCE", await data.news_items("RELIANCE"), await _context()
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.NEUTRAL
    assert len(result.evidence) == 3


async def test_sentiment_agent_marks_unavailable_without_evidence() -> None:
    data = FixtureDataService()
    result = await run_sentiment_analysis(
        "RELIANCE",
        await data.news_items("RELIANCE"),
        await _context(DemoScenario.DEGRADED_SENTIMENT),
    )
    assert result.status == AgentStatus.UNAVAILABLE
    assert result.classification == AgentClassification.UNKNOWN
    assert result.confidence == 0
    assert result.evidence == []
