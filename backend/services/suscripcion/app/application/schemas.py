from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CreatePlanRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    descripcion: str | None = None
    precio_base: Decimal = Field(gt=0)
    moneda_base: str = Field(min_length=3, max_length=3)
    perfiles_maximos: int = Field(ge=1, le=5)


class PlanResponse(BaseModel):
    id: str
    nombre: str
    descripcion: str | None
    precio_base: Decimal
    moneda_base: str
    perfiles_maximos: int
    activo: bool
    creado_en: datetime
    actualizado_en: datetime


class PlanQuoteResponse(BaseModel):
    plan_id: str
    nombre_plan: str
    precio_base: Decimal
    moneda_base: str
    moneda_local: str | None
    monto_local: Decimal | None
    tasa_cambio: Decimal | None
    conversion_disponible: bool
    mensaje: str


class CreateSubscriptionRequest(BaseModel):
    cuenta_id: str
    plan_id: str


class ChangeSubscriptionPlanRequest(BaseModel):
    plan_id: str


class SubscriptionResponse(BaseModel):
    id: str
    cuenta_id: str
    plan_id: str
    estado: str
    fecha_inicio: datetime | None
    fecha_fin: datetime | None
    creado_en: datetime
    actualizado_en: datetime


class SubscriptionStatusResponse(BaseModel):
    tiene_suscripcion: bool
    suscripcion: SubscriptionResponse | None
    puede_descargar: bool


class ActiveSubscriptionAccountsResponse(BaseModel):
    cuenta_ids: list[str]


class MessageResponse(BaseModel):
    message: str
