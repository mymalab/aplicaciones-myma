-- 🚨 SOLUCIÓN DEFINITIVA: Eliminar constraint antiguo y crear uno nuevo con empresa_acreditacion
-- Ejecuta TODO este script en Supabase SQL Editor
-- Si ves algún error, continúa ejecutando el resto del script

-- ============================================
-- PASO 1: Ver qué constraints/índices existen
-- ============================================
SELECT 'ANTES DE ELIMINAR - Verificando constraints/índices existentes:' as info;

-- Ver índices
SELECT 'ÍNDICE' as tipo, indexname as nombre, indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE '%uq_proyecto%';

-- Ver constraints
SELECT 'CONSTRAINT' as tipo, conname as nombre, pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND conname LIKE '%uq_proyecto%';

-- ============================================
-- PASO 2: ELIMINAR el constraint/índice antiguo (múltiples intentos)
-- ============================================
-- Intentar eliminar como índice
DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador CASCADE;
DROP INDEX IF EXISTS public.uq_proyecto_requerimiento_trabajador CASCADE;
DROP INDEX IF EXISTS brg_acreditacion_solicitud_requerimiento_uq_proyecto_requerimiento_trabajador_idx CASCADE;

-- Intentar eliminar como constraint
ALTER TABLE brg_acreditacion_solicitud_requerimiento 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento_trabajador CASCADE;

-- Eliminar cualquier índice que contenga "uq_proyecto" y "trabajador"
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  FOR idx_record IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
      AND (indexname LIKE '%uq_proyecto%' OR indexname LIKE '%trabajador%')
  LOOP
    BEGIN
      EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname) || ' CASCADE';
      RAISE NOTICE '✅ Índice eliminado: %', idx_record.indexname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ No se pudo eliminar índice %: %', idx_record.indexname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Eliminar cualquier constraint que contenga "uq_proyecto" o "trabajador"
DO $$
DECLARE
  con_record RECORD;
BEGIN
  FOR con_record IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
      AND contype = 'u'
      AND (conname LIKE '%uq_proyecto%' OR conname LIKE '%trabajador%')
  LOOP
    BEGIN
      EXECUTE 'ALTER TABLE brg_acreditacion_solicitud_requerimiento DROP CONSTRAINT IF EXISTS ' || quote_ident(con_record.conname) || ' CASCADE';
      RAISE NOTICE '✅ Constraint eliminado: %', con_record.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ No se pudo eliminar constraint %: %', con_record.conname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================
-- PASO 3: Verificar que se eliminaron
-- ============================================
SELECT 'DESPUÉS DE ELIMINAR - Verificando que se eliminaron:' as info;

SELECT 'ÍNDICE' as tipo, indexname as nombre
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE '%uq_proyecto%';

SELECT 'CONSTRAINT' as tipo, conname as nombre
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND conname LIKE '%uq_proyecto%';

-- ============================================
-- PASO 4: Agregar columna empresa_acreditacion si no existe
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
-- Primero eliminar si existe el nuevo índice (por si acaso)
DROP INDEX IF EXISTS uq_proyecto_requerimiento_trabajador_empresa CASCADE;

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
SELECT '✅ VERIFICACIÓN FINAL - Nuevo índice creado:' as info;

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

