from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from app.application.repositories import PlanRepository, SubscriptionRepository
from app.application.schemas import (
    ChangeSubscriptionPlanRequest,
    CreatePlanRequest,
    CreateSubscriptionRequest,
    PlanQuoteResponse,
)
from app.domain.errors import ConflictError, NotFoundError
from app.domain.models import Plan, Subscription
from app.infrastructure.currency_map import currency_from_country
from app.infrastructure.divisas_client import DivisasClient


class SubscriptionService:
    def __init__(
        self,
        plan_repository: PlanRepository,
        subscription_repository: SubscriptionRepository,
        divisas_client: DivisasClient,
    ) -> None:
        self._plan_repository = plan_repository
        self._subscription_repository = subscription_repository
        self._divisas_client = divisas_client

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

    def get_plan_quote(self, plan_id: str, country: str) -> PlanQuoteResponse:
        plan = self._plan_repository.get_by_id(plan_id)
        if plan is None or not plan.activo:
            raise NotFoundError("Plan no encontrado.")

        moneda_local = currency_from_country(country)
        precio_base = Decimal(plan.precio_base)

        if moneda_local is None:
            return PlanQuoteResponse(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                precio_base=precio_base,
                moneda_base=plan.moneda_base,
                moneda_local=None,
                monto_local=None,
                tasa_cambio=None,
                conversion_disponible=False,
                mensaje="No fue posible identificar la moneda local para la ubicacion registrada.",
            )

        if moneda_local == plan.moneda_base.upper():
            return PlanQuoteResponse(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                precio_base=precio_base,
                moneda_base=plan.moneda_base,
                moneda_local=moneda_local,
                monto_local=precio_base,
                tasa_cambio=Decimal("1"),
                conversion_disponible=True,
                mensaje="La moneda local coincide con la moneda base del plan.",
            )

        try:
            monto_local, tasa_cambio = self._divisas_client.convert_amount(
                monto=precio_base,
                moneda_origen=plan.moneda_base,
                moneda_destino=moneda_local,
            )
            return PlanQuoteResponse(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                precio_base=precio_base,
                moneda_base=plan.moneda_base,
                moneda_local=moneda_local,
                monto_local=monto_local,
                tasa_cambio=tasa_cambio,
                conversion_disponible=True,
                mensaje="Monto convertido correctamente.",
            )
        except Exception:
            return PlanQuoteResponse(
                plan_id=plan.id,
                nombre_plan=plan.nombre,
                precio_base=precio_base,
                moneda_base=plan.moneda_base,
                moneda_local=moneda_local,
                monto_local=None,
                tasa_cambio=None,
                conversion_disponible=False,
                mensaje="No fue posible convertir el precio en este momento. Se mostrara el valor base del plan.",
            )

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

    def get_subscription_by_id(self, subscription_id: str) -> Subscription:
        subscription = self._subscription_repository.get_by_id(subscription_id)
        if subscription is None:
            raise NotFoundError("Suscripcion no encontrada.")
        return subscription

    def get_subscription_status_by_account(self, account_id: str) -> Subscription | None:
        return self._subscription_repository.get_active_by_account_id(account_id)

    def list_active_account_ids(self) -> list[str]:
        return self._subscription_repository.list_active_account_ids()

    def change_subscription_plan(
        self, subscription_id: str, request: ChangeSubscriptionPlanRequest
    ) -> Subscription:
        subscription = self._subscription_repository.get_by_id(subscription_id)
        if subscription is None:
            raise NotFoundError("Suscripcion no encontrada.")

        if subscription.estado != "activa":
            raise ConflictError("Solo se puede modificar una suscripcion activa.")

        new_plan = self._plan_repository.get_by_id(request.plan_id)
        if new_plan is None or not new_plan.activo:
            raise NotFoundError("El nuevo plan no esta disponible.")

        if subscription.plan_id == request.plan_id:
            raise ConflictError("La suscripcion ya utiliza ese plan.")

        subscription.plan_id = request.plan_id
        subscription.actualizado_en = datetime.now(timezone.utc)
        return self._subscription_repository.update(subscription)

    def cancel_subscription(self, subscription_id: str) -> Subscription:
        subscription = self._subscription_repository.get_by_id(subscription_id)
        if subscription is None:
            raise NotFoundError("Suscripcion no encontrada.")

        if subscription.estado != "activa":
            raise ConflictError("Solo se puede cancelar una suscripcion activa.")

        subscription.estado = "cancelada"
        subscription.fecha_fin = datetime.now(timezone.utc)
        subscription.actualizado_en = subscription.fecha_fin
        return self._subscription_repository.update(subscription)
