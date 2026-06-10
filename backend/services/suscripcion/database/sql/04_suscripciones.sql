CREATE SCHEMA IF NOT EXISTS suscripciones;
SET search_path TO suscripciones, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE estado_suscripcion AS ENUM ('activa', 'cancelada', 'vencida');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE OR REPLACE FUNCTION suscripciones.fn_actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suscripciones.fn_registrar_instantanea()
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

CREATE VIEW suscripciones.v_planes_activos AS
SELECT *
FROM suscripciones.planes
WHERE activo = TRUE;

CREATE VIEW suscripciones.v_suscripciones_vigentes AS
SELECT *
FROM suscripciones.suscripciones
WHERE estado = 'activa';

CREATE TRIGGER trg_actualizar_actualizado_en_planes
BEFORE UPDATE ON suscripciones.planes
FOR EACH ROW EXECUTE FUNCTION suscripciones.fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_suscripciones
BEFORE UPDATE ON suscripciones.suscripciones
FOR EACH ROW EXECUTE FUNCTION suscripciones.fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snapshot_planes
AFTER INSERT OR UPDATE OR DELETE ON suscripciones.planes
FOR EACH ROW EXECUTE FUNCTION suscripciones.fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_suscripciones
AFTER INSERT OR UPDATE OR DELETE ON suscripciones.suscripciones
FOR EACH ROW EXECUTE FUNCTION suscripciones.fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_cambios_plan
AFTER INSERT OR UPDATE OR DELETE ON suscripciones.cambios_plan
FOR EACH ROW EXECUTE FUNCTION suscripciones.fn_registrar_instantanea();

CREATE INDEX idx_suscripciones_cuenta ON suscripciones.suscripciones(cuenta_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones.suscripciones(estado);
CREATE INDEX idx_suscripciones_instantaneas_tabla
ON suscripciones.instantaneas(tabla_origen, entidad_id);
