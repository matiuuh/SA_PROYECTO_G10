from dataclasses import dataclass

from app.application.subscription_service import SubscriptionService
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.divisas_client import DivisasClient
from app.infrastructure.database import Database
from app.infrastructure.repositories.postgres_plan_repository import PostgresPlanRepository
from app.infrastructure.repositories.postgres_subscription_repository import (
    PostgresSubscriptionRepository,
)


@dataclass
class Container:
    settings: Settings
    database: Database
    subscription_service: SubscriptionService


def build_container() -> Container:
    settings = get_settings()
    database = Database(settings)
    subscription_service = SubscriptionService(
        plan_repository=PostgresPlanRepository(database),
        subscription_repository=PostgresSubscriptionRepository(database),
        divisas_client=DivisasClient(
            target=settings.divisas_grpc_target,
            timeout_seconds=settings.conversion_timeout_seconds,
        ),
    )
    return Container(
        settings=settings,
        database=database,
        subscription_service=subscription_service,
    )
