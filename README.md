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

`DATA_MODE=live` is the production default. It loads keyless, near-real-time prices, attributable news, and public financial statements through yfinance/Yahoo Finance, and reuses only successful Yahoo snapshots from Supabase when configured (including an expired snapshot during a temporary provider outage). If neither live data nor a real cached snapshot is available, the affected dataset is reported unavailable—production never substitutes synthetic data. `DATA_MODE=hybrid` is a backwards-compatible alias with the same live-and-cache-only behavior. `DATA_MODE=fixture` is the only mode that uses deterministic synthetic data, for development and tests. Plain symbols are treated as NSE listings using `.NS`; provide an explicit suffix such as `.BO` when needed. Human-friendly index aliases are supported: `NIFTY 50`/`NIFTY50`, `SENSEX`/`BSE SENSEX`, and `BANK NIFTY` map to their Yahoo index tickers.

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
