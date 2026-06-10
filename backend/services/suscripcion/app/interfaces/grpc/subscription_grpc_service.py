from datetime import datetime
from decimal import Decimal

import grpc

from app.application.subscription_service import SubscriptionService
from app.application.schemas import CreatePlanRequest, CreateSubscriptionRequest
from app.domain.errors import ConflictError, NotFoundError
from app.interfaces.grpc.generated.suscripcion.v1 import (
    suscripcion_pb2,
    suscripcion_pb2_grpc,
)


class SubscriptionGrpcService(suscripcion_pb2_grpc.SuscripcionServiceServicer):
    def __init__(self, subscription_service: SubscriptionService) -> None:
        self._subscription_service = subscription_service

    def ListPlans(self, request, context):
        plans = self._subscription_service.list_active_plans()
        return suscripcion_pb2.ListPlansResponse(
            plans=[self._to_plan_message(plan) for plan in plans]
        )

    def CreatePlan(self, request, context):
        plan = self._subscription_service.create_plan(
            CreatePlanRequest(
                nombre=request.nombre,
                descripcion=request.descripcion or None,
                precio_base=Decimal(request.precio_base),
                moneda_base=request.moneda_base,
                perfiles_maximos=request.perfiles_maximos,
            )
        )
        return self._to_plan_message(plan)

    def CreateSubscription(self, request, context):
        try:
            subscription = self._subscription_service.create_subscription(
                CreateSubscriptionRequest(
                    cuenta_id=request.cuenta_id,
                    plan_id=request.plan_id,
                )
            )
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))
        except ConflictError as exc:
            context.abort(grpc.StatusCode.ALREADY_EXISTS, str(exc))

        return self._to_subscription_message(subscription)

    def GetSubscriptionByAccount(self, request, context):
        try:
            subscription = self._subscription_service.get_subscription_by_account(request.cuenta_id)
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))

        return self._to_subscription_message(subscription)

    def CancelSubscription(self, request, context):
        try:
            self._subscription_service.cancel_subscription(request.suscripcion_id)
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))

        return suscripcion_pb2.CancelSubscriptionResponse(
            ok=True,
            message="Suscripcion cancelada correctamente.",
        )

    def _to_plan_message(self, plan):
        return suscripcion_pb2.Plan(
            id=plan.id,
            nombre=plan.nombre,
            descripcion=plan.descripcion or "",
            precio_base=str(plan.precio_base),
            moneda_base=plan.moneda_base,
            perfiles_maximos=plan.perfiles_maximos,
            activo=plan.activo,
            creado_en=self._to_iso(plan.creado_en),
            actualizado_en=self._to_iso(plan.actualizado_en),
        )

    def _to_subscription_message(self, subscription):
        return suscripcion_pb2.Subscription(
            id=subscription.id,
            cuenta_id=subscription.cuenta_id,
            plan_id=subscription.plan_id,
            estado=subscription.estado,
            fecha_inicio=self._to_iso(subscription.fecha_inicio),
            fecha_fin=self._to_iso(subscription.fecha_fin),
            creado_en=self._to_iso(subscription.creado_en),
            actualizado_en=self._to_iso(subscription.actualizado_en),
        )

    @staticmethod
    def _to_iso(value: datetime | None) -> str:
        return value.isoformat().replace("+00:00", "Z") if value else ""
