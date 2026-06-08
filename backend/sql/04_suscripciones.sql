-- =========================================================
-- ENUMS Y ESQUEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE estado_suscripcion AS ENUM ('activa', 'cancelada', 'vencida');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE TABLE planes (
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

CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES planes(id),
    estado estado_suscripcion NOT NULL DEFAULT 'activa',
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cambios_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suscripcion_id UUID NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
    plan_anterior_id UUID REFERENCES planes(id),
    plan_nuevo_id UUID NOT NULL REFERENCES planes(id),
    estado estado_suscripcion NOT NULL DEFAULT 'activa',
    solicitado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aplicado_en TIMESTAMPTZ
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

-- =========================================================
-- FUNCIONES
-- =========================================================

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
        INSERT INTO suscripciones.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO suscripciones.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSE
        INSERT INTO suscripciones.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', to_jsonb(NEW), NOW());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW v_planes_activos AS
SELECT *
FROM planes
WHERE activo = TRUE;

CREATE VIEW v_suscripciones_vigentes AS
SELECT *
FROM suscripciones
WHERE estado = 'activa';

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_actualizar_actualizado_en_planes
BEFORE UPDATE ON planes
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_suscripciones
BEFORE UPDATE ON suscripciones
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snapshot_planes
AFTER INSERT OR UPDATE OR DELETE ON planes
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_suscripciones
AFTER INSERT OR UPDATE OR DELETE ON suscripciones
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_cambios_plan
AFTER INSERT OR UPDATE OR DELETE ON cambios_plan
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_suscripciones_cuenta ON suscripciones(cuenta_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_suscripciones_instantaneas_tabla ON instantaneas(tabla_origen, entidad_id);
