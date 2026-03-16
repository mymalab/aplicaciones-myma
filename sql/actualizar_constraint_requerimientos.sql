-- Script para actualizar el constraint UNIQUE en proyecto_requerimientos_acreditacion
-- Esto permite que el mismo requerimiento se repita para diferentes trabajadores
-- Ejecuta este script en Supabase SQL Editor

-- PASO 1: Eliminar el constraint UNIQUE anterior
ALTER TABLE proyecto_requerimientos_acreditacion 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento;

-- PASO 2: Crear un nuevo constraint UNIQUE que incluya el id_proyecto_trabajador
-- Esto permite que el mismo requerimiento exista múltiples veces, una por cada trabajador
ALTER TABLE proyecto_requerimientos_acreditacion 
ADD CONSTRAINT uq_proyecto_requerimiento_trabajador 
UNIQUE (codigo_proyecto, requerimiento, id_proyecto_trabajador);

-- NOTA: Este constraint permite:
-- ✅ Mismo requerimiento con diferentes trabajadores (id_proyecto_trabajador diferente)
-- ✅ Mismo requerimiento sin trabajador (id_proyecto_trabajador NULL) solo una vez
-- ❌ Mismo requerimiento con el mismo trabajador duplicado

-- PASO 3: Verificar el nuevo constraint
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'proyecto_requerimientos_acreditacion'::regclass
  AND conname LIKE 'uq_proyecto%';

