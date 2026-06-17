"""Tests unitarios del dominio del servicio usuario — sin DB ni red."""
import pytest
from datetime import datetime, timezone

from app.domain.errors import AuthenticationError, ConflictError, DomainError, NotFoundError
from app.domain.models import Account, AuthTokens, Profile, Session
from app.infrastructure.security.password_hasher import PasswordHasher
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.repositories.in_memory_account_repository import InMemoryAccountRepository
from app.infrastructure.repositories.in_memory_profile_repository import InMemoryProfileRepository
from app.infrastructure.repositories.in_memory_session_repository import InMemorySessionRepository


# ─── Errores de dominio ───────────────────────────────────────────────────────

class TestDomainErrors:
    def test_conflict_error_is_domain_error(self) -> None:
        err = ConflictError("conflicto")
        assert isinstance(err, DomainError)
        assert str(err) == "conflicto"

    def test_authentication_error_is_domain_error(self) -> None:
        err = AuthenticationError("no autorizado")
        assert isinstance(err, DomainError)
        assert str(err) == "no autorizado"

    def test_not_found_error_is_domain_error(self) -> None:
        err = NotFoundError("no encontrado")
        assert isinstance(err, DomainError)
        assert str(err) == "no encontrado"

    def test_errors_are_exceptions(self) -> None:
        with pytest.raises(ConflictError):
            raise ConflictError("test")

    def test_not_found_is_exception(self) -> None:
        with pytest.raises(NotFoundError):
            raise NotFoundError("test")

    def test_authentication_error_is_exception(self) -> None:
        with pytest.raises(AuthenticationError):
            raise AuthenticationError("test")


# ─── Modelos de dominio ───────────────────────────────────────────────────────

class TestAccountModel:
    def test_account_fields(self) -> None:
        now = datetime.now(timezone.utc)
        account = Account(
            id="acc-1",
            nombre="Test User",
            correo="test@example.com",
            contrasena_hash="hash123",
            pais="Guatemala",
            rol="usuario",
            creado_en=now,
        )
        assert account.id == "acc-1"
        assert account.correo == "test@example.com"
        assert account.rol == "usuario"
        assert account.pais == "Guatemala"

    def test_account_rol_admin(self) -> None:
        now = datetime.now(timezone.utc)
        admin = Account(
            id="admin-1", nombre="Admin", correo="admin@example.com",
            contrasena_hash="hash", pais="Guatemala", rol="admin", creado_en=now,
        )
        assert admin.rol == "admin"


class TestProfileModel:
    def test_profile_fields(self) -> None:
        now = datetime.now(timezone.utc)
        profile = Profile(
            id="p-1", cuenta_id="acc-1", nombre="Principal",
            color="#6D28D9", es_principal=True, activo=True,
            creado_en=now, actualizado_en=now,
        )
        assert profile.es_principal is True
        assert profile.activo is True
        assert profile.color == "#6D28D9"

    def test_profile_not_principal(self) -> None:
        now = datetime.now(timezone.utc)
        profile = Profile(
            id="p-2", cuenta_id="acc-1", nombre="Secundario",
            color="#000000", es_principal=False, activo=True,
            creado_en=now, actualizado_en=now,
        )
        assert profile.es_principal is False


class TestSessionModel:
    def test_session_fields(self) -> None:
        now = datetime.now(timezone.utc)
        session = Session(
            id="s-1", cuenta_id="acc-1", metodo="credenciales",
            iniciada_en=now, expira_en=now, cerrada_en=None,
        )
        assert session.cerrada_en is None
        assert session.metodo == "credenciales"

    def test_session_cerrada(self) -> None:
        now = datetime.now(timezone.utc)
        session = Session(
            id="s-2", cuenta_id="acc-1", metodo="credenciales",
            iniciada_en=now, expira_en=now, cerrada_en=now,
        )
        assert session.cerrada_en is not None


# ─── PasswordHasher ───────────────────────────────────────────────────────────

