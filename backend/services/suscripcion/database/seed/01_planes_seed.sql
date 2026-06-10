SET search_path TO suscripciones, public;

INSERT INTO suscripciones.planes (
    id,
    nombre,
    descripcion,
    precio_base,
    moneda_base,
    perfiles_maximos,
    activo
)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'Basico',
        'Plan inicial para una sola persona.',
        4.99,
        'USD',
        1,
        TRUE
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        'Estandar',
        'Plan intermedio para compartir en casa.',
        8.99,
        'USD',
        3,
        TRUE
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
        'Premium',
        'Plan completo con todos los perfiles disponibles.',
        12.99,
        'USD',
        5,
        TRUE
    )
ON CONFLICT (nombre) DO NOTHING;
