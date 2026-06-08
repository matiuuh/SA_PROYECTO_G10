from fastapi import FastAPI

from app.infrastructure.container import build_container
from app.interfaces.http.auth_router import build_auth_router


container = build_container()

app = FastAPI(title=container.settings.app_name)
app.include_router(build_auth_router(container), prefix="/api/v1")


@app.on_event("startup")
def startup() -> None:
    if container.database is not None:
        container.database.ping()


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
