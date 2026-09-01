from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Protocol, TypeVar

from backend.app.core.config import Settings, settings
from backend.app.core.symbols import canonical_symbol
from backend.app.schemas import DocumentChunk, MarketData, NewsItem

from .cache import CachedSnapshot, SnapshotCache, build_snapshot_cache


logger = logging.getLogger(__name__)
T = TypeVar("T")


class DataNotFoundError(LookupError):
    """Raised when a requested market dataset cannot be obtained."""


class DataService(Protocol):
    async def resolve_symbol(self, symbol: str) -> str: ...

    async def market_data(self, symbol: str) -> MarketData: ...

    async def news_items(self, symbol: str) -> list[NewsItem]: ...

    async def document_chunks(self, symbol: str) -> list[DocumentChunk]: ...


class FixtureDataService:
    """Reliable Sprint 1 input provider backed by clearly labeled JSON fixtures."""

    def __init__(self, data_root: Path | None = None) -> None:
        self.data_root = data_root or Path(__file__).resolve().parents[3] / "data"

    @staticmethod
    def _read_json(path: Path) -> object:
        if not path.exists():
            raise DataNotFoundError(f"No curated dataset is available for {path.stem.upper()}")
        return json.loads(path.read_text(encoding="utf-8"))

    async def resolve_symbol(self, symbol: str) -> str:
        return canonical_symbol(symbol)

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


