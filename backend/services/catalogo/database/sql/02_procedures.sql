-- =========================================================
-- sp_registrar_contenido_completo
--
-- Registra una pelicula o serie junto con sus generos en una
-- sola transaccion atomica. Evita inserciones parciales si
-- alguno de los genero_ids no existe (RESTRICT en FK).
--
-- Parametros de entrada:
--   p_titulo, p_tipo, p_sinopsis, p_ficha_tecnica,
--   p_fecha_lanzamiento, p_clasificacion_edad,
--   p_duracion_minutos, p_idioma, p_url_portada, p_url_trailer,
--   p_creado_por     : UUID de la cuenta administradora
--   p_genero_ids     : arreglo de IDs de genero a asociar
--
-- Parametro de salida:
--   p_id             : UUID asignado al nuevo contenido
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_registrar_contenido_completo(
    IN  p_titulo               VARCHAR(200),
    IN  p_tipo                 tipo_contenido,
    IN  p_sinopsis             TEXT,
    IN  p_ficha_tecnica        TEXT,
    IN  p_fecha_lanzamiento    TIMESTAMPTZ,  -- ← Cambiado de DATE a TIMESTAMPTZ
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

-- =========================================================
-- sp_calificar_contenido
--
-- Inserta o actualiza la calificacion de un perfil sobre un
-- contenido. Un perfil solo puede tener una reaccion vigente
-- (uq_calificacion_por_perfil). Si ya existe, la reemplaza.
-- =========================================================

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
