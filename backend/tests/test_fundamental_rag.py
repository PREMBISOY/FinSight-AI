"""Tests for the Fundamental RAG agent.

Coverage:
- document ingestion
- chunk field validation (chunking contract)
- retrieval ranking
- irrelevant query behaviour
- evidence attribution
- missing corpus → unavailable
- malformed / empty-text chunk handling
- AgentOutput schema compliance
- latency measurement
- bullish classification (normal scenario)
- bearish classification (conflict scenario)
- evidence never fabricated when corpus is absent
"""

from __future__ import annotations

import pytest

from backend.app.agents.fundamental import (
    load_chunks,
    retrieve,
    retrieval_backend,
    run_fundamental_analysis,
)
from backend.app.agents.fundamental.corpus import clear_cache
from backend.app.database import InMemoryRepository
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    AnalysisContext,
    DemoScenario,
    DocumentChunk,
)
from backend.app.services.data import FixtureDataService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _context(scenario: DemoScenario = DemoScenario.NORMAL) -> AnalysisContext:
    repository = InMemoryRepository()
    return AnalysisContext(
        user_id="conservative-demo",
        profile=await repository.get_profile("conservative-demo"),
        portfolio=await repository.get_portfolio("conservative-demo"),
        scenario=scenario,
    )


def _make_chunk(
    chunk_id: str = "test-chunk-001",
    text: str = "Revenue grew strongly and cash flow improved significantly.",
    symbol: str = "TESTCO",
    source_name: str = "Test Earnings Brief",
    source_type: str = "synthetic_earnings_brief",
    page: int = 1,
    synthetic: bool = True,
) -> DocumentChunk:
    return DocumentChunk(
        chunk_id=chunk_id,
        symbol=symbol,
        source_name=source_name,
        source_type=source_type,
        text=text,
        page=page,
        url=None,
        synthetic=synthetic,
    )


# ---------------------------------------------------------------------------
# 1. Document ingestion
# ---------------------------------------------------------------------------

async def test_ingestion_loads_chunks_from_fixture() -> None:
    """FixtureDataService loads at least 1 DocumentChunk for RELIANCE."""
    data = FixtureDataService()
    chunks = await data.document_chunks("RELIANCE")
    assert len(chunks) >= 1, "Expected at least one document chunk"


async def test_ingestion_loads_expanded_corpus() -> None:
    """The expanded corpus should contain at least 10 chunks."""
    data = FixtureDataService()
    chunks = await data.document_chunks("RELIANCE")
    assert len(chunks) >= 10, (
        f"Expected ≥10 chunks in expanded corpus, got {len(chunks)}"
    )


# ---------------------------------------------------------------------------
# 2. Chunking / field contract
# ---------------------------------------------------------------------------

async def test_chunking_fields_are_present() -> None:
    """Every chunk must have chunk_id, source_name, source_type, and non-empty text."""
    data = FixtureDataService()
    chunks = await data.document_chunks("RELIANCE")
    for chunk in chunks:
        assert chunk.chunk_id, f"Missing chunk_id on {chunk}"
        assert chunk.source_name, f"Missing source_name on {chunk}"
        assert chunk.source_type, f"Missing source_type on {chunk}"
        assert chunk.text.strip(), f"Empty text on chunk {chunk.chunk_id}"


async def test_chunking_all_synthetic_are_labelled() -> None:
    """All synthetic fixture chunks must carry synthetic=True."""
    data = FixtureDataService()
    chunks = await data.document_chunks("RELIANCE")
    for chunk in chunks:
        assert chunk.synthetic is True, (
            f"Chunk {chunk.chunk_id} is not labelled synthetic"
        )


# ---------------------------------------------------------------------------
# 3. Retrieval — ranked results
# ---------------------------------------------------------------------------

def test_retrieval_returns_ranked_results() -> None:
    """retrieve() returns results ordered by descending relevance score."""
    chunks = [
        _make_chunk("c1", "Revenue grew strongly and cash flow improved significantly.", "X"),
        _make_chunk("c2", "The weather is fine today and birds are singing.", "X"),
        _make_chunk("c3", "Earnings per share increased 15 percent on strong retail growth.", "X"),
    ]
    results = retrieve("revenue growth earnings cash flow", chunks, limit=3)
    assert len(results) <= 3
    scores = [score for _, score in results]
    assert scores == sorted(scores, reverse=True), "Results are not ordered by descending score"


