"""
Technical Analysis Agent — FinSight AI
Owned by: Sunal (sunal/technical branch)

Answers: "What does the market data indicate?"

The agent runs a score-based pipeline over up to six technical indicators.
Each indicator casts a directional vote (+1 bullish, 0 neutral, -1 bearish),
votes are weighted and summed, and the net score drives the classification.

Status tiers
------------
success   : full indicator set produced (history ≥ 20 data points)
degraded  : short history — momentum + volume + SMA only (2–19 points)
unavailable: history < 2 points; classification forced to UNKNOWN

The function signature is fixed by the shared agent contract; only the
internals have been replaced.
"""
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

from .indicators import macd, momentum, rsi, sma, volatility, volume_ratio

# --------------------------------------------------------------------------- #
# Thresholds
# --------------------------------------------------------------------------- #
_MOMENTUM_BULLISH = 0.02    # +2 % → bullish vote
_MOMENTUM_BEARISH = -0.02   # -2 % → bearish vote
_RSI_OVERBOUGHT = 70.0      # RSI > 70 → bearish vote
_RSI_OVERSOLD = 30.0        # RSI < 30 → bullish vote (oversold = bounce)
_VOL_RATIO_HIGH = 1.30      # volume spike confirms direction
_VOL_RATIO_LOW = 0.70       # volume drought weakens signal
_VOLATILITY_HIGH = 0.04     # coefficient of variation > 4 % → note in metadata

# Minimum history length thresholds
_MIN_FOR_FULL = 34   # MACD(12, 26, 9) needs slow + signal - 1 observations
_MIN_FOR_ANY = 2     # need at least 2 points for momentum

# Classification score thresholds
_BULLISH_THRESHOLD = 0.25
_BEARISH_THRESHOLD = -0.25

# Indicator weights (must sum to 1.0 over the full set)
_WEIGHTS_FULL = {
    "momentum":     0.20,
    "sma_cross":    0.20,
    "rsi":          0.20,
    "macd":         0.20,
    "volume":       0.10,
    "volatility":   0.10,
}
_WEIGHTS_DEGRADED = {
    "momentum":     0.50,
    "sma_cross":    0.30,
    "volume":       0.20,
}


def _vote(value: float, bullish_thresh: float, bearish_thresh: float) -> int:
    """Return +1, -1, or 0 based on whether *value* crosses a threshold."""
    if value >= bullish_thresh:
        return 1
    if value <= bearish_thresh:
        return -1
    return 0


def _classify(score: float) -> AgentClassification:
    if score >= _BULLISH_THRESHOLD:
        return AgentClassification.BULLISH
    if score <= _BEARISH_THRESHOLD:
        return AgentClassification.BEARISH
    return AgentClassification.NEUTRAL


def _confidence(score: float, degraded: bool, n_signals: int) -> float:
    """Derive confidence from score magnitude and data quality."""
    base = 0.50 + min(abs(score) * 0.80, 0.40)   # 0.50 – 0.90
    if degraded:
        base = max(0.30, base - 0.15)              # penalty for short history
    signal_bonus = min(n_signals * 0.01, 0.05)    # tiny bonus per indicator
    return round(min(0.95, base + signal_bonus), 4)


