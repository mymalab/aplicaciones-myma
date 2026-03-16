-- 🚨 SCRIPT DEFINITIVO: Eliminar y recrear constraint con empresa_acreditacion
-- Ejecuta TODO este script en Supabase SQL Editor
-- Este script elimina TODOS los constraints/índices relacionados y crea uno nuevo

-- ============================================
-- PASO 1: Verificar constraints/índices actuales
-- ============================================
SELECT
  'ÍNDICES ACTUALES:' as tipo,
  indexname as nombre,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND (indexname LIKE 'uq_proyecto%' OR indexname LIKE '%requerimiento%')
UNION ALL
SELECT
  'CONSTRAINTS ACTUALES:' as tipo,
  conname as nombre,
  pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND (conname LIKE 'uq_proyecto%' OR conname LIKE '%requerimiento%');

-- ============================================
-- PASO 2: Eliminar TODOS los índices únicos relacionados
-- ============================================
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  -- Eliminar todos los índices únicos que contengan "uq_proyecto" o "requerimiento"
  FOR idx_record IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
      AND (indexname LIKE 'uq_proyecto%' OR indexname LIKE '%requerimiento%')
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname) || ' CASCADE';
    RAISE NOTICE '✅ Índice eliminado: %', idx_record.indexname;
  END LOOP;
END $$;

-- ============================================
-- PASO 3: Eliminar TODOS los constraints únicos relacionados
-- ============================================
DO $$
DECLARE
  con_record RECORD;
BEGIN
  -- Eliminar todos los constraints únicos que contengan "uq_proyecto" o "requerimiento"
  FOR con_record IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
      AND contype = 'u'  -- Solo constraints únicos
      AND (conname LIKE 'uq_proyecto%' OR conname LIKE '%requerimiento%')
  LOOP
    EXECUTE 'ALTER TABLE brg_acreditacion_solicitud_requerimiento DROP CONSTRAINT IF EXISTS ' || quote_ident(con_record.conname) || ' CASCADE';
    RAISE NOTICE '✅ Constraint eliminado: %', con_record.conname;
  END LOOP;
END $$;

-- ============================================
-- PASO 4: Verificar que la columna empresa_acreditacion existe en brg_acreditacion_solicitud_requerimiento
-- NOTA: empresa_acreditacion está en brg_acreditacion_cliente_requerimiento, pero necesitamos agregarla
-- a brg_acreditacion_solicitud_requerimiento para el constraint UNIQUE
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
    
    RAISE NOTICE '✅ Columna empresa_acreditacion creada en brg_acreditacion_solicitud_requerimiento';
  ELSE
    RAISE NOTICE '✅ Columna empresa_acreditacion ya existe en brg_acreditacion_solicitud_requerimiento';
  END IF;
END $$;

-- ============================================
-- PASO 5: Crear el nuevo índice único con empresa_acreditacion
-- ============================================
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
SELECT
  '✅ NUEVO ÍNDICE CREADO:' as estado,
  indexname as nombre_constraint,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname = 'uq_proyecto_requerimiento_trabajador_empresa';

-- ============================================
-- ✅ RESULTADO ESPERADO:
-- ============================================
-- Deberías ver un índice único con esta definición:
-- CREATE UNIQUE INDEX uq_proyecto_requerimiento_trabajador_empresa 
-- ON brg_acreditacion_solicitud_requerimiento 
-- (codigo_proyecto, requerimiento, COALESCE(id_proyecto_trabajador, -1), COALESCE(empresa_acreditacion, ''))
--
-- Esto permite:
-- ✅ (153, "MALEG", -1, "MyMA")
-- ✅ (153, "MALEG", -1, "AGQ")
-- ✅ (153, "MALEG", trabajador_1, "MyMA")
-- ✅ (153, "MALEG", trabajador_1, "AGQ")
-- ❌ (153, "MALEG", -1, "MyMA") - duplicado exacto bloqueado