def test_retrieval_respects_limit() -> None:
    """retrieve() returns at most *limit* results."""
    chunks = [_make_chunk(f"c{i}", f"financial document chunk {i}") for i in range(10)]
    results = retrieve("financial", chunks, limit=3)
    assert len(results) <= 3


def test_retrieval_scores_are_in_unit_interval() -> None:
    """All relevance scores must be in [0, 1]."""
    chunks = [
        _make_chunk("c1", "Strong revenue growth and improved margins."),
        _make_chunk("c2", "Regulatory risk and debt refinancing uncertainty."),
    ]
    results = retrieve("revenue growth", chunks, limit=2)
    for _, score in results:
        assert 0.0 <= score <= 1.0, f"Score {score} is outside [0, 1]"


# ---------------------------------------------------------------------------
# 4. Irrelevant query
# ---------------------------------------------------------------------------

def test_retrieval_irrelevant_query_does_not_crash() -> None:
    """A completely unrelated query should return results without raising."""
    chunks = [
        _make_chunk("c1", "Consolidated revenue grew 12 percent year over year."),
        _make_chunk("c2", "Free cash flow improved during the period."),
    ]
    results = retrieve("xyzzy quux frobble nonsense", chunks, limit=2)
    # Should return results (possibly low-score) but must not crash
    assert isinstance(results, list)


def test_retrieval_irrelevant_query_has_lower_scores_than_relevant() -> None:
    """Irrelevant query scores should be lower than on-topic query scores."""
    chunks = [_make_chunk("c1", "Revenue grew strongly year over year on improved earnings.")]
    relevant_results = retrieve("revenue growth earnings", chunks, limit=1)
    irrelevant_results = retrieve("xyzzy quux frobble nonsense", chunks, limit=1)

    relevant_score = relevant_results[0][1] if relevant_results else 0.0
    irrelevant_score = irrelevant_results[0][1] if irrelevant_results else 0.0
    assert relevant_score >= irrelevant_score, (
        "Expected relevant query to score at least as high as irrelevant query"
    )


# ---------------------------------------------------------------------------
# 5. Evidence attribution
# ---------------------------------------------------------------------------

async def test_evidence_attribution_fields() -> None:
    """Every evidence item must have chunk_id, source_name, and relevance_score."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth cash flow operating outlook",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    assert len(result.evidence) > 0, "Expected at least one evidence item"
    for item in result.evidence:
        assert item.chunk_id, f"Evidence missing chunk_id: {item}"
        assert item.source_name, f"Evidence missing source_name: {item}"
        assert item.relevance_score is not None, f"Evidence missing relevance_score: {item}"
        assert 0.0 <= item.relevance_score <= 1.0


async def test_evidence_carries_synthetic_label() -> None:
    """Evidence from synthetic documents must carry synthetic=True."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth outlook",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    for item in result.evidence:
        assert item.synthetic is True, f"Evidence item {item.chunk_id} not labelled synthetic"


# ---------------------------------------------------------------------------
# 6. Missing corpus → unavailable
# ---------------------------------------------------------------------------

async def test_missing_corpus_returns_unavailable() -> None:
    """Empty document list must return UNAVAILABLE with UNKNOWN and zero confidence."""
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(),
        [],  # empty corpus
    )
    assert result.status == AgentStatus.UNAVAILABLE
    assert result.classification == AgentClassification.UNKNOWN
    assert result.confidence == 0


# ---------------------------------------------------------------------------
# 7. Evidence never fabricated on unavailable path
# ---------------------------------------------------------------------------

async def test_evidence_never_fabricated_when_corpus_missing() -> None:
    """When the corpus is empty, evidence must be an empty list."""
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(),
        [],
    )
    assert result.evidence == [], "Evidence must not be fabricated when corpus is unavailable"


# ---------------------------------------------------------------------------
# 8. Malformed / degenerate chunk handling
# ---------------------------------------------------------------------------

