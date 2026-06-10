SET search_path TO usuarios, public;

-- Cuenta administrador
-- Contraseña: 12345678 (PBKDF2-SHA256, 100 000 iteraciones)
INSERT INTO usuarios.cuentas (id, nombre, correo, contrasena_hash, pais, rol)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  'admin@quetzaltv.com',
  'pbkdf2_sha256$100000$obLD1OX2obLD1OX2obLD1A==$J3iojt/sSdqjFcQqeoW31Ku3idPY3Ut1052ZcAu9FxI=',
  'Guatemala',
  'administrador'
);

-- Perfil principal del administrador
INSERT INTO usuarios.perfiles (id, cuenta_id, nombre, color, es_principal, activo)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  '#6D28D9',
  TRUE,
  TRUE
);
