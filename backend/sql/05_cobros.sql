-- =========================================================
-- ENUMS Y ESQUEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_operacion_pago AS ENUM ('contratacion', 'modificacion_plan');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'cancelado');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE TABLE transacciones (
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

CREATE TABLE recibos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaccion_id UUID NOT NULL REFERENCES transacciones(id) ON DELETE CASCADE,
    numero_recibo VARCHAR(50) NOT NULL UNIQUE,
    correo_destino VARCHAR(255) NOT NULL,
    enviado BOOLEAN NOT NULL DEFAULT FALSE,
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION fn_actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_registrar_instantanea()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO cobros.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO cobros.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSE
        INSERT INTO cobros.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', to_jsonb(NEW), NOW());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_registrar_compra(
    p_cuenta_id UUID,
    p_plan_id UUID,
    p_tipo_operacion tipo_operacion_pago,
    p_monto_base NUMERIC(10,2),
    p_monto_local NUMERIC(10,2),
    p_moneda_local CHAR(3),
    p_estado estado_pago,
    p_referencia_pasarela VARCHAR(120),
    p_correo_destino VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaccion_id UUID;
BEGIN
    INSERT INTO transacciones (
        cuenta_id,
        plan_id,
        tipo_operacion,
        monto_base,
        monto_local,
        moneda_local,
        estado,
        referencia_pasarela,
        pagado_en
    ) VALUES (
        p_cuenta_id,
        p_plan_id,
        p_tipo_operacion,
        p_monto_base,
        p_monto_local,
        p_moneda_local,
        p_estado,
        p_referencia_pasarela,
        CASE WHEN p_estado = 'aprobado' THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_transaccion_id;

    IF p_estado = 'aprobado' THEN
        INSERT INTO recibos (
            transaccion_id,
            numero_recibo,
            correo_destino,
            enviado,
            enviado_en
        ) VALUES (
            v_transaccion_id,
            'REC-' || REPLACE(v_transaccion_id::TEXT, '-', ''),
            p_correo_destino,
            FALSE,
            NULL
        );
    END IF;
END;
$$;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW v_transacciones_aprobadas AS
SELECT *
FROM transacciones
WHERE estado = 'aprobado';

CREATE VIEW v_resumen_transacciones AS
SELECT
    t.id,
    t.cuenta_id,
    t.plan_id,
    t.tipo_operacion,
    t.monto_base,
    t.monto_local,
    t.moneda_local,
    t.estado,
    t.referencia_pasarela,
    t.pagado_en,
    t.creado_en
FROM transacciones t;

CREATE VIEW v_recibos_enviados AS
SELECT *
FROM recibos
WHERE enviado = TRUE;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_actualizar_actualizado_en_transacciones
BEFORE UPDATE ON transacciones
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snapshot_transacciones
AFTER INSERT OR UPDATE OR DELETE ON transacciones
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_recibos
AFTER INSERT OR UPDATE OR DELETE ON recibos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_transacciones_cuenta ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_estado ON transacciones(estado);
CREATE INDEX idx_recibos_transaccion ON recibos(transaccion_id);
CREATE INDEX idx_cobros_instantaneas_tabla ON instantaneas(tabla_origen, entidad_id);
