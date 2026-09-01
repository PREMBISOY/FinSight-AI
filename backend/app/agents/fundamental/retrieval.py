"""Semantic retrieval for the Fundamental RAG agent.

Two-tier implementation:

1. **EmbeddingIndex** — uses ``sentence-transformers`` (``all-MiniLM-L6-v2``)
   to encode document chunks once and rank by cosine similarity at query time.
   Produces genuine dense-vector semantic search.

2. **LexicalIndex** — fallback used automatically when ``sentence-transformers``
   is not installed.  Implements TF-weighted cosine similarity over token
   frequency vectors (Counter), which is what the original Sprint 1 stub used.

The public API is the single function::

    retrieve(query, chunks, limit=4) -> list[tuple[DocumentChunk, float]]

The caller (interface.py) never needs to know which backend is active.
"""

from __future__ import annotations

import logging
import math
import re
from collections import Counter
from backend.app.schemas import DocumentChunk

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Attempt to import sentence-transformers; note absence but do not raise.
# ---------------------------------------------------------------------------
try:
    from sentence_transformers import SentenceTransformer  # type: ignore[import-untyped]
    import numpy as np  # already required by numpy dep

    _ST_AVAILABLE = True
except ImportError:
    _ST_AVAILABLE = False
    logger.warning(
        "sentence-transformers not available; fundamental agent will use "
        "lexical-vector retrieval as fallback."
    )

# ---------------------------------------------------------------------------
# Model singleton — loaded once per process, not per request.
# ---------------------------------------------------------------------------
_MODEL_NAME = "all-MiniLM-L6-v2"
_model: "SentenceTransformer | None" = None  # noqa: F821 — guarded by _ST_AVAILABLE


def _get_model() -> "SentenceTransformer":  # noqa: F821
    global _model  # noqa: PLW0603
    if _model is None:
        logger.info("Loading embedding model '%s' …", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


# ---------------------------------------------------------------------------
# Embedding-based index
# ---------------------------------------------------------------------------

class EmbeddingIndex:
    """Encodes a fixed list of DocumentChunks and supports cosine-similarity search."""

    def __init__(self, chunks: list[DocumentChunk]) -> None:
        import numpy as np  # noqa: PLC0415

        self._chunks = list(chunks)
        model = _get_model()
        texts = [c.text for c in self._chunks]
        # encode returns (n, dim) float32 ndarray
        raw: "np.ndarray" = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # L2-normalise rows so dot product == cosine similarity
        norms = np.linalg.norm(raw, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        self._matrix: "np.ndarray" = (raw / norms).astype(np.float32)

    def search(self, query: str, limit: int) -> list[tuple[DocumentChunk, float]]:
        import numpy as np  # noqa: PLC0415

        model = _get_model()
        q_raw: "np.ndarray" = model.encode([query], convert_to_numpy=True, show_progress_bar=False)
        q_norm = np.linalg.norm(q_raw)
        if q_norm == 0:
            q_vec = q_raw[0].astype(np.float32)
        else:
            q_vec = (q_raw[0] / q_norm).astype(np.float32)

        scores: "np.ndarray" = self._matrix @ q_vec  # cosine similarity, shape (n,)
        top_indices = np.argsort(scores)[::-1][:limit]
        # Cosine similarity can be negative, while the shared Evidence schema
        # deliberately exposes relevance on a normalized 0..1 scale.
        return [
            (self._chunks[i], max(0.0, min(1.0, float(scores[i]))))
            for i in top_indices
        ]


# ---------------------------------------------------------------------------
# Lexical fallback index (original Sprint 1 Counter cosine)
# ---------------------------------------------------------------------------

_TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9]+")


def _lexical_vector(text: str) -> Counter[str]:
    return Counter(
        token.lower()
        for token in _TOKEN_PATTERN.findall(text)
        if len(token) > 2
    )


def _lexical_cosine(left: Counter[str], right: Counter[str]) -> float:
    numerator = sum(value * right.get(key, 0) for key, value in left.items())
    left_norm = math.sqrt(sum(v * v for v in left.values()))
    right_norm = math.sqrt(sum(v * v for v in right.values()))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


class LexicalIndex:
    """TF cosine-similarity retrieval — no external dependencies."""

    def __init__(self, chunks: list[DocumentChunk]) -> None:
        self._chunks = list(chunks)
        self._vectors = [_lexical_vector(c.text) for c in self._chunks]

    def search(self, query: str, limit: int) -> list[tuple[DocumentChunk, float]]:
        q_vec = _lexical_vector(query)
        ranked = sorted(
            ((chunk, _lexical_cosine(q_vec, vec)) for chunk, vec in zip(self._chunks, self._vectors)),
            key=lambda item: item[1],
            reverse=True,
        )
        return ranked[:limit]


# ---------------------------------------------------------------------------
# Public retrieval function
# ---------------------------------------------------------------------------

# Per-symbol cache: symbol -> (index, content fingerprint). Fixture/service
# layers commonly create a fresh list on every request, so object identity
# would rebuild the embedding index on every analysis.
_index_cache: dict[str, tuple[object, tuple[tuple[str, str], ...]]] = {}


def _build_index(chunks: list[DocumentChunk]) -> EmbeddingIndex | LexicalIndex:
    """Build the best available index for the given chunk list."""
    if _ST_AVAILABLE:
        return EmbeddingIndex(chunks)
    return LexicalIndex(chunks)


def retrieve(
    query: str,
    chunks: list[DocumentChunk],
    limit: int = 4,
) -> list[tuple[DocumentChunk, float]]:
    """Return up to *limit* (chunk, relevance_score) pairs ordered by descending relevance.

    Uses embedding cosine similarity when ``sentence-transformers`` is available,
    otherwise uses lexical cosine similarity.  Scores are in [0, 1].
    """
    if not chunks:
        return []

    symbol = chunks[0].symbol if chunks else "_"
    cache_key = symbol
    fingerprint = tuple((chunk.chunk_id, chunk.text) for chunk in chunks)
    cached_index, cached_fingerprint = _index_cache.get(cache_key, (None, ()))

    if cached_index is None or cached_fingerprint != fingerprint:
        cached_index = _build_index(chunks)
        _index_cache[cache_key] = (cached_index, fingerprint)

    return cached_index.search(query, limit)


def retrieval_backend() -> str:
    """Return the name of the active retrieval backend (for metadata / testing)."""
    return "embedding" if _ST_AVAILABLE else "lexical"
