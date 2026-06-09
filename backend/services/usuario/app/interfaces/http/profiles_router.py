from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.application.schemas import (
    CreateProfileRequest,
    MessageResponse,
    ProfileResponse,
    UpdateProfileRequest,
)
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.infrastructure.container import Container


def build_profiles_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/profiles", tags=["profiles"])

    def get_bearer_token(authorization: str = Header(...)) -> str:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Encabezado Authorization invalido.",
            )
        return token

    @router.get("", response_model=list[ProfileResponse])
    def list_profiles(token: str = Depends(get_bearer_token)) -> list[ProfileResponse]:
        try:
            profiles = container.auth_service.list_profiles(token)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        return [ProfileResponse(**profile.__dict__) for profile in profiles]

    @router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
    def create_profile(
        request: CreateProfileRequest,
        token: str = Depends(get_bearer_token),
    ) -> ProfileResponse:
        try:
            profile = container.auth_service.create_profile(token, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return ProfileResponse(**profile.__dict__)

    @router.patch("/{profile_id}", response_model=ProfileResponse)
    def update_profile(
        profile_id: str,
        request: UpdateProfileRequest,
        token: str = Depends(get_bearer_token),
    ) -> ProfileResponse:
        try:
            profile = container.auth_service.update_profile(token, profile_id, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return ProfileResponse(**profile.__dict__)

    @router.delete("/{profile_id}", response_model=MessageResponse)
    def delete_profile(profile_id: str, token: str = Depends(get_bearer_token)) -> MessageResponse:
        try:
            container.auth_service.delete_profile(token, profile_id)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return MessageResponse(message="Perfil eliminado correctamente.")

    return router
