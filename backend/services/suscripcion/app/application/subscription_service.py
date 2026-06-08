from datetime import datetime, timezone
from uuid import uuid4

from app.application.repositories import PlanRepository, SubscriptionRepository
from app.application.schemas import CreatePlanRequest, CreateSubscriptionRequest
from app.domain.errors import ConflictError, NotFoundError
from app.domain.models import Plan, Subscription


class SubscriptionService:
    def __init__(
        self,
        plan_repository: PlanRepository,
        subscription_repository: SubscriptionRepository,
    ) -> None:
        self._plan_repository = plan_repository
        self._subscription_repository = subscription_repository

    def create_plan(self, request: CreatePlanRequest) -> Plan:
        now = datetime.now(timezone.utc)
        plan = Plan(
            id=str(uuid4()),
            nombre=request.nombre,
            descripcion=request.descripcion,
            precio_base=request.precio_base,
            moneda_base=request.moneda_base.upper(),
            perfiles_maximos=request.perfiles_maximos,
            activo=True,
            creado_en=now,
            actualizado_en=now,
        )
        return self._plan_repository.create(plan)

    def list_active_plans(self) -> list[Plan]:
        return self._plan_repository.list_active()

    def create_subscription(self, request: CreateSubscriptionRequest) -> Subscription:
        plan = self._plan_repository.get_by_id(request.plan_id)
        if plan is None or not plan.activo:
            raise NotFoundError("Plan no encontrado.")

        existing_subscription = self._subscription_repository.get_active_by_account_id(request.cuenta_id)
        if existing_subscription is not None:
            raise ConflictError("La cuenta ya tiene una suscripcion activa.")

        now = datetime.now(timezone.utc)
        subscription = Subscription(
            id=str(uuid4()),
            cuenta_id=request.cuenta_id,
            plan_id=request.plan_id,
            estado="activa",
            fecha_inicio=now,
            fecha_fin=None,
            creado_en=now,
            actualizado_en=now,
        )
        return self._subscription_repository.create(subscription)

    def get_subscription_by_account(self, account_id: str) -> Subscription:
        subscription = self._subscription_repository.get_active_by_account_id(account_id)
        if subscription is None:
            raise NotFoundError("No hay una suscripcion activa para esa cuenta.")
        return subscription

    def cancel_subscription(self, subscription_id: str) -> Subscription:
        subscription = self._subscription_repository.get_by_id(subscription_id)
        if subscription is None:
            raise NotFoundError("Suscripcion no encontrada.")

        subscription.estado = "cancelada"
        subscription.fecha_fin = datetime.now(timezone.utc)
        subscription.actualizado_en = subscription.fecha_fin
        return self._subscription_repository.update(subscription)
