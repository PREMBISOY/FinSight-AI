from __future__ import annotations

import re


_USER_ALIASES = {
    "NIFTY": "NIFTY50",
    "NIFTY50": "NIFTY50",
    "NSEI": "NIFTY50",
    "SENSEX": "SENSEX",
    "BSESENSEX": "SENSEX",
    "BSESN": "SENSEX",
    # A common informal search term. There is no combined NIFTY/SENSEX
    # instrument, so canonicalize it to the explicitly named SENSEX index.
    "NIFTYSENSEX": "SENSEX",
    "BANKNIFTY": "BANKNIFTY",
    "NIFTYBANK": "BANKNIFTY",
}

_YAHOO_INDEX_SYMBOLS = {
    "NIFTY50": "^NSEI",
    "SENSEX": "^BSESN",
    "BANKNIFTY": "^NSEBANK",
}


def canonical_symbol(value: str) -> str:
    """Normalize human-friendly Indian index names without altering stock tickers."""

    normalized = value.strip().upper()
    compact = re.sub(r"[\s_-]+", "", normalized)
    return _USER_ALIASES.get(compact, normalized)


def yahoo_symbol(symbol: str, exchange_suffix: str = ".NS") -> str:
    normalized = canonical_symbol(symbol)
    if normalized in _YAHOO_INDEX_SYMBOLS:
        return _YAHOO_INDEX_SYMBOLS[normalized]
    if "." in normalized or normalized.startswith("^") or "=" in normalized:
        return normalized
    return f"{normalized}{exchange_suffix}"
