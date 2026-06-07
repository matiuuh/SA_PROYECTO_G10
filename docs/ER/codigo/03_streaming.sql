CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE estado_historial AS ENUM ('en_progreso', 'finalizado');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE SCHEMA IF NOT EXISTS streaming;

CREATE TABLE streaming.historial_reproduccion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id UUID NOT NULL,
    contenido_id UUID NOT NULL,
    episodio_id UUID,
    estado estado_historial NOT NULL DEFAULT 'en_progreso',
    progreso_segundos INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_historial_perfil_recurso UNIQUE (perfil_id, contenido_id, episodio_id),
    CONSTRAINT ck_progreso_segundos CHECK (progreso_segundos >= 0)
);

CREATE TABLE streaming.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historial_perfil ON streaming.historial_reproduccion(perfil_id);
CREATE INDEX idx_historial_contenido ON streaming.historial_reproduccion(contenido_id);
CREATE INDEX idx_historial_episodio ON streaming.historial_reproduccion(episodio_id);
CREATE INDEX idx_streaming_instantaneas_tabla ON streaming.instantaneas(tabla_origen, entidad_id);
