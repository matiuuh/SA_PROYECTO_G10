from datetime import datetime
from decimal import Decimal

from app.domain.models import Plan
from app.infrastructure.database import Database


class PostgresPlanRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, plan: Plan, actor_account_id: str = "") -> Plan:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                if actor_account_id:
                    cursor.execute(
                        "SELECT set_config('app.usuario_accion', %s, true)",
                        (actor_account_id,),
                    )
                cursor.execute(
                    """
                    INSERT INTO suscripciones.planes (
                        id, nombre, descripcion, precio_base, moneda_base,
                        perfiles_maximos, activo, creado_en, actualizado_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, nombre, descripcion, precio_base, moneda_base,
                              perfiles_maximos, activo, creado_en, actualizado_en
                    """,
                    (
                        plan.id,
                        plan.nombre,
                        plan.descripcion,
                        plan.precio_base,
                        plan.moneda_base,
                        plan.perfiles_maximos,
                        plan.activo,
                        plan.creado_en,
                        plan.actualizado_en,
                    ),
                )
                row = cursor.fetchone()
            connection.commit()
        return self._map_row(row)

    def list_active(self) -> list[Plan]:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, nombre, descripcion, precio_base, moneda_base,
                           perfiles_maximos, activo, creado_en, actualizado_en
                    FROM suscripciones.planes
                    WHERE activo = TRUE
                    ORDER BY creado_en ASC
                    """
                )
                rows = cursor.fetchall()
        return [self._map_row(row) for row in rows]

    def get_by_id(self, plan_id: str) -> Plan | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, nombre, descripcion, precio_base, moneda_base,
                           perfiles_maximos, activo, creado_en, actualizado_en
                    FROM suscripciones.planes
                    WHERE id = %s
                    """,
                    (plan_id,),
                )
                row = cursor.fetchone()
        return self._map_row(row) if row else None

    @staticmethod
    def _map_row(row: dict[str, str | int | bool | Decimal | datetime | None]) -> Plan:
        return Plan(
            id=str(row["id"]),
            nombre=str(row["nombre"]),
            descripcion=row["descripcion"],
            precio_base=row["precio_base"],
            moneda_base=str(row["moneda_base"]),
            perfiles_maximos=int(row["perfiles_maximos"]),
            activo=bool(row["activo"]),
            creado_en=row["creado_en"],
            actualizado_en=row["actualizado_en"],
        )
