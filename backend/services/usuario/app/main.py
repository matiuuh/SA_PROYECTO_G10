from fastapi import FastAPI

from app.infrastructure.container import build_container
from app.interfaces.grpc.server import build_grpc_server
from app.interfaces.http.auth_router import build_auth_router


container = build_container()
grpc_server = build_grpc_server(container)

app = FastAPI(title=container.settings.app_name)
app.include_router(build_auth_router(container), prefix="/api/v1")


@app.on_event("startup")
def startup() -> None:
    if container.database is not None:
        container.database.ping()
    grpc_server.start(container.settings.grpc_port)


@app.on_event("shutdown")
def shutdown() -> None:
    grpc_server.stop()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
