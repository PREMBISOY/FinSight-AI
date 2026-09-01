"""Fundamental Agent interface.

Implements genuine retrieval-augmented generation for financial-document
analysis.  The RAG pipeline is:

    DocumentChunks
        ↓  EmbeddingIndex (sentence-transformers all-MiniLM-L6-v2)
        ↓  or LexicalIndex (Counter cosine fallback)
    Top-k retrieved chunks (default k=4)
        ↓  positive/negative term scoring
    Classification  →  Evidence-backed AgentOutput

The function signature is fixed by the shared contract in
``docs/AGENT_CONTRACT.md``::

    async def run_fundamental_analysis(
        symbol: str,
        query: str,
        context: AnalysisContext,
        documents: list[DocumentChunk],
    ) -> AgentOutput
"""

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
    DocumentChunk,
    Evidence,
    Signal,
)

from .retrieval import retrieve, retrieval_backend

# ---------------------------------------------------------------------------
# Keyword vocabulary for tone scoring
# ---------------------------------------------------------------------------

POSITIVE_TERMS = {
    "grew",
    "growth",
    "strong",
    "improved",
    "increased",
    "resilient",
    "expansion",
    "accelerated",
    "positive",
    "recovery",
    "outperform",
    "record",
    "momentum",
    "upgrade",
    "dividend",
    "profitable",
}

NEGATIVE_TERMS = {
    "decline",
    "downside",
    "pressure",
    "risk",
    "uncertainty",
    "weak",
    "weaken",
    "miss",
    "loss",
    "slowdown",
    "downgrade",
    "concern",
    "headwind",
    "competition",
    "volatility",
    "debt",
    "regulatory",
}

# Minimum relevance score for a chunk to contribute to tone scoring.
# Set high enough that marginally-relevant chunks (retrieved due to incidental
# vocabulary overlap) do not swing the classification.
_RELEVANCE_THRESHOLD = 0.37

# Number of chunks to retrieve per query.
_RETRIEVAL_LIMIT = 4

# Classification dead-band: |net_score| must exceed this to be directional.
_CLASSIFICATION_THRESHOLD = 0.20


