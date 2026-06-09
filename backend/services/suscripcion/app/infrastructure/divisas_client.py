import json
import urllib.error
import urllib.request
from decimal import Decimal


class DivisasClient:
    def __init__(self, target: str, timeout_seconds: float) -> None:
        # target es ahora la URL base del API Gateway (ej. http://api-gateway:4000)
        self._base_url = target.rstrip('/')
        self._timeout_seconds = timeout_seconds

    def convert_amount(
        self,
        monto: Decimal,
        moneda_origen: str,
        moneda_destino: str,
    ) -> tuple[Decimal, Decimal]:
        url = f"{self._base_url}/api/divisas/api/v1/convertir"
        payload = json.dumps({
            'monto': float(monto),
            'moneda_origen': moneda_origen.upper(),
            'moneda_destino': moneda_destino.upper(),
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
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"divisas respondió {exc.code}: {exc.read().decode()}") from exc
        except Exception as exc:
            raise RuntimeError(f"no se pudo contactar divisas vía API Gateway: {exc}") from exc

        monto_convertido = Decimal(str(data['monto_convertido']))
        tasa = Decimal(str(data['tasa']))
        return monto_convertido, tasa
