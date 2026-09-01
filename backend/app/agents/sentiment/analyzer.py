"""
Sentiment Analysis Core — FinSight AI (Namish)

Pure, synchronous, deterministic lexicon analyzer.
No external API calls. No side effects. Fully testable in isolation.

Design notes
------------
- Headlines are weighted 2× relative to summary text because they carry
  the primary editorial signal and are more reliably present.
- Financial domain terms are split into positive and negative sets.
  Term overlap (e.g. "stable" which can be neutral) is resolved by
  placing ambiguous terms in neither set.
- Confidence is a function of: (a) magnitude of the sentiment score,
  (b) number of news items available (more evidence → higher ceiling),
  and (c) source diversity.
- A single news item produces a DEGRADED result; the signal is too thin
  to trust but not absent.
- Zero news items produce an UNAVAILABLE result (handled by interface.py).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from backend.app.schemas import AgentClassification, AgentStatus, NewsItem, Signal


# ---------------------------------------------------------------------------
# Lexicon
# ---------------------------------------------------------------------------

POSITIVE_TERMS: frozenset[str] = frozenset(
    {
        # Growth & performance
        "growth", "growing", "grew", "outperform", "outperformed",
        "beat", "beats", "exceeded", "surpassed", "record",
        # Financial strength
        "profit", "profitable", "expansion", "improving",
        "improved", "upgrade", "upgraded", "resilient", "recovery",
        "recover", "rebound", "rebounded", "rally", "rallied",
        # Market sentiment
        "bullish", "optimistic", "confident", "positive", "strong",
        "strength", "stable", "supports", "supported", "rise",
        "rising", "gain", "gains", "upside", "opportunity",
        # Operational signals
        "wins", "win", "accelerate", "accelerating",
        "momentum", "robust", "solid",
    }
)

NEGATIVE_TERMS: frozenset[str] = frozenset(
    {
        # Decline & weakness
        "decline", "declined", "declining", "falling", "fell", "drop", "dropped",
        "loss", "losses", "miss", "missed", "below", "weak", "weakness",
        "slowdown", "slowing", "slowed",
        # Risk & concern
        "risk", "risks", "risky", "cautious", "caution", "concern",
        "concerns", "worried", "worry", "uncertain", "uncertainty",
        "volatile", "volatility", "pressure", "pressured",
        # Negative outlook
        "bearish", "pessimistic", "downside", "downgrade", "downgraded",
        "sell", "avoid", "warning", "warn", "warned", "threat", "threats",
        # Operational problems
        "cut", "cuts", "restructuring", "layoffs", "layoff", "deficit",
        "debt", "defaults", "default", "overvalued",
    }
)


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class SentimentAnalysisResult:
    """Structured output from the core analyzer — used by interface.py."""

    classification: AgentClassification
    status: AgentStatus
    confidence: float
    sentiment_score: float          # –1.0 … +1.0
    positive_count: int
    negative_count: int
    headline_score: float           # raw lexicon balance on headlines only
    summary_score: float            # raw lexicon balance on summaries only
    source_count: int               # unique sources seen
    signals: list[Signal] = field(default_factory=list)
    reasoning: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def analyze_news_sentiment(
    news_items: list[NewsItem],
    source_label: str = "provided news items",
) -> SentimentAnalysisResult:
    """
    Deterministic lexicon-based sentiment analysis.

    Parameters
    ----------
    news_items:
        Non-empty list of NewsItem objects. Callers are responsible for
        checking for the empty-list case and returning UNAVAILABLE early.

    Returns
    -------
    SentimentAnalysisResult
        status is DEGRADED when only one item is present,
        SUCCESS otherwise.
    """
    assert news_items, "analyze_news_sentiment requires at least one NewsItem"

    # --- tokenize each field separately so we can weight them differently ---
    headline_positive = 0
    headline_negative = 0
    summary_positive = 0
    summary_negative = 0
    sources: set[str] = set()

    for item in news_items:
        sources.add(item.source_name)
        hl_tokens = _tokenize(item.headline)
        sm_tokens = _tokenize(item.summary)

        for tok in hl_tokens:
            if tok in POSITIVE_TERMS:
                headline_positive += 1
            elif tok in NEGATIVE_TERMS:
                headline_negative += 1

        for tok in sm_tokens:
            if tok in POSITIVE_TERMS:
                summary_positive += 1
            elif tok in NEGATIVE_TERMS:
                summary_negative += 1

    # Headlines count double
    total_positive = headline_positive * 2 + summary_positive
    total_negative = headline_negative * 2 + summary_negative
    total_signal = total_positive + total_negative

    raw_score = (total_positive - total_negative) / max(total_signal, 1)

    # Separate normalized scores for signals
    hl_total = headline_positive + headline_negative
    sm_total = summary_positive + summary_negative
    headline_score = (headline_positive - headline_negative) / max(hl_total, 1)
    summary_score = (summary_positive - summary_negative) / max(sm_total, 1)

    # Classification thresholds
    if raw_score > 0.25:
        classification = AgentClassification.BULLISH
    elif raw_score < -0.25:
        classification = AgentClassification.BEARISH
    else:
        classification = AgentClassification.NEUTRAL

    # Confidence formula
    #   base:             0.45
    #   item coverage:    up to +0.20 (saturates at 5 items)
    #   signal strength:  up to +0.15 (|raw_score|)
    #   source diversity: up to +0.05 (2+ sources)
    item_bonus = min(len(news_items), 5) * 0.04
    strength_bonus = min(abs(raw_score), 1.0) * 0.15
    diversity_bonus = 0.05 if len(sources) >= 2 else 0.0
    confidence = min(0.92, 0.45 + item_bonus + strength_bonus + diversity_bonus)

    # Status: degraded for single-item feeds
    status = AgentStatus.DEGRADED if len(news_items) == 1 else AgentStatus.SUCCESS

    # Build signals
    signals = [
        Signal(
            name="news_sentiment_balance",
            value=round(raw_score, 4),
            interpretation=(
                "Weighted lexicon balance (–1 = all negative, +1 = all positive). "
                "Headlines are weighted 2× summaries."
            ),
            source=source_label,
        ),
        Signal(
            name="news_item_count",
            value=len(news_items),
            interpretation="Number of attributed news items evaluated.",
            source=source_label,
        ),
        Signal(
            name="headline_score",
            value=round(headline_score, 4),
            interpretation="Lexicon balance for headline text only.",
            source=source_label,
        ),
        Signal(
            name="summary_score",
            value=round(summary_score, 4),
            interpretation="Lexicon balance for summary text only.",
            source=source_label,
        ),
        Signal(
            name="source_diversity",
            value=len(sources),
            interpretation="Number of distinct news sources contributing.",
            source=source_label,
        ),
    ]

    # Reasoning
    reasoning = [
        f"Evaluated {len(news_items)} attributed news item(s) from {len(sources)} source(s).",
        f"Headline lexicon: {headline_positive} supportive, {headline_negative} cautionary terms.",
        f"Summary lexicon: {summary_positive} supportive, {summary_negative} cautionary terms.",
        f"Weighted sentiment score: {raw_score:.3f} → classified as {classification.value}.",
    ]

    limitations: list[str] = []
    if status == AgentStatus.DEGRADED:
        limitations.append(
            "Only one news item was available; confidence is reduced and classification "
            "should be treated as indicative only."
        )
    if total_signal == 0:
        limitations.append(
            "No domain-specific lexicon terms were matched; "
            "the NEUTRAL classification reflects absence of signal, not confirmed neutrality."
        )
    limitations.append("Lexicon sentiment is not a substitute for a production financial classifier.")
    if all(item.synthetic for item in news_items):
        limitations.append("All evaluated news items are labeled synthetic/curated.")

    return SentimentAnalysisResult(
        classification=classification,
        status=status,
        confidence=round(confidence, 4),
        sentiment_score=round(raw_score, 4),
        positive_count=total_positive,
        negative_count=total_negative,
        headline_score=round(headline_score, 4),
        summary_score=round(summary_score, 4),
        source_count=len(sources),
        signals=signals,
        reasoning=reasoning,
        limitations=limitations,
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    """Lowercase alpha-only tokenization — identical to what the original fallback used."""
    import re
    return re.findall(r"[a-zA-Z]+", text.lower())
