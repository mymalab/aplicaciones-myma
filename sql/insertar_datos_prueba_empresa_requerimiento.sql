-- Script para insertar datos de prueba en empresa_requerimiento
-- Ejecuta este script en Supabase si no tienes datos de prueba

-- Primero, elimina datos de prueba anteriores (opcional)
-- DELETE FROM empresa_requerimiento WHERE empresa IN ('CODELCO', 'CMP', 'ENAMI');

-- Insertar requerimientos para CODELCO
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, observaciones) 
VALUES 
  ('CODELCO', 'Acreditacion RESSO', 'Carpeta de Arranque', 'JPRO', NULL),
  ('CODELCO', 'Actas CPHS', 'Carpeta de Arranque', 'EPR', NULL),
  ('CODELCO', 'Antecedentes EPR', 'Carpeta de Arranque', 'EPR', NULL),
  ('CODELCO', 'Contrato de Trabajo', 'Documentación Legal', 'RRHH', NULL),
  ('CODELCO', 'Ficha de Ingreso', 'Documentación Legal', 'RRHH', NULL),
  ('CODELCO', 'Revisión Legal', 'Documentación Legal', 'Legal', 'Verificar cláusulas especiales')
ON CONFLICT (empresa, requerimiento, categoria_requerimiento) DO NOTHING;

-- Insertar requerimientos para CMP
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, observaciones) 
VALUES 
  ('CMP', 'Plan de Seguridad', 'Prevención', 'EPR', NULL),
  ('CMP', 'Certificación ISO', 'Calidad', 'JPRO', NULL),
  ('CMP', 'Nómina de Personal', 'RRHH', 'RRHH', NULL)
ON CONFLICT (empresa, requerimiento, categoria_requerimiento) DO NOTHING;

-- Insertar requerimientos para ENAMI
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, observaciones) 
VALUES 
  ('ENAMI', 'Programa de Capacitación', 'Formación', 'RRHH', NULL),
  ('ENAMI', 'Evaluación de Riesgos', 'Prevención', 'EPR', NULL),
  ('ENAMI', 'Documentación Ambiental', 'Medio Ambiente', 'JPRO', NULL)
ON CONFLICT (empresa, requerimiento, categoria_requerimiento) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT 
  empresa,
  COUNT(*) as total_requerimientos
FROM empresa_requerimiento 
GROUP BY empresa
ORDER BY empresa;

