-- ⚠️ SCRIPT CRÍTICO - EJECUTAR EN SUPABASE SQL EDITOR ⚠️
-- Este script agrega las columnas necesarias para guardar responsables

-- 1. AGREGAR COLUMNAS DE RESPONSABLES
ALTER TABLE solicitud_acreditacion 
  ADD COLUMN IF NOT EXISTS empresa_id TEXT,
  ADD COLUMN IF NOT EXISTS empresa_nombre TEXT,
  ADD COLUMN IF NOT EXISTS jpro_id INTEGER,
  ADD COLUMN IF NOT EXISTS jpro_nombre TEXT,
  ADD COLUMN IF NOT EXISTS epr_id INTEGER,
  ADD COLUMN IF NOT EXISTS epr_nombre TEXT,
  ADD COLUMN IF NOT EXISTS rrhh_id INTEGER,
  ADD COLUMN IF NOT EXISTS rrhh_nombre TEXT,
  ADD COLUMN IF NOT EXISTS legal_id INTEGER,
  ADD COLUMN IF NOT EXISTS legal_nombre TEXT;

-- 2. VERIFICAR QUE SE CREARON LAS COLUMNAS
SELECT 
  '✅ Columnas creadas exitosamente:' as mensaje,
  COUNT(*) as total_columnas
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN (
    'empresa_id', 'empresa_nombre',
    'jpro_id', 'jpro_nombre', 
    'epr_id', 'epr_nombre', 
    'rrhh_id', 'rrhh_nombre', 
    'legal_id', 'legal_nombre'
  );

-- 3. LISTAR LAS COLUMNAS NUEVAS
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND (
    column_name LIKE '%empresa%' OR
    column_name LIKE '%jpro%' OR 
    column_name LIKE '%epr%' OR 
    column_name LIKE '%rrhh%' OR 
    column_name LIKE '%legal%'
  )
ORDER BY column_name;

-- ✅ RESULTADO ESPERADO:
-- Deberías ver "total_columnas: 10" 
-- Y una lista con las 10 columnas nuevas

