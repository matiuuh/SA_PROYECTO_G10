CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE estado_suscripcion AS ENUM ('activa', 'cancelada', 'vencida');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE SCHEMA IF NOT EXISTS suscripciones;

CREATE TABLE suscripciones.planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    precio_base NUMERIC(10,2) NOT NULL,
    moneda_base CHAR(3) NOT NULL DEFAULT 'USD',
    perfiles_maximos SMALLINT NOT NULL DEFAULT 5,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_precio_base CHECK (precio_base > 0),
    CONSTRAINT ck_perfiles_maximos CHECK (perfiles_maximos BETWEEN 1 AND 5)
);

CREATE TABLE suscripciones.suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES suscripciones.planes(id),
    estado estado_suscripcion NOT NULL DEFAULT 'activa',
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suscripciones.cambios_plan (
    cambio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suscripcion_id UUID NOT NULL REFERENCES suscripciones.suscripciones(id) ON DELETE CASCADE,
    plan_anterior_id UUID REFERENCES suscripciones.planes(id),
    plan_nuevo_id UUID NOT NULL REFERENCES suscripciones.planes(id),
    estado estado_suscripcion NOT NULL DEFAULT 'activa',
    solicitado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aplicado_en TIMESTAMPTZ
);

CREATE TABLE suscripciones.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suscripciones_cuenta ON suscripciones.suscripciones(cuenta_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones.suscripciones(estado);
CREATE INDEX idx_suscripciones_instantaneas_tabla ON suscripciones.instantaneas(tabla_origen, entidad_id);
