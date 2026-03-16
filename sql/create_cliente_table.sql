-- Script SQL para crear la tabla cliente en Supabase
-- Ejecutar este script en Supabase SQL Editor si la tabla no existe

-- Crear tabla cliente (si no existe)
CREATE TABLE IF NOT EXISTS cliente (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rut TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_cliente_nombre ON cliente(nombre);
CREATE INDEX IF NOT EXISTS idx_cliente_rut ON cliente(rut);

-- Agregar comentarios para documentación
COMMENT ON TABLE cliente IS 'Tabla de clientes/empresas contratistas';
COMMENT ON COLUMN cliente.id IS 'ID único del cliente';
COMMENT ON COLUMN cliente.nombre IS 'Nombre de la empresa o cliente';
COMMENT ON COLUMN cliente.rut IS 'RUT de la empresa';
COMMENT ON COLUMN cliente.direccion IS 'Dirección de la empresa';
COMMENT ON COLUMN cliente.telefono IS 'Teléfono de contacto';
COMMENT ON COLUMN cliente.email IS 'Email de contacto';

-- Insertar datos de ejemplo (opcional - puedes comentar esto si ya tienes datos)
INSERT INTO cliente (nombre, rut) VALUES
  ('Tech Mining SpA', '76.123.456-7'),
  ('Servicios Logísticos del Norte', '77.234.567-8'),
  ('GeoConsulting Ltda.', '78.345.678-9'),
  ('Construcciones del Sur Limitada', '79.456.789-0'),
  ('Ingeniería Total S.A.', '80.567.890-1'),
  ('Transportes y Logística Norte Chile', '81.678.901-2'),
  ('Mantenciones Industriales ProService', '82.789.012-3'),
  ('Energía Renovable del Pacífico', '83.890.123-4'),
  ('Seguridad Integral Profesional', '84.901.234-5'),
  ('Equipos Pesados y Maquinaria Ltda.', '85.012.345-6')
ON CONFLICT DO NOTHING;

-- Verificar que la tabla se creó correctamente
SELECT * FROM cliente ORDER BY nombre;

