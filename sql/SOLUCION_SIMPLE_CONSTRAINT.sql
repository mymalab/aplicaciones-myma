-- 🚨 SOLUCIÓN SIMPLE: Actualizar constraint UNIQUE para incluir empresa_acreditacion
-- Ejecuta este script COMPLETO en Supabase SQL Editor
-- Si hay errores, ejecuta cada sección por separado

-- ============================================
-- PASO 1: Ver qué constraints/índices únicos existen
-- ============================================
SELECT '🔍 Constraints únicos existentes:' as info;
SELECT conname as nombre, pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND contype = 'u';

SELECT '🔍 Índices únicos existentes:' as info;
SELECT indexname as nombre, indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE '%uq%';

-- ============================================
-- PASO 2: Eliminar SOLO los constraints únicos específicos (NO PRIMARY KEY)
-- ============================================
-- Eliminar constraints únicos conocidos (uno por uno para evitar errores)
ALTER TABLE brg_acreditacion_solicitud_requerimiento 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento_trabajador CASCADE;

ALTER TABLE brg_acreditacion_solicitud_requerimiento 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento CASCADE;

-- Eliminar índices únicos conocidos (NO incluye PRIMARY KEY)
DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador CASCADE;
DROP INDEX IF EXISTS uq_proyecto_requerimiento CASCADE;
DROP INDEX IF EXISTS brg_acreditacion_solicitud_requerimiento_uq_proyecto_requerimiento_trabajador_idx CASCADE;
DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador_empresa CASCADE;

-- ============================================
-- PASO 3: Verificar/crear columna empresa_acreditacion
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'brg_acreditacion_solicitud_requerimiento' 
      AND column_name = 'empresa_acreditacion'
  ) THEN
    ALTER TABLE brg_acreditacion_solicitud_requerimiento 
    ADD COLUMN empresa_acreditacion TEXT;
    RAISE NOTICE '✅ Columna empresa_acreditacion creada';
  ELSE
    RAISE NOTICE '✅ Columna empresa_acreditacion ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 4: Crear el nuevo índice único CON empresa_acreditacion
-- ============================================
CREATE UNIQUE INDEX uq_proyecto_requerimiento_trabajador_empresa 
ON brg_acreditacion_solicitud_requerimiento (
  codigo_proyecto, 
  requerimiento, 
  COALESCE(id_proyecto_trabajador, -1),
  COALESCE(empresa_acreditacion, '')
);

-- ============================================
-- PASO 5: Verificar que se creó correctamente
-- ============================================
SELECT '✅ VERIFICACIÓN FINAL:' as info;
SELECT 
  indexname as nombre_indice,
  indexdef as definicion_completa
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname = 'uq_proyecto_requerimiento_trabajador_empresa';

-- ✅ Deberías ver el índice con COALESCE(empresa_acreditacion, '') en la definición

