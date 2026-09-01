# FinSight AI

FinSight AI is an explainable, evidence-backed, personalized multi-agent financial intelligence prototype for HackVerse: Into the Web — Sprint 1.

Three specialist agents inspect technical market signals, financial documents, and news sentiment concurrently. A deterministic synthesis engine combines their structured findings, and a separate risk engine adjusts the result for an investor's profile and portfolio exposure.

## Quick start

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn backend.main:app --reload
```

Open `http://localhost:8000/docs` for the API. Frontend implementation is intentionally not included on Prem's branch; Aarya can build against the stable examples in `docs/API_CONTRACT.md`.

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