class TestPasswordHasher:
    def setup_method(self) -> None:
        self.hasher = PasswordHasher()

    def test_hash_returns_string(self) -> None:
        h = self.hasher.hash("mi_contrasena")
        assert isinstance(h, str)

    def test_hash_has_pbkdf2_prefix(self) -> None:
        h = self.hasher.hash("password123")
        assert h.startswith("pbkdf2_sha256$")

    def test_hash_has_four_parts(self) -> None:
        h = self.hasher.hash("password")
        parts = h.split("$")
        assert len(parts) == 4

    def test_verify_correct_password(self) -> None:
        raw = "supersegura123"
        h = self.hasher.hash(raw)
        assert self.hasher.verify(raw, h) is True

    def test_verify_wrong_password(self) -> None:
        h = self.hasher.hash("original")
        assert self.hasher.verify("diferente", h) is False

    def test_hash_is_different_each_time(self) -> None:
        h1 = self.hasher.hash("same_password")
        h2 = self.hasher.hash("same_password")
        assert h1 != h2  # different salts

    def test_verify_both_hashes(self) -> None:
        raw = "contrasena_fuerte"
        h1 = self.hasher.hash(raw)
        h2 = self.hasher.hash(raw)
        assert self.hasher.verify(raw, h1) is True
        assert self.hasher.verify(raw, h2) is True

    def test_verify_empty_password(self) -> None:
        h = self.hasher.hash("")
        assert self.hasher.verify("", h) is True
        assert self.hasher.verify("notempty", h) is False


# ─── JwtService ───────────────────────────────────────────────────────────────

class TestJwtService:
    def setup_method(self) -> None:
        self.jwt = JwtService(secret="test-secret-key", algorithm="HS256")

    def test_encode_returns_string(self) -> None:
        from datetime import timedelta
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = self.jwt.encode({"sub": "user-1", "email": "u@example.com"}, expires_at=expires)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_valid_token(self) -> None:
        from datetime import timedelta
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"sub": "user-1", "sid": "session-1"}
        token = self.jwt.encode(payload, expires_at=expires)
        decoded = self.jwt.decode(token)
        assert decoded["sub"] == "user-1"
        assert decoded["sid"] == "session-1"

    def test_decode_expired_token_raises(self) -> None:
        from datetime import timedelta
        expires = datetime.now(timezone.utc) - timedelta(seconds=1)
        token = self.jwt.encode({"sub": "user-1"}, expires_at=expires)
        with pytest.raises(AuthenticationError):
            self.jwt.decode(token)

    def test_decode_invalid_token_raises(self) -> None:
        with pytest.raises(AuthenticationError):
            self.jwt.decode("not.a.valid.jwt")

    def test_decode_tampered_token_raises(self) -> None:
        from datetime import timedelta
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = self.jwt.encode({"sub": "user-1"}, expires_at=expires)
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(AuthenticationError):
            self.jwt.decode(tampered)

    def test_wrong_secret_raises(self) -> None:
        from datetime import timedelta
        other_jwt = JwtService(secret="other-secret", algorithm="HS256")
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        token = other_jwt.encode({"sub": "user-1"}, expires_at=expires)
        with pytest.raises(AuthenticationError):
            self.jwt.decode(token)


# ─── InMemoryProfileRepository ────────────────────────────────────────────────

