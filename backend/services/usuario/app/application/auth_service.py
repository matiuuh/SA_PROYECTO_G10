from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.application.repositories import AccountRepository, SessionRepository
from app.application.schemas import LoginRequest, RegisterRequest
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.domain.models import Account, AuthTokens, Session
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.password_hasher import PasswordHasher


class AuthService:
    def __init__(
        self,
        account_repository: AccountRepository,
        session_repository: SessionRepository,
        password_hasher: PasswordHasher,
        jwt_service: JwtService,
        jwt_expire_minutes: int,
    ) -> None:
        self._account_repository = account_repository
        self._session_repository = session_repository
        self._password_hasher = password_hasher
        self._jwt_service = jwt_service
        self._jwt_expire_minutes = jwt_expire_minutes

    def register(self, request: RegisterRequest) -> AuthTokens:
        existing_account = self._account_repository.get_by_email(request.correo)
        if existing_account is not None:
            raise ConflictError("Ya existe una cuenta con ese correo.")

        account = Account(
            id=str(uuid4()),
            nombre=request.nombre,
            correo=request.correo,
            contrasena_hash=self._password_hasher.hash(request.contrasena),
            pais=request.pais,
            rol="usuario",
            creado_en=datetime.now(timezone.utc),
        )
        self._account_repository.create(account)

        return self._issue_session(account)

    def login(self, request: LoginRequest) -> AuthTokens:
        account = self._account_repository.get_by_email(request.correo)
        if account is None:
            raise AuthenticationError("Credenciales invalidas.")

        if not self._password_hasher.verify(request.contrasena, account.contrasena_hash):
            raise AuthenticationError("Credenciales invalidas.")

        return self._issue_session(account)

    def get_current_account(self, token: str) -> Account:
        payload = self._jwt_service.decode(token)
        session_id = payload.get("sid")
        account_id = payload.get("sub")
        if session_id is None or account_id is None:
            raise AuthenticationError("Token invalido.")

        session = self._session_repository.get_by_id(session_id)
        if session is None or session.cerrada_en is not None:
            raise AuthenticationError("La sesion ya no esta activa.")

        account = self._account_repository.get_by_id(account_id)
        if account is None:
            raise NotFoundError("Cuenta no encontrada.")

        return account

    def logout(self, token: str) -> None:
        payload = self._jwt_service.decode(token)
        session_id = payload.get("sid")
        if session_id is None:
            raise AuthenticationError("Token invalido.")

        session = self._session_repository.get_by_id(session_id)
        if session is None:
            raise AuthenticationError("Sesion no encontrada.")

        session.cerrada_en = datetime.now(timezone.utc)
        self._session_repository.update(session)

    def _issue_session(self, account: Account) -> AuthTokens:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=self._jwt_expire_minutes)

        session = Session(
            id=str(uuid4()),
            cuenta_id=account.id,
            metodo="credenciales",
            iniciada_en=now,
            expira_en=expires_at,
            cerrada_en=None,
        )
        self._session_repository.create(session)

        access_token = self._jwt_service.encode(
            {
                "sub": account.id,
                "sid": session.id,
                "email": account.correo,
                "role": account.rol,
            },
            expires_at=expires_at,
        )

        return AuthTokens(
            access_token=access_token,
            token_type="bearer",
            expires_at=expires_at,
            account=account,
        )
