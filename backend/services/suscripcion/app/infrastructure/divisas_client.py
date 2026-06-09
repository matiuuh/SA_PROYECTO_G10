from decimal import Decimal

import grpc

from app.interfaces.grpc.generated.divisas.v1 import divisas_pb2, divisas_pb2_grpc


class DivisasClient:
    def __init__(self, target: str, timeout_seconds: float) -> None:
        self._target = target
        self._timeout_seconds = timeout_seconds

    def convert_amount(
        self,
        monto: Decimal,
        moneda_origen: str,
        moneda_destino: str,
    ) -> tuple[Decimal, Decimal]:
        with grpc.insecure_channel(self._target) as channel:
            stub = divisas_pb2_grpc.DivisasServiceStub(channel)
            response = stub.ConvertirMonto(
                divisas_pb2.ConvertirMontoRequest(
                    monto=float(monto),
                    moneda_origen=moneda_origen.upper(),
                    moneda_destino=moneda_destino.upper(),
                ),
                timeout=self._timeout_seconds,
            )

        monto_convertido = Decimal(str(response.monto_convertido))
        tasa = Decimal(str(response.tasa))
        return monto_convertido, tasa