async def run_technical_analysis(
    symbol: str,
    market_data: MarketData,
    context: AnalysisContext,
) -> AgentOutput:
    """Full technical analysis pipeline replacing the Sprint 1 fallback.

    The function signature is fixed by the shared agent contract in
    docs/AGENT_CONTRACT.md.  Only these internals are owned by Sunal.
    """
    started = perf_counter()

    history = market_data.history
    closes = [pt.close for pt in history]
    volumes = [pt.volume for pt in history]
    n = len(closes)

    # ------------------------------------------------------------------ #
    # Guard: unavailable when history is too short for any computation
    # ------------------------------------------------------------------ #
    if n < _MIN_FOR_ANY:
        return AgentOutput(
            agent=AgentType.TECHNICAL,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0.0,
            signals=[],
            reasoning=["Insufficient market history to compute any technical signal."],
            evidence=[],
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=[
                f"Only {n} data point(s) available; at least {_MIN_FOR_ANY} required."
            ],
            metadata={"implementation": "sunal_technical_v1", "symbol": symbol},
        )

    # ------------------------------------------------------------------ #
    # Compute indicators
    # ------------------------------------------------------------------ #
    mom = momentum(closes, n=min(5, n - 1))
    sma5 = sma(closes, 5)
    sma20 = sma(closes, 20)
    rsi14 = rsi(closes, period=14)
    macd_result = macd(closes)
    vol_ratio = volume_ratio(volumes)
    vol = volatility(closes, n=min(5, n))

    degraded = n < _MIN_FOR_FULL

    # ------------------------------------------------------------------ #
    # Vote tallying
    # ------------------------------------------------------------------ #
    weights = _WEIGHTS_DEGRADED if degraded else _WEIGHTS_FULL
    votes: dict[str, int] = {}
    signals: list[Signal] = []
    limitations: list[str] = []

    # -- Momentum ---------------------------------------------------------
    if mom is not None:
        votes["momentum"] = _vote(mom, _MOMENTUM_BULLISH, _MOMENTUM_BEARISH)
        signals.append(Signal(
            name="price_momentum",
            value=round(mom, 4),
            interpretation=(
                "Positive momentum indicates recent price appreciation; "
                "negative indicates depreciation."
            ),
            source=market_data.source,
        ))
    else:
        limitations.append("Momentum could not be computed from available history.")

    # -- SMA cross --------------------------------------------------------
    if sma5 is not None and sma20 is not None:
        cross_gap = (sma5 - sma20) / sma20
        votes["sma_cross"] = _vote(cross_gap, 0.005, -0.005)
        signals.append(Signal(
            name="sma_cross",
            value=round(cross_gap, 4),
            interpretation=(
                "Positive gap (SMA-5 > SMA-20) is a bullish golden-cross signal; "
                "negative is a death-cross bearish signal."
            ),
            source=market_data.source,
        ))
    elif sma5 is not None:
        # Only short-window SMA available; compare to first close as proxy
        cross_gap = (sma5 - closes[0]) / closes[0]
        votes["sma_cross"] = _vote(cross_gap, 0.005, -0.005)
        signals.append(Signal(
            name="sma_5d",
            value=round(sma5, 2),
            interpretation="SMA-5 compared to first available close (SMA-20 unavailable).",
            source=market_data.source,
        ))
        limitations.append("SMA-20 unavailable; using SMA-5 vs first close as proxy.")
    else:
        limitations.append("SMA signals unavailable; history too short.")

    # -- RSI --------------------------------------------------------------
    if rsi14 is not None:
        rsi_vote = 0
        if rsi14 < _RSI_OVERSOLD:
            rsi_vote = 1      # oversold → bullish bounce signal
        elif rsi14 > _RSI_OVERBOUGHT:
            rsi_vote = -1     # overbought → bearish reversal risk
        votes["rsi"] = rsi_vote
        signals.append(Signal(
            name="rsi_14",
            value=round(rsi14, 2),
            interpretation=(
                f"RSI {rsi14:.1f}: "
                + ("oversold — potential bullish reversal." if rsi14 < _RSI_OVERSOLD
                   else "overbought — potential bearish reversal." if rsi14 > _RSI_OVERBOUGHT
                   else "neutral zone.")
            ),
            source=market_data.source,
        ))
    elif not degraded:
        limitations.append("RSI-14 requires at least 15 data points; unavailable.")

    # -- MACD -------------------------------------------------------------
    if macd_result is not None:
        macd_line, signal_line = macd_result
        macd_gap = macd_line - signal_line
        votes["macd"] = _vote(macd_gap, 1e-9, -1e-9)
        signals.append(Signal(
            name="macd",
            value=round(macd_gap, 4),
            interpretation=(
                "Positive MACD-minus-signal gap indicates bullish momentum; "
                "negative indicates bearish."
            ),
            source=market_data.source,
        ))
    elif not degraded:
        limitations.append("MACD requires at least 35 data points; unavailable.")

    # -- Volume -----------------------------------------------------------
    if vol_ratio is not None:
        # Volume amplifies the momentum direction rather than voting independently
        direction = votes.get("momentum", 0)
        if direction != 0 and vol_ratio >= _VOL_RATIO_HIGH:
            vol_vote = direction   # confirms the momentum direction
        elif vol_ratio <= _VOL_RATIO_LOW:
            vol_vote = 0           # low volume — do not amplify any direction
        else:
            vol_vote = 0
        votes["volume"] = vol_vote
        signals.append(Signal(
            name="volume_ratio",
            value=round(vol_ratio, 4),
            interpretation=(
                f"Latest volume is {vol_ratio:.2f}× the preceding-session average. "
                + ("High volume confirms price direction." if vol_ratio >= _VOL_RATIO_HIGH
                   else "Normal volume — no confirmation amplification.")
            ),
            source=market_data.source,
        ))
    else:
        limitations.append("Volume data insufficient for ratio calculation.")

    # -- Volatility -------------------------------------------------------
    if vol is not None and not degraded:
        vol_vote = 0  # volatility alone is not directional
        votes["volatility"] = vol_vote
        signals.append(Signal(
            name="volatility_5d",
            value=round(vol, 4),
            interpretation=(
                f"5-day coefficient of variation: {vol:.1%}. "
                + ("Elevated volatility detected." if vol > _VOLATILITY_HIGH
                   else "Normal volatility range.")
            ),
            source=market_data.source,
        ))
    elif not degraded:
        limitations.append("Volatility requires at least 5 data points.")

    # ------------------------------------------------------------------ #
    # Score: weighted sum of votes
    # ------------------------------------------------------------------ #
    total_weight = 0.0
    weighted_sum = 0.0
    for indicator, weight in weights.items():
        if indicator in votes:
            weighted_sum += votes[indicator] * weight
            total_weight += weight

    # Normalise to [-1, 1] accounting for absent indicators
    score = weighted_sum / total_weight if total_weight > 0 else 0.0

    classification = _classify(score)
    n_signals = len(signals)
    confidence = _confidence(score, degraded, n_signals)

    # ------------------------------------------------------------------ #
    # Status
    # ------------------------------------------------------------------ #
    if degraded:
        status = AgentStatus.DEGRADED
        limitations.append(
            f"Short history ({n} points, < {_MIN_FOR_FULL} required for full analysis). "
            "RSI and MACD are excluded from this result."
        )
    else:
        status = AgentStatus.SUCCESS

    # ------------------------------------------------------------------ #
    # Reasoning narrative
    # ------------------------------------------------------------------ #
    reasoning: list[str] = []
    if mom is not None:
        direction_word = "upward" if mom > 0 else "downward" if mom < 0 else "flat"
        reasoning.append(
            f"Price momentum over the observation window is {mom:.1%} ({direction_word})."
        )
    if "sma_cross" in votes:
        reasoning.append(
            "SMA trend alignment " + (
                "supports bullish momentum." if votes["sma_cross"] == 1
                else "indicates bearish pressure." if votes["sma_cross"] == -1
                else "is neutral."
            )
        )
    if rsi14 is not None:
        reasoning.append(f"RSI-14 is {rsi14:.1f}, indicating {'oversold' if rsi14 < 30 else 'overbought' if rsi14 > 70 else 'neutral momentum'}.")
    if macd_result is not None:
        macd_line, signal_line = macd_result
        reasoning.append(
            f"MACD line ({macd_line:.2f}) is {'above' if macd_line > signal_line else 'below'} the signal line ({signal_line:.2f})."
        )
    if vol_ratio is not None:
        reasoning.append(
            f"Volume is {vol_ratio:.2f}× the preceding-session average, "
            + ("confirming the price direction." if vol_ratio >= _VOL_RATIO_HIGH else "within normal range.")
        )
    reasoning.append(
        f"Net weighted score: {score:.3f} → {classification.value}."
    )

    # ------------------------------------------------------------------ #
    # Metadata
    # ------------------------------------------------------------------ #
    metadata: dict = {
        "implementation": "sunal_technical_v1",
        "symbol": symbol,
        "history_length": n,
        "weighted_score": round(score, 4),
        "votes": votes,
    }
    if rsi14 is not None:
        metadata["rsi_14"] = round(rsi14, 2)
    if macd_result is not None:
        metadata["macd_line"] = round(macd_result[0], 4)
        metadata["macd_signal"] = round(macd_result[1], 4)
    if vol is not None:
        metadata["volatility_5d"] = round(vol, 4)

    return AgentOutput(
        agent=AgentType.TECHNICAL,
        status=status,
        classification=classification,
        confidence=confidence,
        signals=signals,
        reasoning=reasoning,
        evidence=[],
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=limitations,
        metadata=metadata,
    )
