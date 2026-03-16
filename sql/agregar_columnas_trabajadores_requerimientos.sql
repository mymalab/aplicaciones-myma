-- Script para corregir y agregar columnas relacionadas con trabajadores en proyecto_requerimientos_acreditacion
-- Ejecuta este script en Supabase SQL Editor

-- PASO 1: Eliminar las columnas existentes con tipo incorrecto (si existen)
ALTER TABLE proyecto_requerimientos_acreditacion 
DROP COLUMN IF EXISTS nombre_trabajador;

ALTER TABLE proyecto_requerimientos_acreditacion 
DROP COLUMN IF EXISTS categoria_empresa;

ALTER TABLE proyecto_requerimientos_acreditacion 
DROP COLUMN IF EXISTS id_proyecto_trabajador;

-- PASO 2: Agregar las columnas con los tipos correctos
-- Columna nombre_trabajador (TEXT, no BIGINT)
ALTER TABLE proyecto_requerimientos_acreditacion 
ADD COLUMN nombre_trabajador TEXT;

-- Columna categoria_empresa (TEXT, no BIGINT)
ALTER TABLE proyecto_requerimientos_acreditacion 
ADD COLUMN categoria_empresa TEXT;

-- Columna id_proyecto_trabajador (BIGINT, correcto)
ALTER TABLE proyecto_requerimientos_acreditacion 
ADD COLUMN id_proyecto_trabajador BIGINT;

-- PASO 3: Agregar comentarios a las columnas
COMMENT ON COLUMN proyecto_requerimientos_acreditacion.nombre_trabajador IS 
'Nombre del trabajador asignado a este requerimiento (para requerimientos de categoría Trabajadores)';

COMMENT ON COLUMN proyecto_requerimientos_acreditacion.categoria_empresa IS 
'Categoría de la empresa del trabajador (MyMA o Contratista)';

COMMENT ON COLUMN proyecto_requerimientos_acreditacion.id_proyecto_trabajador IS 
'ID del trabajador en la tabla proyecto_trabajadores (FK opcional)';

-- PASO 4 (Opcional): Agregar foreign key constraint
-- Descomenta las siguientes líneas si quieres garantizar integridad referencial
-- ALTER TABLE proyecto_requerimientos_acreditacion 
-- ADD CONSTRAINT fk_proyecto_trabajador 
-- FOREIGN KEY (id_proyecto_trabajador) 
-- REFERENCES proyecto_trabajadores(id) 
-- ON DELETE SET NULL;

-- PASO 5: Verificar que las columnas se corrigieron correctamente
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'proyecto_requerimientos_acreditacion'
  AND column_name IN ('categoria_empresa', 'id_proyecto_trabajador', 'nombre_trabajador', 'categoria_requerimiento')
ORDER BY column_name;

