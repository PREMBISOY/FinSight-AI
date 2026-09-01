# FinSight AI

FinSight AI is an explainable, evidence-backed, personalized multi-agent financial intelligence prototype for HackVerse: Into the Web — Sprint 1.

Three specialist agents inspect technical market signals, financial documents, and news sentiment concurrently. A deterministic synthesis engine combines their structured findings, a separate risk engine adjusts the result for an investor's profile and portfolio exposure, and Gemini adds a current, Google-Search-grounded explanation without being allowed to override the computed recommendation.

## Quick start

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn backend.main:app --reload

cd frontend
npm ci
npm run dev
```

Open `http://localhost:8000/docs` for the API and `http://localhost:5173` for the dashboard.

Copy `.env.example` values into your local environment or Railway variables. Gemini accepts the existing `LLM_API_KEY` name (and `GEMINI_API_KEY` as an alias). Supabase persistence and shared data caching require `SUPABASE_URL` plus a server-only `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`; a URL or public anon key alone cannot safely write through Row Level Security. Apply the SQL files under `supabase/migrations/` in order.

`DATA_MODE=live` is the production default. It loads keyless, near-real-time prices, attributable news, and public financial statements through yfinance/Yahoo Finance, and reuses only successful Yahoo snapshots from Supabase when configured (including an expired snapshot during a temporary provider outage). If neither live data nor a real cached snapshot is available, the affected dataset is reported unavailable—production never substitutes synthetic data. `DATA_MODE=hybrid` is a backwards-compatible alias with the same live-and-cache-only behavior. `DATA_MODE=fixture` is the only mode that uses deterministic synthetic data, for development and tests. You can enter an NSE ticker (`RELIANCE`), a BSE ticker (`RELIANCE.BO`), or a company name; name searches resolve to an NSE/BSE Yahoo Finance equity and prefer NSE when both listings exist. Human-friendly index aliases are also supported: `NIFTY 50`/`NIFTY50`, `SENSEX`/`BSE SENSEX`, and `BANK NIFTY`.

Gemini is an optional explanation layer. If its quota is exhausted or the service is unavailable, the frontend shows **AI explanation temporarily unavailable** and continues to display the deterministic technical, fundamental, sentiment, synthesis, and personalized recommendation results. The frontend does not automatically retry a failed Gemini request.

## Database and persistence

The application has two repository modes:

- With both `SUPABASE_URL` and a server-only key, FastAPI reads and writes through Supabase PostgREST and uses Supabase for shared live-data snapshots.
- Without that complete configuration, it uses process-local in-memory profiles, portfolios, watchlists, analyses, and snapshots. This fallback is reset whenever the backend restarts.

Apply the migrations in this exact order; the application does not run them automatically:

1. `001_initial_schema.sql` creates `investor_profiles`, `portfolio_holdings`, `watchlists`, `analyses`, `agent_results`, `analysis_metrics`, and `evidence`, then seeds the two demo investors and their holdings/watchlists.
2. `002_production_integrations.sql` adds query, scenario, and Gemini audit fields; adds analysis constraints and uniqueness rules; links analyses to investor profiles; and locks all application tables behind Row Level Security.
3. `003_live_data_cache.sql` creates `data_snapshots`, keyed by `(symbol, data_type)`, for `market`, `news`, and `fundamentals` payloads.

Database access is backend-only. The migrations revoke access from `anon` and `authenticated` and grant it to `service_role`; never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vite variables or browser code. `SUPABASE_ANON_KEY` is retained as an environment placeholder but is deliberately not used by the persistence layer.

The frontend login is a demo-only browser account stored in local/session storage. It maps the signed-in name to either `conservative-demo` or `aggressive-demo`; it does **not** use Supabase Auth and does not create an investor profile or any other database row. The signed-in name is used in user-facing profile and personalized-intelligence cards, while the selected demo profile continues to supply risk tolerance, investment horizon, portfolio holdings, and position limits. The corresponding backend profiles must already exist from the migrations (or from the in-memory seed data).

Successful analyses store the complete response in `analyses.payload` and also write normalized agent results, metrics, and flattened evidence for inspection. These PostgREST inserts are currently sequential rather than one database transaction, so an interrupted or failed child insert can leave a partial analysis record. Snapshot cache failures are non-fatal: the data service logs them and continues with the live provider or a previously loaded real snapshot when available. Default snapshot TTLs are 15 minutes for market data, 30 minutes for news, and 6 hours for fundamentals.

## Demo users and scenarios

- `conservative-demo`: conservative, long-horizon investor with 25% RELIANCE exposure.
- `aggressive-demo`: aggressive, short-horizon investor with 5% RELIANCE exposure.
- `normal`: every agent completes.
- `degraded_sentiment`: sentiment is explicitly unavailable and confidence is reduced.
- `conflict`: technical and fundamental agents disagree.

Example request:

```json
{
  "user_id": "conservative-demo",
  "symbol": "RELIANCE",
  "scenario": "normal"
}
```

See [the architecture](docs/ARCHITECTURE.md), [agent contract](docs/AGENT_CONTRACT.md), [API contract](docs/API_CONTRACT.md), and [demo runbook](docs/DEMO.md).

Run every deterministic judge scenario without a frontend:

```powershell
.venv\Scripts\python -m backend.scripts.demo
```

## Team integration

- Sunal replaces internals behind `backend/app/agents/technical/interface.py`.
- Aayush replaces or extends `backend/app/agents/fundamental/` while preserving the interface and citations.
- Namish replaces internals behind `backend/app/agents/sentiment/interface.py` and extends scenario tests.
- Aarya consumes only the documented FastAPI endpoints and response models.

Run `python -m pytest -q` after every integration. Do not rename shared schemas or interface functions without coordinating downstream consumers.

## Safety

This hackathon prototype provides investment intelligence, not financial advice. Synthetic or curated sources are labeled. Missing evidence is never invented, and predictive accuracy is not claimed.

Yahoo Finance data is research-grade and may be delayed, incomplete, or temporarily unavailable; it is not an exchange-grade execution feed. Gemini supplies cited current context and investor-specific explanation. The explicit fixture mode remains visibly marked `synthetic` in the API and dashboard.
