-- Migración idempotente para instalaciones existentes de catalogo.
-- docker-entrypoint-initdb.d solo se ejecuta cuando el volumen está vacío;
-- este archivo también es ejecutado por el servicio catalogo-migrations.

BEGIN;

ALTER TABLE instantaneas
    ADD COLUMN IF NOT EXISTS estado_anterior JSONB;

CREATE OR REPLACE FUNCTION fn_registrar_instantanea()
RETURNS TRIGGER AS $$
DECLARE
    v_actor UUID;
    v_old JSONB;
    v_new JSONB;
BEGIN
    v_old := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;

    IF TG_OP = 'DELETE' THEN
        v_actor := COALESCE(
            NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
            NULLIF(v_old->>'creado_por_cuenta_id', '')::UUID,
            NULLIF(v_old->>'perfil_id', '')::UUID
        );

        INSERT INTO instantaneas (
            tabla_origen, entidad_id, evento,
            estado_anterior, estado_nuevo, usuario_accion
        )
        VALUES (
            TG_TABLE_NAME, OLD.id, 'eliminacion',
            v_old, NULL, v_actor
        );
        RETURN OLD;
    END IF;

    v_actor := COALESCE(
        NULLIF(current_setting('app.usuario_accion', true), '')::UUID,
        NULLIF(v_new->>'creado_por_cuenta_id', '')::UUID,
        NULLIF(v_new->>'perfil_id', '')::UUID,
        NULLIF(v_old->>'creado_por_cuenta_id', '')::UUID,
        NULLIF(v_old->>'perfil_id', '')::UUID
    );

    IF TG_OP = 'UPDATE'
       AND v_old->>'eliminado_en' IS NULL
       AND v_new->>'eliminado_en' IS NOT NULL THEN
        INSERT INTO instantaneas (
            tabla_origen, entidad_id, evento,
            estado_anterior, estado_nuevo, usuario_accion
        )
        VALUES (
            TG_TABLE_NAME, NEW.id, 'eliminacion',
            v_old, NULL, v_actor
        );
        RETURN NEW;
    END IF;

    INSERT INTO instantaneas (
        tabla_origen, entidad_id, evento,
        estado_anterior, estado_nuevo, usuario_accion
    )
    VALUES (
        TG_TABLE_NAME,
        NEW.id,
        CASE
            WHEN TG_OP = 'UPDATE' THEN 'actualizacion'::evento_instantanea
            ELSE 'insercion'::evento_instantanea
        END,
        v_old,
        v_new,
        v_actor
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_snap_fecha
    ON instantaneas(fecha_evento DESC);

COMMIT;
