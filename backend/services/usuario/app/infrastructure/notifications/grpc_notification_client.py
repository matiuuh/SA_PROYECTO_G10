import json
import urllib.error
import urllib.request


class GrpcNotificationClient:
    # Nombre mantenido por compatibilidad; internamente usa HTTP vía API Gateway.
    def __init__(self, target: str, timeout_seconds: float) -> None:
        # target es la URL base del API Gateway (ej. http://api-gateway:4000)
        self._base_url = target.rstrip('/')
        self._timeout_seconds = timeout_seconds

    def send_registration_confirmation(self, correo: str, nombre: str) -> None:
        url = f"{self._base_url}/api/notificaciones/api/v1/confirmacion-registro"
        payload = json.dumps({
            'correo_destino': correo,
            'nombre_usuario': nombre,
        }).encode('utf-8')

        request = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )

        try:
            with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                data: dict = json.loads(response.read())
            if not data.get('enviado'):
                print(
                    "[usuario-service] notificacion de registro no enviada:",
                    data.get('mensaje', 'sin mensaje'),
                )
        except urllib.error.HTTPError as exc:
            print(
                "[usuario-service] fallo al enviar confirmacion_registro vía API Gateway:",
                exc.code, exc.read().decode(),
            )
        except Exception as exc:
            print(
                "[usuario-service] error inesperado enviando confirmacion_registro:",
                str(exc),
            )
