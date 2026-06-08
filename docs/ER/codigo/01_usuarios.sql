-- =========
-- TABLAS
-- =======

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE rol_cuenta AS ENUM ('usuario', 'administrador');
CREATE TYPE metodo_autenticacion AS ENUM ('credenciales', 'oauth');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

CREATE SCHEMA IF NOT EXISTS usuarios;

CREATE TABLE usuarios.cuentas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    pais VARCHAR(100) NOT NULL,
    rol rol_cuenta NOT NULL DEFAULT 'usuario',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ
);

CREATE TABLE usuarios.sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES usuarios.cuentas(id) ON DELETE CASCADE,
    metodo metodo_autenticacion NOT NULL,
    iniciada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_en TIMESTAMPTZ NOT NULL,
    cerrada_en TIMESTAMPTZ
);

CREATE TABLE usuarios.perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES usuarios.cuentas(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    color VARCHAR(7) DEFAULT '#6D28D9',
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT uq_perfil_nombre_por_cuenta UNIQUE (cuenta_id, nombre)
);

CREATE UNIQUE INDEX uq_perfil_principal_por_cuenta
ON usuarios.perfiles(cuenta_id)
WHERE es_principal = TRUE;

CREATE TABLE usuarios.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========
-- FUNCIONES
-- =======

CREATE OR REPLACE FUNCTION usuarios.fn_actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION usuarios.fn_registrar_instantanea()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO usuarios.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, OLD.id, 'eliminacion', to_jsonb(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO usuarios.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'actualizacion', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSE
        INSERT INTO usuarios.instantaneas (tabla_origen, entidad_id, evento, estado_nuevo, fecha_evento)
        VALUES (TG_TABLE_NAME, NEW.id, 'insercion', to_jsonb(NEW), NOW());
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- =========
-- VISTAS
-- =======

CREATE VIEW usuarios.v_cuentas_activas AS
SELECT id, nombre, correo, pais, rol, creado_en, actualizado_en
FROM usuarios.cuentas
WHERE eliminado_en IS NULL;

CREATE VIEW usuarios.v_perfiles_disponibles AS
SELECT p.id, p.cuenta_id, p.nombre, p.color, p.es_principal, p.creado_en, p.actualizado_en
FROM usuarios.perfiles p
JOIN usuarios.cuentas c ON c.id = p.cuenta_id
WHERE p.eliminado_en IS NULL
  AND c.eliminado_en IS NULL;

-- =========
-- TRIGGERS
-- =======

CREATE TRIGGER trg_actualizar_actualizado_en_cuentas
BEFORE UPDATE ON usuarios.cuentas
FOR EACH ROW EXECUTE FUNCTION usuarios.fn_actualizar_actualizado_en();

CREATE TRIGGER trg_actualizar_actualizado_en_perfiles
BEFORE UPDATE ON usuarios.perfiles
FOR EACH ROW EXECUTE FUNCTION usuarios.fn_actualizar_actualizado_en();

CREATE TRIGGER trg_snapshot_cuentas
AFTER INSERT OR UPDATE OR DELETE ON usuarios.cuentas
FOR EACH ROW EXECUTE FUNCTION usuarios.fn_registrar_instantanea();

CREATE TRIGGER trg_snapshot_perfiles
AFTER INSERT OR UPDATE OR DELETE ON usuarios.perfiles
FOR EACH ROW EXECUTE FUNCTION usuarios.fn_registrar_instantanea();

-- =========
-- ÍNDICES
-- =======

CREATE INDEX idx_cuentas_correo ON usuarios.cuentas(correo);
CREATE INDEX idx_perfiles_cuenta ON usuarios.perfiles(cuenta_id);
CREATE INDEX idx_sesiones_cuenta ON usuarios.sesiones(cuenta_id);
CREATE INDEX idx_usuarios_instantaneas_tabla ON usuarios.instantaneas(tabla_origen, entidad_id);
