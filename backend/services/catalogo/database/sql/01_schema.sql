-- =========================================================
-- EXTENSIONES
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE tipo_contenido    AS ENUM ('pelicula', 'serie');
CREATE TYPE tipo_reaccion     AS ENUM ('like', 'dislike');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE generos (
    id          BIGSERIAL PRIMARY KEY,
    nombre      VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE reparto (
    id               BIGSERIAL PRIMARY KEY,
    nombre_artistico VARCHAR(150) NOT NULL,
    nombre_real      VARCHAR(150),
    nacionalidad     VARCHAR(80)
);

CREATE TABLE contenidos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo               VARCHAR(200) NOT NULL,
    tipo                 tipo_contenido NOT NULL,
    sinopsis             TEXT NOT NULL,
    ficha_tecnica        TEXT,
    fecha_lanzamiento    DATE,
    clasificacion_edad   VARCHAR(30),
    duracion_minutos     INTEGER,
    idioma               VARCHAR(50),
    url_portada          TEXT,
    url_trailer          TEXT,
    creado_por_cuenta_id UUID,
    creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en         TIMESTAMPTZ,
    CONSTRAINT ck_contenido_video_pelicula CHECK (
        (tipo = 'pelicula' AND duracion_minutos IS NOT NULL)
        OR (tipo = 'serie')
    )
);

CREATE TABLE temporadas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id     UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    numero_temporada SMALLINT NOT NULL,
    titulo           VARCHAR(150),
    descripcion      TEXT,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en     TIMESTAMPTZ,
    CONSTRAINT uq_temporada_por_serie UNIQUE (contenido_id, numero_temporada)
);

CREATE TABLE episodios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada_id     UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
    numero_episodio  SMALLINT NOT NULL,
    titulo           VARCHAR(200) NOT NULL,
    sinopsis         TEXT,
    duracion_minutos INTEGER NOT NULL,
    url_video        TEXT NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en     TIMESTAMPTZ,
    CONSTRAINT uq_episodio_por_temporada UNIQUE (temporada_id, numero_episodio)
);

CREATE TABLE contenido_generos (
    contenido_id UUID   NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    genero_id    BIGINT NOT NULL REFERENCES generos(id) ON DELETE RESTRICT,
    PRIMARY KEY (contenido_id, genero_id)
);

CREATE TABLE contenido_reparto (
    contenido_id UUID   NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    reparto_id   BIGINT NOT NULL REFERENCES reparto(id) ON DELETE RESTRICT,
    personaje    VARCHAR(120),
    PRIMARY KEY (contenido_id, reparto_id)
);

CREATE TABLE calificaciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    perfil_id    UUID NOT NULL,
    reaccion     tipo_reaccion NOT NULL,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calificacion_por_perfil UNIQUE (contenido_id, perfil_id)
);