class TestInMemoryProfileRepository:
    def _make_profile(self, pid: str, account_id: str = "acc-1",
                      nombre: str = "Perfil", es_principal: bool = False,
                      activo: bool = True) -> Profile:
        now = datetime.now(timezone.utc)
        return Profile(
            id=pid, cuenta_id=account_id, nombre=nombre,
            color="#000", es_principal=es_principal, activo=activo,
            creado_en=now, actualizado_en=now,
        )

    def test_create_and_list(self) -> None:
        repo = InMemoryProfileRepository()
        p = self._make_profile("p-1", es_principal=True)
        repo.create(p)
        profiles = repo.list_by_account_id("acc-1")
        assert len(profiles) == 1
        assert profiles[0].id == "p-1"

    def test_only_one_principal_after_create(self) -> None:
        repo = InMemoryProfileRepository()
        p1 = self._make_profile("p-1", es_principal=True)
        p2 = self._make_profile("p-2", es_principal=True)
        repo.create(p1)
        repo.create(p2)
        profiles = repo.list_by_account_id("acc-1")
        principals = [pr for pr in profiles if pr.es_principal]
        assert len(principals) == 1
        assert principals[0].id == "p-2"

    def test_get_by_id(self) -> None:
        repo = InMemoryProfileRepository()
        p = self._make_profile("p-1")
        repo.create(p)
        assert repo.get_by_id("p-1") is not None
        assert repo.get_by_id("missing") is None

    def test_get_by_name_case_insensitive(self) -> None:
        repo = InMemoryProfileRepository()
        p = self._make_profile("p-1", nombre="Mi Perfil")
        repo.create(p)
        assert repo.get_by_name("acc-1", "mi perfil") is not None
        assert repo.get_by_name("acc-1", "MI PERFIL") is not None
        assert repo.get_by_name("acc-1", "otro") is None

    def test_count_by_account_id(self) -> None:
        repo = InMemoryProfileRepository()
        repo.create(self._make_profile("p-1"))
        repo.create(self._make_profile("p-2"))
        assert repo.count_by_account_id("acc-1") == 2
        assert repo.count_by_account_id("other") == 0

    def test_delete_promotes_next_profile_if_principal(self) -> None:
        repo = InMemoryProfileRepository()
        p1 = self._make_profile("p-1", es_principal=True)
        p2 = self._make_profile("p-2", es_principal=False)
        repo.create(p1)
        repo.create(p2)
        repo.delete("p-1")
        remaining = repo.list_by_account_id("acc-1")
        assert len(remaining) == 1
        assert remaining[0].es_principal is True

    def test_delete_non_principal_does_not_promote(self) -> None:
        repo = InMemoryProfileRepository()
        p1 = self._make_profile("p-1", es_principal=True)
        p2 = self._make_profile("p-2", es_principal=False)
        repo.create(p1)
        repo.create(p2)
        repo.delete("p-2")
        remaining = repo.list_by_account_id("acc-1")
        assert len(remaining) == 1
        assert remaining[0].id == "p-1"
        assert remaining[0].es_principal is True

    def test_delete_missing_profile_is_noop(self) -> None:
        repo = InMemoryProfileRepository()
        repo.delete("nonexistent")  # should not raise

    def test_update_profile(self) -> None:
        repo = InMemoryProfileRepository()
        p = self._make_profile("p-1", nombre="Antes")
        repo.create(p)
        p.nombre = "Despues"
        repo.update(p)
        updated = repo.get_by_id("p-1")
        assert updated is not None
        assert updated.nombre == "Despues"


# ─── InMemoryAccountRepository ────────────────────────────────────────────────

class TestInMemoryAccountRepository:
    def _make_account(self, aid: str, correo: str = "test@example.com") -> Account:
        return Account(
            id=aid, nombre="Test", correo=correo, contrasena_hash="hash",
            pais="Guatemala", rol="usuario", creado_en=datetime.now(timezone.utc),
        )

    def test_create_and_get_by_id(self) -> None:
        repo = InMemoryAccountRepository()
        acc = self._make_account("a-1")
        repo.create(acc)
        found = repo.get_by_id("a-1")
        assert found is not None
        assert found.id == "a-1"

    def test_get_by_id_missing_returns_none(self) -> None:
        repo = InMemoryAccountRepository()
        assert repo.get_by_id("missing") is None

    def test_get_by_email(self) -> None:
        repo = InMemoryAccountRepository()
        acc = self._make_account("a-1", correo="user@example.com")
        repo.create(acc)
        found = repo.get_by_email("user@example.com")
        assert found is not None
        assert found.correo == "user@example.com"

    def test_get_by_email_missing_returns_none(self) -> None:
        repo = InMemoryAccountRepository()
        assert repo.get_by_email("nobody@example.com") is None

    def test_update_account(self) -> None:
        repo = InMemoryAccountRepository()
        acc = self._make_account("a-1")
        repo.create(acc)
        acc.nombre = "Updated"
        repo.update(acc)
        updated = repo.get_by_id("a-1")
        assert updated is not None
        assert updated.nombre == "Updated"


