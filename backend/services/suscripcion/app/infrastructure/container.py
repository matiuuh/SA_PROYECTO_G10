from dataclasses import dataclass

from app.application.subscription_service import SubscriptionService
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.divisas_client import DivisasClient
from app.infrastructure.database import Database
from app.infrastructure.repositories.in_memory_plan_repository import InMemoryPlanRepository
from app.infrastructure.repositories.in_memory_subscription_repository import (
    InMemorySubscriptionRepository,
)
from app.infrastructure.repositories.postgres_plan_repository import PostgresPlanRepository
from app.infrastructure.repositories.postgres_subscription_repository import (
    PostgresSubscriptionRepository,
)


@dataclass
class Container:
    settings: Settings
    database: Database | None
    subscription_service: SubscriptionService


def build_container() -> Container:
    settings = get_settings()
    database = Database(settings) if settings.storage_backend == "postgres" else None

    if settings.storage_backend == "postgres":
        plan_repository = PostgresPlanRepository(database)
        subscription_repository = PostgresSubscriptionRepository(database)
    else:
        plan_repository = InMemoryPlanRepository()
        subscription_repository = InMemorySubscriptionRepository()

    subscription_service = SubscriptionService(
        plan_repository=plan_repository,
        subscription_repository=subscription_repository,
        divisas_client=DivisasClient(
            target=settings.api_gateway_url,
            timeout_seconds=settings.conversion_timeout_seconds,
        ),
    )
    return Container(
        settings=settings,
        database=database,
        subscription_service=subscription_service,
    )
