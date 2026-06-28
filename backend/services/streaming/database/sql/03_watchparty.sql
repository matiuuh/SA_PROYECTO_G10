-- Watch Party — salas de visualización sincronizada
CREATE TABLE IF NOT EXISTS salas_watch_party (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creador_perfil_id     UUID NOT NULL,
    creador_cuenta_id     UUID NOT NULL,
    contenido_id          UUID NOT NULL,
    tipo_contenido        VARCHAR(20) NOT NULL DEFAULT 'pelicula',
    codigo_invite         VARCHAR(10) NOT NULL UNIQUE,
    estado                VARCHAR(20) NOT NULL DEFAULT 'activa',
    estado_reproduccion   VARCHAR(20) NOT NULL DEFAULT 'pausada',
    posicion_segundos     INTEGER NOT NULL DEFAULT 0,
    duracion_segundos     INTEGER NOT NULL DEFAULT 0,
    creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_sala_estado CHECK (estado IN ('activa', 'finalizada')),
    CONSTRAINT ck_sala_reproduccion CHECK (estado_reproduccion IN ('reproduciendo', 'pausada', 'finalizada'))
);

CREATE TABLE IF NOT EXISTS participantes_watch_party (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sala_id           UUID NOT NULL REFERENCES salas_watch_party(id) ON DELETE CASCADE,
    perfil_id         UUID NOT NULL,
    perfil_nombre     VARCHAR(80) NOT NULL,
    cuenta_id         UUID NOT NULL,
    es_anfitrion      BOOLEAN NOT NULL DEFAULT FALSE,
    conectado         BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_latido     TIMESTAMPTZ,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_participante_sala UNIQUE (sala_id, perfil_id)
);

-- Función para generar código de invitación único
CREATE OR REPLACE FUNCTION fn_generar_codigo_invite()
RETURNS VARCHAR(10) AS $$
DECLARE
    v_codigo VARCHAR(10);
BEGIN
    LOOP
        v_codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        IF NOT EXISTS (SELECT 1 FROM salas_watch_party WHERE codigo_invite = v_codigo AND estado = 'activa') THEN
            RETURN v_codigo;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_salas_codigo ON salas_watch_party(codigo_invite) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_salas_contenido ON salas_watch_party(contenido_id);
CREATE INDEX IF NOT EXISTS idx_participantes_sala ON participantes_watch_party(sala_id);
CREATE INDEX IF NOT EXISTS idx_participantes_perfil ON participantes_watch_party(perfil_id);
