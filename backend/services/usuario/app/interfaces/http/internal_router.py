from fastapi import APIRouter, HTTPException, status

from app.application.schemas import AccountResponse
from app.domain.errors import NotFoundError
from app.infrastructure.container import Container


def build_internal_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/internal", tags=["internal"])

    @router.get("/accounts/{account_id}", response_model=AccountResponse)
    async def get_account_by_id(account_id: str) -> AccountResponse:
        try:
            account = container.auth_service.get_account_by_id(account_id)
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return AccountResponse(**account.__dict__)

    return router
