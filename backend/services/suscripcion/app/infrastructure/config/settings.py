from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "suscripcion-service"
    app_env: str = "development"
    app_port: int = 8002
    grpc_port: int = 50052
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "quetzal_suscripcion"
    db_user: str = "postgres"
    db_password: str = "postgres"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
