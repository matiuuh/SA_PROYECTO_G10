from datetime import datetime, timezone

import jwt

from app.domain.errors import AuthenticationError


class JwtService:
    def __init__(self, secret: str, algorithm: str) -> None:
        self._secret = secret
        self._algorithm = algorithm

    def encode(self, payload: dict[str, str], expires_at: datetime) -> str:
        token_payload = {
            **payload,
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(token_payload, self._secret, algorithm=self._algorithm)

    def decode(self, token: str) -> dict[str, str]:
        try:
            payload = jwt.decode(token, self._secret, algorithms=[self._algorithm])
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Token invalido o expirado.") from exc
        return payload