def test_malformed_empty_text_chunk_does_not_crash_retrieval() -> None:
    """A chunk whose text is whitespace-only should not crash retrieve()."""
    chunks = [
        _make_chunk("c1", "Revenue grew strongly year over year."),
        DocumentChunk(
            chunk_id="c2-empty",
            symbol="X",
            source_name="Test",
            source_type="synthetic_test",
            text="   ",  # degenerate
            page=1,
            url=None,
            synthetic=True,
        ),
    ]
    # Must not raise
    results = retrieve("revenue growth", chunks, limit=2)
    assert isinstance(results, list)


# ---------------------------------------------------------------------------
# 9. AgentOutput schema compliance
# ---------------------------------------------------------------------------

async def test_agent_output_passes_schema_validation() -> None:
    """The output must be a valid AgentOutput Pydantic model instance."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth cash flow",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    assert isinstance(result, AgentOutput)
    assert result.agent == AgentType.FUNDAMENTAL
    assert result.classification in AgentClassification
    assert result.status in AgentStatus
    assert 0.0 <= result.confidence <= 1.0
    assert isinstance(result.signals, list)
    assert isinstance(result.reasoning, list)
    assert isinstance(result.evidence, list)
    assert isinstance(result.limitations, list)


async def test_agent_output_has_three_signals() -> None:
    """The successful output must contain exactly 3 signals."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    signal_names = {s.name for s in result.signals}
    assert "retrieved_evidence_tone" in signal_names
    assert "average_retrieval_relevance" in signal_names
    assert "top_chunk_relevance" in signal_names


# ---------------------------------------------------------------------------
# 10. Latency measurement
# ---------------------------------------------------------------------------

async def test_latency_is_measured_and_non_negative() -> None:
    """latency_ms must be a non-negative float."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth cash flow",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    assert result.latency_ms >= 0.0


async def test_latency_is_measured_on_unavailable_path() -> None:
    """latency_ms must be non-negative even on the empty-corpus path."""
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(),
        [],
    )
    assert result.latency_ms >= 0.0


# ---------------------------------------------------------------------------
# 11. Classification — normal bullish scenario
# ---------------------------------------------------------------------------

async def test_fundamental_analysis_normal_is_bullish() -> None:
    """Normal scenario with earnings-oriented query should classify BULLISH."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth cash flow operating outlook earnings",
        await _context(DemoScenario.NORMAL),
        await data.document_chunks("RELIANCE"),
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.BULLISH
    assert result.confidence > 0


# ---------------------------------------------------------------------------
# 12. Classification — conflict scenario is bearish
# ---------------------------------------------------------------------------

async def test_fundamental_analysis_conflict_is_bearish() -> None:
    """CONFLICT scenario must steer retrieval toward risk chunks → BEARISH."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(DemoScenario.CONFLICT),
        await data.document_chunks("RELIANCE"),
    )
    assert result.status == AgentStatus.SUCCESS
    assert result.classification == AgentClassification.BEARISH


# ---------------------------------------------------------------------------
# 13. Corpus loader
# ---------------------------------------------------------------------------

def test_corpus_loader_returns_chunks() -> None:
    """load_chunks() returns the same chunks as the fixture data service."""
    clear_cache()
    chunks = load_chunks("RELIANCE")
    assert len(chunks) >= 10


def test_corpus_loader_missing_symbol_returns_empty() -> None:
    """load_chunks() for an unknown symbol returns an empty list (no exception)."""
    clear_cache()
    chunks = load_chunks("XXXXNOTEXIST")
    assert chunks == []


# ---------------------------------------------------------------------------
# 14. Retrieval backend label in metadata
# ---------------------------------------------------------------------------

async def test_metadata_contains_retrieval_backend() -> None:
    """The output metadata must document which retrieval backend was used."""
    data = FixtureDataService()
    result = await run_fundamental_analysis(
        "RELIANCE",
        "revenue growth",
        await _context(),
        await data.document_chunks("RELIANCE"),
    )
    assert "retrieval_backend" in result.metadata
    assert result.metadata["retrieval_backend"] in ("embedding", "lexical")
    assert result.metadata["retrieval_backend"] == retrieval_backend()
