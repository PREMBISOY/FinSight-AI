# FinSight AI Architecture

## Product overview

FinSight AI acts as a miniature research desk for retail investors. Independent agents answer narrowly scoped questions, expose their evidence and confidence, and never decide the final recommendation. Deterministic synthesis evaluates the market evidence; personalization then evaluates what that evidence means for one investor.

## System architecture

```text
React dashboard (Aarya-owned repository area)
      |
      v
FastAPI API -> live Yahoo adapter -> Supabase TTL cache -> explicit unavailable result
      |
      v
async orchestrator
  |----------|-------------|
  v          v             v
Technical  Fundamental   Sentiment
  |          + RAG          |
  |----------|-------------|
             v
deterministic synthesis
             v
personalization and risk
             v
Gemini explanation + Google Search grounding
             v
decision trace + metrics + evidence
             v
repository (Supabase or in-memory fallback)
```

The three agent calls are logical modules in one FastAPI process and run concurrently with `asyncio.gather(..., return_exceptions=True)`. This avoids Sprint 1 microservice overhead while retaining independent contracts.

## Ownership boundaries

- Prem: schemas, API, orchestrator, synthesis, personalization, repositories, integration, deployment.
- Sunal: `backend/app/agents/technical/` implementation.
- Aayush: `backend/app/agents/fundamental/` retrieval and analysis implementation.
- Namish: `backend/app/agents/sentiment/` implementation and degraded/conflict QA.
- Aarya: `frontend/` visual implementation.

The interface files and shared schemas are integration boundaries. Implementations can be replaced without changing orchestrator code. Cross-owner fixes should be minimal and backwards compatible.

## Data flow

1. The API validates an analysis request.
2. The repository loads the profile, portfolio, and watchlist.
3. The data service loads near-real-time prices, attributable news, and public financial statements from Yahoo Finance. Fresh snapshots are reused within their TTL; Supabase provides a shared cache when configured.
4. The orchestrator starts three agents concurrently.
5. Exceptions become explicit `error` outputs; missing feeds become `unavailable` outputs.
6. Synthesis maps classifications to scores, applies documented weights, calculates agreement/completeness, and detects conflicts.
7. Personalization considers risk tolerance, horizon, current exposure, and maximum position size.
8. Gemini receives the immutable result and investor context, optionally searches for current context, and returns a structured explanation with citations.
9. The complete result, evidence, Gemini audit metadata, and measured metrics are persisted.
10. The API returns one frontend-ready response with a visible decision trace.

## Decision logic

Default weights are technical `0.40`, fundamental `0.40`, and sentiment `0.20`. Agent contribution is `classification_score × confidence × weight`, where bearish is `-1`, neutral is `0`, and bullish is `+1`. Unavailable results contribute no directional score and reduce data completeness. Opposing bullish and bearish results trigger a conflict penalty. Thresholds and weights live in configuration rather than agent prompts.

Gemini rewrites and enriches already-calculated explanations, but it cannot choose the structured classification or recommendation. Failure is explicit and does not erase the deterministic analysis.

## Personalization

Market synthesis is immutable across users. The risk engine then derives concentration and suitability. A conservative investor above maximum position size is held back from adding exposure, while an aggressive investor with low exposure may receive `CONSIDER_ENTRY` for the same positive market result. The rules are deterministic and tested.

## Degraded-data handling

- Live provider outage: an expired Yahoo snapshot is preferred; if no real snapshot exists, the affected dataset is reported unavailable. Production never substitutes a fixture.
- News or statement outage: only the affected agent degrades; valid price analysis continues.
- Missing input: agent returns `unavailable`, `UNKNOWN`, zero confidence, and a limitation. `DATA_MODE=fixture` is reserved for deterministic development/test inputs and labels all such evidence `synthetic`.
- Partial input: agent returns `degraded` and identifies the limitation.
- Exception: orchestrator converts it to an `error` result without crashing sibling tasks.
- Conflict: synthesis explicitly records disagreement and lowers confidence.
- No usable evidence: output is `INSUFFICIENT_DATA`; no recommendation is fabricated.

## Persistence

`Repository` isolates storage from business logic. Development and tests use an in-memory repository with seeded demo users. When `SUPABASE_URL` and a server-only secret/service-role key are configured, the factory selects the Supabase implementation and the data service stores TTL snapshots in `data_snapshots`. Public anon keys are not used for backend persistence. SQL migrations are reproducible under `supabase/migrations/`, enable Row Level Security, and deny direct public access to portfolio, analysis, and cache tables.

## Deployment

Railway runs the FastAPI service using the root `Procfile`/`railway.json`. Aarya's React/Vite client can be deployed independently and point to the backend API. Local functionality and tests take priority over deployment optimization.
