from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pandas as pd
import pytest

from backend.app.core.config import Settings
from backend.app.schemas import DocumentChunk, MarketData, NewsItem, PricePoint
from backend.app.services.cache import CachedSnapshot, InMemorySnapshotCache, SupabaseSnapshotCache
from backend.app.services.data import (
    DataNotFoundError,
    FixtureDataService,
    HybridDataService,
    build_data_service,
)
from backend.app.services.yahoo import YahooFinanceDataService


class FakeTicker:
    history_metadata = {"regularMarketPrice": 2525.25, "currency": "INR"}

    def __init__(self) -> None:
        columns = [pd.Timestamp("2026-06-30"), pd.Timestamp("2025-06-30")]
        self.income_stmt = pd.DataFrame(
            [[100_000.0, 90_000.0], [12_000.0, 10_000.0]],
            index=["Total Revenue", "Net Income"],
            columns=columns,
        )
        self.balance_sheet = pd.DataFrame(
            [[35_000.0, 40_000.0]],
            index=["Total Debt"],
            columns=columns,
        )
        self.cashflow = pd.DataFrame(
            [[18_000.0, 15_000.0]],
            index=["Free Cash Flow"],
            columns=columns,
        )

    def history(self, **_kwargs: object) -> pd.DataFrame:
        index = pd.date_range("2026-06-01", periods=4, tz="Asia/Kolkata")
        return pd.DataFrame(
            {"Close": [2490.0, 2500.0, 2510.0, 2520.0], "Volume": [10, 11, 12, 13]},
            index=index,
        )

    def get_news(self, **_kwargs: object) -> list[dict[str, object]]:
        return [
            {
                "id": "news-1",
                "content": {
                    "title": "Reliance announces a new investment",
                    "summary": "The company detailed its latest investment plan.",
                    "pubDate": "2026-06-30T07:30:00Z",
                    "provider": {"displayName": "Example Wire"},
                    "canonicalUrl": {"url": "https://example.com/reliance"},
                },
            }
        ]


@pytest.mark.asyncio
async def test_yahoo_adapter_maps_nse_symbol_and_returns_live_inputs() -> None:
    requested_symbols: list[str] = []

    def factory(symbol: str) -> FakeTicker:
        requested_symbols.append(symbol)
        return FakeTicker()

    service = YahooFinanceDataService(ticker_factory=factory)
    market = await service.market_data("reliance")
    news = await service.news_items("RELIANCE")
    documents = await service.document_chunks("RELIANCE")

    assert requested_symbols == ["RELIANCE.NS", "RELIANCE.NS", "RELIANCE.NS"]
    assert market.current_price == 2525.25
    assert market.source == "yahoo_finance:RELIANCE.NS"
    assert market.synthetic is False
    assert market.observed_at.utcoffset() == timedelta(hours=5, minutes=30)
    assert news[0].source_name == "Example Wire"
    assert news[0].url == "https://example.com/reliance"
    assert news[0].synthetic is False
    assert {item.source_type for item in documents} == {
        "income_statement",
        "balance_sheet",
        "cash_flow",
    }
    assert all(item.synthetic is False for item in documents)
    assert any("increased by 11.1%" in item.text for item in documents)
    assert any("improved with a 12.5% reduction" in item.text for item in documents)


def test_yahoo_adapter_preserves_explicit_exchange_symbols() -> None:
    service = YahooFinanceDataService(exchange_suffix=".NS")

    assert service.provider_symbol("TCS.BO") == "TCS.BO"
    assert service.provider_symbol("^NSEI") == "^NSEI"
    assert service.provider_symbol("USDINR=X") == "USDINR=X"


@pytest.mark.parametrize(
    ("symbol", "provider_symbol"),
    [
        ("NIFTY 50", "^NSEI"),
        ("NIFTY50", "^NSEI"),
        ("SENSEX", "^BSESN"),
        ("NIFTYSENSEX", "^BSESN"),
        ("BANK NIFTY", "^NSEBANK"),
    ],
)
def test_yahoo_adapter_maps_common_indian_index_aliases(
    symbol: str, provider_symbol: str
) -> None:
    service = YahooFinanceDataService()

    assert service.provider_symbol(symbol) == provider_symbol


