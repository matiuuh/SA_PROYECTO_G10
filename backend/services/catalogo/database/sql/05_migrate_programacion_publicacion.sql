-- =========================================================
-- Migracion de programacion de publicacion con fecha y hora
-- =========================================================

BEGIN;

DROP VIEW IF EXISTS v_detalle_contenido;
DROP VIEW IF EXISTS v_cartelera_contenido;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'contenidos'
          AND column_name = 'fecha_lanzamiento'
          AND data_type = 'date'
    ) THEN
        ALTER TABLE contenidos
            ALTER COLUMN fecha_lanzamiento TYPE TIMESTAMPTZ
            USING CASE
                WHEN fecha_lanzamiento IS NULL THEN NULL
                ELSE fecha_lanzamiento::timestamp AT TIME ZONE 'America/Guatemala'
            END;
    END IF;
END $$;

CREATE OR REPLACE PROCEDURE sp_registrar_contenido_completo(
    IN  p_titulo               VARCHAR(200),
    IN  p_tipo                 tipo_contenido,
    IN  p_sinopsis             TEXT,
    IN  p_ficha_tecnica        TEXT,
    IN  p_fecha_lanzamiento    TIMESTAMPTZ,
    IN  p_clasificacion_edad   VARCHAR(30),
    IN  p_duracion_minutos     INTEGER,
    IN  p_idioma               VARCHAR(50),
    IN  p_url_portada          TEXT,
    IN  p_url_trailer          TEXT,
    IN  p_creado_por           UUID,
    IN  p_genero_ids           BIGINT[],
    INOUT p_id                 UUID DEFAULT NULL
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

CREATE OR REPLACE VIEW v_cartelera_contenido AS
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
  AND (c.fecha_lanzamiento IS NULL OR c.fecha_lanzamiento <= NOW());

CREATE OR REPLACE VIEW v_detalle_contenido AS
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

CREATE INDEX IF NOT EXISTS idx_contenidos_fecha_lanzamiento
    ON contenidos(fecha_lanzamiento);

COMMIT;
