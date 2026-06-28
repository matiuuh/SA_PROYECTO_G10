from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.application.schemas import (
    CreateProfileRequest,
    MessageResponse,
    ProfileResponse,
    ProfileRestrictionsResponse,
    SetControlParentalRequest,
    SetProfilePinRequest,
    SyncProfilesAvailabilityRequest,
    UpdateProfileRequest,
    VerifyProfilePinRequest,
    VerifyProfilePinResponse,
)
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.infrastructure.container import Container


def build_profiles_router(container: Container) -> APIRouter:
    router = APIRouter(prefix="/profiles", tags=["profiles"])

    async def get_bearer_token(authorization: str = Header(...)) -> str:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Encabezado Authorization invalido.",
            )
        return token

    def _to_profile_response(profile) -> ProfileResponse:
        data = profile.__dict__.copy()
        data["tiene_pin"] = data.pop("pin_restrictivo", None) is not None
        data.pop("pin_restrictivo", None)
        return ProfileResponse(**data)

    @router.get("", response_model=list[ProfileResponse])
    async def list_profiles(token: str = Depends(get_bearer_token)) -> list[ProfileResponse]:
        try:
            profiles = container.auth_service.list_profiles(token)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

        return [_to_profile_response(profile) for profile in profiles]

    @router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
    async def create_profile(
        request: CreateProfileRequest,
        token: str = Depends(get_bearer_token),
    ) -> ProfileResponse:
        try:
            profile = container.auth_service.create_profile(token, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return _to_profile_response(profile)

    @router.patch("/{profile_id}", response_model=ProfileResponse)
    async def update_profile(
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

        return _to_profile_response(profile)

    @router.post("/sync-availability", response_model=list[ProfileResponse])
    async def sync_profiles_availability(
        request: SyncProfilesAvailabilityRequest,
        token: str = Depends(get_bearer_token),
    ) -> list[ProfileResponse]:
        try:
            profiles = container.auth_service.sync_profiles_availability(token, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return [_to_profile_response(profile) for profile in profiles]

    @router.delete("/{profile_id}", response_model=MessageResponse)
    async def delete_profile(profile_id: str, token: str = Depends(get_bearer_token)) -> MessageResponse:
        try:
            container.auth_service.delete_profile(token, profile_id)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

        return MessageResponse(message="Perfil eliminado correctamente.")

    @router.put("/{profile_id}/pin", response_model=MessageResponse)
    async def set_profile_pin(
        profile_id: str,
        request: SetProfilePinRequest,
        token: str = Depends(get_bearer_token),
    ) -> MessageResponse:
        try:
            container.auth_service.set_profile_pin(token, profile_id, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return MessageResponse(message="PIN configurado correctamente.")

    @router.delete("/{profile_id}/pin", response_model=MessageResponse)
    async def remove_profile_pin(
        profile_id: str,
        token: str = Depends(get_bearer_token),
    ) -> MessageResponse:
        try:
            container.auth_service.remove_profile_pin(token, profile_id)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return MessageResponse(message="PIN eliminado correctamente.")

    @router.post("/{profile_id}/verify-pin", response_model=VerifyProfilePinResponse)
    async def verify_profile_pin(
        profile_id: str,
        request: VerifyProfilePinRequest,
    ) -> VerifyProfilePinResponse:
        try:
            valido = container.auth_service.verify_profile_pin(profile_id, request)
        except NotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado.")

        return VerifyProfilePinResponse(valido=valido)

    @router.put("/{profile_id}/control-parental", response_model=ProfileResponse)
    async def set_profile_control_parental(
        profile_id: str,
        request: SetControlParentalRequest,
        token: str = Depends(get_bearer_token),
    ) -> ProfileResponse:
        try:
            profile = container.auth_service.set_profile_control_parental(token, profile_id, request)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return _to_profile_response(profile)

    @router.get("/{profile_id}/restrictions", response_model=ProfileRestrictionsResponse)
    async def get_profile_restrictions(
        profile_id: str,
        token: str = Depends(get_bearer_token),
    ) -> ProfileRestrictionsResponse:
        try:
            profile = container.auth_service.get_profile_restrictions(token, profile_id)
        except AuthenticationError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        except NotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

        return ProfileRestrictionsResponse(
            tiene_pin=profile.pin_restrictivo is not None,
            control_parental=profile.control_parental,
        )

    return router
