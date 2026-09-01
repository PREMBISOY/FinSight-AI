from __future__ import annotations

from backend.app.schemas import (
    InvestmentHorizon,
    InvestorProfile,
    MarketOutlook,
    PersonalizedIntelligence,
    Portfolio,
    Recommendation,
    RiskLevel,
    RiskTolerance,
    SynthesisResult,
)


BASE_RISK = {
    RiskTolerance.CONSERVATIVE: 0.46,
    RiskTolerance.MODERATE: 0.32,
    RiskTolerance.AGGRESSIVE: 0.20,
}


def _risk_level(score: float) -> RiskLevel:
    if score >= 0.78:
        return RiskLevel.HIGH
    if score >= 0.58:
        return RiskLevel.ELEVATED
    if score >= 0.32:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


def personalize(
    synthesis: SynthesisResult,
    profile: InvestorProfile,
    portfolio: Portfolio,
    symbol: str,
) -> PersonalizedIntelligence:
    exposure = portfolio.exposure_for(symbol)
    concentration_ratio = min(exposure / profile.max_position_size, 2.0)
    horizon_adjustment = {
        InvestmentHorizon.SHORT: 0.08,
        InvestmentHorizon.MEDIUM: 0.03,
        InvestmentHorizon.LONG: -0.02,
    }[profile.investment_horizon]
    uncertainty = (1 - synthesis.confidence) * 0.22
    risk_score = BASE_RISK[profile.risk_tolerance] + 0.22 * concentration_ratio + horizon_adjustment + uncertainty
    if synthesis.conflict_detected:
        risk_score += 0.10
    risk_score = max(0.0, min(1.0, risk_score))

    reasons = [
        f"Current {symbol} portfolio exposure is {exposure:.1f}% against a {profile.max_position_size:.1f}% profile limit.",
        f"Investor profile is {profile.risk_tolerance.value} with a {profile.investment_horizon.value} horizon.",
        f"Market synthesis confidence is {synthesis.confidence:.1%} with {synthesis.data_completeness:.1%} data completeness.",
    ]

    bullish = synthesis.outlook in {
        MarketOutlook.STRONGLY_BULLISH,
        MarketOutlook.MODERATELY_BULLISH,
    }
    bearish = synthesis.outlook in {
        MarketOutlook.STRONGLY_BEARISH,
        MarketOutlook.MODERATELY_BEARISH,
    }

    if synthesis.outlook == MarketOutlook.INSUFFICIENT_DATA:
        recommendation = Recommendation.INSUFFICIENT_EVIDENCE
        reasons.append("Usable specialist evidence was insufficient for a directional action.")
    elif synthesis.conflict_detected or synthesis.confidence < 0.42:
        recommendation = Recommendation.HOLD if exposure > 0 else Recommendation.WATCH
        reasons.append("Conflicting or low-confidence evidence calls for observation rather than additional exposure.")
    elif bullish:
        if exposure >= profile.max_position_size:
            recommendation = Recommendation.HOLD
            reasons.append("Positive market evidence is offset by portfolio concentration at or above the profile limit.")
        elif profile.risk_tolerance == RiskTolerance.AGGRESSIVE and exposure < profile.max_position_size * 0.75:
            recommendation = Recommendation.CONSIDER_ENTRY
            reasons.append("Positive evidence and low existing exposure fit the aggressive profile's capacity for risk.")
        else:
            recommendation = Recommendation.WATCH
            reasons.append("Positive evidence is present, but the profile rules favor a monitored approach.")
    elif bearish:
        if exposure >= profile.max_position_size:
            recommendation = Recommendation.REDUCE_EXPOSURE
            reasons.append("Bearish evidence coincides with concentration above the profile limit.")
        elif exposure > 0:
            recommendation = Recommendation.HOLD
            reasons.append("Bearish evidence warrants caution; the current position remains below its profile limit.")
        else:
            recommendation = Recommendation.AVOID
            reasons.append("Bearish evidence does not support initiating exposure for this profile.")
    else:
        recommendation = Recommendation.HOLD if exposure > 0 else Recommendation.WATCH
        reasons.append("Neutral market evidence does not justify a directional portfolio change.")

    return PersonalizedIntelligence(
        recommendation=recommendation,
        risk_level=_risk_level(risk_score),
        risk_score=round(risk_score, 4),
        portfolio_exposure_percent=round(exposure, 4),
        reasons=reasons,
    )
