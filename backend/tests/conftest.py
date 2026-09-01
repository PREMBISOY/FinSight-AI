import pytest

from backend.app.database import InMemoryRepository
from backend.app.orchestrator import AnalysisOrchestrator
from backend.app.services.data import FixtureDataService


@pytest.fixture
def repository() -> InMemoryRepository:
    return InMemoryRepository()


@pytest.fixture
def orchestrator(repository: InMemoryRepository) -> AnalysisOrchestrator:
    return AnalysisOrchestrator(repository=repository, data_service=FixtureDataService())
