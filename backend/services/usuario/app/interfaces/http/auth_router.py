from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.application.schemas import (
    AccountResponse,
    AuthResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
)
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.infrastructure.container import Container


def build_auth_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    def get_bearer_token(authorization: str = Header(...)) -> str:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Encabezado Authorization invalido.",
            )
        return token

    @router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
    def register(request: RegisterRequest) -> AuthResponse:
        try:
            result = container.auth_service.register(request)
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return AuthResponse(
            access_token=result.access_token,
            token_type=result.token_type,
            expires_at=result.expires_at,
            account=AccountResponse(**result.account.__dict__),
        )

    @router.post("/login", response_model=AuthResponse)
    def login(request: LoginRequest) -> AuthResponse:
        try:
            result = container.auth_service.login(request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        return AuthResponse(
            access_token=result.access_token,
            token_type=result.token_type,
            expires_at=result.expires_at,
            account=AccountResponse(**result.account.__dict__),
        )

    @router.get("/me", response_model=AccountResponse)
    def me(token: str = Depends(get_bearer_token)) -> AccountResponse:
        try:
            account = container.auth_service.get_current_account(token)
        except (AuthenticationError, NotFoundError) as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        return AccountResponse(**account.__dict__)

    @router.post("/logout", response_model=MessageResponse)
    def logout(token: str = Depends(get_bearer_token)) -> MessageResponse:
        try:
            container.auth_service.logout(token)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        return MessageResponse(message="Sesion cerrada correctamente.")

    return router