def _market(*, source: str, synthetic: bool) -> MarketData:
    observed = datetime(2026, 6, 30, tzinfo=UTC)
    return MarketData(
        symbol="RELIANCE",
        current_price=2500,
        observed_at=observed,
        source=source,
        synthetic=synthetic,
        history=[
            PricePoint(timestamp=observed - timedelta(days=1), close=2490, volume=100),
            PricePoint(timestamp=observed, close=2500, volume=110),
        ],
    )


class StubDataService:
    def __init__(self, market: MarketData | Exception) -> None:
        self.market = market
        self.market_calls = 0

    async def market_data(self, _symbol: str) -> MarketData:
        self.market_calls += 1
        if isinstance(self.market, Exception):
            raise self.market
        return self.market

    async def news_items(self, symbol: str) -> list[NewsItem]:
        return [
            NewsItem(
                id="stub-news",
                symbol=symbol,
                headline="Stub",
                summary="Stub",
                source_name="Stub",
                published_at=datetime.now(UTC),
            )
        ]

    async def document_chunks(self, symbol: str) -> list[DocumentChunk]:
        return [
            DocumentChunk(
                chunk_id="stub-doc",
                symbol=symbol,
                source_name="Stub",
                source_type="test",
                text="Stub",
            )
        ]


@pytest.mark.asyncio
async def test_hybrid_service_reuses_fresh_live_snapshot() -> None:
    primary = StubDataService(_market(source="yahoo_finance:RELIANCE.NS", synthetic=False))
    fallback = StubDataService(_market(source="fixture", synthetic=True))
    service = HybridDataService(primary, fallback, InMemorySnapshotCache())

    first = await service.market_data("RELIANCE")
    second = await service.market_data("RELIANCE")

    assert first.source == "yahoo_finance:RELIANCE.NS"
    assert second.source == "yahoo_finance:RELIANCE.NS:cache"
    assert primary.market_calls == 1
    assert fallback.market_calls == 0


@pytest.mark.asyncio
async def test_hybrid_service_uses_labeled_fixture_when_live_fails() -> None:
    primary = StubDataService(DataNotFoundError("provider unavailable"))
    fallback = StubDataService(_market(source="fixture:curated", synthetic=True))
    service = HybridDataService(primary, fallback, InMemorySnapshotCache())

    result = await service.market_data("RELIANCE")

    assert result.synthetic is True
    assert result.source == "fixture:curated"
    assert primary.market_calls == 1
    assert fallback.market_calls == 1


class StaleCache:
    def __init__(self, market: MarketData) -> None:
        now = datetime.now(UTC)
        self.snapshot = CachedSnapshot(
            payload=market.model_dump(mode="json"),
            provider="yahoo_finance",
            fetched_at=now - timedelta(hours=2),
            expires_at=now - timedelta(hours=1),
        )

    async def get(self, _symbol: str, _data_type: str) -> CachedSnapshot:
        return self.snapshot

    async def set(self, *_args: object, **_kwargs: object) -> None:
        raise AssertionError("failed live data must not be cached")


@pytest.mark.asyncio
async def test_hybrid_service_prefers_stale_live_snapshot_to_fixture() -> None:
    primary = StubDataService(DataNotFoundError("provider unavailable"))
    fallback = StubDataService(_market(source="fixture", synthetic=True))
    cached_market = _market(source="yahoo_finance:RELIANCE.NS", synthetic=False)
    service = HybridDataService(primary, fallback, StaleCache(cached_market))

    result = await service.market_data("RELIANCE")

    assert result.source == "yahoo_finance:RELIANCE.NS:stale_cache"
    assert result.synthetic is False
    assert fallback.market_calls == 0


def test_data_service_modes_are_explicit() -> None:
    assert isinstance(build_data_service(Settings(data_mode="fixture")), FixtureDataService)
    with pytest.raises(ValueError, match="DATA_MODE"):
        build_data_service(Settings(data_mode="invalid"))


def test_supabase_cache_keeps_new_secret_out_of_authorization_header() -> None:
    modern = SupabaseSnapshotCache("https://project.supabase.co/", "sb_secret_example")
    legacy = SupabaseSnapshotCache("https://project.supabase.co", "legacy.jwt.value")

    assert modern.endpoint == "https://project.supabase.co/rest/v1/data_snapshots"
    assert modern.headers["apikey"] == "sb_secret_example"
    assert "Authorization" not in modern.headers
    assert legacy.headers["Authorization"] == "Bearer legacy.jwt.value"
