-- 🚨 SCRIPT URGENTE: Actualizar constraint UNIQUE
-- Este script DEBE ejecutarse ANTES de guardar requerimientos con trabajadores
-- Ejecuta TODO el script en Supabase SQL Editor

DO $$
BEGIN
  -- PASO 1: Eliminar el constraint UNIQUE antiguo
  ALTER TABLE proyecto_requerimientos_acreditacion 
  DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento;
  
  RAISE NOTICE '✅ Constraint antiguo eliminado';
  
  -- PASO 2: Crear índice único que permite mismo requerimiento para diferentes trabajadores
  -- Usamos COALESCE para manejar NULL en id_proyecto_trabajador
  CREATE UNIQUE INDEX IF NOT EXISTS uq_proyecto_requerimiento_trabajador 
  ON proyecto_requerimientos_acreditacion (
    codigo_proyecto, 
    requerimiento, 
    COALESCE(id_proyecto_trabajador, -1)
  );
  
  RAISE NOTICE '✅ Nuevo constraint creado';
END $$;

-- PASO 3: Verificar el nuevo constraint
SELECT
  indexname as nombre_constraint,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'proyecto_requerimientos_acreditacion'
  AND indexname LIKE 'uq_proyecto%';

-- ✅ Resultado esperado:
-- El constraint ahora incluye COALESCE(id_proyecto_trabajador, -1)
-- 
-- Esto permite:
-- ✅ ("MYMA-17", "Examen", trabajador_1)
-- ✅ ("MYMA-17", "Examen", trabajador_2)
-- ✅ ("MYMA-17", "Examen", trabajador_3)
-- ✅ ("MYMA-17", "Documento", NULL) - requerimientos sin trabajador
-- ❌ ("MYMA-17", "Examen", trabajador_1) - duplicado bloqueado

