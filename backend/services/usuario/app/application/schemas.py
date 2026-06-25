from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    nombre: str = Field(min_length=3, max_length=150)
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)
    pais: str = Field(min_length=2, max_length=100)


class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=128)


class UpdateAccountRequest(BaseModel):
    nombre: str = Field(min_length=3, max_length=150)
    pais: str = Field(min_length=2, max_length=100)


class ChangePasswordRequest(BaseModel):
    contrasena_actual: str = Field(min_length=8, max_length=128)
    contrasena_nueva: str = Field(min_length=8, max_length=128)


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
    tiene_pin: bool = False
    control_parental: str | None = None
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


class SetProfilePinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("El PIN debe contener solo digitos.")
        return value


class SetControlParentalRequest(BaseModel):
    nivel: str | None = Field(default=None, min_length=1, max_length=20)

    @field_validator("nivel", mode="before")
    @classmethod
    def normalize_nivel(cls, value: str | None) -> str | None:
        if value is None or (isinstance(value, str) and value.strip() == ""):
            return None
        return value

    @field_validator("nivel")
    @classmethod
    def validate_nivel(cls, value: str | None) -> str | None:
        if value is not None and value not in ("TP", "PG-13", "R"):
            raise ValueError("El nivel debe ser TP, PG-13 o R.")
        return value


class VerifyProfilePinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("El PIN debe contener solo digitos.")
        return value


class VerifyProfilePinResponse(BaseModel):
    valido: bool


class ProfileRestrictionsResponse(BaseModel):
    tiene_pin: bool
    control_parental: str | None


class MessageResponse(BaseModel):
    message: str
