from __future__ import annotations

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
)

from .analyzer import analyze_news_sentiment


async def run_sentiment_analysis(
    symbol: str,
    news_items: list[NewsItem],
    context: AnalysisContext,
) -> AgentOutput:
    """
    Sentiment agent entry point — called by the orchestrator.

    Behaviour by case
    -----------------
    UNAVAILABLE  scenario == DEGRADED_SENTIMENT  → no news feed in this demo run
    UNAVAILABLE  news_items is empty             → no data to analyse
    DEGRADED     len(news_items) == 1            → thin feed; low confidence
    SUCCESS      len(news_items) >= 2            → normal operation

    The function never fabricates a classification when data is absent.
    All evidence is labelled with its source and synthetic flag.
    Namish can extend the `analyze_news_sentiment` core in analyzer.py
    without changing this interface.
    """
    started = perf_counter()

    # ── Unavailable paths ─────────────────────────────────────────────────
    if context.scenario == DemoScenario.DEGRADED_SENTIMENT:
        return AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=[
                "Sentiment feed explicitly unavailable for scenario "
                f"'{DemoScenario.DEGRADED_SENTIMENT.value}'; "
                "no sentiment classification or evidence was fabricated."
            ],
            metadata={"implementation": "namish_lexicon_v1", "symbol": symbol},
        )

    if not news_items:
        return AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=[
                "No news items were available for the requested symbol; "
                "no sentiment classification or evidence was fabricated."
            ],
            metadata={"implementation": "namish_lexicon_v1", "symbol": symbol},
        )

    # ── Core analysis (DEGRADED or SUCCESS) ───────────────────────────────
    source_label = ", ".join(sorted({item.source_name for item in news_items}))
    result = analyze_news_sentiment(news_items, source_label=source_label)

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
        status=result.status,
        classification=result.classification,
        confidence=result.confidence,
        signals=result.signals,
        reasoning=result.reasoning,
        evidence=evidence,
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=result.limitations,
        metadata={
            "implementation": "namish_lexicon_v1",
            "symbol": symbol,
            "items_evaluated": len(news_items),
            "sources_seen": result.source_count,
        },
    )
