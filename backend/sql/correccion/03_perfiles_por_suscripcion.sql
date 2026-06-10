ALTER TABLE usuarios.perfiles
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE VIEW usuarios.v_perfiles_disponibles AS
SELECT
    p.id,
    p.cuenta_id,
    p.nombre,
    p.color,
    p.es_principal,
    p.activo,
    p.creado_en,
    p.actualizado_en
FROM usuarios.perfiles p
JOIN usuarios.cuentas c ON c.id = p.cuenta_id
WHERE p.eliminado_en IS NULL
  AND p.activo = TRUE
  AND c.eliminado_en IS NULL;
