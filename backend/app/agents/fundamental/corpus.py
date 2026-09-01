"""Corpus loader for the Fundamental RAG agent.

Reads ``data/documents/{SYMBOL}.json`` and returns a list of
``DocumentChunk`` objects.  Results are cached in memory for the
lifetime of the process so the file is read only once per symbol.

This module is optional — the orchestrator already loads chunks via
``FixtureDataService.document_chunks`` and passes them to
``run_fundamental_analysis``.  ``corpus.py`` exists so that the
retrieval layer and tests can load chunks independently without
depending on the data service.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from backend.app.schemas import DocumentChunk

logger = logging.getLogger(__name__)

# Project root: backend/app/agents/fundamental/ → ../../../../data/
_DATA_ROOT = Path(__file__).resolve().parents[4] / "data" / "documents"

_cache: dict[str, list[DocumentChunk]] = {}


def load_chunks(symbol: str, data_root: Path | None = None) -> list[DocumentChunk]:
    """Load and cache ``DocumentChunk`` objects for *symbol*.

    Parameters
    ----------
    symbol:
        Ticker symbol, e.g. ``"RELIANCE"``.  Case-insensitive.
    data_root:
        Override the default ``data/documents/`` directory.
        Useful in tests that supply a temporary fixture path.

    Returns
    -------
    list[DocumentChunk]
        An empty list when the file is absent or malformed (never raises).
    """
    key = symbol.upper()
    if key in _cache and data_root is None:
        return _cache[key]

    root = data_root or _DATA_ROOT
    path = root / f"{key}.json"

    if not path.exists():
        logger.warning("Corpus file not found: %s", path)
        return []

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        chunks = [DocumentChunk.model_validate(item) for item in raw]
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to parse corpus file %s: %s", path, exc)
        return []

    if data_root is None:
        _cache[key] = chunks

    logger.info("Loaded %d document chunks for %s from %s", len(chunks), key, path)
    return chunks


async def load_chunks_async(symbol: str, data_root: Path | None = None) -> list[DocumentChunk]:
    """Async wrapper around :func:`load_chunks` for use in async contexts."""
    return await asyncio.to_thread(load_chunks, symbol, data_root)


def clear_cache() -> None:
    """Clear the in-memory chunk cache.  Primarily useful in tests."""
    _cache.clear()
