from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


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

    @property
    def supabase_key(self) -> str:
        return self.supabase_service_role_key or self.supabase_anon_key

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)


settings = Settings()
