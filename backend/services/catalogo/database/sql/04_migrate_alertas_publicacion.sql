-- Agrega control persistente para no duplicar alertas de nuevo contenido.
-- docker-entrypoint-initdb.d solo corre con volumen vacio; este script es idempotente
-- para bases ya creadas.

ALTER TABLE contenidos
    ADD COLUMN IF NOT EXISTS alerta_publicacion_enviada_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contenidos_alerta_publicacion
    ON contenidos(fecha_lanzamiento)
    WHERE eliminado_en IS NULL AND alerta_publicacion_enviada_en IS NULL;
