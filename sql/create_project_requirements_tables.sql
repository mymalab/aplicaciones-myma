-- Script SQL para crear la tabla empresa_requerimiento y poblar datos
-- Ejecutar este script en Supabase SQL Editor
-- NOTA: La tabla proyecto_requerimientos_acreditacion ya existe según tu esquema

-- 1. Tabla empresa_requerimiento: Define los requerimientos estándar por empresa
CREATE TABLE IF NOT EXISTS empresa_requerimiento (
  id SERIAL PRIMARY KEY,
  empresa TEXT NOT NULL,
  requerimiento TEXT NOT NULL,
  categoria_requerimiento TEXT NOT NULL,
  responsable TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_empresa_req_empresa ON empresa_requerimiento(empresa);
CREATE INDEX IF NOT EXISTS idx_empresa_req_responsable ON empresa_requerimiento(responsable);

-- Comentarios
COMMENT ON TABLE empresa_requerimiento IS 'Requerimientos estándar por empresa cliente';

-- NOTA: La tabla proyecto_requerimientos_acreditacion ya existe con este esquema:
-- - id (bigint generated always as identity)
-- - codigo_proyecto (text not null)
-- - requerimiento (text not null)
-- - responsable (text not null)
-- - estado (text null)
-- - created_at (timestamp with time zone default now())
-- - updated_at (timestamp with time zone default now())
-- - cliente (text not null)
-- - categoria_requerimiento (text null)
-- - observaciones (text null)
-- - nombre_responsable (text null)
-- - CONSTRAINT uq_proyecto_requerimiento UNIQUE (codigo_proyecto, requerimiento)

-- Datos de ejemplo para empresa_requerimiento
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, orden) VALUES
  -- CMP
  ('CMP', 'Inducción General CMP', 'Capacitación', 'JPRO', 1),
  ('CMP', 'Examen Pre-ocupacional', 'Salud', 'EPR', 2),
  ('CMP', 'Licencia de Conducir Clase B', 'Conducción', 'JPRO', 3),
  ('CMP', 'Curso Trabajo en Altura', 'Capacitación', 'EPR', 4),
  ('CMP', 'Contrato de Trabajo', 'Legal', 'RRHH', 5),
  ('CMP', 'Certificado Antecedentes', 'Legal', 'Legal', 6),
  
  -- CODELCO
  ('CODELCO', 'Inducción CODELCO', 'Capacitación', 'JPRO', 1),
  ('CODELCO', 'Examen Psicosensométrico', 'Salud', 'EPR', 2),
  ('CODELCO', 'Certificación Operador Equipos', 'Capacitación', 'JPRO', 3),
  ('CODELCO', 'Curso Primeros Auxilios', 'Capacitación', 'EPR', 4),
  ('CODELCO', 'Finiquito Trabajos Anteriores', 'Legal', 'RRHH', 5),
  ('CODELCO', 'Seguro Complementario', 'Legal', 'Legal', 6),
  
  -- ENAMI
  ('ENAMI', 'Inducción ENAMI', 'Capacitación', 'JPRO', 1),
  ('ENAMI', 'Examen Médico Ocupacional', 'Salud', 'EPR', 2),
  ('ENAMI', 'Capacitación en Riesgos Específicos', 'Capacitación', 'EPR', 3),
  ('ENAMI', 'Contrato Faena', 'Legal', 'RRHH', 4),
  
  -- HMC S.A
  ('HMC S.A', 'Inducción HMC', 'Capacitación', 'JPRO', 1),
  ('HMC S.A', 'Evaluación Médica', 'Salud', 'EPR', 2),
  ('HMC S.A', 'Curso Manejo Defensivo', 'Conducción', 'JPRO', 3),
  ('HMC S.A', 'Declaración Jurada Simple', 'Legal', 'Legal', 4),
  
  -- KINROSS
  ('KINROSS', 'Inducción KINROSS', 'Capacitación', 'JPRO', 1),
  ('KINROSS', 'Examen Altura Física', 'Salud', 'EPR', 2),
  ('KINROSS', 'Certificación Trabajo en Altura', 'Capacitación', 'EPR', 3),
  ('KINROSS', 'Contrato Individual', 'Legal', 'RRHH', 4),
  ('KINROSS', 'Afiliación Mutual', 'Legal', 'Legal', 5),
  
  -- LAS CENIZAS
  ('LAS CENIZAS', 'Inducción Las Cenizas', 'Capacitación', 'JPRO', 1),
  ('LAS CENIZAS', 'Control Médico', 'Salud', 'EPR', 2),
  ('LAS CENIZAS', 'Curso Prevención de Riesgos', 'Capacitación', 'EPR', 3),
  
  -- MLP
  ('MLP', 'Inducción MLP', 'Capacitación', 'JPRO', 1),
  ('MLP', 'Evaluación Psicológica', 'Salud', 'EPR', 2),
  ('MLP', 'Licencia Conducir Vigente', 'Conducción', 'JPRO', 3),
  ('MLP', 'Contrato MLP', 'Legal', 'RRHH', 4),
  ('MLP', 'Certificado Estudios', 'Legal', 'Legal', 5)
ON CONFLICT DO NOTHING;

-- Verificar datos
SELECT empresa, COUNT(*) as cantidad_requerimientos 
FROM empresa_requerimiento 
GROUP BY empresa 
ORDER BY empresa;

SELECT * FROM empresa_requerimiento ORDER BY empresa, orden;

