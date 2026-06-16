from datetime import datetime, timezone
from decimal import Decimal

from app.application.subscription_service import SubscriptionService
from app.domain.models import Plan
from app.infrastructure.repositories.in_memory_plan_repository import InMemoryPlanRepository
from app.infrastructure.repositories.in_memory_subscription_repository import (
    InMemorySubscriptionRepository,
)


class FakeDivisasClient:
    def convert_amount(self, monto: Decimal, moneda_origen: str, moneda_destino: str):
        return Decimal("87.50"), Decimal("7.85")


def test_get_plan_quote_returns_converted_amount_on_success() -> None:
    now = datetime.now(timezone.utc)
    plan_repository = InMemoryPlanRepository()
    plan = plan_repository.create(
        Plan(
            id="plan-1",
            nombre="Plan Premium",
            descripcion=None,
            precio_base=Decimal("10.00"),
            moneda_base="USD",
            perfiles_maximos=4,
            activo=True,
            creado_en=now,
            actualizado_en=now,
        )
    )
    service = SubscriptionService(
        plan_repository=plan_repository,
        subscription_repository=InMemorySubscriptionRepository(),
        divisas_client=FakeDivisasClient(),
    )

    quote = service.get_plan_quote(plan.id, "Mexico")

    assert quote.conversion_disponible is True
    assert quote.moneda_local == "MXN"
    assert quote.monto_local == Decimal("87.50")
    assert quote.tasa_cambio == Decimal("7.85")
