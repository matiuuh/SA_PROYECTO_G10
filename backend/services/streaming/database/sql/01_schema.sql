-- =========================================================
-- EXTENSIONES
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE estado_historial  AS ENUM ('en_progreso', 'finalizado');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE historial_reproduccion (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id         UUID NOT NULL,
    contenido_id      UUID NOT NULL,
    episodio_id       UUID,
    estado            estado_historial NOT NULL DEFAULT 'en_progreso',
    progreso_segundos INTEGER NOT NULL DEFAULT 0,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_historial_perfil_recurso UNIQUE (perfil_id, contenido_id, episodio_id),
    CONSTRAINT ck_progreso_segundos CHECK (progreso_segundos >= 0)
);

CREATE TABLE instantaneas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen   VARCHAR(100) NOT NULL,
    entidad_id     UUID NOT NULL,
    evento         evento_instantanea NOT NULL,
    estado_nuevo   JSONB,
    usuario_accion UUID,
    fecha_evento   TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(NEW));
        RETURN NEW;
    ELSE
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', to_jsonb(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW v_historial_reciente AS
SELECT *
FROM historial_reproduccion
ORDER BY actualizado_en DESC;

CREATE VIEW v_continuar_viendo AS
SELECT *
FROM historial_reproduccion
WHERE estado = 'en_progreso' AND progreso_segundos > 0
ORDER BY actualizado_en DESC;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_ts_historial
    BEFORE UPDATE ON historial_reproduccion
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snap_historial
    AFTER INSERT OR UPDATE OR DELETE ON historial_reproduccion
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_historial_perfil     ON historial_reproduccion(perfil_id);
CREATE INDEX idx_historial_contenido  ON historial_reproduccion(contenido_id);
CREATE INDEX idx_historial_episodio   ON historial_reproduccion(episodio_id);
CREATE INDEX idx_snap_tabla           ON instantaneas(tabla_origen, entidad_id);
