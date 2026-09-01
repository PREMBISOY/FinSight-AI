from backend.app.database import InMemoryRepository
from backend.app.personalization import personalize
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    MarketOutlook,
    Recommendation,
)
from backend.app.synthesis import synthesize


def _result(agent: AgentType, classification: AgentClassification, confidence: float) -> AgentOutput:
    return AgentOutput(
        agent=agent,
        status=AgentStatus.SUCCESS,
        classification=classification,
        confidence=confidence,
        latency_ms=1,
    )


def test_synthesis_combines_weighted_agent_outputs() -> None:
    result = synthesize(
        [
            _result(AgentType.TECHNICAL, AgentClassification.BULLISH, 0.82),
            _result(AgentType.FUNDAMENTAL, AgentClassification.BULLISH, 0.76),
            _result(AgentType.SENTIMENT, AgentClassification.NEUTRAL, 0.61),
        ]
    )
    assert result.outlook == MarketOutlook.MODERATELY_BULLISH
    assert result.market_score > 0
    assert not result.conflict_detected
    assert result.data_completeness == 1


def test_missing_agent_reduces_completeness_and_confidence() -> None:
    complete = synthesize(
        [
            _result(AgentType.TECHNICAL, AgentClassification.BULLISH, 0.8),
            _result(AgentType.FUNDAMENTAL, AgentClassification.BULLISH, 0.8),
            _result(AgentType.SENTIMENT, AgentClassification.NEUTRAL, 0.6),
        ]
    )
    degraded = synthesize(
        [
            _result(AgentType.TECHNICAL, AgentClassification.BULLISH, 0.8),
            _result(AgentType.FUNDAMENTAL, AgentClassification.BULLISH, 0.8),
            AgentOutput(
                agent=AgentType.SENTIMENT,
                status=AgentStatus.UNAVAILABLE,
                classification=AgentClassification.UNKNOWN,
                confidence=0,
                latency_ms=1,
            ),
        ]
    )
    assert degraded.data_completeness == 0.8
    assert degraded.confidence < complete.confidence


def test_conflicting_directional_signals_are_explicit() -> None:
    result = synthesize(
        [
            _result(AgentType.TECHNICAL, AgentClassification.BULLISH, 0.82),
            _result(AgentType.FUNDAMENTAL, AgentClassification.BEARISH, 0.76),
            _result(AgentType.SENTIMENT, AgentClassification.NEUTRAL, 0.61),
        ]
    )
    assert result.conflict_detected
    assert result.outlook == MarketOutlook.NEUTRAL
    assert any("conflict" in limitation.lower() for limitation in result.limitations)


async def test_same_synthesis_produces_profile_specific_recommendations() -> None:
    repository = InMemoryRepository()
    synthesis = synthesize(
        [
            _result(AgentType.TECHNICAL, AgentClassification.BULLISH, 0.82),
            _result(AgentType.FUNDAMENTAL, AgentClassification.BULLISH, 0.76),
            _result(AgentType.SENTIMENT, AgentClassification.NEUTRAL, 0.61),
        ]
    )
    conservative = personalize(
        synthesis,
        await repository.get_profile("conservative-demo"),
        await repository.get_portfolio("conservative-demo"),
        "RELIANCE",
    )
    aggressive = personalize(
        synthesis,
        await repository.get_profile("aggressive-demo"),
        await repository.get_portfolio("aggressive-demo"),
        "RELIANCE",
    )
    assert conservative.recommendation == Recommendation.HOLD
    assert aggressive.recommendation == Recommendation.CONSIDER_ENTRY
    assert conservative.risk_score > aggressive.risk_score
