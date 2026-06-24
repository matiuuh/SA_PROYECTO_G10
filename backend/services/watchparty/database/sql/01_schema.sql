-- =========================================================
-- ESQUEMA: watchparty_db
-- Salas de reproducción sincronizada (Watch Party).
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE salas_watch_party (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creador_perfil_id  UUID NOT NULL,
    creador_cuenta_id  UUID NOT NULL,
    contenido_id       UUID NOT NULL,
    tipo_contenido     VARCHAR(20) NOT NULL DEFAULT 'pelicula', -- pelicula / serie
    codigo_invite      VARCHAR(10) UNIQUE NOT NULL,
    estado             VARCHAR(20) NOT NULL DEFAULT 'activa', -- activa / finalizada
    estado_reproduccion VARCHAR(20) NOT NULL DEFAULT 'pausada', -- reproduciendo / pausada / finalizada
    posicion_segundos  INT NOT NULL DEFAULT 0,
    duracion_segundos  INT NOT NULL DEFAULT 0,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE participantes_watch_party (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sala_id         UUID NOT NULL REFERENCES salas_watch_party(id) ON DELETE CASCADE,
    perfil_id       UUID NOT NULL,
    perfil_nombre   VARCHAR(80) NOT NULL,
    cuenta_id       UUID NOT NULL,
    es_anfitrion    BOOLEAN NOT NULL DEFAULT FALSE,
    conectado       BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_latido   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_salas_codigo ON salas_watch_party (codigo_invite);
CREATE INDEX idx_salas_creador ON salas_watch_party (creador_perfil_id);
CREATE INDEX idx_salas_estado ON salas_watch_party (estado);
CREATE INDEX idx_participantes_sala ON participantes_watch_party (sala_id);
CREATE INDEX idx_participantes_perfil ON participantes_watch_party (perfil_id);
CREATE INDEX idx_participantes_conectado ON participantes_watch_party (sala_id, conectado);

-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION fn_generar_codigo_invite()
RETURNS VARCHAR(10) AS $$
DECLARE
    v_codigo VARCHAR(10);
    v_intentos INT := 0;
BEGIN
    LOOP
        v_codigo := upper(substr(md5(random()::text), 1, 8));
        IF NOT EXISTS (SELECT 1 FROM salas_watch_party WHERE codigo_invite = v_codigo) THEN
            RETURN v_codigo;
        END IF;
        v_intentos := v_intentos + 1;
        IF v_intentos > 10 THEN
            RAISE EXCEPTION 'No se pudo generar un codigo unico';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