# ─── InMemorySessionRepository ────────────────────────────────────────────────

class TestInMemorySessionRepository:
    def _make_session(self, sid: str, account_id: str = "acc-1") -> Session:
        now = datetime.now(timezone.utc)
        return Session(
            id=sid, cuenta_id=account_id, metodo="credenciales",
            iniciada_en=now, expira_en=now, cerrada_en=None,
        )

    def test_create_and_get_by_id(self) -> None:
        repo = InMemorySessionRepository()
        s = self._make_session("s-1")
        repo.create(s)
        found = repo.get_by_id("s-1")
        assert found is not None
        assert found.id == "s-1"

    def test_get_by_id_missing_returns_none(self) -> None:
        repo = InMemorySessionRepository()
        assert repo.get_by_id("missing") is None

    def test_update_session(self) -> None:
        repo = InMemorySessionRepository()
        s = self._make_session("s-1")
        repo.create(s)
        now = datetime.now(timezone.utc)
        s.cerrada_en = now
        repo.update(s)
        updated = repo.get_by_id("s-1")
        assert updated is not None
        assert updated.cerrada_en is not None


# ─── AuthService (in-memory) ──────────────────────────────────────────────────

class TestAuthServiceInMemory:
    def _build_service(self):
        from app.application.auth_service import AuthService
        account_repo = InMemoryAccountRepository()
        profile_repo = InMemoryProfileRepository()
        session_repo = InMemorySessionRepository()
        hasher = PasswordHasher()
        jwt_svc = JwtService(secret="test-secret", algorithm="HS256")
        return AuthService(
            account_repository=account_repo,
            profile_repository=profile_repo,
            session_repository=session_repo,
            password_hasher=hasher,
            jwt_service=jwt_svc,
            jwt_expire_minutes=60,
        )

    def test_register_creates_account_and_returns_token(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Ana", correo="ana@example.com",
            contrasena="pass1234", pais="Guatemala",
        ))
        assert tokens.access_token != ""
        assert tokens.token_type == "bearer"

    def test_register_duplicate_email_raises_conflict(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        req = RegisterRequest(nombre="Ana", correo="dup@example.com",
                              contrasena="pass1234", pais="Guatemala")
        svc.register(req)
        with pytest.raises(ConflictError):
            svc.register(req)

    def test_login_valid_credentials(self) -> None:
        from app.application.schemas import RegisterRequest, LoginRequest
        svc = self._build_service()
        svc.register(RegisterRequest(
            nombre="Bob", correo="bob@example.com",
            contrasena="mypassword", pais="Honduras",
        ))
        tokens = svc.login(LoginRequest(correo="bob@example.com", contrasena="mypassword"))  # noqa
        assert tokens.access_token != ""

    def test_login_wrong_password_raises(self) -> None:
        from app.application.schemas import RegisterRequest, LoginRequest
        svc = self._build_service()
        svc.register(RegisterRequest(
            nombre="Bob", correo="bob2@example.com",
            contrasena="correct12", pais="Honduras",
        ))
        with pytest.raises(AuthenticationError):
            svc.login(LoginRequest(correo="bob2@example.com", contrasena="wrongpwd"))

    def test_login_unknown_email_raises(self) -> None:
        from app.application.schemas import LoginRequest
        svc = self._build_service()
        with pytest.raises(AuthenticationError):
            svc.login(LoginRequest(correo="nobody@example.com", contrasena="pass1234"))

    def test_get_current_account_from_token(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Carlos", correo="carlos@example.com",
            contrasena="pass1234", pais="Mexico",
        ))
        account = svc.get_current_account(tokens.access_token)
        assert account.correo == "carlos@example.com"

    def test_logout_invalidates_session(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Diana", correo="diana@example.com",
            contrasena="pass1234", pais="Mexico",
        ))
        svc.logout(tokens.access_token)
        with pytest.raises(AuthenticationError):
            svc.get_current_account(tokens.access_token)

    def test_create_profile(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Eva", correo="eva@example.com",
            contrasena="pass1234", pais="Colombia",
        ))
        profile = svc.create_profile(
            tokens.access_token,
            CreateProfileRequest(nombre="Invitado", color="#FF0000", es_principal=False),
        )
        assert profile.nombre == "Invitado"

    def test_create_duplicate_profile_name_raises(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Eva2", correo="eva2@example.com",
            contrasena="pass1234", pais="Colombia",
        ))
        svc.create_profile(
            tokens.access_token,
            CreateProfileRequest(nombre="Unico", color="#FF0000", es_principal=False),
        )
        with pytest.raises(ConflictError):
            svc.create_profile(
                tokens.access_token,
                CreateProfileRequest(nombre="Unico", color="#00FF00", es_principal=False),
            )

    def test_delete_principal_profile_raises(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Frank", correo="frank@example.com",
            contrasena="pass1234", pais="Peru",
        ))
        profiles = svc.list_profiles(tokens.access_token)
        principal_id = profiles[0].id
        with pytest.raises(ConflictError):
            svc.delete_profile(tokens.access_token, principal_id)

    def test_change_password_success(self) -> None:
        from app.application.schemas import RegisterRequest, ChangePasswordRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Grace", correo="grace@example.com",
            contrasena="original1", pais="Chile",
        ))
        svc.change_password(tokens.access_token, ChangePasswordRequest(
            contrasena_actual="original1", contrasena_nueva="nueva1234",
        ))

    def test_change_password_wrong_current_raises(self) -> None:
        from app.application.schemas import RegisterRequest, ChangePasswordRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Hector", correo="hector@example.com",
            contrasena="real1234", pais="Bolivia",
        ))
        with pytest.raises(AuthenticationError):
            svc.change_password(tokens.access_token, ChangePasswordRequest(
                contrasena_actual="wrongpwd", contrasena_nueva="nueva1234",
            ))

    def test_change_password_same_raises(self) -> None:
        from app.application.schemas import RegisterRequest, ChangePasswordRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Irene", correo="irene@example.com",
            contrasena="same1234", pais="Argentina",
        ))
        with pytest.raises(ConflictError):
            svc.change_password(tokens.access_token, ChangePasswordRequest(
                contrasena_actual="same1234", contrasena_nueva="same1234",
            ))

    def test_validate_token_returns_account_and_session_id(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Jorge", correo="jorge@example.com",
            contrasena="pass1234", pais="Mexico",
        ))
        account, session_id = svc.validate_token(tokens.access_token)
        assert account.correo == "jorge@example.com"
        assert isinstance(session_id, str)

    def test_validate_token_after_logout_raises(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Karla", correo="karla@example.com",
            contrasena="pass1234", pais="Peru",
        ))
        svc.logout(tokens.access_token)
        with pytest.raises(AuthenticationError):
            svc.validate_token(tokens.access_token)

    def test_get_account_by_id(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Luis", correo="luis@example.com",
            contrasena="pass1234", pais="Colombia",
        ))
        account = svc.get_current_account(tokens.access_token)
        found = svc.get_account_by_id(account.id)
        assert found.correo == "luis@example.com"

    def test_get_account_by_id_not_found_raises(self) -> None:
        svc = self._build_service()
        with pytest.raises(NotFoundError):
            svc.get_account_by_id("nonexistent-id")

    def test_get_account_by_email(self) -> None:
        from app.application.schemas import RegisterRequest
        svc = self._build_service()
        svc.register(RegisterRequest(
            nombre="Maria", correo="maria@example.com",
            contrasena="pass1234", pais="Venezuela",
        ))
        found = svc.get_account_by_email("maria@example.com")
        assert found.nombre == "Maria"

    def test_get_account_by_email_not_found_raises(self) -> None:
        svc = self._build_service()
        with pytest.raises(NotFoundError):
            svc.get_account_by_email("nobody@example.com")

    def test_update_current_account(self) -> None:
        from app.application.schemas import RegisterRequest, UpdateAccountRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Nicolas", correo="nicolas@example.com",
            contrasena="pass1234", pais="Ecuador",
        ))
        updated = svc.update_current_account(
            tokens.access_token,
            UpdateAccountRequest(nombre="Nicolas Actualizado", pais="Peru"),
        )
        assert updated.nombre == "Nicolas Actualizado"
        assert updated.pais == "Peru"

    def test_list_profiles(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Olivia", correo="olivia@example.com",
            contrasena="pass1234", pais="Chile",
        ))
        svc.create_profile(
            tokens.access_token,
            CreateProfileRequest(nombre="Secundario", color="#123456"),
        )
        profiles = svc.list_profiles(tokens.access_token)
        assert len(profiles) == 2

    def test_update_profile_nombre(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest, UpdateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Pedro", correo="pedro@example.com",
            contrasena="pass1234", pais="Uruguay",
        ))
        profile = svc.create_profile(
            tokens.access_token,
            CreateProfileRequest(nombre="Mi Perfil", color="#AAAAAA"),
        )
        updated = svc.update_profile(
            tokens.access_token, profile.id,
            UpdateProfileRequest(nombre="Nuevo Nombre"),
        )
        assert updated.nombre == "Nuevo Nombre"

    def test_update_profile_not_found_raises(self) -> None:
        from app.application.schemas import RegisterRequest, UpdateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Raul", correo="raul@example.com",
            contrasena="pass1234", pais="Paraguay",
        ))
        with pytest.raises(NotFoundError):
            svc.update_profile(tokens.access_token, "nonexistent-id", UpdateProfileRequest())

    def test_delete_only_profile_raises(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Sofia", correo="sofia@example.com",
            contrasena="pass1234", pais="Bolivia",
        ))
        profile = svc.create_profile(
            tokens.access_token,
            CreateProfileRequest(nombre="Secundario", color="#FFFFFF"),
        )
        profiles = svc.list_profiles(tokens.access_token)
        principal = next(p for p in profiles if p.es_principal)
        svc.delete_profile(tokens.access_token, profile.id)
        with pytest.raises(ConflictError):
            svc.delete_profile(tokens.access_token, principal.id)

    def test_sync_profiles_availability(self) -> None:
        from app.application.schemas import RegisterRequest, CreateProfileRequest, SyncProfilesAvailabilityRequest
        svc = self._build_service()
        tokens = svc.register(RegisterRequest(
            nombre="Tomas", correo="tomas@example.com",
            contrasena="pass1234", pais="Panama",
        ))
        svc.create_profile(tokens.access_token, CreateProfileRequest(nombre="P2", color="#111111"))
        svc.create_profile(tokens.access_token, CreateProfileRequest(nombre="P3", color="#222222"))
        profiles = svc.sync_profiles_availability(
            tokens.access_token,
            SyncProfilesAvailabilityRequest(max_perfiles_activos=1),
        )
        active = [p for p in profiles if p.activo]
        assert len(active) == 1

    def test_sync_profiles_no_profiles_raises(self) -> None:
        from app.application.schemas import RegisterRequest, SyncProfilesAvailabilityRequest
        from app.infrastructure.repositories.in_memory_account_repository import InMemoryAccountRepository
        from app.infrastructure.repositories.in_memory_session_repository import InMemorySessionRepository
        from app.application.auth_service import AuthService
        account_repo = InMemoryAccountRepository()
        profile_repo = InMemoryProfileRepository()
        session_repo = InMemorySessionRepository()
        hasher = PasswordHasher()
        jwt_svc = JwtService(secret="test-secret", algorithm="HS256")
        svc = AuthService(
            account_repository=account_repo,
            profile_repository=profile_repo,
            session_repository=session_repo,
            password_hasher=hasher,
            jwt_service=jwt_svc,
            jwt_expire_minutes=60,
        )
        tokens = svc.register(
            __import__("app.application.schemas", fromlist=["RegisterRequest"]).RegisterRequest(
                nombre="Vacio", correo="vacio@example.com",
                contrasena="pass1234", pais="Cuba",
            )
        )
        profile_repo._profiles.clear()
        with pytest.raises(NotFoundError):
            svc.sync_profiles_availability(
                tokens.access_token,
                SyncProfilesAvailabilityRequest(max_perfiles_activos=1),
            )
