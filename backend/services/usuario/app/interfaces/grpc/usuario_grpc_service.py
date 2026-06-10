from datetime import datetime

import grpc

from app.application.auth_service import AuthService
from app.domain.errors import AuthenticationError, NotFoundError
from app.interfaces.grpc.generated.usuario.v1 import usuario_pb2, usuario_pb2_grpc


class UsuarioGrpcService(usuario_pb2_grpc.UsuarioServiceServicer):
    def __init__(self, auth_service: AuthService) -> None:
        self._auth_service = auth_service

    def ValidateToken(self, request, context):
        try:
            account, session_id = self._auth_service.validate_token(request.access_token)
        except AuthenticationError as exc:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, str(exc))
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))

        return usuario_pb2.ValidateTokenResponse(
            valid=True,
            session_id=session_id,
            account=self._to_account_message(account),
        )

    def GetAccountById(self, request, context):
        try:
            account = self._auth_service.get_account_by_id(request.account_id)
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))

        return self._to_account_message(account)

    def GetAccountByEmail(self, request, context):
        try:
            account = self._auth_service.get_account_by_email(request.email)
        except NotFoundError as exc:
            context.abort(grpc.StatusCode.NOT_FOUND, str(exc))

        return self._to_account_message(account)

    @staticmethod
    def _to_account_message(account):
        return usuario_pb2.Account(
            id=account.id,
            nombre=account.nombre,
            correo=account.correo,
            pais=account.pais,
            rol=account.rol,
            creado_en=UsuarioGrpcService._to_iso(account.creado_en),
        )

    @staticmethod
    def _to_iso(value: datetime | None) -> str:
        return value.isoformat().replace("+00:00", "Z") if value else ""
