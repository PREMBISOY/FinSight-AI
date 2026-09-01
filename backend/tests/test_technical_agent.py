"""
Tests for the FinSight AI Technical Analysis Agent.

All tests are deterministic — they use hand-crafted price/volume series
or the curated RELIANCE fixture from data/market/.

Coverage:
- valid market data → AgentOutput returned
- insufficient data  → unavailable
- short history      → degraded
- bullish scenario
- bearish scenario
- neutral scenario
- missing / zero volume
- AgentOutput Pydantic contract
- latency is measured (≥ 0)
- determinism (same input → same output)
- existing RELIANCE fixture stays BULLISH

Owned by: Sunal (sunal/technical branch)
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from backend.app.agents.technical import run_technical_analysis
from backend.app.database import InMemoryRepository
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    DemoScenario,
    MarketData,
)
from backend.app.services.data import FixtureDataService

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

_BASE_TIME = datetime(2026, 1, 1, 9, 0, 0, tzinfo=UTC)


def _make_market_data(
    closes: list[float],
    volumes: list[float] | None = None,
    symbol: str = "TEST",
) -> MarketData:
    """Build a MarketData object from bare close/volume lists."""
    if volumes is None:
        volumes = [1_000_000.0] * len(closes)
    assert len(closes) == len(volumes), "closes and volumes must be same length"
    history = [
        {"timestamp": (_BASE_TIME + timedelta(days=i)).isoformat(), "close": c, "volume": v}
        for i, (c, v) in enumerate(zip(closes, volumes))
    ]
    return MarketData.model_validate(
        {
            "symbol": symbol,
            "current_price": closes[-1],
            "currency": "INR",
            "observed_at": (_BASE_TIME + timedelta(days=len(closes) - 1)).isoformat(),
            "source": "unit_test_fixture",
            "synthetic": True,
            "history": history,
        }
    )


async def _context(scenario: DemoScenario = DemoScenario.NORMAL) -> AnalysisContext:
    repo = InMemoryRepository()
    return AnalysisContext(
        user_id="conservative-demo",
        profile=await repo.get_profile("conservative-demo"),
        portfolio=await repo.get_portfolio("conservative-demo"),
        scenario=scenario,
    )


# 40-day uptrend (clearly bullish; long enough for MACD 12/26/9)
_BULLISH_CLOSES = [float(1000 + i * 15) for i in range(40)]
_BULLISH_VOLUMES = [float(5_000_000 + i * 100_000) for i in range(40)]  # rising volume

# 40-day downtrend (clearly bearish)
_BEARISH_CLOSES = [float(2000 - i * 15) for i in range(40)]
_BEARISH_VOLUMES = [float(5_000_000)] * 39 + [float(7_000_000)]  # slight spike

# 40 days flat within ±0.5 % band (neutral)
_NEUTRAL_CLOSES = [float(1500 + ((-1) ** i) * 3) for i in range(40)]
_NEUTRAL_VOLUMES = [float(1_000_000)] * 40

# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #


async def test_technical_valid_data_returns_agent_output() -> None:
    """Basic structural contract: result is AgentOutput with expected fields."""
    md = _make_market_data(_BULLISH_CLOSES, _BULLISH_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert isinstance(result, AgentOutput)
    assert result.agent == AgentType.TECHNICAL
    assert result.status in {AgentStatus.SUCCESS, AgentStatus.DEGRADED}
    assert isinstance(result.classification, AgentClassification)
    assert 0.0 <= result.confidence <= 1.0
    assert result.latency_ms >= 0
    assert isinstance(result.signals, list)
    assert isinstance(result.reasoning, list)
    assert isinstance(result.limitations, list)
    assert isinstance(result.metadata, dict)


async def test_technical_bullish_scenario() -> None:
    """Strong, sustained uptrend with rising volume → BULLISH."""
    md = _make_market_data(_BULLISH_CLOSES, _BULLISH_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert result.classification == AgentClassification.BULLISH
    assert result.status == AgentStatus.SUCCESS
    assert result.confidence > 0.5


async def test_technical_bearish_scenario() -> None:
    """Consistent downtrend → BEARISH."""
    md = _make_market_data(_BEARISH_CLOSES, _BEARISH_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert result.classification == AgentClassification.BEARISH
    assert result.status == AgentStatus.SUCCESS
    assert result.confidence > 0.5


async def test_technical_neutral_scenario() -> None:
    """Flat price with tiny oscillations → NEUTRAL."""
    md = _make_market_data(_NEUTRAL_CLOSES, _NEUTRAL_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert result.classification == AgentClassification.NEUTRAL


async def test_technical_minimum_history_returns_degraded() -> None:
    """MarketData requires at least 2 points (schema-enforced).

    With exactly 2 points the agent must return DEGRADED (not unavailable),
    produce at least one signal, and make a directional classification.
    The schema itself is the guard against single-point input.
    """
    from pydantic import ValidationError as PydanticValidationError

    # Verify the schema enforces the minimum — single point is rejected
    with pytest.raises(PydanticValidationError):
        _make_market_data([1500.0], [1_000_000.0])

    # Two-point history — minimum valid; agent must degrade gracefully
    md = _make_market_data([1500.0, 1530.0], [1_000_000.0, 1_200_000.0])
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert result.status == AgentStatus.DEGRADED
    assert result.classification != AgentClassification.UNKNOWN
    assert result.confidence > 0.0
    assert len(result.signals) >= 1
    assert len(result.limitations) >= 1


async def test_technical_short_history_returns_degraded() -> None:
    """5 data points → degraded (RSI and MACD not available)."""
    closes = [1000.0, 1010.0, 1025.0, 1040.0, 1060.0]
    md = _make_market_data(closes)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert result.status == AgentStatus.DEGRADED
    # RSI and MACD signals should NOT be present
    signal_names = {s.name for s in result.signals}
    assert "rsi_14" not in signal_names
    assert "macd" not in signal_names
    # At least one limitation is noted
    assert len(result.limitations) >= 1
    # Should still make a directional call
    assert result.classification in {
        AgentClassification.BULLISH,
        AgentClassification.BEARISH,
        AgentClassification.NEUTRAL,
    }


async def test_technical_missing_volume_uses_zero_gracefully() -> None:
    """Zero volume across all periods must not crash; agent still runs."""
    zero_volumes = [0.0] * len(_BULLISH_CLOSES)
    md = _make_market_data(_BULLISH_CLOSES, zero_volumes)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    # Should not raise; status may be success or degraded but not error
    assert result.status in {AgentStatus.SUCCESS, AgentStatus.DEGRADED}
    assert isinstance(result.classification, AgentClassification)


async def test_technical_output_conforms_to_agent_contract() -> None:
    """AgentOutput Pydantic model validates without error; contract invariants hold."""
    md = _make_market_data(_BULLISH_CLOSES, _BULLISH_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    # Re-validate via round-trip to guarantee Pydantic passes
    re_validated = AgentOutput.model_validate(result.model_dump())
    assert re_validated.agent == AgentType.TECHNICAL

    # Contract: success must not be UNKNOWN
    if result.status == AgentStatus.SUCCESS:
        assert result.classification != AgentClassification.UNKNOWN

    # Contract: unavailable / error must use UNKNOWN + zero confidence
    # (not exercised here since data is valid, but guards future regression)
    assert 0.0 <= result.confidence <= 1.0
    assert result.latency_ms >= 0


async def test_technical_latency_is_measured() -> None:
    """latency_ms must be a non-negative float reflecting wall-clock time."""
    md = _make_market_data(_BULLISH_CLOSES, _BULLISH_VOLUMES)
    ctx = await _context()
    result = await run_technical_analysis("TEST", md, ctx)

    assert isinstance(result.latency_ms, float)
    assert result.latency_ms >= 0.0


async def test_technical_deterministic() -> None:
    """Two calls with identical inputs must produce identical outputs."""
    md = _make_market_data(_BULLISH_CLOSES, _BULLISH_VOLUMES)
    ctx = await _context()
    result1 = await run_technical_analysis("TEST", md, ctx)
    result2 = await run_technical_analysis("TEST", md, ctx)

    # Core fields must be identical
    assert result1.status == result2.status
    assert result1.classification == result2.classification
    assert result1.confidence == result2.confidence
    assert len(result1.signals) == len(result2.signals)
    assert [s.name for s in result1.signals] == [s.name for s in result2.signals]
    assert [s.value for s in result1.signals] == [s.value for s in result2.signals]


async def test_technical_existing_fixture_stays_bullish() -> None:
    """The curated RELIANCE fixture must still produce BULLISH (regression guard).

    This exercises the full FixtureDataService → run_technical_analysis path
    and is the canonical integration test for Prem's orchestrator.
    """
    data_service = FixtureDataService()
    md = await data_service.market_data("RELIANCE")
    ctx = await _context()
    result = await run_technical_analysis("RELIANCE", md, ctx)

    assert result.status in {AgentStatus.SUCCESS, AgentStatus.DEGRADED}
    assert result.classification == AgentClassification.BULLISH
    assert result.agent == AgentType.TECHNICAL
    assert result.latency_ms >= 0
    # Must contain at least price_momentum signal
    signal_names = {s.name for s in result.signals}
    assert "price_momentum" in signal_names
