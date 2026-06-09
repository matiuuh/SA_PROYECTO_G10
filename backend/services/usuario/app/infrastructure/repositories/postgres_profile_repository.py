from datetime import datetime, timezone

from app.domain.models import Profile
from app.infrastructure.database import Database


class PostgresProfileRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, profile: Profile) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                if profile.es_principal:
                    cursor.execute(
                        """
                        UPDATE usuarios.perfiles
                        SET es_principal = FALSE,
                            actualizado_en = NOW()
                        WHERE cuenta_id = %s
                          AND eliminado_en IS NULL
                        """,
                        (profile.cuenta_id,),
                    )

                cursor.execute(
                    """
                    INSERT INTO usuarios.perfiles (
                        id,
                        cuenta_id,
                        nombre,
                        color,
                        es_principal,
                        creado_en,
                        actualizado_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        profile.id,
                        profile.cuenta_id,
                        profile.nombre,
                        profile.color,
                        profile.es_principal,
                        profile.creado_en,
                        profile.actualizado_en,
                    ),
                )
            connection.commit()

    def list_by_account_id(self, account_id: str) -> list[Profile]:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, nombre, color, es_principal, creado_en, actualizado_en
                    FROM usuarios.perfiles
                    WHERE cuenta_id = %s
                      AND eliminado_en IS NULL
                    ORDER BY es_principal DESC, creado_en ASC
                    """,
                    (account_id,),
                )
                rows = cursor.fetchall()

        return [self._map_row(row) for row in rows]

    def get_by_id(self, profile_id: str) -> Profile | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, nombre, color, es_principal, creado_en, actualizado_en
                    FROM usuarios.perfiles
                    WHERE id = %s
                      AND eliminado_en IS NULL
                    """,
                    (profile_id,),
                )
                row = cursor.fetchone()

        return self._map_row(row) if row else None

    def get_by_name(self, account_id: str, name: str) -> Profile | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, nombre, color, es_principal, creado_en, actualizado_en
                    FROM usuarios.perfiles
                    WHERE cuenta_id = %s
                      AND lower(nombre) = lower(%s)
                      AND eliminado_en IS NULL
                    """,
                    (account_id, name.strip()),
                )
                row = cursor.fetchone()

        return self._map_row(row) if row else None

    def count_by_account_id(self, account_id: str) -> int:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*) AS total
                    FROM usuarios.perfiles
                    WHERE cuenta_id = %s
                      AND eliminado_en IS NULL
                    """,
                    (account_id,),
                )
                row = cursor.fetchone()

        return int(row["total"])

    def update(self, profile: Profile) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                if profile.es_principal:
                    cursor.execute(
                        """
                        UPDATE usuarios.perfiles
                        SET es_principal = FALSE,
                            actualizado_en = NOW()
                        WHERE cuenta_id = %s
                          AND id <> %s
                          AND eliminado_en IS NULL
                        """,
                        (profile.cuenta_id, profile.id),
                    )

                cursor.execute(
                    """
                    UPDATE usuarios.perfiles
                    SET nombre = %s,
                        color = %s,
                        es_principal = %s,
                        actualizado_en = %s
                    WHERE id = %s
                      AND eliminado_en IS NULL
                    """,
                    (
                        profile.nombre,
                        profile.color,
                        profile.es_principal,
                        profile.actualizado_en,
                        profile.id,
                    ),
                )
            connection.commit()

    def delete(self, profile_id: str) -> None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, es_principal
                    FROM usuarios.perfiles
                    WHERE id = %s
                      AND eliminado_en IS NULL
                    """,
                    (profile_id,),
                )
                profile_row = cursor.fetchone()
                if profile_row is None:
                    connection.commit()
                    return

                cursor.execute(
                    """
                    UPDATE usuarios.perfiles
                    SET eliminado_en = NOW(),
                        actualizado_en = NOW()
                    WHERE id = %s
                    """,
                    (profile_id,),
                )

                if profile_row["es_principal"]:
                    cursor.execute(
                        """
                        SELECT id
                        FROM usuarios.perfiles
                        WHERE cuenta_id = %s
                          AND eliminado_en IS NULL
                        ORDER BY creado_en ASC
                        LIMIT 1
                        """,
                        (profile_row["cuenta_id"],),
                    )
                    next_profile = cursor.fetchone()
                    if next_profile is not None:
                        cursor.execute(
                            """
                            UPDATE usuarios.perfiles
                            SET es_principal = TRUE,
                                actualizado_en = %s
                            WHERE id = %s
                            """,
                            (datetime.now(timezone.utc), next_profile["id"]),
                        )
            connection.commit()

    @staticmethod
    def _map_row(row: dict[str, str | bool | datetime]) -> Profile:
        return Profile(
            id=str(row["id"]),
            cuenta_id=str(row["cuenta_id"]),
            nombre=str(row["nombre"]),
            color=str(row["color"]),
            es_principal=bool(row["es_principal"]),
            creado_en=row["creado_en"],
            actualizado_en=row["actualizado_en"],
        )