CREATE TABLE instantaneas (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen  VARCHAR(100) NOT NULL,
    entidad_id    UUID NOT NULL,
    evento        evento_instantanea NOT NULL,
    estado_anterior JSONB,
    estado_nuevo  JSONB,
    usuario_accion UUID,
    fecha_evento  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
DECLARE
    v_actor UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(to_jsonb(OLD)->>'creado_por_cuenta_id', '')::UUID,
            NULLIF(to_jsonb(OLD)->>'perfil_id', '')::UUID
        );
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion)
        VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'eliminacion',
            to_jsonb(OLD),
            NULL,
            v_actor
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(COALESCE(to_jsonb(NEW)->>'creado_por_cuenta_id', to_jsonb(OLD)->>'creado_por_cuenta_id'), '')::UUID,
            NULLIF(COALESCE(to_jsonb(NEW)->>'perfil_id', to_jsonb(OLD)->>'perfil_id'), '')::UUID
        );
        IF to_jsonb(OLD)->>'eliminado_en' IS NULL
           AND to_jsonb(NEW)->>'eliminado_en' IS NOT NULL THEN
            INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion)
            VALUES (
                TG_TABLE_NAME,
                NEW.id,
                'eliminacion',
                to_jsonb(OLD),
                NULL,
                v_actor
            );
            RETURN NEW;
        END IF;

        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion)
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'actualizacion',
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_actor
        );
        RETURN NEW;
    ELSE
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(to_jsonb(NEW)->>'creado_por_cuenta_id', '')::UUID,
            NULLIF(to_jsonb(NEW)->>'perfil_id', '')::UUID
        );
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_anterior, estado_nuevo, usuario_accion)
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'insercion',
            NULL,
            to_jsonb(NEW),
            v_actor
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_total_likes(p_contenido_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM calificaciones
    WHERE contenido_id = p_contenido_id AND reaccion = 'like';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_total_dislikes(p_contenido_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM calificaciones
    WHERE contenido_id = p_contenido_id AND reaccion = 'dislike';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION fn_porcentaje_recomendacion(p_contenido_id UUID)
RETURNS NUMERIC(5,2) AS $$
    SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
            COUNT(*) FILTER (WHERE reaccion = 'like')::NUMERIC / COUNT(*)::NUMERIC * 100,
            2
        )
    END
    FROM calificaciones
    WHERE contenido_id = p_contenido_id;
$$ LANGUAGE sql STABLE;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW v_cartelera_contenido AS
SELECT
    c.id,
    c.titulo,
    c.tipo,
    c.sinopsis,
    c.idioma,
    c.url_portada,
    c.url_trailer,
    c.fecha_lanzamiento,
    fn_porcentaje_recomendacion(c.id) AS porcentaje_recomendacion
FROM contenidos c
WHERE c.eliminado_en IS NULL
  AND (c.fecha_lanzamiento IS NULL OR c.fecha_lanzamiento <= CURRENT_DATE);

CREATE VIEW v_detalle_contenido AS
SELECT
    c.id,
    c.titulo,
    c.tipo,
    c.sinopsis,
    c.ficha_tecnica,
    c.fecha_lanzamiento,
    c.clasificacion_edad,
    c.duracion_minutos,
    c.idioma,
    c.url_portada,
    c.url_trailer,
    fn_total_likes(c.id)              AS total_likes,
    fn_total_dislikes(c.id)           AS total_dislikes,
    fn_porcentaje_recomendacion(c.id) AS porcentaje_recomendacion
FROM contenidos c
WHERE c.eliminado_en IS NULL;

CREATE VIEW v_ficha_actores AS
SELECT
    c.id   AS contenido_id,
    c.titulo,
    r.id   AS reparto_id,
    r.nombre_artistico,
    r.nombre_real,
    r.nacionalidad,
    cr.personaje
FROM contenidos c
JOIN contenido_reparto cr ON cr.contenido_id = c.id
JOIN reparto r             ON r.id = cr.reparto_id
WHERE c.eliminado_en IS NULL;

CREATE VIEW v_episodios_por_serie AS
SELECT
    c.id             AS contenido_id,
    c.titulo         AS serie,
    t.id             AS temporada_id,
    t.numero_temporada,
    e.id             AS episodio_id,
    e.numero_episodio,
    e.titulo,
    e.duracion_minutos,
    e.url_video
FROM contenidos c
JOIN temporadas t ON t.contenido_id = c.id AND t.eliminado_en IS NULL
JOIN episodios  e ON e.temporada_id  = t.id AND e.eliminado_en IS NULL
WHERE c.tipo = 'serie' AND c.eliminado_en IS NULL;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_ts_contenidos
    BEFORE UPDATE ON contenidos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_ts_temporadas
    BEFORE UPDATE ON temporadas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_ts_episodios
    BEFORE UPDATE ON episodios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_ts_calificaciones
    BEFORE UPDATE ON calificaciones
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snap_contenidos
    AFTER INSERT OR UPDATE OR DELETE ON contenidos
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snap_temporadas
    AFTER INSERT OR UPDATE OR DELETE ON temporadas
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snap_episodios
    AFTER INSERT OR UPDATE OR DELETE ON episodios
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snap_calificaciones
    AFTER INSERT OR UPDATE OR DELETE ON calificaciones
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_contenidos_titulo     ON contenidos(titulo);
CREATE INDEX idx_temporadas_contenido  ON temporadas(contenido_id);
CREATE INDEX idx_episodios_temporada   ON episodios(temporada_id);
CREATE INDEX idx_calif_contenido       ON calificaciones(contenido_id);
CREATE INDEX idx_calif_perfil          ON calificaciones(perfil_id);
CREATE INDEX idx_snap_tabla            ON instantaneas(tabla_origen, entidad_id);
CREATE INDEX idx_snap_fecha            ON instantaneas(fecha_evento DESC);
