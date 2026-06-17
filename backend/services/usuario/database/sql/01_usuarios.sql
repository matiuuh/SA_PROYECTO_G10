-- =========================================================
-- ESQUEMA Y CONFIGURACION
-- =========================================================

CREATE SCHEMA IF NOT EXISTS usuarios;
SET search_path TO usuarios, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- TIPOS
-- =========================================================

CREATE TYPE rol_cuenta AS ENUM ('usuario', 'administrador');
CREATE TYPE metodo_autenticacion AS ENUM ('credenciales', 'oauth');
CREATE TYPE evento_instantanea AS ENUM ('insercion', 'actualizacion', 'eliminacion');

-- =========================================================
-- TABLAS
-- =========================================================

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

CREATE TABLE usuarios.perfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES usuarios.cuentas(id) ON DELETE CASCADE,
    nombre VARCHAR(80) NOT NULL,
    color VARCHAR(7) DEFAULT '#6D28D9',
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    eliminado_en TIMESTAMPTZ,
    CONSTRAINT uq_perfil_nombre_por_cuenta UNIQUE (cuenta_id, nombre),
    CONSTRAINT ck_perfiles_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE usuarios.sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id UUID NOT NULL REFERENCES usuarios.cuentas(id) ON DELETE CASCADE,
    perfil_id UUID REFERENCES usuarios.perfiles(id) ON DELETE SET NULL,
    metodo metodo_autenticacion NOT NULL,
    iniciada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_en TIMESTAMPTZ NOT NULL,
    cerrada_en TIMESTAMPTZ
);

CREATE TABLE usuarios.instantaneas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_origen VARCHAR(100) NOT NULL,
    entidad_id UUID NOT NULL,
    evento evento_instantanea NOT NULL,
    estado_anterior JSONB,
    estado_nuevo JSONB,
    usuario_accion UUID,
    fecha_evento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- INDICES
-- =========================================================

CREATE UNIQUE INDEX uq_perfil_principal_por_cuenta
ON usuarios.perfiles(cuenta_id)
WHERE es_principal = TRUE;

CREATE INDEX idx_cuentas_correo ON usuarios.cuentas(correo);
CREATE INDEX idx_perfiles_cuenta ON usuarios.perfiles(cuenta_id);
CREATE INDEX idx_sesiones_cuenta ON usuarios.sesiones(cuenta_id);
CREATE INDEX idx_usuarios_instantaneas_tabla
ON usuarios.instantaneas(tabla_origen, entidad_id);

-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION usuarios.fn_actualizar_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION usuarios.fn_registrar_instantanea()
RETURNS TRIGGER AS $$
DECLARE
    v_actor UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(to_jsonb(OLD)->>'cuenta_id', '')::UUID,
            NULLIF(to_jsonb(OLD)->>'id', '')::UUID
        );

        INSERT INTO usuarios.instantaneas (
            tabla_origen,
            entidad_id,
            evento,
            estado_anterior,
            estado_nuevo,
            usuario_accion,
            fecha_evento
        )
        VALUES (
            TG_TABLE_NAME,
            OLD.id,
            'eliminacion',
            to_jsonb(OLD),
            NULL,
            v_actor,
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(COALESCE(to_jsonb(NEW)->>'cuenta_id', to_jsonb(OLD)->>'cuenta_id'), '')::UUID,
            NULLIF(COALESCE(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id'), '')::UUID
        );

        IF to_jsonb(OLD)->>'eliminado_en' IS NULL AND to_jsonb(NEW)->>'eliminado_en' IS NOT NULL THEN
            INSERT INTO usuarios.instantaneas (
                tabla_origen,
                entidad_id,
                evento,
                estado_anterior,
                estado_nuevo,
                usuario_accion,
                fecha_evento
            )
            VALUES (
                TG_TABLE_NAME,
                NEW.id,
                'eliminacion',
                to_jsonb(OLD),
                NULL,
                v_actor,
                NOW()
            );
            RETURN NEW;
        END IF;

        INSERT INTO usuarios.instantaneas (
            tabla_origen,
            entidad_id,
            evento,
            estado_anterior,
            estado_nuevo,
            usuario_accion,
            fecha_evento
        )
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'actualizacion',
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_actor,
            NOW()
        );
        RETURN NEW;
    ELSE
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(to_jsonb(NEW)->>'cuenta_id', '')::UUID,
            NULLIF(to_jsonb(NEW)->>'id', '')::UUID
        );

        INSERT INTO usuarios.instantaneas (
            tabla_origen,
            entidad_id,
            evento,
            estado_anterior,
            estado_nuevo,
            usuario_accion,
            fecha_evento
        )
        VALUES (
            TG_TABLE_NAME,
            NEW.id,
            'insercion',
            NULL,
            to_jsonb(NEW),
            v_actor,
            NOW()
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- VISTAS
-- =========================================================

CREATE VIEW usuarios.v_cuentas_activas AS
SELECT id, nombre, correo, pais, rol, creado_en, actualizado_en
FROM usuarios.cuentas
WHERE eliminado_en IS NULL;

CREATE VIEW usuarios.v_perfiles_disponibles AS
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

-- =========================================================
-- TRIGGERS
-- =========================================================

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
