# Shared Agent Contract

Every specialist agent implements an asynchronous function and returns `AgentOutput` from `backend.app.schemas.agent`.

```json
{
  "agent": "technical",
  "status": "success",
  "classification": "BULLISH",
  "confidence": 0.82,
  "signals": [
    {
      "name": "price_momentum_5d",
      "value": 0.041,
      "interpretation": "Five-session price momentum is positive.",
      "source": "yahoo_finance:RELIANCE.NS"
    }
  ],
  "reasoning": ["Price and volume signals support a bullish classification."],
  "evidence": [],
  "latency_ms": 12.4,
  "limitations": [],
  "metadata": {"implementation": "integration_fallback"}
}
```

## Required invariants

- `agent`: `technical`, `fundamental`, or `sentiment`.
- `status`: `success`, `degraded`, `unavailable`, or `error`.
- `classification`: `BULLISH`, `NEUTRAL`, `BEARISH`, or `UNKNOWN`.
- `confidence`: measured/derived value normalized to `[0, 1]`.
- `signals`, `reasoning`, `evidence`, and `limitations`: arrays, never hidden prose blobs.
- `latency_ms`: elapsed wall-clock time measured by the implementation.
- `unavailable` and `error` must use `UNKNOWN` with zero confidence.
- Evidence must identify its source and whether it is synthetic. Live sources retain their provider URL and timestamp when available.
- Retrieved document evidence includes a chunk ID and relevance score.
- Agents never return portfolio recommendations.
- Agents never invent a classification or citation when evidence is insufficient.

## Interfaces

```python
async def run_technical_analysis(symbol: str, market_data: MarketData, context: AnalysisContext) -> AgentOutput: ...
async def run_fundamental_analysis(symbol: str, query: str, context: AnalysisContext, documents: list[DocumentChunk]) -> AgentOutput: ...
async def run_sentiment_analysis(symbol: str, news_items: list[NewsItem], context: AnalysisContext) -> AgentOutput: ...
```

The orchestrator calls only these interfaces. Implementations may evolve behind them.

## Error behavior

Expected missing data should be represented as `unavailable` or `degraded`, not raised. Unexpected exceptions may be raised; the orchestrator catches them and creates an auditable `error` result. Partial agents must list what is missing. Fake fallback evidence is prohibited.
