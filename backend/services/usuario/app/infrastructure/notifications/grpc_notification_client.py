import grpc

from app.interfaces.grpc.generated.notificaciones.v1 import (
    notificaciones_pb2,
    notificaciones_pb2_grpc,
)


class GrpcNotificationClient:
    def __init__(self, target: str, timeout_seconds: float) -> None:
        self._target = target
        self._timeout_seconds = timeout_seconds

    def send_registration_confirmation(self, correo: str, nombre: str) -> None:
        try:
            with grpc.insecure_channel(self._target) as channel:
                stub = notificaciones_pb2_grpc.NotificacionesServiceStub(channel)
                response = stub.EnviarConfirmacionRegistro(
                    notificaciones_pb2.ConfirmacionRegistroRequest(
                        correo_destino=correo,
                        nombre_usuario=nombre,
                    ),
                    timeout=self._timeout_seconds,
                )
                if not response.enviado:
                    print(
                        "[usuario-service] notificacion de registro no enviada:",
                        response.mensaje or "sin mensaje",
                    )
        except grpc.RpcError as exc:
            print(
                "[usuario-service] fallo al invocar notificaciones-service para confirmacion_registro:",
                exc.details() or str(exc),
            )
        except Exception as exc:
            print(
                "[usuario-service] error inesperado enviando confirmacion_registro:",
                str(exc),
            )
