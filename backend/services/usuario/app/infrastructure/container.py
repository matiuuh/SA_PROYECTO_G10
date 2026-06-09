from dataclasses import dataclass

from app.application.auth_service import AuthService
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.database import Database
from app.infrastructure.repositories.in_memory_account_repository import (
    InMemoryAccountRepository,
)
from app.infrastructure.repositories.in_memory_profile_repository import (
    InMemoryProfileRepository,
)
from app.infrastructure.repositories.in_memory_session_repository import (
    InMemorySessionRepository,
)
from app.infrastructure.repositories.postgres_account_repository import (
    PostgresAccountRepository,
)
from app.infrastructure.repositories.postgres_profile_repository import (
    PostgresProfileRepository,
)
from app.infrastructure.repositories.postgres_session_repository import (
    PostgresSessionRepository,
)
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.password_hasher import PasswordHasher


@dataclass
class Container:
    settings: Settings
    database: Database | None
    auth_service: AuthService


def build_container() -> Container:
    settings = get_settings()
    database = Database(settings) if settings.storage_backend == "postgres" else None

    if settings.storage_backend == "postgres":
        account_repository = PostgresAccountRepository(database)
        profile_repository = PostgresProfileRepository(database)
        session_repository = PostgresSessionRepository(database)
    else:
        account_repository = InMemoryAccountRepository()
        profile_repository = InMemoryProfileRepository()
        session_repository = InMemorySessionRepository()

    password_hasher = PasswordHasher()
    jwt_service = JwtService(settings.jwt_secret, settings.jwt_algorithm)

    auth_service = AuthService(
        account_repository=account_repository,
        profile_repository=profile_repository,
        session_repository=session_repository,
        password_hasher=password_hasher,
        jwt_service=jwt_service,
        jwt_expire_minutes=settings.jwt_expire_minutes,
    )

    return Container(settings=settings, database=database, auth_service=auth_service)