async def run_fundamental_analysis(
    symbol: str,
    query: str,
    context: AnalysisContext,
    documents: list[DocumentChunk],
) -> AgentOutput:
    """Analyse available financial documents for *symbol* and return an evidence-backed AgentOutput.

    Parameters
    ----------
    symbol:
        Ticker symbol, e.g. ``"RELIANCE"``.
    query:
        Natural-language question from the orchestrator/user.
    context:
        Analysis context carrying the demo scenario flag.
    documents:
        Pre-loaded ``DocumentChunk`` objects from the data service.
        The orchestrator passes these in; this function does not load files.
    """
    started = perf_counter()

    # ------------------------------------------------------------------
    # Guard: no corpus → unavailable (never fabricate evidence)
    # ------------------------------------------------------------------
    if not documents:
        return AgentOutput(
            agent=AgentType.FUNDAMENTAL,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=[
                "No financial document chunks were available; no evidence was invented."
            ],
            metadata={
                "implementation": retrieval_backend() + "_rag",
                "symbol": symbol,
            },
        )

    # ------------------------------------------------------------------
    # Query steering for demo scenarios
    # ------------------------------------------------------------------
    effective_query = query
    if context.scenario == DemoScenario.CONFLICT:
        # Steer toward bearish risk-note content to produce a BEARISH result
        # so synthesis can detect a genuine conflict with the technical agent.
        effective_query = (
            "debt refinancing regulatory uncertainty margin pressure "
            "downside decline risk weaken headwind"
        )
    elif not any(
        term in query.lower()
        for term in ("growth", "revenue", "cash", "outlook", "earnings", "profit")
    ):
        effective_query = f"{query} revenue growth cash flow operating outlook earnings"

    # ------------------------------------------------------------------
    # RAG retrieval
    # ------------------------------------------------------------------
    retrieved = retrieve(effective_query, documents, limit=_RETRIEVAL_LIMIT)

    # ------------------------------------------------------------------
    # Tone scoring over retrieved chunks (above relevance threshold)
    # ------------------------------------------------------------------
    scoreable = [(chunk, score) for chunk, score in retrieved if score >= _RELEVANCE_THRESHOLD]
    if not scoreable:
        # All scores below threshold — use all retrieved regardless
        scoreable = retrieved

    combined = " ".join(chunk.text.lower() for chunk, _ in scoreable)
    tokens = re.findall(r"[a-zA-Z]+", combined)
    positive_count = sum(token in POSITIVE_TERMS for token in tokens)
    negative_count = sum(token in NEGATIVE_TERMS for token in tokens)
    net_score = (positive_count - negative_count) / max(positive_count + negative_count, 1)

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------
    if net_score > _CLASSIFICATION_THRESHOLD:
        classification = AgentClassification.BULLISH
    elif net_score < -_CLASSIFICATION_THRESHOLD:
        classification = AgentClassification.BEARISH
    else:
        classification = AgentClassification.NEUTRAL

    # ------------------------------------------------------------------
    # Confidence
    # ------------------------------------------------------------------
    relevance_scores = [score for _, score in retrieved]
    average_relevance = sum(relevance_scores) / len(relevance_scores)
    top_relevance = max(relevance_scores)
    evidence_volume = len([s for s in relevance_scores if s >= _RELEVANCE_THRESHOLD])

    confidence = min(
        0.92,
        0.55
        + abs(net_score) * 0.15
        + average_relevance * 0.15
        + top_relevance * 0.07
        + (evidence_volume / _RETRIEVAL_LIMIT) * 0.05,
    )

    # ------------------------------------------------------------------
    # Evidence — every retrieved chunk becomes a traceable Evidence item
    # ------------------------------------------------------------------
    evidence = [
        Evidence(
            source_name=chunk.source_name,
            source_type=chunk.source_type,
            excerpt=chunk.text,
            url=chunk.url,
            page=chunk.page,
            chunk_id=chunk.chunk_id,
            relevance_score=round(score, 4),
            synthetic=chunk.synthetic,
        )
        for chunk, score in retrieved
    ]

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------
    backend = retrieval_backend()
    return AgentOutput(
        agent=AgentType.FUNDAMENTAL,
        status=AgentStatus.SUCCESS,
        classification=classification,
        confidence=round(confidence, 4),
        signals=[
            Signal(
                name="retrieved_evidence_tone",
                value=round(net_score, 4),
                interpretation=(
                    f"Positive/negative keyword balance across {len(scoreable)} retrieved "
                    "document chunks. Positive: bullish, negative: bearish."
                ),
                source=f"{backend} document retrieval",
            ),
            Signal(
                name="average_retrieval_relevance",
                value=round(average_relevance, 4),
                interpretation=(
                    f"Mean cosine similarity of top-{_RETRIEVAL_LIMIT} retrieved chunks "
                    "to the analysis query."
                ),
                source=f"{backend} document retrieval",
            ),
            Signal(
                name="top_chunk_relevance",
                value=round(top_relevance, 4),
                interpretation="Cosine similarity of the single most relevant document chunk.",
                source=f"{backend} document retrieval",
            ),
        ],
        reasoning=[
            f"Retrieved {len(retrieved)} attributed document chunks via {backend} retrieval.",
            f"Top chunk relevance score: {round(top_relevance, 4):.4f}.",
            f"Retrieved evidence contained {positive_count} supportive and {negative_count} cautionary terms.",
            f"Net tone score {round(net_score, 4):+.4f} → {classification.value} classification.",
        ],
        evidence=evidence,
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=[
            f"Retrieval uses {backend} cosine similarity; "
            + (
                "all-MiniLM-L6-v2 sentence embeddings provide genuine semantic search."
                if backend == "embedding"
                else "lexical-vector fallback active because sentence-transformers is not installed."
            ),
            "Corpus is synthetic/curated and labelled; real filings would improve precision.",
            "Classification is tone-based; no DCF or quantitative model is applied.",
        ],
        metadata={
            "implementation": f"{backend}_rag",
            "retrieval_backend": backend,
            "query": effective_query,
            "symbol": symbol,
            "chunks_retrieved": len(retrieved),
            "corpus_size": len(documents),
        },
    )
