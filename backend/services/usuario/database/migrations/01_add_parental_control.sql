-- =========================================================
-- MIGRACION: Control Parental
-- Agrega columnas para PIN restrictivo y control parental
-- =========================================================

SET search_path TO usuarios, public;

ALTER TABLE usuarios.perfiles
    ADD COLUMN IF NOT EXISTS pin_restrictivo VARCHAR(60),
    ADD COLUMN IF NOT EXISTS control_parental VARCHAR(20),
    ADD CONSTRAINT ck_perfiles_control_parental CHECK (
        control_parental IS NULL OR control_parental IN ('TP', 'PG-13', 'R')
    );
