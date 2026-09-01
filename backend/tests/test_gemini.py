from __future__ import annotations

import json

import httpx

from backend.app.database import InMemoryRepository
from backend.app.personalization import personalize
from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
)
from backend.app.services.data import FixtureDataService
from backend.app.services.gemini import GeminiInsightService
from backend.app.synthesis import synthesize


async def _inputs(user_id: str = "conservative-demo") -> dict:
    repository = InMemoryRepository()
    profile = await repository.get_profile(user_id)
    portfolio = await repository.get_portfolio(user_id)
    market_data = await FixtureDataService().market_data("RELIANCE")
    results = [
        AgentOutput(
            agent=agent,
            status=AgentStatus.SUCCESS,
            classification=classification,
            confidence=confidence,
            latency_ms=1,
        )
        for agent, classification, confidence in (
            (AgentType.TECHNICAL, AgentClassification.BULLISH, 0.8),
            (AgentType.FUNDAMENTAL, AgentClassification.BULLISH, 0.75),
            (AgentType.SENTIMENT, AgentClassification.NEUTRAL, 0.6),
        )
    ]
    synthesis = synthesize(results)
    intelligence = personalize(synthesis, profile, portfolio, "RELIANCE")
    return {
        "symbol": "RELIANCE",
        "query": "What changed recently?",
        "market_data": market_data,
        "profile": profile,
        "portfolio": portfolio,
        "agent_results": results,
        "synthesis": synthesis,
        "intelligence": intelligence,
    }


async def test_missing_key_is_explicitly_unavailable() -> None:
    result = await GeminiInsightService(api_key="").generate(**await _inputs())
    assert result.status == "unavailable"
    assert "LLM_API_KEY" in (result.limitation or "")


async def test_gemini_uses_search_grounding_and_profile_context() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["headers"] = dict(request.headers)
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "summary": "Current context supports the computed view.",
                                            "profile_specific_guidance": ["Do not exceed the position limit."],
                                            "key_risks": ["Commodity margin volatility."],
                                        }
                                    )
                                }
                            ]
                        },
                        "groundingMetadata": {
                            "groundingChunks": [
                                {"web": {"title": "Exchange filing", "uri": "https://example.com/filing"}}
                            ]
                        },
                    }
                ]
            },
        )

    service = GeminiInsightService(
        api_key="test-key",
        model="gemini-3.7-flash",
        transport=httpx.MockTransport(handler),
    )
    result = await service.generate(**await _inputs("conservative-demo"))

    assert result.status == "success"
    assert result.grounded is True
    assert str(result.citations[0].url) == "https://example.com/filing"
    assert captured["headers"]["x-goog-api-key"] == "test-key"
    assert captured["body"]["tools"] == [{"google_search": {}}]
    assert captured["body"]["generationConfig"]["responseMimeType"] == "application/json"
    assert "responseSchema" in captured["body"]["generationConfig"]
    assert "responseFormat" not in captured["body"]["generationConfig"]
    prompt = captured["body"]["contents"][0]["parts"][0]["text"]
    assert "conservative" in prompt
    assert "25.0" in prompt


async def test_gemini_failure_does_not_fail_analysis_stage() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "rate limited"}})

    service = GeminiInsightService(api_key="test-key", transport=httpx.MockTransport(handler))
    result = await service.generate(**await _inputs())
    assert result.status == "error"
    assert result.summary == ""
    assert "quota is exhausted" in (result.limitation or "")


async def test_gemini_25_preserves_a_prose_answer_when_json_is_imperfect() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": (
                                        "The evidence is moderately positive, but the investor's "
                                        "existing concentration supports holding rather than adding."
                                    )
                                }
                            ]
                        }
                    }
                ]
            },
        )

    service = GeminiInsightService(
        api_key="test-key",
        model="gemini-2.5-flash",
        transport=httpx.MockTransport(handler),
    )
    result = await service.generate(**await _inputs())

    assert result.status == "success"
    assert "moderately positive" in result.summary
    assert result.profile_specific_guidance == []
    assert "returned prose" in (result.limitation or "")
    assert captured["body"]["generationConfig"]["thinkingConfig"] == {
        "thinkingBudget": 0
    }
    assert captured["body"]["tools"] == [{"google_search": {}}]
