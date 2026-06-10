SET search_path TO usuarios, public;

INSERT INTO usuarios.cuentas (
    id,
    nombre,
    correo,
    contrasena_hash,
    pais,
    rol
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Administrador Quetzal TV',
    'yahirlopez380@gmail.com',
    'pbkdf2_sha256$100000$xVhLIS4iEnEhQlsA4mSTeQ==$eSjbtVVO+WXnUCGzIYZ2Tp/GDTcbmkM9TFtj9/94Tz0=',
    'Guatemala',
    'administrador'
)
ON CONFLICT (correo) DO NOTHING;

INSERT INTO usuarios.perfiles (
    id,
    cuenta_id,
    nombre,
    color,
    es_principal,
    activo
)
VALUES (
    '11111111-1111-1111-1111-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Administrador Quetzal',
    '#1D4ED8',
    TRUE,
    TRUE
)
ON CONFLICT (cuenta_id, nombre) DO NOTHING;
