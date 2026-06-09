from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "usuario-service"
    app_env: str = "development"
    app_port: int = 8001
    grpc_port: int = 5001
    storage_backend: str = "inmemory"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "quetzal_usuario"
    db_user: str = "postgres"
    db_password: str = "postgres"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
