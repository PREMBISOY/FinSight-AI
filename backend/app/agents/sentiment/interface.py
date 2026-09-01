from __future__ import annotations

import re
from time import perf_counter

from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    DemoScenario,
    Evidence,
    NewsItem,
    Signal,
)


POSITIVE_TERMS = {"growth", "improving", "resilient", "supports", "expansion", "stable", "rise"}
NEGATIVE_TERMS = {"cautious", "pressure", "weak", "downside", "risk", "decline", "uncertainty"}


async def run_sentiment_analysis(
    symbol: str,
    news_items: list[NewsItem],
    context: AnalysisContext,
) -> AgentOutput:
    """Deterministic integration fallback; Namish can replace the implementation."""
    started = perf_counter()
    if context.scenario == DemoScenario.DEGRADED_SENTIMENT or not news_items:
        return AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=["Sentiment feed unavailable; no sentiment classification or evidence was fabricated."],
            metadata={"implementation": "integration_fallback", "symbol": symbol},
        )

    text = " ".join(f"{item.headline} {item.summary}" for item in news_items).lower()
    tokens = re.findall(r"[a-zA-Z]+", text)
    positive_count = sum(token in POSITIVE_TERMS for token in tokens)
    negative_count = sum(token in NEGATIVE_TERMS for token in tokens)
    sentiment_score = (positive_count - negative_count) / max(positive_count + negative_count, 1)
    if sentiment_score > 0.2:
        classification = AgentClassification.BULLISH
    elif sentiment_score < -0.2:
        classification = AgentClassification.BEARISH
    else:
        classification = AgentClassification.NEUTRAL

    confidence = min(0.85, 0.5 + min(len(news_items), 5) * 0.04 + abs(sentiment_score) * 0.15)
    evidence = [
        Evidence(
            source_name=item.source_name,
            source_type="news",
            excerpt=f"{item.headline}: {item.summary}",
            url=item.url,
            synthetic=item.synthetic,
        )
        for item in news_items
    ]
    return AgentOutput(
        agent=AgentType.SENTIMENT,
        status=AgentStatus.SUCCESS,
        classification=classification,
        confidence=round(confidence, 4),
        signals=[
            Signal(
                name="news_sentiment_balance",
                value=round(sentiment_score, 4),
                interpretation="Lexicon balance across available curated news items.",
                source="curated news fixture",
            ),
            Signal(
                name="news_item_count",
                value=len(news_items),
                interpretation="Number of attributed news items evaluated.",
                source="curated news fixture",
            ),
        ],
        reasoning=[
            f"Evaluated {len(news_items)} attributed news items.",
            f"News text contained {positive_count} supportive and {negative_count} cautionary terms.",
        ],
        evidence=evidence,
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=["Sprint 1 fallback is a transparent lexicon model, not a production financial classifier."],
        metadata={"implementation": "integration_fallback", "symbol": symbol},
    )
