from __future__ import annotations

import asyncio
import hashlib
import math
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import pandas as pd

from backend.app.core.symbols import yahoo_symbol
from backend.app.schemas import DocumentChunk, MarketData, NewsItem, PricePoint

from .data import DataNotFoundError


TickerFactory = Callable[[str], Any]
SymbolSearch = Callable[[str], list[dict[str, Any]]]


_DIRECT_TICKER = re.compile(r"^[A-Z0-9][A-Z0-9.&_-]{0,19}$")
_INDIAN_EXCHANGES = {"NSE", "NSI", "BSE", "BOM"}


class YahooFinanceDataService:
    """Keyless research-grade market adapter backed by yfinance/Yahoo Finance."""

    def __init__(
        self,
        exchange_suffix: str = ".NS",
        ticker_factory: TickerFactory | None = None,
        symbol_search: SymbolSearch | None = None,
    ) -> None:
        self.exchange_suffix = exchange_suffix
        self._ticker_factory = ticker_factory
        self._symbol_search = symbol_search

    def provider_symbol(self, symbol: str) -> str:
        return yahoo_symbol(symbol, self.exchange_suffix)

    async def resolve_symbol(self, symbol: str) -> str:
        """Resolve a company name to an Indian Yahoo ticker when needed.

        Exchange tickers are intentionally passed through without a search so
        ``RELIANCE``, ``RELIANCE.NS``, and ``RELIANCE.BO`` stay predictable.
        Company-name searches are restricted to NSE/BSE equities and prefer NSE
        where the same company trades on both exchanges.
        """

        normalized = symbol.strip().upper()
        if _DIRECT_TICKER.fullmatch(normalized):
            return normalized
        return await asyncio.to_thread(self._resolve_company_name_sync, normalized)

    def _resolve_company_name_sync(self, query: str) -> str:
        try:
            if self._symbol_search is not None:
                quotes = self._symbol_search(query)
            else:
                import yfinance as yf

                quotes = yf.Search(query, max_results=20, news_count=0).quotes
        except Exception as exc:
            raise DataNotFoundError(
                f"Could not search Yahoo Finance for '{query}'. Try an NSE ticker such as "
                "RELIANCE or a BSE ticker such as RELIANCE.BO."
            ) from exc

        candidates = [quote for quote in quotes or [] if _is_indian_equity(quote)]
        if not candidates:
            raise DataNotFoundError(
                f"No NSE/BSE stock matched '{query}'. Use its NSE symbol or add .BO for a BSE symbol."
            )
        return _best_indian_match(query, candidates)

    def _ticker(self, symbol: str) -> Any:
        provider_symbol = self.provider_symbol(symbol)
        if self._ticker_factory is not None:
            return self._ticker_factory(provider_symbol)
        try:
            import yfinance as yf
        except ImportError as exc:  # deployment/install mismatch, handled by hybrid fallback
            raise DataNotFoundError("yfinance is not installed") from exc
        return yf.Ticker(provider_symbol)

    async def market_data(self, symbol: str) -> MarketData:
        return await asyncio.to_thread(self._market_data_sync, symbol)

    def _market_data_sync(self, symbol: str) -> MarketData:
        provider_symbol = self.provider_symbol(symbol)
        ticker = self._ticker(symbol)
        try:
            frame = ticker.history(
                period="3mo",
                interval="1d",
                auto_adjust=False,
                actions=False,
            )
        except Exception as exc:
            raise DataNotFoundError(f"Yahoo market history failed for {symbol}") from exc
        if frame is None or frame.empty:
            raise DataNotFoundError(f"Yahoo returned no market history for {symbol}")

        history: list[PricePoint] = []
        for index, row in frame.iterrows():
            close = _finite_number(row.get("Close"))
            volume = _finite_number(row.get("Volume"))
            if close is None or close <= 0:
                continue
            timestamp = _as_datetime(index)
            history.append(
                PricePoint(
                    timestamp=timestamp,
                    close=close,
                    volume=max(0.0, volume or 0.0),
                )
            )
        if len(history) < 2:
            raise DataNotFoundError(f"Yahoo returned insufficient price history for {symbol}")

        metadata = getattr(ticker, "history_metadata", {}) or {}
        quoted_price = _finite_number(metadata.get("regularMarketPrice"))
        currency = str(metadata.get("currency") or "INR")
        return MarketData(
            symbol=symbol.upper(),
            current_price=quoted_price if quoted_price and quoted_price > 0 else history[-1].close,
            currency=currency,
            observed_at=history[-1].timestamp,
            source=f"yahoo_finance:{provider_symbol}",
            synthetic=False,
            history=history,
        )

    async def news_items(self, symbol: str) -> list[NewsItem]:
        return await asyncio.to_thread(self._news_items_sync, symbol)

    def _news_items_sync(self, symbol: str) -> list[NewsItem]:
        provider_symbol = self.provider_symbol(symbol)
        ticker = self._ticker(symbol)
        try:
            try:
                raw_items = ticker.get_news(count=12, tab="news")
            except (AttributeError, TypeError):
                raw_items = ticker.news
        except Exception as exc:
            raise DataNotFoundError(f"Yahoo news failed for {symbol}") from exc

        results: list[NewsItem] = []
        seen: set[str] = set()
        for raw in raw_items or []:
            if not isinstance(raw, dict):
                continue
            content = raw.get("content") if isinstance(raw.get("content"), dict) else raw
            title = str(content.get("title") or "").strip()
            published_at = _news_datetime(content)
            if not title or published_at is None:
                continue
            url = _news_url(content)
            identity = str(raw.get("id") or content.get("id") or url or title)
            if identity in seen:
                continue
            seen.add(identity)
            provider = content.get("provider")
            if isinstance(provider, dict):
                source_name = str(provider.get("displayName") or "Yahoo Finance")
            else:
                source_name = str(content.get("publisher") or "Yahoo Finance")
            results.append(
                NewsItem(
                    id=identity[:200],
                    symbol=symbol.upper(),
                    headline=title,
                    summary=str(content.get("summary") or content.get("description") or "").strip(),
                    source_name=source_name,
                    published_at=published_at,
                    url=url,
                    synthetic=False,
                )
            )
        if not results:
            raise DataNotFoundError(f"Yahoo returned no attributable news for {provider_symbol}")
        return results

    async def document_chunks(self, symbol: str) -> list[DocumentChunk]:
        return await asyncio.to_thread(self._document_chunks_sync, symbol)

    def _document_chunks_sync(self, symbol: str) -> list[DocumentChunk]:
        provider_symbol = self.provider_symbol(symbol)
        ticker = self._ticker(symbol)
        statement_specs = (
            ("income_statement", "Income statement", "financials", "income_stmt"),
            ("balance_sheet", "Balance sheet", "balance-sheet", "balance_sheet"),
            ("cash_flow", "Cash flow statement", "cash-flow", "cashflow"),
        )
        chunks: list[DocumentChunk] = []
        failures = 0
        for source_type, label, path, attribute in statement_specs:
            try:
                frame = getattr(ticker, attribute)
            except Exception:
                failures += 1
                continue
            if frame is None or frame.empty:
                continue
            chunks.extend(
                _statement_chunks(
                    symbol=symbol.upper(),
                    provider_symbol=provider_symbol,
                    source_type=source_type,
                    label=label,
                    path=path,
                    frame=frame,
                )
            )
        if not chunks:
            detail = "financial statement requests failed" if failures else "statements were empty"
            raise DataNotFoundError(f"Yahoo {detail} for {symbol}")
        return chunks


