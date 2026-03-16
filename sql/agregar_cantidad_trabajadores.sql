-- Script para agregar columnas de cantidad de trabajadores a solicitud_acreditacion
-- Ejecuta este script en Supabase SQL Editor

-- Agregar columna cantidad_trabajadores_myma
ALTER TABLE solicitud_acreditacion 
ADD COLUMN IF NOT EXISTS cantidad_trabajadores_myma INTEGER DEFAULT 0;

-- Agregar columna cantidad_trabajadores_contratista
ALTER TABLE solicitud_acreditacion 
ADD COLUMN IF NOT EXISTS cantidad_trabajadores_contratista INTEGER DEFAULT 0;

-- Agregar comentarios a las columnas
COMMENT ON COLUMN solicitud_acreditacion.cantidad_trabajadores_myma IS 
'Cantidad total objetivo de trabajadores MYMA (internos)';

COMMENT ON COLUMN solicitud_acreditacion.cantidad_trabajadores_contratista IS 
'Cantidad total objetivo de trabajadores de empresa contratista';

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'solicitud_acreditacion'
  AND column_name IN ('cantidad_trabajadores_myma', 'cantidad_trabajadores_contratista');

