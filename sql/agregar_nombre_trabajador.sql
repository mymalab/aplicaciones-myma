-- Script para agregar columna nombre_trabajador a proyecto_requerimientos_acreditacion
-- Ejecuta este script en Supabase SQL Editor

-- Agregar columna nombre_trabajador
ALTER TABLE proyecto_requerimientos_acreditacion 
ADD COLUMN IF NOT EXISTS nombre_trabajador TEXT;

-- Agregar comentario a la columna
COMMENT ON COLUMN proyecto_requerimientos_acreditacion.nombre_trabajador IS 
'Nombre del trabajador específico asignado a este requerimiento (para requerimientos de categoría Trabajadores)';

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'proyecto_requerimientos_acreditacion'
  AND column_name = 'nombre_trabajador';

