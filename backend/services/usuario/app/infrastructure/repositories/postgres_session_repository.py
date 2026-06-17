from datetime import datetime

from app.domain.models import Session
from app.infrastructure.database import Database


class PostgresSessionRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, session: Session) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO usuarios.sesiones (
                        id,
                        cuenta_id,
                        perfil_id,
                        metodo,
                        iniciada_en,
                        expira_en,
                        cerrada_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        session.id,
                        session.cuenta_id,
                        None,
                        session.metodo,
                        session.iniciada_en,
                        session.expira_en,
                        session.cerrada_en,
                    ),
                )
            connection.commit()

    def get_by_id(self, session_id: str) -> Session | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, metodo, iniciada_en, expira_en, cerrada_en
                    FROM usuarios.sesiones
                    WHERE id = %s
                    """,
                    (session_id,),
                )
                row = cursor.fetchone()

        return self._map_row(row) if row else None

    def update(self, session: Session) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE usuarios.sesiones
                    SET cuenta_id = %s,
                        metodo = %s,
                        iniciada_en = %s,
                        expira_en = %s,
                        cerrada_en = %s
                    WHERE id = %s
                    """,
                    (
                        session.cuenta_id,
                        session.metodo,
                        session.iniciada_en,
                        session.expira_en,
                        session.cerrada_en,
                        session.id,
                    ),
                )
            connection.commit()

    @staticmethod
    def _map_row(row: dict[str, str | datetime | None]) -> Session:
        return Session(
            id=str(row["id"]),
            cuenta_id=str(row["cuenta_id"]),
            metodo=str(row["metodo"]),
            iniciada_en=row["iniciada_en"],
            expira_en=row["expira_en"],
            cerrada_en=row["cerrada_en"],
        )
