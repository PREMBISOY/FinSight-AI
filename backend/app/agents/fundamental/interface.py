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

from .retrieval import retrieve


POSITIVE_TERMS = {"grew", "growth", "strong", "improved", "increased", "resilient", "expansion"}
NEGATIVE_TERMS = {"decline", "downside", "pressure", "risk", "uncertainty", "weak", "weaken"}


async def run_fundamental_analysis(
    symbol: str,
    query: str,
    context: AnalysisContext,
    documents: list[DocumentChunk],
) -> AgentOutput:
    """Lightweight local RAG fallback with visible, source-attributed retrieval."""
    started = perf_counter()
    if not documents:
        return AgentOutput(
            agent=AgentType.FUNDAMENTAL,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.UNKNOWN,
            confidence=0,
            latency_ms=round((perf_counter() - started) * 1000, 3),
            limitations=["No financial document chunks were available; no evidence was invented."],
            metadata={"implementation": "local_rag_fallback", "symbol": symbol},
        )

    effective_query = query
    if context.scenario == DemoScenario.CONFLICT:
        effective_query = "debt refinancing regulatory uncertainty margin pressure downside decline risk"
    elif not any(term in query.lower() for term in ("growth", "revenue", "cash", "outlook")):
        effective_query = f"{query} revenue growth cash flow operating outlook"

    retrieved = retrieve(effective_query, documents, limit=2)
    combined = " ".join(chunk.text.lower() for chunk, _ in retrieved)
    tokens = re.findall(r"[a-zA-Z]+", combined)
    positive_count = sum(token in POSITIVE_TERMS for token in tokens)
    negative_count = sum(token in NEGATIVE_TERMS for token in tokens)
    net_score = (positive_count - negative_count) / max(positive_count + negative_count, 1)

    if net_score > 0.15:
        classification = AgentClassification.BULLISH
    elif net_score < -0.15:
        classification = AgentClassification.BEARISH
    else:
        classification = AgentClassification.NEUTRAL

    average_relevance = sum(score for _, score in retrieved) / len(retrieved)
    confidence = min(0.9, 0.58 + abs(net_score) * 0.16 + average_relevance * 0.18)
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
    return AgentOutput(
        agent=AgentType.FUNDAMENTAL,
        status=AgentStatus.SUCCESS,
        classification=classification,
        confidence=round(confidence, 4),
        signals=[
            Signal(
                name="retrieved_evidence_tone",
                value=round(net_score, 4),
                interpretation="Positive/negative term balance across retrieved document chunks.",
                source="local document retrieval",
            ),
            Signal(
                name="average_retrieval_relevance",
                value=round(average_relevance, 4),
                interpretation="Cosine relevance of retrieved lexical vectors.",
                source="local document retrieval",
            ),
        ],
        reasoning=[
            f"Retrieved {len(retrieved)} attributed chunks for the analysis query.",
            f"Retrieved evidence contained {positive_count} supportive and {negative_count} cautionary terms.",
        ],
        evidence=evidence,
        latency_ms=round((perf_counter() - started) * 1000, 3),
        limitations=["Sprint 1 fallback uses transparent lexical-vector retrieval rather than a hosted embedding model."],
        metadata={"implementation": "local_rag_fallback", "query": effective_query, "symbol": symbol},
    )
