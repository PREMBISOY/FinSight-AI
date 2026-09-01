# Judge Demo Runbook

## Preparation

1. Start FastAPI and the dashboard.
2. Open `/health` and confirm `ok`.
3. Keep the dashboard stock fixed on `RELIANCE`.
4. Explain that fixtures and synthetic document excerpts are clearly labeled for a reliable five-hour Sprint 1 demo.

## Scenario 1 — normal pipeline

Select `conservative-demo`, choose `normal`, and analyze. Show the three agent statuses and measured latencies. Open the technical signals, fundamental retrieved chunks, and sentiment evidence. Then show synthesis, portfolio concentration adjustment, decision trace, and limitations.

## Scenario 2 — personalization

Keep `RELIANCE` and `normal` unchanged. Switch only from `conservative-demo` to `aggressive-demo`. The market synthesis remains identical, but the recommendation changes because exposure, risk tolerance, and horizon differ. This is the central demonstration.

## Scenario 3 — degraded sentiment

Select `degraded_sentiment`. Show that sentiment is `unavailable`/`UNKNOWN`, carries no invented evidence, lowers completeness and confidence, and leaves a safe partial result.

## Scenario 4 — conflicting signals

Select `conflict`. Show bullish technical, bearish fundamental, and neutral sentiment outputs. The synthesis marks conflict, reduces confidence, and exposes the disagreement in the decision trace.

## Closing points

- Three specialist agents execute concurrently, not sequentially.
- Evidence and data quality are visible.
- Structured rules choose the decision; an LLM cannot invent it.
- The system reports actual latency and risk/completeness metrics, not fabricated accuracy.
- Supabase persistence can be activated without changing business logic.