def _finite_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _is_indian_equity(quote: object) -> bool:
    if not isinstance(quote, dict):
        return False
    symbol = str(quote.get("symbol") or "").upper()
    exchange = str(quote.get("exchange") or "").upper()
    quote_type = str(quote.get("quoteType") or quote.get("typeDisp") or "").upper()
    is_indian_listing = symbol.endswith((".NS", ".BO")) or exchange in _INDIAN_EXCHANGES
    return is_indian_listing and quote_type in {"EQUITY", "STOCK"}


def _best_indian_match(query: str, candidates: list[dict[str, Any]]) -> str:
    """Choose Yahoo's best NSE/BSE equity result deterministically."""

    wanted = _company_key(query)

    def rank(item: tuple[int, dict[str, Any]]) -> tuple[int, int, int]:
        index, quote = item
        symbol = str(quote.get("symbol") or "").upper()
        names = (str(quote.get("longname") or ""), str(quote.get("shortname") or ""))
        exact_name = any(_company_key(name) == wanted for name in names)
        name_contains_query = any(wanted and wanted in _company_key(name) for name in names)
        nse_preferred = symbol.endswith(".NS") or str(quote.get("exchange") or "").upper() in {"NSE", "NSI"}
        return (2 if exact_name else 1 if name_contains_query else 0, 1 if nse_preferred else 0, -index)

    best = max(enumerate(candidates), key=rank)[1]
    symbol = str(best.get("symbol") or "").strip().upper()
    if not symbol:
        raise DataNotFoundError("Yahoo Finance returned an NSE/BSE search result without a ticker.")
    if "." not in symbol:
        exchange = str(best.get("exchange") or "").upper()
        symbol += ".BO" if exchange in {"BSE", "BOM"} else ".NS"
    return symbol


