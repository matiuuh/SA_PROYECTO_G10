from fastapi import APIRouter, Depends, HTTPException, status

from app.application.schemas import (
    ActiveSubscriptionAccountsResponse,
    ChangeSubscriptionPlanRequest,
    CreateSubscriptionRequest,
    MessageResponse,
    SubscriptionResponse,
    SubscriptionStatusResponse,
)
from app.domain.errors import ConflictError, NotFoundError
from app.infrastructure.container import Container
from app.interfaces.http.deps import TokenData, require_admin, require_user


USER_ROLE = "usuario"


def is_user_role(role: str) -> bool:
    return role.strip().lower() == USER_ROLE


def ensure_subscription_owner(
    container: Container,
    subscription_id: str,
    token: TokenData,
) -> None:
    if not is_user_role(token.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo las cuentas de usuario pueden gestionar suscripciones.",
        )

    try:
        subscription = container.subscription_service.get_subscription_by_id(subscription_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if subscription.cuenta_id != token.account_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta suscripcion.",
        )


def build_subscription_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

    # ── Usuario autenticado ───────────────────────────────────────────────────

    @router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
    async def create_subscription(
        request: CreateSubscriptionRequest,
        token: TokenData = Depends(require_user),
    ) -> SubscriptionResponse:
        # El usuario solo puede crear suscripción para su propia cuenta
        if not is_user_role(token.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo las cuentas de usuario pueden contratar planes.",
            )
        if request.cuenta_id != token.account_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes crear una suscripcion para otra cuenta.",
            )
        try:
            subscription = container.subscription_service.create_subscription(request)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return SubscriptionResponse(**subscription.__dict__)

    @router.get("/account/{cuenta_id}", response_model=SubscriptionResponse)
    async def get_subscription_by_account(
        cuenta_id: str,
        token: TokenData = Depends(require_user),
    ) -> SubscriptionResponse:
        # Usuario ve solo la suya; admin ve cualquiera
        if token.role != "administrador" and token.account_id != cuenta_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta suscripcion.",
            )
        try:
            subscription = container.subscription_service.get_subscription_by_account(cuenta_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return SubscriptionResponse(**subscription.__dict__)

    @router.get("/account/{cuenta_id}/status", response_model=SubscriptionStatusResponse)
    async def get_subscription_status_by_account(
        cuenta_id: str,
        token: TokenData = Depends(require_user),
    ) -> SubscriptionStatusResponse:
        # Usuario ve solo la suya; admin ve cualquiera
        if token.role != "administrador" and token.account_id != cuenta_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver esta suscripcion.",
            )
        subscription = container.subscription_service.get_subscription_status_by_account(cuenta_id)

        return SubscriptionStatusResponse(
            tiene_suscripcion=subscription is not None,
            suscripcion=SubscriptionResponse(**subscription.__dict__) if subscription is not None else None,
        )

    @router.put("/{suscripcion_id}/plan", response_model=SubscriptionResponse)
    async def change_subscription_plan(
        suscripcion_id: str,
        request: ChangeSubscriptionPlanRequest,
        token: TokenData = Depends(require_user),
    ) -> SubscriptionResponse:
        ensure_subscription_owner(container, suscripcion_id, token)
        try:
            subscription = container.subscription_service.change_subscription_plan(
                suscripcion_id, request
            )
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return SubscriptionResponse(**subscription.__dict__)

    @router.post("/{suscripcion_id}/cancel", response_model=MessageResponse)
    async def cancel_subscription(
        suscripcion_id: str,
        token: TokenData = Depends(require_user),
    ) -> MessageResponse:
        ensure_subscription_owner(container, suscripcion_id, token)
        try:
            container.subscription_service.cancel_subscription(suscripcion_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return MessageResponse(message="Suscripcion cancelada correctamente.")

    # ── Solo administrador ────────────────────────────────────────────────────

    @router.get("/active/accounts", response_model=ActiveSubscriptionAccountsResponse)
    async def list_active_subscription_accounts(
        _: TokenData = Depends(require_admin),
    ) -> ActiveSubscriptionAccountsResponse:
        return ActiveSubscriptionAccountsResponse(
            cuenta_ids=container.subscription_service.list_active_account_ids()
        )

    return router