class HybridDataService:
    """Live provider with TTL snapshots and an optional explicit test fallback.

    Production construction never supplies ``fallback``.  That guarantees a live
    request can only return live Yahoo Finance data or a previously stored Yahoo
    Finance snapshot; it cannot silently turn into a fixture when the upstream
    provider is unavailable.
    """

    def __init__(
        self,
        primary: DataService,
        fallback: DataService | None,
        cache: SnapshotCache,
        *,
        market_ttl_seconds: int = 900,
        news_ttl_seconds: int = 1800,
        fundamentals_ttl_seconds: int = 21600,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.cache = cache
        self.market_ttl_seconds = market_ttl_seconds
        self.news_ttl_seconds = news_ttl_seconds
        self.fundamentals_ttl_seconds = fundamentals_ttl_seconds

    async def resolve_symbol(self, symbol: str) -> str:
        """Delegate resolution to the live provider before cache keys are created."""

        try:
            return await self.primary.resolve_symbol(symbol)
        except Exception:
            if self.fallback is not None:
                return await self.fallback.resolve_symbol(symbol)
            raise

    async def _cached(self, symbol: str, data_type: str) -> CachedSnapshot | None:
        try:
            return await self.cache.get(symbol, data_type)
        except Exception as exc:
            logger.warning(
                "snapshot_cache_read_failed",
                extra={
                    "symbol": symbol.upper(),
                    "data_type": data_type,
                    "error_type": type(exc).__name__,
                },
            )
            return None

    async def _store(
        self,
        symbol: str,
        data_type: str,
        payload: object,
        provider: str,
        ttl_seconds: int,
    ) -> None:
        try:
            await self.cache.set(symbol, data_type, payload, provider, ttl_seconds)
        except Exception as exc:
            logger.warning(
                "snapshot_cache_write_failed",
                extra={
                    "symbol": symbol.upper(),
                    "data_type": data_type,
                    "error_type": type(exc).__name__,
                },
            )

    async def _load(
        self,
        *,
        symbol: str,
        data_type: str,
        ttl_seconds: int,
        primary_loader: Callable[[str], Awaitable[T]],
        fallback_loader: Callable[[str], Awaitable[T]] | None,
        serialize: Callable[[T], object],
        parse: Callable[[object, CachedSnapshot], T],
    ) -> T:
        snapshot = await self._cached(symbol, data_type)
        if snapshot is not None and not snapshot.expired:
            try:
                return parse(snapshot.payload, snapshot)
            except Exception as exc:
                logger.warning(
                    "snapshot_cache_payload_invalid",
                    extra={
                        "symbol": symbol.upper(),
                        "data_type": data_type,
                        "error_type": type(exc).__name__,
                    },
                )

        provider_error: Exception | None = None
        try:
            result = await primary_loader(symbol)
            await self._store(
                symbol,
                data_type,
                serialize(result),
                "yahoo_finance",
                ttl_seconds,
            )
            return result
        except Exception as exc:
            provider_error = exc
            logger.warning(
                "live_data_provider_failed",
                extra={
                    "symbol": symbol.upper(),
                    "data_type": data_type,
                    "error_type": type(exc).__name__,
                },
            )

        if snapshot is not None:
            try:
                return parse(snapshot.payload, snapshot)
            except Exception:
                pass
        if fallback_loader is not None:
            return await fallback_loader(symbol)
        raise DataNotFoundError(
            f"Live {data_type} data is currently unavailable for {symbol.upper()}"
        ) from provider_error

    async def market_data(self, symbol: str) -> MarketData:
        def parse(payload: object, snapshot: CachedSnapshot) -> MarketData:
            market = MarketData.model_validate(payload)
            freshness = "stale_cache" if snapshot.expired else "cache"
            return market.model_copy(
                update={"source": f"{market.source}:{freshness}"}
            )

        return await self._load(
            symbol=symbol,
            data_type="market",
            ttl_seconds=self.market_ttl_seconds,
            primary_loader=self.primary.market_data,
            fallback_loader=self.fallback.market_data if self.fallback else None,
            serialize=lambda value: value.model_dump(mode="json"),
            parse=parse,
        )

    async def news_items(self, symbol: str) -> list[NewsItem]:
        def parse(payload: object, snapshot: CachedSnapshot) -> list[NewsItem]:
            items = [NewsItem.model_validate(item) for item in payload]
            if snapshot.expired:
                return [
                    item.model_copy(update={"source_name": f"{item.source_name} (stale cache)"})
                    for item in items
                ]
            return items

        return await self._load(
            symbol=symbol,
            data_type="news",
            ttl_seconds=self.news_ttl_seconds,
            primary_loader=self.primary.news_items,
            fallback_loader=self.fallback.news_items if self.fallback else None,
            serialize=lambda values: [value.model_dump(mode="json") for value in values],
            parse=parse,
        )

    async def document_chunks(self, symbol: str) -> list[DocumentChunk]:
        def parse(payload: object, snapshot: CachedSnapshot) -> list[DocumentChunk]:
            chunks = [DocumentChunk.model_validate(item) for item in payload]
            if snapshot.expired:
                return [
                    item.model_copy(update={"source_name": f"{item.source_name} (stale cache)"})
                    for item in chunks
                ]
            return chunks

        return await self._load(
            symbol=symbol,
            data_type="fundamentals",
            ttl_seconds=self.fundamentals_ttl_seconds,
            primary_loader=self.primary.document_chunks,
            fallback_loader=self.fallback.document_chunks if self.fallback else None,
            serialize=lambda values: [value.model_dump(mode="json") for value in values],
            parse=parse,
        )


def build_data_service(config: Settings = settings) -> DataService:
    """Build a live-and-cached provider unless fixtures are explicitly requested."""

    if config.data_mode == "fixture":
        return FixtureDataService()
    if config.data_mode not in {"live", "hybrid"}:
        raise ValueError("DATA_MODE must be one of: live, hybrid, fixture")

    from .yahoo import YahooFinanceDataService

    live = YahooFinanceDataService(exchange_suffix=config.yahoo_exchange_suffix)
    # ``hybrid`` remains a backwards-compatible name for deployments that used
    # the former setting.  It now combines only the live provider and its cache;
    # fixture data is available solely through DATA_MODE=fixture.
    return HybridDataService(
        primary=live,
        fallback=None,
        cache=build_snapshot_cache(config),
        market_ttl_seconds=config.market_cache_ttl_seconds,
        news_ttl_seconds=config.news_cache_ttl_seconds,
        fundamentals_ttl_seconds=config.fundamentals_cache_ttl_seconds,
    )
