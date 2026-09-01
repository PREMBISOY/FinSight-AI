from __future__ import annotations

from time import perf_counter

from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    MarketData,
    Signal,
)


async def run_technical_analysis(
    symbol: str,
    market_data: MarketData,
    context: AnalysisContext,
) -> AgentOutput:
    """Integration fallback; Sunal can replace internals without changing this signature."""
    started = perf_counter()
    history = market_data.history
    first_close = history[0].close
    latest_close = history[-1].close
    momentum = (latest_close - first_close) / first_close
    baseline_volume = sum(point.volume for point in history[:-1]) / max(len(history) - 1, 1)
    volume_ratio = history[-1].volume / baseline_volume if baseline_volume else 0

    if momentum > 0.02:
        classification = AgentClassification.BULLISH
    elif momentum < -0.02:
        classification = AgentClassification.BEARISH
    else:
        classification = AgentClassification.NEUTRAL

    confidence = min(0.95, 0.55 + min(abs(momentum) * 4, 0.2) + min(abs(volume_ratio - 1) * 0.12, 0.15))
    reasoning = [
        f"Observed momentum over {len(history)} curated observations is {momentum:.1%}.",
        f"Latest volume is {volume_ratio:.2f}× the preceding-observation average.",
    ]
    return AgentOutput(
        agent=AgentType.TECHNICAL,
        status=AgentStatus.SUCCESS,
        classification=classification,
        confidence=round(confidence, 4),
        signals=[
            Signal(
                name="price_momentum",
                value=round(momentum, 4),
                interpretation="Positive values indicate upward price momentum.",
                source=market_data.source,
            ),
            Signal(
                name="volume_ratio",
                value=round(volume_ratio, 4),
                interpretation="Values above one indicate above-baseline activity.",
                source=market_data.source,
            ),
        ],
        reasoning=reasoning,
        evidence=[],
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=["Sprint 1 fallback uses a compact indicator set; Sunal's module can extend it."],
        metadata={"implementation": "integration_fallback", "symbol": symbol},
    )
