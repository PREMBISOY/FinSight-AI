from backend.app.core.config import Settings
from backend.app.database import InMemoryRepository, SupabaseRepository, build_repository


def test_supabase_requires_server_secret_not_public_anon_key() -> None:
    config = Settings(
        supabase_url="https://project.supabase.co",
        supabase_anon_key="public-anon-key",
        supabase_service_role_key="",
        supabase_secret_key="",
    )
    assert config.has_supabase is False
    assert isinstance(build_repository(config), InMemoryRepository)


def test_new_supabase_secret_uses_apikey_header_without_invalid_bearer() -> None:
    repository = SupabaseRepository("https://project.supabase.co", "sb_secret_example")
    assert repository.headers["apikey"] == "sb_secret_example"
    assert "Authorization" not in repository.headers


def test_legacy_service_role_jwt_uses_authorization_header() -> None:
    repository = SupabaseRepository("https://project.supabase.co", "legacy.jwt.value")
    assert repository.headers["Authorization"] == "Bearer legacy.jwt.value"
