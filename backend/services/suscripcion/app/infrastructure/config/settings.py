from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "suscripcion-service"
    app_env: str = "development"
    app_port: int = 8002
    grpc_port: int = 50052
    api_gateway_url: str = "http://localhost:4000"
    conversion_timeout_seconds: float = 3.0
    storage_backend: str = "inmemory"
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "quetzal_suscripcion"
    db_user: str = "postgres"
    db_password: str = "postgres"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
