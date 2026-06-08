-- =========================================================
-- sp_upsert_cache_divisa
--
-- Inserta o actualiza una tasa de cambio en la tabla de caché.
-- Recalcula expira_en como NOW() + ttl_segundos.
--
-- Parámetros de entrada:
--   p_moneda_base    : código ISO 4217 de la moneda base (ej. 'USD')
--   p_moneda_destino : código ISO 4217 de la moneda destino (ej. 'GTQ')
--   p_tasa           : tasa de cambio (unidades de destino por 1 de base)
--   p_ttl_segundos   : tiempo de vida del caché en segundos (default 3600)
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_upsert_cache_divisa(
    IN p_moneda_base    CHAR(3),
    IN p_moneda_destino CHAR(3),
    IN p_tasa           NUMERIC(18, 6),
    IN p_ttl_segundos   INTEGER DEFAULT 3600
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO cache_divisas (moneda_base, moneda_destino, tasa, actualizado_en, expira_en)
    VALUES (
        p_moneda_base,
        p_moneda_destino,
        p_tasa,
        NOW(),
        NOW() + (p_ttl_segundos || ' seconds')::INTERVAL
    )
    ON CONFLICT (moneda_base, moneda_destino) DO UPDATE
        SET tasa           = EXCLUDED.tasa,
            actualizado_en = NOW(),
            expira_en      = NOW() + (p_ttl_segundos || ' seconds')::INTERVAL;
END;
$$;

-- =========================================================
-- sp_registrar_consulta
--
-- Registra en el historial de consultas la tasa utilizada y,
-- opcionalmente, los montos de una conversión.
--
-- Parámetros de entrada:
--   p_moneda_base      : moneda de origen
--   p_moneda_destino   : moneda de destino
--   p_tasa_utilizada   : tasa aplicada en la consulta
--   p_monto_original   : monto antes de la conversión (NULL si solo fue consulta)
--   p_monto_convertido : monto resultante (NULL si solo fue consulta)
--   p_fuente           : 'cache_redis' | 'cache_db' | 'api'
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_registrar_consulta(
    IN p_moneda_base      CHAR(3),
    IN p_moneda_destino   CHAR(3),
    IN p_tasa_utilizada   NUMERIC(18, 6),
    IN p_monto_original   NUMERIC(18, 6) DEFAULT NULL,
    IN p_monto_convertido NUMERIC(18, 6) DEFAULT NULL,
    IN p_fuente           VARCHAR(20)    DEFAULT 'api'
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO historial_consultas (
        moneda_base, moneda_destino,
        tasa_utilizada, monto_original, monto_convertido,
        fuente
    )
    VALUES (
        p_moneda_base, p_moneda_destino,
        p_tasa_utilizada, p_monto_original, p_monto_convertido,
        p_fuente
    );
END;
$$;

-- =========================================================
-- sp_limpiar_cache_expirado
--
-- Elimina todas las entradas de cache_divisas cuyo expira_en
-- ya haya pasado. Útil para mantenimiento periódico.
-- =========================================================

CREATE OR REPLACE PROCEDURE sp_limpiar_cache_expirado()
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM cache_divisas WHERE expira_en <= NOW();
END;
$$;
