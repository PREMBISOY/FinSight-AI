# Judge Demo Runbook

## Preparation

1. Start FastAPI and the dashboard.
2. Open `/health` and confirm `ok`.
3. Keep the dashboard stock fixed on `RELIANCE`.
4. Confirm the market card shows `yahoo_finance:<ticker>` and no `SYNTHETIC` badge. Explain that Supabase caches upstream snapshots and Gemini adds current Google-Search-grounded context with visible citations.

## Scenario 1 — normal pipeline

Select `conservative-demo`, choose `normal`, and analyze. Show the three agent statuses and measured latencies. Open the technical signals, fundamental retrieved chunks, and sentiment evidence. Then show synthesis, portfolio concentration adjustment, decision trace, and limitations.

## Scenario 2 — personalization

Keep `RELIANCE` and `normal` unchanged. Switch only from `conservative-demo` to `aggressive-demo`. The market evidence correctly remains identical, while exposure, risk score, suitability reasons, and Gemini guidance change. A live low-confidence/conflicting market can legitimately yield the same cautious action for both profiles; set `DATA_MODE=fixture` only when a scripted demo requires the deterministic `HOLD` versus `CONSIDER_ENTRY` contrast.

## Scenario 3 — degraded sentiment

Select `degraded_sentiment`. Show that sentiment is `unavailable`/`UNKNOWN`, carries no invented evidence, lowers completeness and confidence, and leaves a safe partial result.

## Scenario 4 — conflicting signals

Select `conflict`. Show bullish technical, bearish fundamental, and neutral sentiment outputs. The synthesis marks conflict, reduces confidence, and exposes the disagreement in the decision trace.

## Closing points

- Three specialist agents execute concurrently, not sequentially.
- Evidence and data quality are visible.
- Structured rules choose the decision; Gemini explains it and adds cited current context but cannot override it.
- The system reports actual latency and risk/completeness metrics, not fabricated accuracy.
- Supabase persistence uses a server-only secret/service-role key and protected tables.
- Yahoo Finance supplies research-grade live inputs; only real Yahoo snapshots may be reused from cache. Fixture mode is explicit and visibly labeled synthetic.
