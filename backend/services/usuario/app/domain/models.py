from dataclasses import dataclass
from datetime import datetime


@dataclass
class Account:
    id: str
    nombre: str
    correo: str
    contrasena_hash: str
    pais: str
    rol: str
    creado_en: datetime


@dataclass
class Session:
    id: str
    cuenta_id: str
    metodo: str
    iniciada_en: datetime
    expira_en: datetime
    cerrada_en: datetime | None


@dataclass
class AuthTokens:
    access_token: str
    token_type: str
    expires_at: datetime
    account: Account
