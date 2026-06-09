-- =========================================================
-- ENUMS Y ESQUEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE tipo_contenido AS ENUM ('pelicula', 'serie');
CREATE TYPE tipo_reaccion AS ENUM ('like', 'dislike');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE generos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE reparto (
    id BIGSERIAL PRIMARY KEY,
    nombre_artistico VARCHAR(150) NOT NULL,
    nombre_real VARCHAR(150),
    nacionalidad VARCHAR(80)
);

CREATE TABLE contenidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    tipo tipo_contenido NOT NULL,
    sinopsis TEXT NOT NULL,
    ficha_tecnica TEXT,
    fecha_lanzamiento DATE,
    clasificacion_edad VARCHAR(30),
    duracion_minutos INTEGER,
    idioma VARCHAR(50),
    url_portada TEXT,
    url_trailer TEXT,
    creado_por_cuenta_id UUID,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT ck_contenido_video_pelicula CHECK (
        (tipo = 'pelicula' AND duracion_minutos IS NOT NULL)
        OR (tipo = 'serie')
    )
);

CREATE TABLE temporadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    numero_temporada SMALLINT NOT NULL,
    titulo VARCHAR(150),
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT uq_temporada_por_serie UNIQUE (contenido_id, numero_temporada)
);

CREATE TABLE episodios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
    numero_episodio SMALLINT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    sinopsis TEXT,
    duracion_minutos INTEGER NOT NULL,
    url_video TEXT NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT uq_episodio_por_temporada UNIQUE (temporada_id, numero_episodio)
);

CREATE TABLE contenido_generos (
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    genero_id BIGINT NOT NULL REFERENCES generos(id) ON DELETE RESTRICT,
    PRIMARY KEY (contenido_id, genero_id)
);

CREATE TABLE contenido_reparto (
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    reparto_id BIGINT NOT NULL REFERENCES reparto(id) ON DELETE RESTRICT,
    personaje VARCHAR(120),
    PRIMARY KEY (contenido_id, reparto_id)
);

CREATE TABLE calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,
    perfil_id UUID NOT NULL,
    reaccion tipo_reaccion NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_calificacion_por_perfil UNIQUE (contenido_id, perfil_id)
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
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSE
        INSERT INTO instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', to_jsonb(NEW), NOW());
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
        ELSE ROUND((COUNT(*) FILTER (WHERE reaccion = 'like')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
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
WHERE c.eliminado_en IS NULL;

CREATE VIEW v_ficha_actores AS
SELECT
    c.id AS contenido_id,
    c.titulo,
    r.id AS reparto_id,
    r.nombre_artistico,
    r.nombre_real,
    cr.personaje
FROM contenidos c
JOIN contenido_reparto cr ON cr.contenido_id = c.id
JOIN reparto r ON r.id = cr.reparto_id
WHERE c.eliminado_en IS NULL;

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
    fn_total_likes(c.id) AS total_likes,
    fn_total_dislikes(c.id) AS total_dislikes,
    fn_porcentaje_recomendacion(c.id) AS porcentaje_recomendacion
FROM contenidos c
WHERE c.eliminado_en IS NULL;

CREATE VIEW v_episodios_por_serie AS
SELECT
    c.id AS contenido_id,
    c.titulo AS serie,
    t.id AS temporada_id,
    t.numero_temporada,
    e.id AS episodio_id,
    e.numero_episodio,
    e.titulo,
    e.duracion_minutos,
    e.url_video
FROM contenidos c
JOIN temporadas t ON t.contenido_id = c.id AND t.eliminado_en IS NULL
JOIN episodios e ON e.temporada_id = t.id AND e.eliminado_en IS NULL
WHERE c.tipo = 'serie' AND c.eliminado_en IS NULL;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_actualizar_actualizado_en_contenidos
BEFORE UPDATE ON contenidos
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_temporadas
BEFORE UPDATE ON temporadas
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_episodios
BEFORE UPDATE ON episodios
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_calificaciones
BEFORE UPDATE ON calificaciones
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snapshot_contenidos
AFTER INSERT OR UPDATE OR DELETE ON contenidos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_temporadas
AFTER INSERT OR UPDATE OR DELETE ON temporadas
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_episodios
AFTER INSERT OR UPDATE OR DELETE ON episodios
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_calificaciones
AFTER INSERT OR UPDATE OR DELETE ON calificaciones
FOR EACH ROW EXECUTE FUNCTION fn_registrar_instantanea();

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_contenidos_titulo ON contenidos(titulo);
CREATE INDEX idx_temporadas_contenido ON temporadas(contenido_id);
CREATE INDEX idx_episodios_temporada ON episodios(temporada_id);
CREATE INDEX idx_calificaciones_contenido ON calificaciones(contenido_id);
CREATE INDEX idx_calificaciones_perfil ON calificaciones(perfil_id);
CREATE INDEX idx_catalogo_instantaneas_tabla ON instantaneas(tabla_origen, entidad_id);

-- =========================================================
-- PROCEDIMIENTOS
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_registrar_contenido_completo(
    IN  p_titulo             VARCHAR(200),
    IN  p_tipo               tipo_contenido,
    IN  p_sinopsis           TEXT,
    IN  p_ficha_tecnica      TEXT,
    IN  p_fecha_lanzamiento  DATE,
    IN  p_clasificacion_edad VARCHAR(30),
    IN  p_duracion_minutos   INTEGER,
    IN  p_idioma             VARCHAR(50),
    IN  p_url_portada        TEXT,
    IN  p_url_trailer        TEXT,
    IN  p_creado_por         UUID,
    IN  p_genero_ids         BIGINT[],
    INOUT p_id               UUID DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO contenidos (
        titulo, tipo, sinopsis, ficha_tecnica,
        fecha_lanzamiento, clasificacion_edad,
        duracion_minutos, idioma,
        url_portada, url_trailer, creado_por_cuenta_id
    ) VALUES (
        p_titulo, p_tipo, p_sinopsis, p_ficha_tecnica,
        p_fecha_lanzamiento, p_clasificacion_edad,
        p_duracion_minutos, p_idioma,
        p_url_portada, p_url_trailer, p_creado_por
    )
    RETURNING id INTO p_id;

    IF p_genero_ids IS NOT NULL AND array_length(p_genero_ids, 1) > 0 THEN
        INSERT INTO contenido_generos (contenido_id, genero_id)
        SELECT p_id, unnest(p_genero_ids);
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_calificar_contenido(
    IN p_contenido_id UUID,
    IN p_perfil_id    UUID,
    IN p_reaccion     tipo_reaccion
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO calificaciones (contenido_id, perfil_id, reaccion)
    VALUES (p_contenido_id, p_perfil_id, p_reaccion)
    ON CONFLICT (contenido_id, perfil_id) DO UPDATE
        SET reaccion       = EXCLUDED.reaccion,
            actualizado_en = NOW();
END;
$$;
