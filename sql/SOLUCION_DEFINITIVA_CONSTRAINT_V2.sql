-- 🚨 SOLUCIÓN DEFINITIVA V2: Actualizar constraint UNIQUE para incluir empresa_acreditacion
-- Este script elimina TODOS los constraints/índices únicos y crea uno nuevo con empresa_acreditacion
-- Ejecuta TODO el script en Supabase SQL Editor

-- ============================================
-- PASO 1: Ver qué constraints/índices existen ANTES
-- ============================================
SELECT '🔍 ANTES - Verificando constraints/índices existentes:' as info;

-- Ver índices únicos
SELECT 'ÍNDICE' as tipo, indexname as nombre, indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE '%uq%' OR indexname LIKE '%unique%' OR indexname LIKE '%requerimiento%';

-- Ver constraints únicos
SELECT 'CONSTRAINT' as tipo, conname as nombre, pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND contype = 'u';

-- ============================================
-- PASO 2: ELIMINAR TODOS los índices únicos (múltiples intentos)
-- ============================================
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  -- Eliminar todos los índices únicos relacionados
  FOR idx_record IN 
    SELECT indexname 
    FROM pg_indexes
    WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
      AND (indexname LIKE '%uq%' OR indexname LIKE '%unique%' OR indexname LIKE '%requerimiento%')
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname) || ' CASCADE';
    RAISE NOTICE '✅ Índice eliminado: %', idx_record.indexname;
  END LOOP;
END $$;

-- ============================================
-- PASO 3: ELIMINAR TODOS los constraints únicos
-- ============================================
DO $$
DECLARE
  con_record RECORD;
BEGIN
  -- Eliminar todos los constraints únicos
  FOR con_record IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
      AND contype = 'u'  -- Solo constraints únicos
  LOOP
    EXECUTE 'ALTER TABLE brg_acreditacion_solicitud_requerimiento DROP CONSTRAINT IF EXISTS ' || quote_ident(con_record.conname) || ' CASCADE';
    RAISE NOTICE '✅ Constraint eliminado: %', con_record.conname;
  END LOOP;
END $$;

-- ============================================
-- PASO 4: Verificar que la columna empresa_acreditacion existe
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
-- PASO 5: Crear el nuevo índice único CON empresa_acreditacion
-- ============================================
-- Asegurarse de que no existe antes de crearlo
DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador_empresa CASCADE;
DROP INDEX IF EXISTS public.uq_proyecto_requerimiento_trabajador_empresa CASCADE;

-- Crear el nuevo índice único
CREATE UNIQUE INDEX uq_proyecto_requerimiento_trabajador_empresa 
ON brg_acreditacion_solicitud_requerimiento (
  codigo_proyecto, 
  requerimiento, 
  COALESCE(id_proyecto_trabajador, -1),
  COALESCE(empresa_acreditacion, '')
);

-- ============================================
-- PASO 6: Verificar que el nuevo índice se creó correctamente
-- ============================================
SELECT '✅ DESPUÉS - Verificando nuevo índice creado:' as info;

SELECT 
  indexname as nombre_indice,
  indexdef as definicion_completa
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname = 'uq_proyecto_requerimiento_trabajador_empresa';

-- ============================================
-- ✅ RESULTADO ESPERADO:
-- ============================================
-- Deberías ver un índice con esta definición:
-- CREATE UNIQUE INDEX uq_proyecto_requerimiento_trabajador_empresa 
-- ON brg_acreditacion_solicitud_requerimiento 
-- (codigo_proyecto, requerimiento, COALESCE(id_proyecto_trabajador, -1), COALESCE(empresa_acreditacion, ''))
--
-- Si la definición incluye COALESCE(empresa_acreditacion, ''), entonces está correcto ✅

