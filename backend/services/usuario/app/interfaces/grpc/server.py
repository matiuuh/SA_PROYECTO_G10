from concurrent import futures
from dataclasses import dataclass

import grpc

from app.infrastructure.container import Container
from app.interfaces.grpc.generated.usuario.v1 import usuario_pb2_grpc
from app.interfaces.grpc.usuario_grpc_service import UsuarioGrpcService


@dataclass
class GrpcServerHandle:
    server: grpc.Server

    def start(self, port: int) -> None:
        self.server.add_insecure_port(f"[::]:{port}")
        self.server.start()

    def stop(self) -> None:
        self.server.stop(grace=5)


def build_grpc_server(container: Container) -> GrpcServerHandle:
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    usuario_pb2_grpc.add_UsuarioServiceServicer_to_server(
        UsuarioGrpcService(container.auth_service),
        server,
    )
    return GrpcServerHandle(server=server)
