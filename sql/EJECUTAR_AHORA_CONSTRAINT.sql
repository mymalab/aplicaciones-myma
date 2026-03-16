-- 🚨 EJECUTAR ESTO AHORA: Solución para el error de constraint UNIQUE
-- Copia TODO este script y pégalo en Supabase SQL Editor, luego ejecuta (RUN)

-- ============================================
-- PASO 1: Ver qué constraints únicos existen (para diagnóstico)
-- ============================================
SELECT '🔍 Constraints únicos existentes:' as info;
SELECT conname as nombre, pg_get_constraintdef(oid) as definicion
FROM pg_constraint
WHERE conrelid = 'brg_acreditacion_solicitud_requerimiento'::regclass
  AND contype = 'u'
  AND conname NOT LIKE '%pkey%';

-- ============================================
-- PASO 2: Eliminar SOLO los constraints únicos problemáticos (NO PRIMARY KEY)
-- ============================================
-- Estos comandos son seguros y NO afectan el PRIMARY KEY

ALTER TABLE brg_acreditacion_solicitud_requerimiento 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento_trabajador CASCADE;

ALTER TABLE brg_acreditacion_solicitud_requerimiento 
DROP CONSTRAINT IF EXISTS uq_proyecto_requerimiento CASCADE;

-- Eliminar índices únicos (NO incluye PRIMARY KEY)
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
SELECT '✅ VERIFICACIÓN FINAL - Nuevo índice creado:' as info;
SELECT 
  indexname as nombre_indice,
  indexdef as definicion_completa
FROM pg_indexes
WHERE tablename = 'brg_acreditacion_solicitud_requerimiento'
  AND indexname = 'uq_proyecto_requerimiento_trabajador_empresa';

-- ✅ RESULTADO ESPERADO:
-- Deberías ver una fila con:
-- nombre_indice: uq_proyecto_requerimiento_trabajador_empresa
-- definicion_completa: CREATE UNIQUE INDEX ... (codigo_proyecto, requerimiento, COALESCE(id_proyecto_trabajador, -1), COALESCE(empresa_acreditacion, ''))
--
-- Si ves COALESCE(empresa_acreditacion, '') en la definición, ¡está correcto! ✅

