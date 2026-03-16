-- 🔍 PASO 1: VERIFICAR ESTRUCTURA DE solicitud_acreditacion
-- Ejecuta esto en Supabase SQL Editor

-- Ver todas las columnas actuales
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion'
ORDER BY ordinal_position;

-- Verificar si existen las columnas de responsables (debería dar 0 si no existen)
SELECT 
  COUNT(*) as columnas_responsables_encontradas
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN (
    'jpro_id', 'jpro_nombre', 
    'epr_id', 'epr_nombre', 
    'rrhh_id', 'rrhh_nombre', 
    'legal_id', 'legal_nombre',
    'empresa_id', 'empresa_nombre'
  );

-- ❓ RESULTADO ESPERADO:
-- Si "columnas_responsables_encontradas" = 0 → NECESITAS ejecutar el PASO 2
-- Si "columnas_responsables_encontradas" = 10 → Las columnas YA EXISTEN (el error es otro)

