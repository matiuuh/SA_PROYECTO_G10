-- =========================================================
-- EXTENSIONES Y TIPOS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_notificacion   AS ENUM ('confirmacion_registro', 'recibo', 'alerta_publicacion');
CREATE TYPE estado_notificacion AS ENUM ('pendiente', 'enviado', 'fallido');
CREATE TYPE evento_auditoria    AS ENUM ('insercion', 'actualizacion', 'eliminacion');

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE notificaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo            tipo_notificacion   NOT NULL,
    correo_destino  VARCHAR(255)        NOT NULL,
    asunto          VARCHAR(500)        NOT NULL,
    estado          estado_notificacion NOT NULL DEFAULT 'pendiente',
    intentos        INT                 NOT NULL DEFAULT 0,
    error_mensaje   TEXT,
    creado_en       TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    enviado_en      TIMESTAMPTZ
);

CREATE TABLE auditoria_notificaciones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla       VARCHAR(100)    NOT NULL,
    entidad_id  UUID            NOT NULL,
    evento      evento_auditoria NOT NULL,
    estado_anterior JSONB,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION fn_registrar_auditoria_notificaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_actor UUID;
BEGIN
    v_actor := NULLIF(current_setting('app.usuario_accion', true), '')::UUID;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO auditoria_notificaciones(tabla, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion, fecha_evento)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD), NULL, v_actor, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO auditoria_notificaciones(tabla, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(OLD), to_jsonb(NEW), v_actor, NOW());
        RETURN NEW;
    ELSE
        INSERT INTO auditoria_notificaciones(tabla, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', NULL, to_jsonb(NEW), v_actor, NOW());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Calcula la tasa de éxito de envíos (0-100)
CREATE OR REPLACE FUNCTION fn_tasa_exito_notificaciones()
RETURNS NUMERIC AS $$
DECLARE
    total   INT;
    exitosas INT;
BEGIN
    SELECT COUNT(*) INTO total   FROM notificaciones;
    SELECT COUNT(*) INTO exitosas FROM notificaciones WHERE estado = 'enviado';
    IF total = 0 THEN RETURN 0; END IF;
    RETURN ROUND((exitosas::NUMERIC / total) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_registrar_notificacion(
    p_tipo            tipo_notificacion,
    p_correo_destino  VARCHAR(255),
    p_asunto          VARCHAR(500),
    p_estado          estado_notificacion,
    p_error_mensaje   TEXT,
    OUT p_id          UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO notificaciones(tipo, correo_destino, asunto, estado, error_mensaje, intentos, enviado_en)
    VALUES (
        p_tipo,
        p_correo_destino,
        p_asunto,
        p_estado,
        p_error_mensaje,
        1,
        CASE WHEN p_estado = 'enviado' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO p_id;
END;
$$;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW v_notificaciones_fallidas AS
SELECT *
FROM notificaciones
WHERE estado = 'fallido'
ORDER BY creado_en DESC;

CREATE VIEW v_resumen_por_tipo AS
SELECT
    tipo,
    COUNT(*)                                    AS total,
    COUNT(*) FILTER (WHERE estado = 'enviado')  AS enviadas,
    COUNT(*) FILTER (WHERE estado = 'fallido')  AS fallidas
FROM notificaciones
GROUP BY tipo;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_auditoria_notificaciones
AFTER INSERT OR UPDATE OR DELETE ON notificaciones
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria_notificaciones();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_notificaciones_tipo   ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_estado ON notificaciones(estado);
CREATE INDEX idx_notificaciones_correo ON notificaciones(correo_destino);
CREATE INDEX idx_auditoria_tabla       ON auditoria_notificaciones(tabla, entidad_id);
