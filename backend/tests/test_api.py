import httpx

from backend import main as backend_main
from backend.main import create_app


async def test_health(orchestrator) -> None:
    transport = httpx.ASGITransport(app=create_app(orchestrator))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_analyze_and_read_subresources(orchestrator) -> None:
    transport = httpx.ASGITransport(app=create_app(orchestrator))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/analyze",
            json={"user_id": "conservative-demo", "symbol": "reliance", "scenario": "normal"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["symbol"] == "RELIANCE"
        analysis_id = payload["analysis_id"]
        stored = await client.get(f"/api/analyses/{analysis_id}")
        agents = await client.get(f"/api/analyses/{analysis_id}/agents")
        evidence = await client.get(f"/api/analyses/{analysis_id}/evidence")
        metrics = await client.get(f"/api/analyses/{analysis_id}/metrics")
    assert stored.status_code == 200
    assert len(agents.json()) == 3
    assert evidence.status_code == 200 and len(evidence.json()) >= 2
    assert metrics.status_code == 200 and len(metrics.json()) >= 7


async def test_unknown_user_and_symbol_are_404(orchestrator) -> None:
    transport = httpx.ASGITransport(app=create_app(orchestrator))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        user_response = await client.post(
            "/api/analyze", json={"user_id": "unknown", "symbol": "RELIANCE"}
        )
        symbol_response = await client.post(
            "/api/analyze", json={"user_id": "conservative-demo", "symbol": "UNKNOWN"}
        )
    assert user_response.status_code == 404
    assert symbol_response.status_code == 404


async def test_built_frontend_is_served_without_hiding_api_routes(
    orchestrator,
    monkeypatch,
    tmp_path,
) -> None:
    frontend_dist = tmp_path / "dist"
    assets = frontend_dist / "assets"
    assets.mkdir(parents=True)
    (frontend_dist / "index.html").write_text(
        "<!doctype html><title>FinSight AI</title>",
        encoding="utf-8",
    )
    (assets / "index.css").write_text("body{}", encoding="utf-8")

    monkeypatch.setattr(backend_main, "FRONTEND_DIST", frontend_dist)
    transport = httpx.ASGITransport(app=create_app(orchestrator))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        frontend = await client.get("/")
        spa_route = await client.get("/dashboard")
        health = await client.get("/health")
        docs = await client.get("/docs")
        asset = await client.get("/assets/index.css")

    assert frontend.status_code == 200
    assert "FinSight AI" in frontend.text
    assert spa_route.status_code == 200
    assert "FinSight AI" in spa_route.text
    assert health.status_code == 200
    assert docs.status_code == 200
    assert asset.status_code == 200
