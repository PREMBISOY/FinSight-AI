from __future__ import annotations

import logging
from time import perf_counter

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import router
from backend.app.core.config import settings
from backend.app.core.logging import configure_logging
from backend.app.orchestrator import AnalysisOrchestrator, build_orchestrator


def create_app(orchestrator: AnalysisOrchestrator | None = None) -> FastAPI:
    configure_logging(settings.log_level)
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Explainable, evidence-backed, personalized multi-agent financial intelligence.",
    )
    application.state.orchestrator = orchestrator or build_orchestrator()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(router)

    @application.middleware("http")
    async def log_request(request: Request, call_next):
        started = perf_counter()
        response = await call_next(request)
        logging.getLogger("finsight.http").info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "latency_ms": round((perf_counter() - started) * 1000, 3),
            },
        )
        return response
    return application


app = create_app()
