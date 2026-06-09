from fastapi import APIRouter, HTTPException, status

from app.application.schemas import CreatePlanRequest, PlanResponse
from app.infrastructure.container import Container


def build_plan_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/plans", tags=["plans"])

    @router.get("", response_model=list[PlanResponse])
    def list_active_plans() -> list[PlanResponse]:
        plans = container.subscription_service.list_active_plans()
        return [PlanResponse(**plan.__dict__) for plan in plans]

    @router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
    def create_plan(request: CreatePlanRequest) -> PlanResponse:
        plan = container.subscription_service.create_plan(request)
        return PlanResponse(**plan.__dict__)

    return router
