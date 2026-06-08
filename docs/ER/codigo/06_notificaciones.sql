-- =========================================================
-- ENUMS Y ESQUEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_notificacion AS ENUM ('registro', 'recibo_compra', 'nuevo_contenido');
CREATE TYPE estado_envio AS ENUM ('enviado', 'fallido');

CREATE SCHEMA IF NOT EXISTS notificaciones;

CREATE TABLE notificaciones.envios_correo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_notificacion tipo_notificacion NOT NULL,
    correo_destino VARCHAR(255) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado_envio estado_envio NOT NULL,
    mensaje_error TEXT,
    origen_servicio VARCHAR(80) NOT NULL,
    referencia_origen UUID,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    procesado_en TIMESTAMPTZ
);

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW notificaciones.v_envios_exitosos AS
SELECT *
FROM notificaciones.envios_correo
WHERE estado_envio = 'enviado';

CREATE VIEW notificaciones.v_envios_fallidos AS
SELECT *
FROM notificaciones.envios_correo
WHERE estado_envio = 'fallido';

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_envios_correo_estado ON notificaciones.envios_correo(estado_envio);
CREATE INDEX idx_envios_correo_tipo ON notificaciones.envios_correo(tipo_notificacion);
