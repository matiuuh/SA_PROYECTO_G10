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


class MessageResponse(BaseModel):
    message: str
