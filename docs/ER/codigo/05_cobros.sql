CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_operacion_pago AS ENUM ('contratacion', 'modificacion_plan');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'cancelado');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE SCHEMA IF NOT EXISTS cobros;

CREATE TABLE cobros.transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL,
    suscripcion_id UUID,
    plan_id UUID NOT NULL,
    tipo_operacion tipo_operacion_pago NOT NULL,
    monto_base NUMERIC(10,2) NOT NULL,
    monto_local NUMERIC(10,2) NOT NULL,
    moneda_local CHAR(3) NOT NULL,
    estado estado_pago NOT NULL DEFAULT 'pendiente',
    referencia_pasarela VARCHAR(120),
    pagado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_monto_base CHECK (monto_base > 0),
    CONSTRAINT ck_monto_local CHECK (monto_local > 0)
);

CREATE TABLE cobros.recibos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaccion_id UUID NOT NULL REFERENCES cobros.transacciones(id) ON DELETE CASCADE,
    numero_recibo VARCHAR(50) NOT NULL UNIQUE,
    correo_destino VARCHAR(255) NOT NULL,
    enviado BOOLEAN NOT NULL DEFAULT FALSE,
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cobros.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transacciones_cuenta ON cobros.transacciones(cuenta_id);
CREATE INDEX idx_transacciones_estado ON cobros.transacciones(estado);
CREATE INDEX idx_recibos_transaccion ON cobros.recibos(transaccion_id);
CREATE INDEX idx_cobros_instantaneas_tabla ON cobros.instantaneas(tabla_origen, entidad_id);
