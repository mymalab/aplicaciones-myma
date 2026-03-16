-- 🔍 VERIFICAR COLUMNAS ACTUALES
-- Copia y pega esto en Supabase SQL Editor

SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion'
ORDER BY column_name;

-- Resultado esperado: deberías ver TODAS las columnas de la tabla
-- Si NO ves columnas como jpro_id, jpro_nombre, epr_id, epr_nombre, etc.
-- entonces necesitas ejecutar el siguiente script.

