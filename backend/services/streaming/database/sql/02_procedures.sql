-- =========================================================
-- sp_upsert_progreso
--
-- Inserta o actualiza el progreso de reproduccion de un perfil
-- para un contenido o episodio especifico.
--
-- La logica de estado es:
--   - Si progreso >= 90% de la duracion total -> 'finalizado'
--   - En cualquier otro caso                  -> 'en_progreso'
--
-- Parametros:
--   p_perfil_id                : perfil que reproduce
--   p_contenido_id             : pelicula o serie
--   p_episodio_id              : NULL para peliculas, UUID para episodios
--   p_progreso_segundos        : segundo actual de reproduccion
--   p_duracion_total_segundos  : duracion total del recurso (0 si desconocida)
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_upsert_progreso(
    IN p_perfil_id                UUID,
    IN p_contenido_id             UUID,
    IN p_episodio_id              UUID,
    IN p_progreso_segundos        INTEGER,
    IN p_duracion_total_segundos  INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_estado estado_historial := 'en_progreso';
BEGIN
    IF p_duracion_total_segundos > 0 AND
       (p_progreso_segundos::FLOAT / p_duracion_total_segundos) >= 0.90
    THEN
        v_estado := 'finalizado';
    END IF;

    INSERT INTO historial_reproduccion
        (perfil_id, contenido_id, episodio_id, progreso_segundos, estado)
    VALUES
        (p_perfil_id, p_contenido_id, p_episodio_id, p_progreso_segundos, v_estado)
    ON CONFLICT (perfil_id, contenido_id, episodio_id) DO UPDATE
        SET progreso_segundos = EXCLUDED.progreso_segundos,
            estado            = v_estado,
            actualizado_en    = NOW();
END;
$$;
