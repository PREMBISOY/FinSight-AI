from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_bool(name: str, default: bool) -> bool:
    raw = _env(name)
    if not raw:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    app_name: str = "FinSight AI"
    app_version: str = "0.1.0"
    app_env: str = _env("APP_ENV", "development")
    log_level: str = _env("LOG_LEVEL", "INFO")
    frontend_origin: str = _env("FRONTEND_ORIGIN", "http://localhost:5173")
    supabase_url: str = _env("SUPABASE_URL")
    supabase_anon_key: str = _env("SUPABASE_ANON_KEY")
    supabase_service_role_key: str = _env("SUPABASE_SERVICE_ROLE_KEY")
    supabase_secret_key: str = _env("SUPABASE_SECRET_KEY")
    llm_api_key: str = _env("LLM_API_KEY") or _env("GEMINI_API_KEY")
    gemini_model: str = _env("GEMINI_MODEL", "gemini-3.7-flash")
    gemini_grounding: bool = _env_bool("GEMINI_GROUNDING", True)
    gemini_timeout_seconds: float = float(_env("GEMINI_TIMEOUT_SECONDS", "20"))
    data_mode: str = _env("DATA_MODE", "hybrid").lower()
    yahoo_exchange_suffix: str = _env("YAHOO_EXCHANGE_SUFFIX", ".NS")
    market_cache_ttl_seconds: int = int(_env("MARKET_CACHE_TTL_SECONDS", "900"))
    news_cache_ttl_seconds: int = int(_env("NEWS_CACHE_TTL_SECONDS", "1800"))
    fundamentals_cache_ttl_seconds: int = int(
        _env("FUNDAMENTALS_CACHE_TTL_SECONDS", "21600")
    )

    @property
    def supabase_key(self) -> str:
        # Persistence is a server-side operation. Never silently use a public
        # anon/publishable key here: it either fails under RLS or requires
        # dangerously broad public write policies.
        return self.supabase_secret_key or self.supabase_service_role_key

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    @property
    def has_gemini(self) -> bool:
        return bool(self.llm_api_key)

    @property
    def frontend_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


settings = Settings()
