from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.domain.models import Plan, Subscription
from app.infrastructure import container as container_module
from app.infrastructure.config.settings import Settings
from app.infrastructure.database import Database
from app.infrastructure.repositories.postgres_plan_repository import PostgresPlanRepository
from app.infrastructure.repositories.postgres_subscription_repository import (
    PostgresSubscriptionRepository,
)


class FakeCursor:
    def __init__(self, fetchone_result=None, fetchall_result=None) -> None:
        self.fetchone_result = fetchone_result
        self.fetchall_result = fetchall_result or []
        self.executed: list[tuple] = []

    def execute(self, query, params=None) -> None:
        self.executed.append((query, params))

    def fetchone(self):
        return self.fetchone_result

    def fetchall(self):
        return self.fetchall_result

    def __enter__(self):
        return self

    def __exit__(self, *args) -> bool:
        return False


class FakeConnection:
    def __init__(self, cursor: FakeCursor) -> None:
        self._cursor = cursor
        self.committed = False

    def cursor(self):
        return self._cursor

    def commit(self) -> None:
        self.committed = True

    def __enter__(self):
        return self

    def __exit__(self, *args) -> bool:
        return False


class FakeDatabase:
    def __init__(self, connection: FakeConnection) -> None:
        self._connection = connection

    def connection(self):
        return self._connection


def test_database_ping_raises_when_postgres_is_unreachable() -> None:
    settings = Settings(storage_backend="postgres", db_host="127.0.0.1", db_port=1)
    database = Database(settings)
    with pytest.raises(Exception):
        database.ping()


def test_postgres_plan_repository_create_list_and_get() -> None:
    now = datetime.now(timezone.utc)
    row = {
        "id": "plan-1",
        "nombre": "Plan",
        "descripcion": None,
        "precio_base": Decimal("10.00"),
        "moneda_base": "GTQ",
        "perfiles_maximos": 2,
        "activo": True,
        "creado_en": now,
        "actualizado_en": now,
    }
    cursor = FakeCursor(fetchone_result=row, fetchall_result=[row])
    connection = FakeConnection(cursor)
    repository = PostgresPlanRepository(FakeDatabase(connection))

    created = repository.create(
        Plan(
            id="plan-1",
            nombre="Plan",
            descripcion=None,
            precio_base=Decimal("10.00"),
            moneda_base="GTQ",
            perfiles_maximos=2,
            activo=True,
            creado_en=now,
            actualizado_en=now,
        )
    )
    assert created.id == "plan-1"
    assert connection.committed is True

    assert len(repository.list_active()) == 1
    assert repository.get_by_id("plan-1") is not None

    cursor.fetchone_result = None
    assert repository.get_by_id("missing") is None


def test_postgres_subscription_repository_full_cycle() -> None:
    now = datetime.now(timezone.utc)
    row = {
        "id": "sub-1",
        "cuenta_id": "account-1",
        "plan_id": "plan-1",
        "estado": "activa",
        "fecha_inicio": now,
        "fecha_fin": None,
        "creado_en": now,
        "actualizado_en": now,
    }
    cursor = FakeCursor(fetchone_result=row, fetchall_result=[row])
    connection = FakeConnection(cursor)
    repository = PostgresSubscriptionRepository(FakeDatabase(connection))

    created = repository.create(
        Subscription(
            id="sub-1",
            cuenta_id="account-1",
            plan_id="plan-1",
            estado="activa",
            fecha_inicio=now,
            fecha_fin=None,
            creado_en=now,
            actualizado_en=now,
        )
    )
    assert created.id == "sub-1"
    assert connection.committed is True

    assert repository.get_active_by_account_id("account-1") is not None
    assert repository.get_by_id("sub-1") is not None
    assert repository.list_active_account_ids() == ["account-1"]

    updated = repository.update(created)
    assert updated.id == "sub-1"

    cursor.fetchone_result = None
    assert repository.get_active_by_account_id("missing") is None
    assert repository.get_by_id("missing") is None


def test_build_container_wires_postgres_repositories_when_configured(monkeypatch) -> None:
    postgres_settings = Settings(storage_backend="postgres", db_host="127.0.0.1", db_port=1)
    monkeypatch.setattr(container_module, "get_settings", lambda: postgres_settings)

    built = container_module.build_container()

    assert built.database is not None
    assert isinstance(built.subscription_service, container_module.SubscriptionService)


def test_grpc_server_handle_start_and_stop() -> None:
    from app.interfaces.grpc.server import GrpcServerHandle

    class FakeGrpcServer:
        def __init__(self) -> None:
            self.bound_address = None
            self.started = False
            self.stopped_with_grace = None

        def add_insecure_port(self, address: str) -> int:
            self.bound_address = address
            return 12345

        def start(self) -> None:
            self.started = True

        def stop(self, grace: int) -> None:
            self.stopped_with_grace = grace

    server = FakeGrpcServer()
    handle = GrpcServerHandle(server)
    handle.start(50052)
    handle.stop()

    assert server.bound_address == "[::]:50052"
    assert server.started is True
    assert server.stopped_with_grace == 5
