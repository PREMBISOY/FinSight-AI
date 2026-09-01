from __future__ import annotations

import asyncio

from backend.app.orchestrator import build_orchestrator
from backend.app.schemas import AnalyzeRequest, DemoScenario


async def main() -> None:
    orchestrator = build_orchestrator()
    runs = [
        ("conservative-demo", DemoScenario.NORMAL),
        ("aggressive-demo", DemoScenario.NORMAL),
        ("conservative-demo", DemoScenario.DEGRADED_SENTIMENT),
        ("conservative-demo", DemoScenario.CONFLICT),
    ]
    print("FinSight AI deterministic integration demo")
    print("=" * 92)
    print(f"{'user':<20} {'scenario':<22} {'outlook':<24} {'recommendation':<20} confidence")
    for user_id, scenario in runs:
        result = await orchestrator.run_analysis(
            AnalyzeRequest(user_id=user_id, symbol="RELIANCE", scenario=scenario)
        )
        print(
            f"{user_id:<20} {scenario.value:<22} {result.synthesis.outlook.value:<24} "
            f"{result.intelligence.recommendation.value:<20} {result.synthesis.confidence:.1%}"
        )
    print("=" * 92)
    print("All sources used by this demo are labeled in the API response. No accuracy is claimed.")


if __name__ == "__main__":
    asyncio.run(main())
