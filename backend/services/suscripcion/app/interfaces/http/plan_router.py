from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.schemas import CreatePlanRequest, PlanQuoteResponse, PlanResponse
from app.domain.errors import NotFoundError
from app.infrastructure.container import Container
from app.interfaces.http.deps import TokenData, require_admin


def build_plan_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/plans", tags=["plans"])

    # ── Públicas ──────────────────────────────────────────────────────────────

    @router.get("", response_model=list[PlanResponse])
    def list_active_plans() -> list[PlanResponse]:
        plans = container.subscription_service.list_active_plans()
        return [PlanResponse(**plan.__dict__) for plan in plans]

    @router.get("/{plan_id}/quote", response_model=PlanQuoteResponse)
    def get_plan_quote(
        plan_id: str, pais: str = Query(min_length=2, max_length=100)
    ) -> PlanQuoteResponse:
        try:
            return container.subscription_service.get_plan_quote(plan_id, pais)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    # ── Solo administrador ────────────────────────────────────────────────────

    @router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
    def create_plan(
        request: CreatePlanRequest,
        _: TokenData = Depends(require_admin),
    ) -> PlanResponse:
        plan = container.subscription_service.create_plan(request)
        return PlanResponse(**plan.__dict__)

    return router
