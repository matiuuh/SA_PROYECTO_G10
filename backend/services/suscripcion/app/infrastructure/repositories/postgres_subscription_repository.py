from datetime import datetime

from app.domain.models import Subscription
from app.infrastructure.database import Database


class PostgresSubscriptionRepository:
    def __init__(self, database: Database) -> None:
        self._database = database

    def create(self, subscription: Subscription) -> Subscription:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO suscripciones.suscripciones (
                        id, cuenta_id, plan_id, estado, fecha_inicio,
                        fecha_fin, creado_en, actualizado_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, cuenta_id, plan_id, estado, fecha_inicio,
                              fecha_fin, creado_en, actualizado_en
                    """,
                    (
                        subscription.id,
                        subscription.cuenta_id,
                        subscription.plan_id,
                        subscription.estado,
                        subscription.fecha_inicio,
                        subscription.fecha_fin,
                        subscription.creado_en,
                        subscription.actualizado_en,
                    ),
                )
                row = cursor.fetchone()
            connection.commit()
        return self._map_row(row)

    def get_active_by_account_id(self, account_id: str) -> Subscription | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, plan_id, estado, fecha_inicio,
                           fecha_fin, creado_en, actualizado_en
                    FROM suscripciones.suscripciones
                    WHERE cuenta_id = %s
                      AND estado = 'activa'
                    ORDER BY creado_en DESC
                    LIMIT 1
                    """,
                    (account_id,),
                )
                row = cursor.fetchone()
        return self._map_row(row) if row else None

    def get_by_id(self, subscription_id: str) -> Subscription | None:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, cuenta_id, plan_id, estado, fecha_inicio,
                           fecha_fin, creado_en, actualizado_en
                    FROM suscripciones.suscripciones
                    WHERE id = %s
                    """,
                    (subscription_id,),
                )
                row = cursor.fetchone()
        return self._map_row(row) if row else None

    def list_active_account_ids(self) -> list[str]:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT DISTINCT cuenta_id
                    FROM suscripciones.suscripciones
                    WHERE estado = 'activa'
                    ORDER BY cuenta_id
                    """
                )
                rows = cursor.fetchall()
        return [str(row["cuenta_id"]) for row in rows]

    def update(self, subscription: Subscription) -> Subscription:
        with self._database.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE suscripciones.suscripciones
                    SET plan_id = %s,
                        estado = %s,
                        fecha_inicio = %s,
                        fecha_fin = %s,
                        actualizado_en = %s
                    WHERE id = %s
                    RETURNING id, cuenta_id, plan_id, estado, fecha_inicio,
                              fecha_fin, creado_en, actualizado_en
                    """,
                    (
                        subscription.plan_id,
                        subscription.estado,
                        subscription.fecha_inicio,
                        subscription.fecha_fin,
                        subscription.actualizado_en,
                        subscription.id,
                    ),
                )
                row = cursor.fetchone()
            connection.commit()
        return self._map_row(row)

    @staticmethod
    def _map_row(row: dict[str, str | datetime | None]) -> Subscription:
        return Subscription(
            id=str(row["id"]),
            cuenta_id=str(row["cuenta_id"]),
            plan_id=str(row["plan_id"]),
            estado=str(row["estado"]),
            fecha_inicio=row["fecha_inicio"],
            fecha_fin=row["fecha_fin"],
            creado_en=row["creado_en"],
            actualizado_en=row["actualizado_en"],
        )
