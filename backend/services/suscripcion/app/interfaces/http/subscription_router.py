from fastapi import APIRouter, HTTPException, status

from app.application.schemas import (
    CreateSubscriptionRequest,
    MessageResponse,
    SubscriptionResponse,
    SubscriptionStatusResponse,
)
from app.domain.errors import ConflictError, NotFoundError
from app.infrastructure.container import Container


def build_subscription_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

    @router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
    def create_subscription(request: CreateSubscriptionRequest) -> SubscriptionResponse:
        try:
            subscription = container.subscription_service.create_subscription(request)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return SubscriptionResponse(**subscription.__dict__)

    @router.get("/account/{cuenta_id}", response_model=SubscriptionResponse)
    def get_subscription_by_account(cuenta_id: str) -> SubscriptionResponse:
        try:
            subscription = container.subscription_service.get_subscription_by_account(cuenta_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return SubscriptionResponse(**subscription.__dict__)

    @router.get("/account/{cuenta_id}/status", response_model=SubscriptionStatusResponse)
    def get_subscription_status_by_account(cuenta_id: str) -> SubscriptionStatusResponse:
        subscription = container.subscription_service.get_subscription_status_by_account(cuenta_id)

        return SubscriptionStatusResponse(
            tiene_suscripcion=subscription is not None,
            suscripcion=SubscriptionResponse(**subscription.__dict__) if subscription is not None else None,
        )

    @router.post("/{suscripcion_id}/cancel", response_model=MessageResponse)
    def cancel_subscription(suscripcion_id: str) -> MessageResponse:
        try:
            container.subscription_service.cancel_subscription(suscripcion_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return MessageResponse(message="Suscripcion cancelada correctamente.")

    return router
