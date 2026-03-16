-- 🚨 SCRIPT URGENTE: Actualizar constraint UNIQUE para incluir empresa_acreditacion
-- Este script permite duplicar requerimientos de categoría "Empresa" con diferentes empresas_acreditacion
-- Ejecuta TODO el script en Supabase SQL Editor

-- PASO 1: Verificar índices existentes antes de eliminar
SELECT
  indexname as nombre_indice_actual,
  indexdef as definicion_actual
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE 'uq_proyecto%';

-- PASO 2: Eliminar TODOS los constraints únicos y sus índices relacionados
-- IMPORTANTE: NO eliminar PRIMARY KEY constraints (como proyecto_requerimientos_acreditacion_pkey)
DO $$
DECLARE
  con_record RECORD;
  idx_record RECORD;
BEGIN
  -- PRIMERO: Eliminar constraints únicos (NO PRIMARY KEY)
  FOR con_record IN 
    SELECT conname
    FROM pg_constraint 
    WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
      AND contype = 'u'  -- Solo constraints únicos (NO PRIMARY KEY)
      AND (conname LIKE '%uq%' OR conname LIKE '%requerimiento%' OR conname LIKE '%proyecto%')
      AND conname NOT LIKE '%pkey%'  -- Excluir PRIMARY KEY
  LOOP
    EXECUTE 'ALTER TABLE brg_acreditacion_solicitud_requerimiento DROP CONSTRAINT IF EXISTS ' || quote_ident(con_record.conname) || ' CASCADE';
    RAISE NOTICE '✅ Constraint único eliminado: %', con_record.conname;
  END LOOP;
  
  -- SEGUNDO: Eliminar índices únicos relacionados (excluyendo PRIMARY KEY)
  -- Solo eliminar índices que empiecen con 'uq_' o sean específicamente los que buscamos
  FOR idx_record IN 
    SELECT indexname 
    FROM pg_indexes
    WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
      AND (
        indexname LIKE 'uq_%'  -- Índices que empiezan con uq_
        OR indexname = 'uq_proyecto_requerimiento_trabajador'
        OR indexname = 'uq_proyecto_requerimiento'
        OR indexname LIKE 'brg_acreditacion_solicitud_requerimiento_uq_%'  -- Índices con prefijo de tabla
      )
      AND indexname NOT LIKE '%_pkey'  -- Excluir PRIMARY KEY (terminan en _pkey)
      AND indexname NOT LIKE '%pkey%'  -- Excluir cualquier PRIMARY KEY
  LOOP
    BEGIN
      EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(idx_record.indexname) || ' CASCADE';
      RAISE NOTICE '✅ Índice único eliminado: %', idx_record.indexname;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ No se pudo eliminar índice % (puede estar asociado a un constraint): %', idx_record.indexname, SQLERRM;
    END;
  END LOOP;
END $$;

-- PASO 3: Verificar que la columna empresa_acreditacion existe en brg_acreditacion_solicitud_requerimiento
-- NOTA: empresa_acreditacion existe en brg_acreditacion_cliente_requerimiento, pero necesitamos agregarla
-- también a brg_acreditacion_solicitud_requerimiento para guardar si es MyMA o el contratista en cada requerimiento del proyecto
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

-- PASO 4: Crear nuevo índice único que incluye empresa_acreditacion
-- Esto permite:
-- ✅ Mismo requerimiento para diferentes trabajadores
-- ✅ Mismo requerimiento con diferentes empresa_acreditacion (MyMA vs Contratista)
-- ❌ Mismo requerimiento, mismo trabajador, misma empresa_acreditacion (duplicado bloqueado)

-- Asegurarse de eliminar el índice si existe antes de crearlo (por si tiene definición diferente)
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

-- PASO 5: Verificar el nuevo constraint
SELECT
  indexname as nombre_constraint,
  indexdef as definicion
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname LIKE 'uq_proyecto%';

-- ✅ Resultado esperado:
-- El constraint ahora incluye COALESCE(empresa_acreditacion, '')
-- 
-- Esto permite:
-- ✅ ("150", "MALEG", -1, "MyMA")
-- ✅ ("150", "MALEG", -1, "AGQ")
-- ✅ ("150", "MALEG", trabajador_1, "MyMA")
-- ✅ ("150", "MALEG", trabajador_1, "AGQ")
-- ❌ ("150", "MALEG", -1, "MyMA") - duplicado bloqueado

