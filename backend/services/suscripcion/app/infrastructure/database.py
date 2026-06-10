from psycopg import Connection, connect
from psycopg.rows import dict_row

from app.infrastructure.config.settings import Settings


class Database:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def connection(self) -> Connection:
        return connect(
            host=self._settings.db_host,
            port=self._settings.db_port,
            dbname=self._settings.db_name,
            user=self._settings.db_user,
            password=self._settings.db_password,
            row_factory=dict_row,
        )

    def ping(self) -> None:
        with self.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
