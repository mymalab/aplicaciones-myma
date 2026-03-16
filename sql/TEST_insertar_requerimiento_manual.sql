-- Script de PRUEBA para insertar manualmente un requerimiento
-- Ejecuta este script en Supabase SQL Editor para probar que la tabla funciona

-- PASO 1: Ver la estructura de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'proyecto_requerimientos_acreditacion'
ORDER BY ordinal_position;

-- PASO 2: Ver constraints actuales
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'proyecto_requerimientos_acreditacion'::regclass;

-- PASO 3: Intentar insertar un registro de prueba
-- Cambia 'MYMA-18' por tu código de proyecto real
INSERT INTO proyecto_requerimientos_acreditacion (
  codigo_proyecto,
  requerimiento,
  responsable,
  estado,
  cliente,
  categoria_requerimiento,
  observaciones,
  nombre_responsable,
  id_proyecto,
  nombre_trabajador,
  categoria_empresa,
  id_proyecto_trabajador
) VALUES (
  'TEST-MANUAL',
  'Requerimiento de prueba manual',
  'JPRO',
  'Pendiente',
  'Cliente Test',
  'Documentos',
  'Prueba manual desde SQL',
  'Juan Pérez Test',
  NULL,
  NULL,
  NULL,
  NULL
)
RETURNING *;

-- PASO 4: Verificar que se insertó
SELECT * 
FROM proyecto_requerimientos_acreditacion 
WHERE codigo_proyecto = 'TEST-MANUAL';

-- PASO 5: Limpiar el registro de prueba
DELETE FROM proyecto_requerimientos_acreditacion 
WHERE codigo_proyecto = 'TEST-MANUAL';

-- Si el INSERT del PASO 3 falló, revisa:
-- 1. El mensaje de error específico
-- 2. Si alguna columna requerida (NOT NULL) falta
-- 3. Si hay un constraint UNIQUE que está bloqueando
-- 4. Si los tipos de datos coinciden