def _company_key(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def _as_datetime(value: Any) -> datetime:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


def _news_datetime(content: dict[str, Any]) -> datetime | None:
    raw = content.get("pubDate") or content.get("displayTime")
    if raw:
        try:
            return _as_datetime(raw)
        except (TypeError, ValueError):
            pass
    epoch = content.get("providerPublishTime")
    try:
        return datetime.fromtimestamp(float(epoch), tz=UTC) if epoch is not None else None
    except (TypeError, ValueError, OSError):
        return None


def _news_url(content: dict[str, Any]) -> str | None:
    for key in ("canonicalUrl", "clickThroughUrl"):
        nested = content.get(key)
        if isinstance(nested, dict) and nested.get("url"):
            return str(nested["url"])
    raw = content.get("link") or content.get("url")
    return str(raw) if raw else None


def _statement_chunks(
    *,
    symbol: str,
    provider_symbol: str,
    source_type: str,
    label: str,
    path: str,
    frame: pd.DataFrame,
) -> list[DocumentChunk]:
    columns = list(frame.columns)
    if not columns:
        return []
    latest_column = columns[0]
    prior_column = columns[1] if len(columns) > 1 else None
    latest_date = _as_datetime(latest_column).date().isoformat()
    prior_date = _as_datetime(prior_column).date().isoformat() if prior_column is not None else None
    lines: list[str] = []
    for metric, row in frame.iterrows():
        latest = _finite_number(row.get(latest_column))
        prior = _finite_number(row.get(prior_column)) if prior_column is not None else None
        if latest is None:
            continue
        line = f"{metric}: {latest:,.2f} as of {latest_date}"
        if prior is not None:
            line += f" versus {prior:,.2f} as of {prior_date}"
            if prior != 0:
                change = (latest - prior) / abs(prior)
                line += f" ({_trend_phrase(str(metric), change)})"
        lines.append(line + ".")
        if len(lines) >= 48:
            break

    chunks: list[DocumentChunk] = []
    for offset in range(0, len(lines), 8):
        group = lines[offset : offset + 8]
        text = f"{label} for {provider_symbol}. " + " ".join(group)
        digest = hashlib.sha256(f"{provider_symbol}:{source_type}:{offset}:{text}".encode()).hexdigest()[:16]
        chunks.append(
            DocumentChunk(
                chunk_id=f"yahoo-{source_type}-{digest}",
                symbol=symbol,
                source_name=f"Yahoo Finance {label} ({provider_symbol})",
                source_type=source_type,
                text=text,
                url=f"https://finance.yahoo.com/quote/{provider_symbol}/{path}/",
                synthetic=False,
            )
        )
    return chunks


def _trend_phrase(metric: str, change: float) -> str:
    percent = abs(change) * 100
    normalized = metric.lower()
    adverse_when_higher = any(term in normalized for term in ("debt", "liabil", "expense", "cost"))
    if abs(change) < 0.005:
        return f"stable, {percent:.1f}% change"
    if change > 0 and adverse_when_higher:
        return f"risk increased by {percent:.1f}%"
    if change < 0 and adverse_when_higher:
        return f"improved with a {percent:.1f}% reduction"
    return f"{'increased' if change > 0 else 'declined'} by {percent:.1f}%"
