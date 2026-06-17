from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass
class Plan:
    id: str
    nombre: str
    descripcion: str | None
    precio_base: Decimal
    moneda_base: str
    perfiles_maximos: int
    activo: bool
    creado_en: datetime
    actualizado_en: datetime


@dataclass
class Subscription:
    id: str
    cuenta_id: str
    plan_id: str
    estado: str
    fecha_inicio: datetime | None
    fecha_fin: datetime | None
    creado_en: datetime
    actualizado_en: datetime
