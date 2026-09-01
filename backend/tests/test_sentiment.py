"""
test_sentiment.py — Namish QA Scenarios for Sentiment Agent
FinSight AI — HackVerse Sprint 1

Ten scenarios covering:
  1.  Normal mixed sentiment (fixture → NEUTRAL)
  2.  Strong positive sentiment (inline bullish items → BULLISH)
  3.  Strong negative sentiment (inline bearish items → BEARISH)
  4.  Neutral sentiment (balanced inline items → NEUTRAL)
  5.  Missing news — empty list (→ UNAVAILABLE, UNKNOWN, confidence=0)
  6.  Thin/invalid news — single item (→ DEGRADED, low confidence)
  7.  Sentiment unavailable — DEGRADED_SENTIMENT scenario (→ UNAVAILABLE)
  8.  AgentOutput contract validation (Pydantic invariants for all statuses)
  9.  Latency measurement (latency_ms always ≥ 0)
  10. Integration compatibility (FixtureDataService → run_sentiment_analysis end-to-end)

Additionally covers three demo fixture scenarios: normal, degraded, conflict.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from backend.app.agents.sentiment import run_sentiment_analysis
from backend.app.agents.sentiment.analyzer import (
    NEGATIVE_TERMS,
    POSITIVE_TERMS,
    SentimentAnalysisResult,
    analyze_news_sentiment,
)
from backend.app.database import InMemoryRepository
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    DemoScenario,
    NewsItem,
)
from backend.app.services.data import FixtureDataService


# ─────────────────────────────────────────────────────────────────────────────
# Shared fixtures
# ─────────────────────────────────────────────────────────────────────────────

def _make_item(
    item_id: str,
    headline: str,
    summary: str,
    source_name: str = "HackVerse Curated News",
    synthetic: bool = True,
) -> NewsItem:
    return NewsItem(
        id=item_id,
        symbol="RELIANCE",
        headline=headline,
        summary=summary,
        source_name=source_name,
        published_at=datetime(2026, 9, 1, 8, 0, 0, tzinfo=timezone.utc),
        url=None,
        synthetic=synthetic,
    )


@pytest.fixture
def normal_news_items() -> list[NewsItem]:
    """Mixed signal set — mirrors data/news/RELIANCE.json."""
    return [
        _make_item(
            "n-001",
            "Reliance retail expansion supports growth outlook",
            "A curated demo brief highlights resilient demand and improving digital engagement.",
        ),
        _make_item(
            "n-002",
            "Analysts remain cautious about energy margin pressure",
            "A curated demo brief notes weak refining spreads and downside risk if input costs rise.",
        ),
        _make_item(
            "n-003",
            "Telecom subscriber additions stay stable",
            "The latest curated checkpoint describes balanced operating trends without a major surprise.",
        ),
    ]


@pytest.fixture
def bullish_news_items() -> list[NewsItem]:
    """Strongly positive signal set."""
    return [
        _make_item(
            "b-001",
            "Reliance posts record profit on robust revenue growth",
            "Strong earnings beat estimates; management upgraded full-year outlook on expanding margins.",
        ),
        _make_item(
            "b-002",
            "Jio subscriber rebound and ARPU gains accelerate momentum",
            "Improving average revenue per user; bullish analysts raised price targets after outperform upgrade.",
        ),
        _make_item(
            "b-003",
            "Retail expansion supports strong growth and recovery in demand",
            "Recovery in consumer spending and rising footfall positive for outlook.",
        ),
        _make_item(
            "b-004",
            "Reliance rallied to record high on solid investment win",
            "Solid earnings and robust demand; institutional buying accelerating on confident outlook.",
        ),
        _make_item(
            "b-005",
            "Green energy investment gains upside with profitable returns",
            "Brokers optimistic with rising revenue and strong upside from renewable expansion.",
        ),
    ]


@pytest.fixture
def bearish_news_items() -> list[NewsItem]:
    """Strongly negative signal set."""
    return [
        _make_item(
            "r-001",
            "Reliance misses earnings; refining margins decline",
            "Weak refining spreads and losses in O2C segment. Analysts cautious with downgrade to sell.",
        ),
        _make_item(
            "r-002",
            "Rising debt and weak demand threaten Reliance outlook",
            "Uncertainty and volatile environment risk margin pressure. Management warned of weak consumer.",
        ),
        _make_item(
            "r-003",
            "Reliance stock fell after bearish downgrade on overvalued concerns",
            "Downside risks increased; institutional caution after multiple sell-side downgrades.",
        ),
        _make_item(
            "r-004",
            "Retail slowdown and losses concern analysts",
            "Revenue decline and weak footfall worried brokers. Restructuring pressure added to deficit fears.",
        ),
        _make_item(
            "r-005",
            "Regulatory threat and competition risk rising for Jio",
            "Pessimistic outlook; uncertain regulation and competition pressure subscriber losses.",
        ),
    ]


@pytest.fixture
def single_news_item() -> list[NewsItem]:
    """One item only — triggers DEGRADED."""
    return [
        _make_item(
            "s-001",
            "Reliance quarterly earnings release scheduled next week",
            "The company will publish its financial results. Analysts are awaiting the update.",
        )
    ]


async def _context(scenario: DemoScenario = DemoScenario.NORMAL) -> AnalysisContext:
    repository = InMemoryRepository()
    return AnalysisContext(
        user_id="conservative-demo",
        profile=await repository.get_profile("conservative-demo"),
        portfolio=await repository.get_portfolio("conservative-demo"),
        scenario=scenario,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 1 — Normal mixed sentiment
# ─────────────────────────────────────────────────────────────────────────────

async def test_1_normal_mixed_sentiment_returns_neutral(
    normal_news_items: list[NewsItem],
) -> None:
    """
    Three items with balanced positive/negative terms should classify NEUTRAL.
    Mirrors the assertion in the shared test_agents.py.
    """
    result = await run_sentiment_analysis(
        "RELIANCE", normal_news_items, await _context()
    )
    assert result.agent == AgentType.SENTIMENT
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.NEUTRAL
    assert result.confidence > 0
    assert len(result.evidence) == 3
    assert all(e.source_type == "news" for e in result.evidence)
    assert result.latency_ms >= 0


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 2 — Strong positive sentiment
# ─────────────────────────────────────────────────────────────────────────────

async def test_2_strong_positive_sentiment_returns_bullish(
    bullish_news_items: list[NewsItem],
) -> None:
    """Five strongly positive items should produce BULLISH with high confidence."""
    result = await run_sentiment_analysis(
        "RELIANCE", bullish_news_items, await _context()
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.BULLISH
    assert result.confidence >= 0.65, f"expected high confidence, got {result.confidence}"
    assert len(result.evidence) == 5
    # Signals must include the balance signal
    signal_names = {s.name for s in result.signals}
    assert "news_sentiment_balance" in signal_names
    assert "news_item_count" in signal_names

    # Sentiment balance should be positive
    balance = next(s for s in result.signals if s.name == "news_sentiment_balance")
    assert float(balance.value) > 0


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 3 — Strong negative sentiment
# ─────────────────────────────────────────────────────────────────────────────

async def test_3_strong_negative_sentiment_returns_bearish(
    bearish_news_items: list[NewsItem],
) -> None:
    """Five strongly negative items should produce BEARISH with high confidence."""
    result = await run_sentiment_analysis(
        "RELIANCE", bearish_news_items, await _context()
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.BEARISH
    assert result.confidence >= 0.65, f"expected high confidence, got {result.confidence}"
    assert len(result.evidence) == 5

    balance = next(s for s in result.signals if s.name == "news_sentiment_balance")
    assert float(balance.value) < 0


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 4 — Balanced / neutral sentiment
# ─────────────────────────────────────────────────────────────────────────────

async def test_4_balanced_items_produce_neutral_classification() -> None:
    """
    Items with equal positive and negative terms should land in NEUTRAL band.
    We construct items carefully so the scores cancel.
    """
    pos_item = _make_item(
        "bal-p",
        "Company posts record profit and strong growth",
        "Expanding revenue and optimistic outlook with improving margins.",
    )
    neg_item = _make_item(
        "bal-n",
        "Analysts cautious on weak demand and declining margins",
        "Pressure from rising costs and downside risk to outlook uncertain.",
    )
    result = await run_sentiment_analysis(
        "RELIANCE", [pos_item, neg_item], await _context()
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.NEUTRAL


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 5 — Missing news (empty list)
# ─────────────────────────────────────────────────────────────────────────────

async def test_5_empty_news_list_returns_unavailable() -> None:
    """An empty news list must produce UNAVAILABLE, UNKNOWN, and zero confidence."""
    result = await run_sentiment_analysis("RELIANCE", [], await _context())
    assert result.status == AgentStatus.UNAVAILABLE
    assert result.classification == AgentClassification.UNKNOWN
    assert result.confidence == 0
    assert result.evidence == []
    assert result.signals == []
    assert len(result.limitations) >= 1
    assert result.latency_ms >= 0


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 6 — Thin/single-item news (DEGRADED)
# ─────────────────────────────────────────────────────────────────────────────

async def test_6_single_item_returns_degraded_status(
    single_news_item: list[NewsItem],
) -> None:
    """
    A single news item is present but insufficient for a reliable classification.
    The agent should return DEGRADED (not UNAVAILABLE — data exists) with
    low confidence and an explicit limitation.
    """
    result = await run_sentiment_analysis(
        "RELIANCE", single_news_item, await _context()
    )
    assert result.status == AgentStatus.DEGRADED
    # Classification can be any directional value — not UNKNOWN for DEGRADED
    assert result.classification != AgentClassification.UNKNOWN
    # Confidence should be materially below what 5 items would give
    assert result.confidence < 0.75
    assert len(result.evidence) == 1
    assert any("one" in lim.lower() or "single" in lim.lower() for lim in result.limitations)


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 7 — Sentiment unavailable (DEGRADED_SENTIMENT scenario flag)
# ─────────────────────────────────────────────────────────────────────────────

async def test_7_degraded_sentiment_scenario_returns_unavailable(
    normal_news_items: list[NewsItem],
) -> None:
    """
    When the scenario flag is DEGRADED_SENTIMENT, the agent must return UNAVAILABLE
    even if news items are present — this simulates a real feed outage.
    No evidence or classification must be fabricated.
    """
    degraded_ctx = await _context(DemoScenario.DEGRADED_SENTIMENT)
    result = await run_sentiment_analysis("RELIANCE", normal_news_items, degraded_ctx)
    assert result.status == AgentStatus.UNAVAILABLE
    assert result.classification == AgentClassification.UNKNOWN
    assert result.confidence == 0
    assert result.evidence == []
    assert result.signals == []
    assert len(result.limitations) >= 1
    # Limitation should mention the degraded scenario
    assert any(
        "unavailable" in lim.lower() or "degraded" in lim.lower()
        for lim in result.limitations
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 8 — AgentOutput contract validation
# ─────────────────────────────────────────────────────────────────────────────

def test_8_agent_output_contract_valid_success() -> None:
    """BULLISH SUCCESS output passes Pydantic validation."""
    out = AgentOutput(
        agent=AgentType.SENTIMENT,
        status=AgentStatus.SUCCESS,
        classification=AgentClassification.BULLISH,
        confidence=0.78,
        latency_ms=5.2,
    )
    assert out.confidence == 0.78
    assert out.agent == AgentType.SENTIMENT


def test_8_agent_output_contract_valid_unavailable() -> None:
    """UNAVAILABLE must pair with UNKNOWN and zero confidence."""
    out = AgentOutput(
        agent=AgentType.SENTIMENT,
        status=AgentStatus.UNAVAILABLE,
        classification=AgentClassification.UNKNOWN,
        confidence=0,
        latency_ms=0.8,
    )
    assert out.classification == AgentClassification.UNKNOWN
    assert out.confidence == 0


def test_8_agent_output_contract_rejects_fabricated_classification() -> None:
    """UNAVAILABLE must not allow a directional classification."""
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.BULLISH,  # ← illegal
            confidence=0,
            latency_ms=1,
        )


def test_8_agent_output_contract_rejects_nonzero_confidence_on_unavailable() -> None:
    """UNAVAILABLE must not allow nonzero confidence."""
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0.1,  # ← illegal
            latency_ms=1,
        )


def test_8_agent_output_contract_rejects_unknown_on_success() -> None:
    """Successful agents must not classify as UNKNOWN."""
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.UNKNOWN,  # ← illegal
            confidence=0.6,
            latency_ms=1,
        )


def test_8_agent_output_contract_confidence_bounds() -> None:
    """Confidence must be in [0, 1]."""
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=1.01,  # ← out of range
            latency_ms=1,
        )
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=-0.01,  # ← out of range
            latency_ms=1,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 9 — Latency measurement
# ─────────────────────────────────────────────────────────────────────────────

async def test_9_latency_ms_is_non_negative_for_all_paths(
    normal_news_items: list[NewsItem],
    bullish_news_items: list[NewsItem],
) -> None:
    """All execution paths must produce a non-negative latency_ms."""
    normal_ctx = await _context(DemoScenario.NORMAL)
    degraded_ctx = await _context(DemoScenario.DEGRADED_SENTIMENT)

    paths = [
        await run_sentiment_analysis("RELIANCE", normal_news_items, normal_ctx),
        await run_sentiment_analysis("RELIANCE", bullish_news_items, normal_ctx),
        await run_sentiment_analysis("RELIANCE", [], normal_ctx),
        await run_sentiment_analysis("RELIANCE", normal_news_items, degraded_ctx),
    ]
    for result in paths:
        assert result.latency_ms >= 0, (
            f"negative latency for {result.status}: {result.latency_ms}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario 10 — Integration compatibility (FixtureDataService end-to-end)
# ─────────────────────────────────────────────────────────────────────────────

async def test_10_integration_with_fixture_data_service_normal() -> None:
    """
    FixtureDataService loads data/news/RELIANCE.json → run_sentiment_analysis
    produces a valid AgentOutput with correct shape.
    Verifies the integration path the orchestrator uses.
    """
    data = FixtureDataService()
    news = await data.news_items("RELIANCE")
    ctx = await _context()
    result = await run_sentiment_analysis("RELIANCE", news, ctx)

    # Shape assertions (mirrors test_agents.py baseline test)
    assert isinstance(result, AgentOutput)
    assert result.agent == AgentType.SENTIMENT
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.NEUTRAL
    assert len(result.evidence) == 3
    assert result.latency_ms >= 0
    # Every evidence item must have source_name and source_type
    assert all(e.source_name and e.source_type for e in result.evidence)
    # Every signal must have a name and source
    assert all(s.name and s.source for s in result.signals)
    # Metadata must identify the implementation
    assert result.metadata.get("implementation") == "namish_lexicon_v1"
    assert result.metadata.get("symbol") == "RELIANCE"


async def test_10_integration_degraded_sentiment_scenario() -> None:
    """
    DEGRADED_SENTIMENT scenario flag — FixtureDataService → UNAVAILABLE.
    Verifies the demo runbook scenario works end-to-end.
    """
    data = FixtureDataService()
    news = await data.news_items("RELIANCE")
    ctx = await _context(DemoScenario.DEGRADED_SENTIMENT)
    result = await run_sentiment_analysis("RELIANCE", news, ctx)

    assert result.status == AgentStatus.UNAVAILABLE
    assert result.classification == AgentClassification.UNKNOWN
    assert result.confidence == 0
    assert result.evidence == []


async def test_10_integration_conflict_scenario_returns_neutral() -> None:
    """
    CONFLICT scenario — the orchestrator drives technical vs fundamental conflict,
    but sentiment still produces an honest result from the news data.
    This verifies sentiment is unaffected by the conflict scenario flag.
    """
    data = FixtureDataService()
    news = await data.news_items("RELIANCE")
    ctx = await _context(DemoScenario.CONFLICT)
    result = await run_sentiment_analysis("RELIANCE", news, ctx)

    # The conflict scenario does not suppress sentiment — normal run
    assert result.status == AgentStatus.SUCCESS
    assert result.classification in {
        AgentClassification.BULLISH,
        AgentClassification.NEUTRAL,
        AgentClassification.BEARISH,
    }
    assert 0 < result.confidence <= 1


# ─────────────────────────────────────────────────────────────────────────────
# Bonus — Core analyzer unit tests (analyzer.py in isolation)
# ─────────────────────────────────────────────────────────────────────────────

def test_analyzer_returns_dataclass_with_required_fields(
    bullish_news_items: list[NewsItem],
) -> None:
    """analyze_news_sentiment must return a SentimentAnalysisResult dataclass."""
    res = analyze_news_sentiment(bullish_news_items)
    assert isinstance(res, SentimentAnalysisResult)
    assert res.classification in list(AgentClassification)
    assert 0.0 <= res.confidence <= 1.0
    assert -1.0 <= res.sentiment_score <= 1.0
    assert res.positive_count >= 0
    assert res.negative_count >= 0
    assert res.source_count >= 1
    assert len(res.signals) == 5  # balance, count, headline, summary, diversity
    assert len(res.reasoning) >= 1


def test_analyzer_single_item_yields_degraded_status(
    single_news_item: list[NewsItem],
) -> None:
    """The core analyzer marks single-item results as DEGRADED."""
    res = analyze_news_sentiment(single_news_item)
    assert res.status == AgentStatus.DEGRADED


def test_analyzer_lexicons_have_no_overlap() -> None:
    """Positive and negative term sets must be disjoint to avoid ambiguous scoring."""
    overlap = POSITIVE_TERMS & NEGATIVE_TERMS
    assert overlap == frozenset(), f"Term overlap found: {overlap}"
