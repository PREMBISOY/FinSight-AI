import pytest
from pydantic import ValidationError

from backend.app.schemas import AgentClassification, AgentOutput, AgentStatus, AgentType, AnalyzeRequest


def test_agent_output_normalizes_confidence_contract() -> None:
    output = AgentOutput(
        agent=AgentType.TECHNICAL,
        status=AgentStatus.SUCCESS,
        classification=AgentClassification.BULLISH,
        confidence=0.82,
        latency_ms=12.5,
    )
    assert output.confidence == 0.82


@pytest.mark.parametrize("confidence", [-0.01, 1.01])
def test_agent_output_rejects_out_of_range_confidence(confidence: float) -> None:
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.TECHNICAL,
            status=AgentStatus.SUCCESS,
            classification=AgentClassification.BULLISH,
            confidence=confidence,
            latency_ms=1,
        )


def test_unavailable_agent_cannot_fabricate_a_classification() -> None:
    with pytest.raises(ValidationError):
        AgentOutput(
            agent=AgentType.SENTIMENT,
            status=AgentStatus.UNAVAILABLE,
            classification=AgentClassification.NEUTRAL,
            confidence=0.3,
            latency_ms=1,
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("symbol", "../secret"),
        ("symbol", "RELIANCE/../../x"),
        ("user_id", "eq.admin,role.eq.owner"),
        ("query", " "),
    ],
)
def test_analysis_request_rejects_unsafe_or_blank_inputs(field: str, value: str) -> None:
    payload = {"user_id": "conservative-demo", "symbol": "RELIANCE", field: value}
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate(payload)


@pytest.mark.parametrize(
    ("submitted", "canonical"),
    [
        ("NIFTY 50", "NIFTY50"),
        ("nifty", "NIFTY50"),
        ("BSE Sensex", "SENSEX"),
        ("NIFTYSENSEX", "SENSEX"),
        ("Bank Nifty", "BANKNIFTY"),
        ("M&M", "M&M"),
    ],
)
def test_analysis_request_normalizes_human_friendly_symbols(
    submitted: str, canonical: str
) -> None:
    request = AnalyzeRequest(user_id="conservative-demo", symbol=submitted)

    assert request.symbol == canonical
