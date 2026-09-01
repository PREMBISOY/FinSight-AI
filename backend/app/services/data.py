from __future__ import annotations

import asyncio
import json
from pathlib import Path

from backend.app.schemas import DocumentChunk, MarketData, NewsItem


class DataNotFoundError(LookupError):
    """Raised when a requested demo dataset does not exist."""


class FixtureDataService:
    """Reliable Sprint 1 input provider backed by clearly labeled JSON fixtures."""

    def __init__(self, data_root: Path | None = None) -> None:
        self.data_root = data_root or Path(__file__).resolve().parents[3] / "data"

    @staticmethod
    def _read_json(path: Path) -> object:
        if not path.exists():
            raise DataNotFoundError(f"No curated dataset is available for {path.stem.upper()}")
        return json.loads(path.read_text(encoding="utf-8"))

    async def market_data(self, symbol: str) -> MarketData:
        payload = await asyncio.to_thread(
            self._read_json, self.data_root / "market" / f"{symbol.upper()}.json"
        )
        return MarketData.model_validate(payload)

    async def news_items(self, symbol: str) -> list[NewsItem]:
        payload = await asyncio.to_thread(
            self._read_json, self.data_root / "news" / f"{symbol.upper()}.json"
        )
        return [NewsItem.model_validate(item) for item in payload]

    async def document_chunks(self, symbol: str) -> list[DocumentChunk]:
        payload = await asyncio.to_thread(
            self._read_json, self.data_root / "documents" / f"{symbol.upper()}.json"
        )
        return [DocumentChunk.model_validate(item) for item in payload]
