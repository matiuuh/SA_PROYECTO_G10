-- =========================================================
-- ESQUEMA: divisas_db
-- Tabla de caché de tasas de cambio (respaldo y auditoría).
-- Redis es el caché principal (TTL 3600 s); esta tabla sirve
-- como respaldo durable y registro histórico de las tasas.
-- =========================================================

-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE cache_divisas (
    moneda_base    CHAR(3)        NOT NULL,
    moneda_destino CHAR(3)        NOT NULL,
    tasa           NUMERIC(18, 6) NOT NULL,
    actualizado_en TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    expira_en      TIMESTAMPTZ    NOT NULL,
    PRIMARY KEY (moneda_base, moneda_destino)
);

-- Historial de consultas para análisis de uso
CREATE TABLE historial_consultas (
    id             BIGSERIAL    PRIMARY KEY,
    moneda_base    CHAR(3)      NOT NULL,
    moneda_destino CHAR(3)      NOT NULL,
    tasa_utilizada NUMERIC(18, 6) NOT NULL,
    monto_original NUMERIC(18, 6),
    monto_convertido NUMERIC(18, 6),
    fuente         VARCHAR(20)  NOT NULL DEFAULT 'api', -- 'cache_redis' | 'cache_db' | 'api'
    consultado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_cache_divisas_expira
    ON cache_divisas (expira_en);

CREATE INDEX idx_cache_divisas_base
    ON cache_divisas (moneda_base);

CREATE INDEX idx_historial_monedas
    ON historial_consultas (moneda_base, moneda_destino);

CREATE INDEX idx_historial_fecha
    ON historial_consultas (consultado_en DESC);

-- =========================================================
-- FUNCIONES
-- =========================================================

-- Devuelve TRUE si la entrada del caché de BD aún es válida.
CREATE OR REPLACE FUNCTION fn_cache_vigente(
    p_moneda_base    CHAR(3),
    p_moneda_destino CHAR(3)
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM cache_divisas
        WHERE moneda_base    = p_moneda_base
          AND moneda_destino = p_moneda_destino
          AND expira_en      > NOW()
    );
$$ LANGUAGE sql STABLE;

-- Calcula el promedio de tasa utilizada en un rango de fechas.
CREATE OR REPLACE FUNCTION fn_tasa_promedio(
    p_moneda_base    CHAR(3),
    p_moneda_destino CHAR(3),
    p_desde          TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    p_hasta          TIMESTAMPTZ DEFAULT NOW()
)
RETURNS NUMERIC(18, 6) AS $$
    SELECT ROUND(AVG(tasa_utilizada), 6)
    FROM historial_consultas
    WHERE moneda_base    = p_moneda_base
      AND moneda_destino = p_moneda_destino
      AND consultado_en BETWEEN p_desde AND p_hasta;
$$ LANGUAGE sql STABLE;

-- =========================================================
-- VISTAS
-- =========================================================

-- Vista de tasas vigentes (no expiradas)
CREATE VIEW v_tasas_vigentes AS
SELECT
    moneda_base,
    moneda_destino,
    tasa,
    actualizado_en,
    expira_en,
    EXTRACT(EPOCH FROM (expira_en - NOW()))::INTEGER AS segundos_restantes
FROM cache_divisas
WHERE expira_en > NOW();

-- Vista de monedas disponibles (pares únicos registrados)
CREATE VIEW v_monedas_disponibles AS
SELECT DISTINCT moneda_base AS moneda
FROM cache_divisas
UNION
SELECT DISTINCT moneda_destino
FROM cache_divisas
ORDER BY moneda;

-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE OR REPLACE FUNCTION fn_actualizar_ts_cache()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ts_cache_divisas
    BEFORE UPDATE ON cache_divisas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_ts_cache();
