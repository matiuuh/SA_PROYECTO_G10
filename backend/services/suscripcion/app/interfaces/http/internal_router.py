from fastapi import APIRouter

from app.application.schemas import SubscriptionResponse, SubscriptionStatusResponse
from app.infrastructure.container import Container


def build_internal_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/internal", tags=["internal"])

    @router.get("/subscriptions/account/{cuenta_id}/status", response_model=SubscriptionStatusResponse)
    async def get_subscription_status_internal(cuenta_id: str) -> SubscriptionStatusResponse:
        subscription = container.subscription_service.get_subscription_status_by_account(cuenta_id)
        return SubscriptionStatusResponse(
            tiene_suscripcion=subscription is not None,
            suscripcion=SubscriptionResponse(**subscription.__dict__) if subscription is not None else None,
        )

    return router
