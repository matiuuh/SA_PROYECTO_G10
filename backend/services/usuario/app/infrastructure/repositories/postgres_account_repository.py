from datetime import datetime

from app.domain.models import Account
from app.infrastructure.database import Database


class PostgresAccountRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, account: Account) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO usuarios.cuentas (
                        id,
                        nombre,
                        correo,
                        contrasena_hash,
                        pais,
                        rol,
                        creado_en,
                        actualizado_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        account.id,
                        account.nombre,
                        account.correo,
                        account.contrasena_hash,
                        account.pais,
                        account.rol,
                        account.creado_en,
                        account.creado_en,
                    ),
                )
            connection.commit()

    def get_by_email(self, email: str) -> Account | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, nombre, correo, contrasena_hash, pais, rol, creado_en
                    FROM usuarios.cuentas
                    WHERE lower(correo) = lower(%s)
                      AND eliminado_en IS NULL
                    """,
                    (email,),
                )
                row = cursor.fetchone()

        return self._map_row(row) if row else None

    def get_by_id(self, account_id: str) -> Account | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, nombre, correo, contrasena_hash, pais, rol, creado_en
                    FROM usuarios.cuentas
                    WHERE id = %s
                      AND eliminado_en IS NULL
                    """,
                    (account_id,),
                )
                row = cursor.fetchone()

        return self._map_row(row) if row else None

    def update(self, account: Account) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE usuarios.cuentas
                    SET nombre = %s,
                        contrasena_hash = %s,
                        pais = %s,
                        actualizado_en = NOW()
                    WHERE id = %s
                      AND eliminado_en IS NULL
                    """,
                    (
                        account.nombre,
                        account.contrasena_hash,
                        account.pais,
                        account.id,
                    ),
                )
            connection.commit()

    @staticmethod
    def _map_row(row: dict[str, str | datetime]) -> Account:
        return Account(
            id=str(row["id"]),
            nombre=str(row["nombre"]),
            correo=str(row["correo"]),
            contrasena_hash=str(row["contrasena_hash"]),
            pais=str(row["pais"]),
            rol=str(row["rol"]),
            creado_en=row["creado_en"],
        )
