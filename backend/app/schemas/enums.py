from enum import Enum


class AgentType(str, Enum):
    TECHNICAL = "technical"
    FUNDAMENTAL = "fundamental"
    SENTIMENT = "sentiment"


class AgentStatus(str, Enum):
    SUCCESS = "success"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


class AgentClassification(str, Enum):
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"
    BEARISH = "BEARISH"
    UNKNOWN = "UNKNOWN"


class RiskTolerance(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class InvestmentHorizon(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"


class MarketOutlook(str, Enum):
    STRONGLY_BULLISH = "STRONGLY_BULLISH"
    MODERATELY_BULLISH = "MODERATELY_BULLISH"
    NEUTRAL = "NEUTRAL"
    MODERATELY_BEARISH = "MODERATELY_BEARISH"
    STRONGLY_BEARISH = "STRONGLY_BEARISH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class Recommendation(str, Enum):
    CONSIDER_ENTRY = "CONSIDER_ENTRY"
    WATCH = "WATCH"
    HOLD = "HOLD"
    REDUCE_EXPOSURE = "REDUCE_EXPOSURE"
    AVOID = "AVOID"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
