from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.application.repositories import (
    AccountRepository,
    ProfileRepository,
    SessionRepository,
)
from app.application.schemas import (
    ChangePasswordRequest,
    CreateProfileRequest,
    LoginRequest,
    RegisterRequest,
    SyncProfilesAvailabilityRequest,
    UpdateAccountRequest,
    UpdateProfileRequest,
)
from app.domain.errors import AuthenticationError, ConflictError, NotFoundError
from app.domain.models import Account, AuthTokens, Profile, Session
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.password_hasher import PasswordHasher


class AuthService:
    def __init__(
        self,
        account_repository: AccountRepository,
        profile_repository: ProfileRepository,
        session_repository: SessionRepository,
        password_hasher: PasswordHasher,
        jwt_service: JwtService,
        jwt_expire_minutes: int,
    ) -> None:
        self._account_repository = account_repository
        self._profile_repository = profile_repository
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
        self._create_default_profile(account)

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

    def validate_token(self, token: str) -> tuple[Account, str]:
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

        return account, session_id

    def get_account_by_id(self, account_id: str) -> Account:
        account = self._account_repository.get_by_id(account_id)
        if account is None:
            raise NotFoundError("Cuenta no encontrada.")
        return account

    def get_account_by_email(self, email: str) -> Account:
        account = self._account_repository.get_by_email(email)
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

    def update_current_account(self, token: str, request: UpdateAccountRequest) -> Account:
        account = self.get_current_account(token)
        account.nombre = request.nombre.strip()
        account.pais = request.pais.strip()
        self._account_repository.update(account)
        return account

    def change_password(self, token: str, request: ChangePasswordRequest) -> None:
        account = self.get_current_account(token)

        if not self._password_hasher.verify(request.contrasena_actual, account.contrasena_hash):
            raise AuthenticationError("La contrasena actual es incorrecta.")

        if request.contrasena_actual == request.contrasena_nueva:
            raise ConflictError("La nueva contrasena debe ser diferente a la actual.")

        account.contrasena_hash = self._password_hasher.hash(request.contrasena_nueva)
        self._account_repository.update(account)

    def list_profiles(self, token: str) -> list[Profile]:
        account = self.get_current_account(token)
        return self._profile_repository.list_by_account_id(account.id)

    def create_profile(self, token: str, request: CreateProfileRequest) -> Profile:
        account = self.get_current_account(token)
        profile_count = self._profile_repository.count_by_account_id(account.id)
        if profile_count >= 5:
            raise ConflictError("La cuenta ya alcanzo el maximo de 5 perfiles.")

        existing_profile = self._profile_repository.get_by_name(account.id, request.nombre)
        if existing_profile is not None:
            raise ConflictError("Ya existe un perfil con ese nombre.")

        now = datetime.now(timezone.utc)
        profile = Profile(
            id=str(uuid4()),
            cuenta_id=account.id,
            nombre=request.nombre.strip(),
            color=request.color,
            es_principal=request.es_principal or profile_count == 0,
            activo=True,
            creado_en=now,
            actualizado_en=now,
        )
        self._profile_repository.create(profile)
        return profile

    def update_profile(self, token: str, profile_id: str, request: UpdateProfileRequest) -> Profile:
        account = self.get_current_account(token)
        profile = self._profile_repository.get_by_id(profile_id)
        if profile is None or profile.cuenta_id != account.id:
            raise NotFoundError("Perfil no encontrado.")

        if request.nombre is not None:
            normalized_name = request.nombre.strip()
            existing_profile = self._profile_repository.get_by_name(account.id, normalized_name)
            if existing_profile is not None and existing_profile.id != profile.id:
                raise ConflictError("Ya existe un perfil con ese nombre.")
            profile.nombre = normalized_name

        if request.color is not None:
            profile.color = request.color

        if request.es_principal is not None:
            if request.es_principal is False and profile.es_principal:
                raise ConflictError(
                    "No puedes quitar el perfil principal directamente. Asigna otro perfil como principal."
                )
            profile.es_principal = request.es_principal

        profile.actualizado_en = datetime.now(timezone.utc)
        self._profile_repository.update(profile)
        return profile

    def delete_profile(self, token: str, profile_id: str) -> None:
        account = self.get_current_account(token)
        profiles = self._profile_repository.list_by_account_id(account.id)
        profile = next((item for item in profiles if item.id == profile_id), None)
        if profile is None:
            raise NotFoundError("Perfil no encontrado.")

        if profile.es_principal:
            raise ConflictError("El perfil principal no puede eliminarse.")

        if len(profiles) == 1:
            raise ConflictError("La cuenta debe conservar al menos un perfil.")

        self._profile_repository.delete(profile_id)

    def sync_profiles_availability(
        self, token: str, request: SyncProfilesAvailabilityRequest
    ) -> list[Profile]:
        account = self.get_current_account(token)
        profiles = self._profile_repository.list_by_account_id(account.id)
        if not profiles:
            raise NotFoundError("No hay perfiles registrados para esta cuenta.")

        allowed_active_profiles = max(1, request.max_perfiles_activos)
        ordered_profiles = sorted(
            profiles,
            key=lambda item: (
                0 if item.es_principal else 1,
                item.creado_en,
            ),
        )

        active_ids: set[str] = set()
        for profile in ordered_profiles:
            if len(active_ids) >= allowed_active_profiles:
                break
            active_ids.add(profile.id)

        for profile in ordered_profiles:
            should_be_active = profile.id in active_ids
            if profile.activo == should_be_active:
                continue
            profile.activo = should_be_active
            profile.actualizado_en = datetime.now(timezone.utc)
            self._profile_repository.update(profile)

        return self._profile_repository.list_by_account_id(account.id)

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

    def _create_default_profile(self, account: Account) -> None:
        now = datetime.now(timezone.utc)
        default_name = account.nombre.strip() or "Perfil"
        profile = Profile(
            id=str(uuid4()),
            cuenta_id=account.id,
            nombre=default_name[:80],
            color="#6D28D9",
            es_principal=True,
            activo=True,
            creado_en=now,
            actualizado_en=now,
        )
        self._profile_repository.create(profile)
