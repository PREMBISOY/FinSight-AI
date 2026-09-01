from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations

from backend.app.schemas import (
    AgentClassification,
    AgentOutput,
    AgentStatus,
    AgentType,
    MarketOutlook,
    SynthesisResult,
)
from backend.app.schemas.analysis import AgentContribution


CLASSIFICATION_SCORES = {
    AgentClassification.BULLISH: 1.0,
    AgentClassification.NEUTRAL: 0.0,
    AgentClassification.BEARISH: -1.0,
    AgentClassification.UNKNOWN: 0.0,
}


@dataclass(frozen=True, slots=True)
class SynthesisConfig:
    weights: dict[AgentType, float] = field(
        default_factory=lambda: {
            AgentType.TECHNICAL: 0.40,
            AgentType.FUNDAMENTAL: 0.40,
            AgentType.SENTIMENT: 0.20,
        }
    )
    strong_threshold: float = 0.68
    directional_threshold: float = 0.15
    conflict_penalty: float = 0.65


def _agreement(scores: list[float]) -> float:
    if len(scores) < 2:
        return 1.0 if scores else 0.0
    pair_scores = [1 - abs(left - right) / 2 for left, right in combinations(scores, 2)]
    return sum(pair_scores) / len(pair_scores)


def _outlook(score: float, usable_count: int, config: SynthesisConfig) -> MarketOutlook:
    if usable_count == 0:
        return MarketOutlook.INSUFFICIENT_DATA
    if score >= config.strong_threshold:
        return MarketOutlook.STRONGLY_BULLISH
    if score >= config.directional_threshold:
        return MarketOutlook.MODERATELY_BULLISH
    if score <= -config.strong_threshold:
        return MarketOutlook.STRONGLY_BEARISH
    if score <= -config.directional_threshold:
        return MarketOutlook.MODERATELY_BEARISH
    return MarketOutlook.NEUTRAL


def synthesize(
    results: list[AgentOutput], config: SynthesisConfig | None = None
) -> SynthesisResult:
    config = config or SynthesisConfig()
    by_agent = {result.agent: result for result in results}
    contributions: list[AgentContribution] = []
    usable_scores: list[float] = []
    available_weight = 0.0
    weighted_confidence = 0.0
    market_score = 0.0
    limitations: list[str] = []

    for agent_type, base_weight in config.weights.items():
        result = by_agent.get(agent_type)
        included = bool(
            result
            and result.status in {AgentStatus.SUCCESS, AgentStatus.DEGRADED}
            and result.classification != AgentClassification.UNKNOWN
        )
        classification_score = CLASSIFICATION_SCORES[result.classification] if result else 0.0
        confidence = result.confidence if result else 0.0
        weighted_score = base_weight * classification_score * confidence if included else 0.0
        contributions.append(
            AgentContribution(
                agent=agent_type.value,
                base_weight=base_weight,
                classification_score=classification_score,
                confidence=confidence,
                weighted_score=round(weighted_score, 4),
                included=included,
            )
        )
        if included:
            usable_scores.append(classification_score)
            available_weight += base_weight
            weighted_confidence += base_weight * confidence
            market_score += weighted_score
        else:
            status = result.status.value if result else "missing"
            limitations.append(f"{agent_type.value.title()} agent was {status} and contributed no directional score.")

    conflict = 1.0 in usable_scores and -1.0 in usable_scores
    agreement = _agreement(usable_scores)
    completeness = min(1.0, available_weight / sum(config.weights.values()))
    average_confidence = weighted_confidence / available_weight if available_weight else 0.0
    confidence = average_confidence * completeness * (0.75 + 0.25 * agreement)
    if conflict:
        confidence *= config.conflict_penalty
        limitations.append("Signal conflict detected between bullish and bearish specialist conclusions.")

    outlook = _outlook(market_score, len(usable_scores), config)
    reasoning = [
        f"{len(usable_scores)} of {len(config.weights)} weighted agent signals were usable.",
        f"Confidence-weighted market score was {market_score:.3f} on a -1 to +1 scale.",
        f"Signal agreement was {agreement:.1%}; data completeness was {completeness:.1%}.",
    ]
    if conflict:
        reasoning.append("Opposing directional signals triggered the configured conflict penalty.")

    return SynthesisResult(
        outlook=outlook,
        market_score=round(max(-1.0, min(1.0, market_score)), 4),
        confidence=round(max(0.0, min(1.0, confidence)), 4),
        agreement_score=round(agreement, 4),
        data_completeness=round(completeness, 4),
        conflict_detected=conflict,
        contributions=contributions,
        reasoning=reasoning,
        limitations=limitations,
    )
