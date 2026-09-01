# API Contract

The backend is the system of record. The frontend does not call agents directly.

## Health

`GET /health`

```json
{"status":"ok","service":"finsight-api","version":"0.1.0"}
```

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

The `200` response contains:

- immutable market data and investor context
- three complete `AgentOutput` objects
- deterministic synthesis with score, agreement, completeness, conflict flag, contributions, and limitations
- personalized recommendation and risk assessment
- ordered decision trace
- evidence and measured latency/risk metrics
- warnings for degraded or conflicting data

Validation errors return HTTP `422`; missing users or symbols return `404`; an unexpected pipeline failure returns `500` without leaking secrets.

## Stored analysis

- `GET /api/analyses/{analysis_id}` returns the complete stored analysis.
- `GET /api/analyses/{analysis_id}/agents` returns agent outputs.
- `GET /api/analyses/{analysis_id}/evidence` returns flattened evidence.
- `GET /api/analyses/{analysis_id}/metrics` returns measured metrics.

Unknown analysis IDs return `404`.
