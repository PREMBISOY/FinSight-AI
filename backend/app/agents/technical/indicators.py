"""
Technical indicator computations for the FinSight AI technical agent.

All functions are pure: no I/O, no side-effects.  Each returns None when
the input sequence is too short to produce a meaningful result so that the
caller can decide how to handle missing data rather than receiving a
silently wrong number.

Owned by: Sunal (sunal/technical branch)
"""
from __future__ import annotations

import numpy as np


def sma(closes: list[float], n: int) -> float | None:
    """Simple moving average of the last *n* closing prices.

    Returns None when fewer than *n* data points are available.
    """
    if len(closes) < n:
        return None
    return float(np.mean(closes[-n:]))


def ema(closes: list[float], n: int) -> float | None:
    """Exponential moving average using standard smoothing factor 2/(n+1).

    Returns None when fewer than *n* data points are available.
    """
    if len(closes) < n:
        return None
    k = 2.0 / (n + 1)
    result = float(closes[0])
    for price in closes[1:]:
        result = price * k + result * (1.0 - k)
    return result


def rsi(closes: list[float], period: int = 14) -> float | None:
    """Wilder RSI.

    Requires at least *period + 1* data points to compute one RSI value.
    Returns None when insufficient data is available.
    """
    if len(closes) < period + 1:
        return None
    deltas = np.diff(closes)
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = float(np.mean(gains[:period]))
    avg_loss = float(np.mean(losses[:period]))
    # Wilder smoothing over remaining values
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return float(100.0 - 100.0 / (1.0 + rs))


def macd(
    closes: list[float],
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> tuple[float, float] | None:
    """MACD line and signal line.

    Returns (macd_line, signal_line) or None when insufficient data.
    Requires at least *slow* data points for the MACD line and an
    additional *signal_period* to compute the signal.
    """
    required = slow + signal_period - 1
    if len(closes) < required:
        return None
    fast_ema = ema(closes, fast)
    slow_ema = ema(closes, slow)
    if fast_ema is None or slow_ema is None:
        return None
    macd_line = fast_ema - slow_ema

    # Build a MACD-line series long enough for the signal EMA
    macd_series: list[float] = []
    for end in range(slow, len(closes) + 1):
        fe = ema(closes[:end], fast)
        se = ema(closes[:end], slow)
        if fe is not None and se is not None:
            macd_series.append(fe - se)

    signal_line = ema(macd_series, signal_period)
    if signal_line is None:
        return None
    return macd_line, signal_line


def momentum(closes: list[float], n: int = 5) -> float | None:
    """n-period rate-of-change: (latest - n_periods_ago) / n_periods_ago.

    Returns None when fewer than n+1 data points are available.
    """
    if len(closes) < n + 1:
        return None
    base = closes[-(n + 1)]
    if base == 0:
        return None
    return (closes[-1] - base) / base


def volume_ratio(volumes: list[float]) -> float | None:
    """Ratio of the latest volume to the mean of all preceding volumes.

    Returns None when there are fewer than 2 data points or the baseline
    mean is zero.
    """
    if len(volumes) < 2:
        return None
    baseline = float(np.mean(volumes[:-1]))
    if baseline == 0:
        return None
    return volumes[-1] / baseline


def volatility(closes: list[float], n: int = 5) -> float | None:
    """Coefficient of variation (std / mean) over the last *n* closes.

    Returns None when fewer than *n* data points or when the mean is zero.
    """
    if len(closes) < n:
        return None
    window = closes[-n:]
    mean = float(np.mean(window))
    if mean == 0:
        return None
    return float(np.std(window, ddof=1)) / mean
