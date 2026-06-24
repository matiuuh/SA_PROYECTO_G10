from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.infrastructure.container import build_container
from app.interfaces.grpc.server import build_grpc_server
from app.interfaces.http.internal_router import build_internal_router
from app.interfaces.http.plan_router import build_plan_router
from app.interfaces.http.subscription_router import build_subscription_router


container = build_container()
grpc_server = build_grpc_server(container)

app = FastAPI(title=container.settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:6006",
        "http://127.0.0.1:6006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(build_internal_router(container), prefix="/api/v1")
app.include_router(build_plan_router(container), prefix="/api/v1")
app.include_router(build_subscription_router(container), prefix="/api/v1")


@app.on_event("startup")
def startup() -> None:
    if container.database is not None:
        container.database.ping()
    if container.settings.app_env != "test":
        grpc_server.start(container.settings.grpc_port)


@app.on_event("shutdown")
def shutdown() -> None:
    grpc_server.stop()


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
