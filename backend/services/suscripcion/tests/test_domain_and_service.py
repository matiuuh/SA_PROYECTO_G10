"""Tests unitarios ampliados para suscripcion — dominio, repos en memoria, servicio."""
import pytest
from datetime import datetime, timezone
from decimal import Decimal

from app.application.schemas import (
    ChangeSubscriptionPlanRequest,
    CreatePlanRequest,
    CreateSubscriptionRequest,
)
from app.application.subscription_service import SubscriptionService
from app.domain.errors import ConflictError, NotFoundError
from app.domain.models import Plan, Subscription
from app.infrastructure.currency_map import currency_from_country, COUNTRY_TO_CURRENCY
from app.infrastructure.repositories.in_memory_plan_repository import InMemoryPlanRepository
from app.infrastructure.repositories.in_memory_subscription_repository import (
    InMemorySubscriptionRepository,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_plan(pid: str = "plan-1", nombre: str = "Plan Básico",
               precio: str = "10.00", activo: bool = True) -> Plan:
    now = _now()
    return Plan(
        id=pid, nombre=nombre, descripcion="Descripcion",
        precio_base=Decimal(precio), moneda_base="USD",
        perfiles_maximos=4, activo=activo,
        creado_en=now, actualizado_en=now,
    )


def _make_subscription(sid: str = "sub-1", cuenta_id: str = "acc-1",
                       plan_id: str = "plan-1", estado: str = "activa") -> Subscription:
    now = _now()
    return Subscription(
        id=sid, cuenta_id=cuenta_id, plan_id=plan_id, estado=estado,
        fecha_inicio=now, fecha_fin=None,
        creado_en=now, actualizado_en=now,
    )


class FakeDivisasClientOK:
    def convert_amount(self, monto: Decimal, moneda_origen: str, moneda_destino: str):
        return Decimal("87.50"), Decimal("7.85")


class FakeDivisasClientFail:
    def convert_amount(self, monto: Decimal, moneda_origen: str, moneda_destino: str):
        raise RuntimeError("divisas unavailable")


def _build_service(divisas_client=None) -> SubscriptionService:
    return SubscriptionService(
        plan_repository=InMemoryPlanRepository(),
        subscription_repository=InMemorySubscriptionRepository(),
        divisas_client=divisas_client or FakeDivisasClientOK(),
    )


# ─── currency_map ─────────────────────────────────────────────────────────────

class TestCurrencyMap:
    def test_known_countries_return_currency(self) -> None:
        assert currency_from_country("Guatemala") == "GTQ"
        assert currency_from_country("Mexico") == "MXN"
        assert currency_from_country("Costa Rica") == "CRC"

    def test_case_insensitive(self) -> None:
        assert currency_from_country("GUATEMALA") == "GTQ"
        assert currency_from_country("mexico") == "MXN"
        assert currency_from_country("COSTA RICA") == "CRC"

    def test_strips_whitespace(self) -> None:
        assert currency_from_country("  Guatemala  ") == "GTQ"

    def test_unknown_country_returns_none(self) -> None:
        assert currency_from_country("PaisInventado") is None
        assert currency_from_country("") is None

    def test_usd_countries(self) -> None:
        usd_countries = ["Ecuador", "El Salvador", "Estados Unidos", "Panama", "Puerto Rico"]
        for country in usd_countries:
            assert currency_from_country(country) == "USD", f"{country} should be USD"

    def test_all_keys_are_lowercase(self) -> None:
        for key in COUNTRY_TO_CURRENCY:
            assert key == key.lower(), f"Key '{key}' is not lowercase"

    def test_all_values_are_three_chars(self) -> None:
        for country, currency in COUNTRY_TO_CURRENCY.items():
            assert len(currency) == 3, f"Currency for '{country}' is not 3 chars"


# ─── InMemoryPlanRepository ───────────────────────────────────────────────────

class TestInMemoryPlanRepository:
    def test_create_and_get_by_id(self) -> None:
        repo = InMemoryPlanRepository()
        plan = _make_plan("p-1")
        repo.create(plan)
        found = repo.get_by_id("p-1")
        assert found is not None
        assert found.id == "p-1"

    def test_get_by_id_missing_returns_none(self) -> None:
        repo = InMemoryPlanRepository()
        assert repo.get_by_id("nonexistent") is None

    def test_list_active_returns_only_active(self) -> None:
        repo = InMemoryPlanRepository()
        repo.create(_make_plan("p-1", activo=True))
        repo.create(_make_plan("p-2", activo=False))
        repo.create(_make_plan("p-3", activo=True))
        active = repo.list_active()
        assert len(active) == 2
        assert all(p.activo for p in active)

    def test_list_active_empty(self) -> None:
        repo = InMemoryPlanRepository()
        assert repo.list_active() == []

    def test_create_returns_plan(self) -> None:
        repo = InMemoryPlanRepository()
        plan = _make_plan()
        result = repo.create(plan)
        assert result.id == plan.id


# ─── InMemorySubscriptionRepository ──────────────────────────────────────────

class TestInMemorySubscriptionRepository:
    def test_create_and_get_by_id(self) -> None:
        repo = InMemorySubscriptionRepository()
        sub = _make_subscription("s-1")
        repo.create(sub)
        found = repo.get_by_id("s-1")
        assert found is not None
        assert found.id == "s-1"

    def test_get_by_id_missing(self) -> None:
        repo = InMemorySubscriptionRepository()
        assert repo.get_by_id("missing") is None

    def test_get_active_by_account_id(self) -> None:
        repo = InMemorySubscriptionRepository()
        repo.create(_make_subscription("s-1", cuenta_id="acc-1", estado="activa"))
        result = repo.get_active_by_account_id("acc-1")
        assert result is not None
        assert result.cuenta_id == "acc-1"

    def test_get_active_by_account_id_inactive(self) -> None:
        repo = InMemorySubscriptionRepository()
        repo.create(_make_subscription("s-1", cuenta_id="acc-1", estado="cancelada"))
        assert repo.get_active_by_account_id("acc-1") is None

    def test_get_active_by_account_id_missing(self) -> None:
        repo = InMemorySubscriptionRepository()
        assert repo.get_active_by_account_id("nonexistent") is None

    def test_list_active_account_ids(self) -> None:
        repo = InMemorySubscriptionRepository()
        repo.create(_make_subscription("s-1", cuenta_id="acc-1", estado="activa"))
        repo.create(_make_subscription("s-2", cuenta_id="acc-2", estado="activa"))
        repo.create(_make_subscription("s-3", cuenta_id="acc-3", estado="cancelada"))
        ids = repo.list_active_account_ids()
        assert sorted(ids) == ["acc-1", "acc-2"]

    def test_list_active_account_ids_deduplicates(self) -> None:
        repo = InMemorySubscriptionRepository()
        repo.create(_make_subscription("s-1", cuenta_id="acc-1", estado="activa"))
        repo.create(_make_subscription("s-2", cuenta_id="acc-1", estado="activa"))
        ids = repo.list_active_account_ids()
        assert ids == ["acc-1"]

    def test_update_subscription(self) -> None:
        repo = InMemorySubscriptionRepository()
        sub = _make_subscription("s-1")
        repo.create(sub)
        sub.estado = "cancelada"
        repo.update(sub)
        updated = repo.get_by_id("s-1")
        assert updated is not None
        assert updated.estado == "cancelada"


# ─── Domain models ────────────────────────────────────────────────────────────

class TestDomainModels:
    def test_plan_fields(self) -> None:
        plan = _make_plan()
        assert plan.precio_base == Decimal("10.00")
        assert plan.moneda_base == "USD"
        assert plan.perfiles_maximos == 4
        assert plan.activo is True

    def test_subscription_fields(self) -> None:
        sub = _make_subscription()
        assert sub.estado == "activa"
        assert sub.fecha_fin is None

    def test_plan_inactive(self) -> None:
        plan = _make_plan(activo=False)
        assert plan.activo is False


# ─── SubscriptionService ─────────────────────────────────────────────────────

class TestSubscriptionServiceCreatePlan:
    def test_create_plan_success(self) -> None:
        svc = _build_service()
        req = CreatePlanRequest(
            nombre="Premium", descripcion="Plan premium",
            precio_base=Decimal("15.00"), moneda_base="USD", perfiles_maximos=4,
        )
        plan = svc.create_plan(req)
        assert plan.nombre == "Premium"
        assert plan.precio_base == Decimal("15.00")
        assert plan.activo is True

    def test_create_plan_appears_in_list(self) -> None:
        svc = _build_service()
        req = CreatePlanRequest(
            nombre="Basico", descripcion=None,
            precio_base=Decimal("5.00"), moneda_base="USD", perfiles_maximos=2,
        )
        created = svc.create_plan(req)
        plans = svc.list_active_plans()
        assert any(p.id == created.id for p in plans)

    def test_list_active_plans_empty(self) -> None:
        svc = _build_service()
        assert svc.list_active_plans() == []

    def test_get_plan_by_id_via_repo(self) -> None:
        plan_repo = InMemoryPlanRepository()
        svc = SubscriptionService(
            plan_repository=plan_repo,
            subscription_repository=InMemorySubscriptionRepository(),
            divisas_client=FakeDivisasClientOK(),
        )
        req = CreatePlanRequest(
            nombre="Medio", descripcion=None,
            precio_base=Decimal("8.00"), moneda_base="USD", perfiles_maximos=3,
        )
        created = svc.create_plan(req)
        found = plan_repo.get_by_id(created.id)
        assert found is not None and found.id == created.id

    def test_get_plan_not_found_returns_none(self) -> None:
        repo = InMemoryPlanRepository()
        assert repo.get_by_id("nonexistent-id") is None


class TestSubscriptionServicePlanQuote:
    def _setup(self, divisas=None) -> tuple[SubscriptionService, str]:
        svc = SubscriptionService(
            plan_repository=InMemoryPlanRepository(),
            subscription_repository=InMemorySubscriptionRepository(),
            divisas_client=divisas or FakeDivisasClientOK(),
        )
        req = CreatePlanRequest(
            nombre="Plan Cotización", descripcion=None,
            precio_base=Decimal("10.00"), moneda_base="USD", perfiles_maximos=4,
        )
        plan = svc.create_plan(req)
        return svc, plan.id

    def test_quote_with_conversion(self) -> None:
        svc, plan_id = self._setup()
        quote = svc.get_plan_quote(plan_id, "Mexico")
        assert quote.conversion_disponible is True
        assert quote.moneda_local == "MXN"
        assert quote.monto_local == Decimal("87.50")
        assert quote.tasa_cambio == Decimal("7.85")

    def test_quote_same_currency_no_conversion(self) -> None:
        svc, plan_id = self._setup()
        quote = svc.get_plan_quote(plan_id, "Estados Unidos")
        assert quote.moneda_local == "USD"
        assert quote.conversion_disponible is True
        assert quote.monto_local == Decimal("10.00")

    def test_quote_unknown_country(self) -> None:
        svc, plan_id = self._setup()
        quote = svc.get_plan_quote(plan_id, "PaisDesconocido")
        assert quote.conversion_disponible is False
        assert quote.moneda_local is None
        assert quote.monto_local is None

    def test_quote_divisas_client_fails(self) -> None:
        svc, plan_id = self._setup(divisas=FakeDivisasClientFail())
        quote = svc.get_plan_quote(plan_id, "Mexico")
        assert quote.conversion_disponible is False

    def test_quote_plan_not_found_raises(self) -> None:
        svc = _build_service()
        with pytest.raises(NotFoundError):
            svc.get_plan_quote("nonexistent", "Mexico")


class TestSubscriptionServiceSubscriptions:
    def _setup_with_plan(self) -> tuple[SubscriptionService, str]:
        svc = _build_service()
        req = CreatePlanRequest(
            nombre="Plan Test", descripcion=None,
            precio_base=Decimal("10.00"), moneda_base="USD", perfiles_maximos=4,
        )
        plan = svc.create_plan(req)
        return svc, plan.id

    def test_create_subscription_success(self) -> None:
        svc, plan_id = self._setup_with_plan()
        req = CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id)
        sub = svc.create_subscription(req)
        assert sub.cuenta_id == "acc-1"
        assert sub.plan_id == plan_id
        assert sub.estado == "activa"

    def test_create_subscription_plan_not_found_raises(self) -> None:
        svc = _build_service()
        req = CreateSubscriptionRequest(cuenta_id="acc-1", plan_id="missing-plan")
        with pytest.raises(NotFoundError):
            svc.create_subscription(req)

    def test_create_duplicate_subscription_raises_conflict(self) -> None:
        svc, plan_id = self._setup_with_plan()
        req = CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id)
        svc.create_subscription(req)
        with pytest.raises(ConflictError):
            svc.create_subscription(req)

    def test_get_subscription_by_account_with_active(self) -> None:
        svc, plan_id = self._setup_with_plan()
        svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        sub = svc.get_subscription_by_account("acc-1")
        assert sub.cuenta_id == "acc-1"
        assert sub.estado == "activa"

    def test_get_subscription_status_by_account_none(self) -> None:
        svc = _build_service()
        result = svc.get_subscription_status_by_account("acc-nobody")
        assert result is None

    def test_get_subscription_by_account_not_found_raises(self) -> None:
        svc = _build_service()
        with pytest.raises(NotFoundError):
            svc.get_subscription_by_account("acc-nobody")

    def test_cancel_subscription_by_id(self) -> None:
        svc, plan_id = self._setup_with_plan()
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        cancelled = svc.cancel_subscription(sub.id)
        assert cancelled.estado == "cancelada"
        assert cancelled.fecha_fin is not None

    def test_cancel_nonexistent_subscription_raises(self) -> None:
        svc = _build_service()
        with pytest.raises(NotFoundError):
            svc.cancel_subscription("sub-missing")

    def test_cancel_already_cancelled_raises_conflict(self) -> None:
        svc, plan_id = self._setup_with_plan()
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        svc.cancel_subscription(sub.id)
        with pytest.raises(ConflictError):
            svc.cancel_subscription(sub.id)

    def test_list_active_account_ids(self) -> None:
        svc, plan_id = self._setup_with_plan()
        svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-2", plan_id=plan_id))
        result = svc.list_active_account_ids()
        assert sorted(result) == ["acc-1", "acc-2"]

    def test_change_plan(self) -> None:
        plan_repo = InMemoryPlanRepository()
        sub_repo = InMemorySubscriptionRepository()
        svc = SubscriptionService(
            plan_repository=plan_repo,
            subscription_repository=sub_repo,
            divisas_client=FakeDivisasClientOK(),
        )
        now = _now()
        plan1 = plan_repo.create(Plan(
            id="p-1", nombre="Basico", descripcion=None,
            precio_base=Decimal("5.00"), moneda_base="USD",
            perfiles_maximos=2, activo=True, creado_en=now, actualizado_en=now,
        ))
        plan2 = plan_repo.create(Plan(
            id="p-2", nombre="Premium", descripcion=None,
            precio_base=Decimal("15.00"), moneda_base="USD",
            perfiles_maximos=4, activo=True, creado_en=now, actualizado_en=now,
        ))
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan1.id))
        updated = svc.change_subscription_plan(sub.id, ChangeSubscriptionPlanRequest(plan_id=plan2.id))
        assert updated.plan_id == plan2.id

    def test_change_plan_no_subscription_raises(self) -> None:
        svc = _build_service()
        with pytest.raises(NotFoundError):
            svc.change_subscription_plan("sub-missing", ChangeSubscriptionPlanRequest(plan_id="any"))

    def test_change_plan_to_nonexistent_raises(self) -> None:
        svc, plan_id = self._setup_with_plan()
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        with pytest.raises(NotFoundError):
            svc.change_subscription_plan(sub.id, ChangeSubscriptionPlanRequest(plan_id="missing"))

    def test_change_plan_same_plan_raises_conflict(self) -> None:
        svc, plan_id = self._setup_with_plan()
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        with pytest.raises(ConflictError):
            svc.change_subscription_plan(sub.id, ChangeSubscriptionPlanRequest(plan_id=plan_id))

    def test_get_subscription_by_id(self) -> None:
        svc, plan_id = self._setup_with_plan()
        sub = svc.create_subscription(CreateSubscriptionRequest(cuenta_id="acc-1", plan_id=plan_id))
        found = svc.get_subscription_by_id(sub.id)
        assert found.id == sub.id

    def test_get_subscription_by_id_not_found_raises(self) -> None:
        svc = _build_service()
        with pytest.raises(NotFoundError):
            svc.get_subscription_by_id("sub-missing")
