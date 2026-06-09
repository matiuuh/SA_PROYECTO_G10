SET search_path TO suscripciones, public;

-- Planes iniciales de Quetzal TV
INSERT INTO suscripciones.planes (id, nombre, descripcion, precio_base, moneda_base, perfiles_maximos)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Básico',   'Calidad HD en 1 pantalla',          7.99,  'USD', 1),
  ('b0000000-0000-0000-0000-000000000002', 'Estándar', 'Full HD en 2 pantallas simultáneas', 12.99, 'USD', 2),
  ('b0000000-0000-0000-0000-000000000003', 'Premium',  '4K + HDR en 4 pantallas',            17.99, 'USD', 4);
