from dataclasses import dataclass

import jwt as pyjwt
from fastapi import Depends, Header, HTTPException, status

from app.infrastructure.config.settings import get_settings


@dataclass
class TokenData:
    account_id: str
    role: str


def get_bearer_token(authorization: str = Header(...)) -> str:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Encabezado Authorization invalido.",
        )
    return token


def get_token_data(token: str = Depends(get_bearer_token)) -> TokenData:
    settings = get_settings()
    try:
        payload = pyjwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except pyjwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado.",
        )
    account_id = payload.get("sub")
    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido.",
        )
    return TokenData(account_id=account_id, role=payload.get("role", "usuario"))


def require_user(token_data: TokenData = Depends(get_token_data)) -> TokenData:
    """Cualquier usuario autenticado."""
    return token_data


def require_admin(token_data: TokenData = Depends(get_token_data)) -> TokenData:
    """Solo administradores."""
    if token_data.role != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol administrador.",
        )
    return token_data
