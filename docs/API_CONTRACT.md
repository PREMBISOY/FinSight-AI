# API Contract

The backend is the system of record. The frontend does not call agents directly.

## Health

`GET /health`

The response retains `status`, `service`, and `version`, and includes an `integrations` object showing the active repository, Gemini configuration, model, grounding setting, market-data mode/provider, and snapshot-cache backend. Configuration status does not imply a successful external network probe.

## User context

- `GET /api/users/{user_id}` returns profile, portfolio, and watchlist.
- `GET /api/users/{user_id}/profile`
- `GET /api/users/{user_id}/portfolio`
- `GET /api/users/{user_id}/watchlist`

Unknown users return HTTP `404` with a concise `detail` message.

## Analyze

`POST /api/analyze`

```json
{
  "user_id": "conservative-demo",
  "symbol": "RELIANCE",
  "query": "What do the latest earnings and outlook imply?",
  "scenario": "normal"
}
```

`scenario` is one of `normal`, `degraded_sentiment`, or `conflict` and exists to make Sprint 1 judging deterministic. Production inputs would determine degradation naturally.

The symbol is normalized before validation. Common index names are accepted: `NIFTY 50`, `NIFTY50`, and `NIFTY` resolve to the NIFTY 50 index; `SENSEX` and `BSE SENSEX` resolve to the BSE SENSEX; `BANK NIFTY` resolves to NIFTY Bank. Because indices do not have corporate financial statements, their fundamental agent may be explicitly unavailable while technical, news, synthesis, personalization, and Gemini still complete.

The `200` response contains:

- immutable market data and investor context
- three complete `AgentOutput` objects
- deterministic synthesis with score, agreement, completeness, conflict flag, contributions, and limitations
- personalized recommendation and risk assessment
- Gemini research insight with explicit status, model, latency, profile-specific considerations, risks, and Google Search grounding citations
- the original query and scenario for auditability
- ordered decision trace
- evidence and measured latency/risk metrics
- warnings for degraded or conflicting data

`market_data.source` identifies Yahoo, a fresh cache, a stale cache, or the curated fallback, while `market_data.synthetic` is always `true` for fixture data. News and evidence carry their own source names, URLs, timestamps, and synthetic labels.

Gemini is an explanation and current-context layer. It cannot change specialist classifications, deterministic synthesis scores, or the profile-specific recommendation. When Gemini is missing or fails, the deterministic analysis still returns and `ai_insight.status` is `unavailable` or `error`.

The frontend displays `query` beside `ai_insight.summary` in a dedicated “Answer to your research question” panel, including model, grounding citations, profile considerations, risks, and any limitation.

Validation errors return HTTP `422`; missing users or symbols return `404`; an unexpected pipeline failure returns `500` without leaking secrets.

## Stored analysis

- `GET /api/analyses/{analysis_id}` returns the complete stored analysis.
- `GET /api/analyses/{analysis_id}/agents` returns agent outputs.
- `GET /api/analyses/{analysis_id}/evidence` returns flattened evidence.
- `GET /api/analyses/{analysis_id}/metrics` returns measured metrics.

Unknown analysis IDs return `404`.
