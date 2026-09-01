from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

import httpx

from backend.app.core.config import Settings, settings


@dataclass(frozen=True, slots=True)
class CachedSnapshot:
    payload: Any
    provider: str
    fetched_at: datetime
    expires_at: datetime

    @property
    def expired(self) -> bool:
        return self.expires_at <= datetime.now(UTC)


class SnapshotCache(Protocol):
    async def get(self, symbol: str, data_type: str) -> CachedSnapshot | None: ...

    async def set(
        self,
        symbol: str,
        data_type: str,
        payload: Any,
        provider: str,
        ttl_seconds: int,
    ) -> None: ...


class InMemorySnapshotCache:
    def __init__(self) -> None:
        self._values: dict[tuple[str, str], CachedSnapshot] = {}
        self._lock = asyncio.Lock()

    async def get(self, symbol: str, data_type: str) -> CachedSnapshot | None:
        async with self._lock:
            return self._values.get((symbol.upper(), data_type))

    async def set(
        self,
        symbol: str,
        data_type: str,
        payload: Any,
        provider: str,
        ttl_seconds: int,
    ) -> None:
        now = datetime.now(UTC)
        snapshot = CachedSnapshot(
            payload=payload,
            provider=provider,
            fetched_at=now,
            expires_at=now + timedelta(seconds=max(1, ttl_seconds)),
        )
        async with self._lock:
            self._values[(symbol.upper(), data_type)] = snapshot


class SupabaseSnapshotCache:
    """TTL cache stored through Supabase PostgREST."""

    def __init__(self, url: str, key: str, timeout: float = 10.0) -> None:
        self.endpoint = f"{url.rstrip('/')}/rest/v1/data_snapshots"
        self.headers = {"apikey": key, "Content-Type": "application/json"}
        if not key.startswith("sb_secret_"):
            self.headers["Authorization"] = f"Bearer {key}"
        self.timeout = timeout

    async def get(self, symbol: str, data_type: str) -> CachedSnapshot | None:
        params = {
            "symbol": f"eq.{symbol.upper()}",
            "data_type": f"eq.{data_type}",
            "select": "payload,provider,fetched_at,expires_at",
            "limit": "1",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(self.endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            rows = response.json()
        if not rows:
            return None
        row = rows[0]
        return CachedSnapshot(
            payload=row["payload"],
            provider=row["provider"],
            fetched_at=datetime.fromisoformat(row["fetched_at"].replace("Z", "+00:00")),
            expires_at=datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")),
        )

    async def set(
        self,
        symbol: str,
        data_type: str,
        payload: Any,
        provider: str,
        ttl_seconds: int,
    ) -> None:
        now = datetime.now(UTC)
        headers = {
            **self.headers,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }
        params = {"on_conflict": "symbol,data_type"}
        body = {
            "symbol": symbol.upper(),
            "data_type": data_type,
            "provider": provider,
            "payload": payload,
            "fetched_at": now.isoformat(),
            "expires_at": (now + timedelta(seconds=max(1, ttl_seconds))).isoformat(),
            "updated_at": now.isoformat(),
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                self.endpoint,
                headers=headers,
                params=params,
                json=body,
            )
            response.raise_for_status()


def build_snapshot_cache(config: Settings = settings) -> SnapshotCache:
    if config.has_supabase:
        return SupabaseSnapshotCache(config.supabase_url, config.supabase_key)
    return InMemorySnapshotCache()
