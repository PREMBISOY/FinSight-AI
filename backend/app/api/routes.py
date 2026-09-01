from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.app.core.config import settings
from backend.app.orchestrator import AnalysisOrchestrator
from backend.app.schemas import (
    AgentOutput,
    AnalysisMetric,
    AnalysisResponse,
    AnalyzeRequest,
    Evidence,
    InvestorProfile,
    Portfolio,
    UserContext,
)
from backend.app.services.data import DataNotFoundError


router = APIRouter()


def get_orchestrator(request: Request) -> AnalysisOrchestrator:
    return request.app.state.orchestrator


@router.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "finsight-api", "version": settings.app_version}


async def _user_context(user_id: str, service: AnalysisOrchestrator) -> UserContext:
    try:
        profile, portfolio, watchlist = await asyncio.gather(
            service.repository.get_profile(user_id),
            service.repository.get_portfolio(user_id),
            service.repository.get_watchlist(user_id),
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc.args[0])) from exc
    return UserContext(profile=profile, portfolio=portfolio, watchlist=watchlist)


@router.get("/api/users/{user_id}", response_model=UserContext, tags=["users"])
async def get_user(
    user_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> UserContext:
    return await _user_context(user_id, service)


@router.get("/api/users/{user_id}/profile", response_model=InvestorProfile, tags=["users"])
async def get_profile(
    user_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> InvestorProfile:
    return (await _user_context(user_id, service)).profile


@router.get("/api/users/{user_id}/portfolio", response_model=Portfolio, tags=["users"])
async def get_portfolio(
    user_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> Portfolio:
    return (await _user_context(user_id, service)).portfolio


@router.get("/api/users/{user_id}/watchlist", response_model=list[str], tags=["users"])
async def get_watchlist(
    user_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> list[str]:
    return (await _user_context(user_id, service)).watchlist


@router.post("/api/analyze", response_model=AnalysisResponse, tags=["analysis"])
async def analyze(
    payload: AnalyzeRequest, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> AnalysisResponse:
    try:
        return await service.run_analysis(payload)
    except (KeyError, DataNotFoundError) as exc:
        detail = str(exc.args[0]) if exc.args else "Requested analysis context was not found."
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc


async def _stored(analysis_id: str, service: AnalysisOrchestrator) -> AnalysisResponse:
    try:
        return await service.repository.get_analysis(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc.args[0])) from exc


@router.get("/api/analyses/{analysis_id}", response_model=AnalysisResponse, tags=["analysis"])
async def get_analysis(
    analysis_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> AnalysisResponse:
    return await _stored(analysis_id, service)


@router.get("/api/analyses/{analysis_id}/agents", response_model=list[AgentOutput], tags=["analysis"])
async def get_agents(
    analysis_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> list[AgentOutput]:
    return (await _stored(analysis_id, service)).agent_results


@router.get("/api/analyses/{analysis_id}/evidence", response_model=list[Evidence], tags=["analysis"])
async def get_evidence(
    analysis_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> list[Evidence]:
    analysis = await _stored(analysis_id, service)
    return [evidence for result in analysis.agent_results for evidence in result.evidence]


@router.get("/api/analyses/{analysis_id}/metrics", response_model=list[AnalysisMetric], tags=["analysis"])
async def get_metrics(
    analysis_id: str, service: AnalysisOrchestrator = Depends(get_orchestrator)
) -> list[AnalysisMetric]:
    return (await _stored(analysis_id, service)).metrics
