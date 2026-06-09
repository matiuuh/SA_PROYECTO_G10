from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    nombre: str = Field(min_length=3, max_length=150)
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)
    pais: str = Field(min_length=2, max_length=100)


class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)


class AccountResponse(BaseModel):
    id: str
    nombre: str
    correo: EmailStr
    pais: str
    rol: str
    creado_en: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    account: AccountResponse


class ProfileResponse(BaseModel):
    id: str
    cuenta_id: str
    nombre: str
    color: str
    es_principal: bool
    activo: bool
    creado_en: datetime
    actualizado_en: datetime


class CreateProfileRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    color: str = Field(default="#6D28D9", min_length=7, max_length=7)
    es_principal: bool = False


class UpdateProfileRequest(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, min_length=7, max_length=7)
    es_principal: bool | None = None


class SyncProfilesAvailabilityRequest(BaseModel):
    max_perfiles_activos: int = Field(ge=1, le=5)


class MessageResponse(BaseModel):
    message: str
