-- ⚡ PASO 2: AGREGAR COLUMNAS DE RESPONSABLES
-- Ejecuta esto SOLO SI el PASO 1 mostró "columnas_responsables_encontradas: 0"

-- Agregar columnas de responsables a solicitud_acreditacion
ALTER TABLE solicitud_acreditacion 
  ADD COLUMN IF NOT EXISTS empresa_id TEXT,
  ADD COLUMN IF NOT EXISTS empresa_nombre TEXT,
  ADD COLUMN IF NOT EXISTS jpro_id INTEGER,
  ADD COLUMN IF NOT EXISTS jpro_nombre TEXT,
  ADD COLUMN IF NOT EXISTS epr_id INTEGER,
  ADD COLUMN IF NOT EXISTS epr_nombre TEXT,
  ADD COLUMN IF NOT EXISTS rrhh_id INTEGER,
  ADD COLUMN IF NOT EXISTS rrhh_nombre TEXT,
  ADD COLUMN IF NOT EXISTS legal_id INTEGER,
  ADD COLUMN IF NOT EXISTS legal_nombre TEXT;

-- Verificar que se crearon
SELECT 
  '✅ ÉXITO: Columnas agregadas a solicitud_acreditacion' as mensaje,
  COUNT(*) as total_columnas_creadas
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN (
    'empresa_id', 'empresa_nombre',
    'jpro_id', 'jpro_nombre', 
    'epr_id', 'epr_nombre', 
    'rrhh_id', 'rrhh_nombre', 
    'legal_id', 'legal_nombre'
  );

-- Listar las columnas nuevas
SELECT 
  column_name, 
  data_type,
  '✅' as status
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN (
    'empresa_id', 'empresa_nombre',
    'jpro_id', 'jpro_nombre', 
    'epr_id', 'epr_nombre', 
    'rrhh_id', 'rrhh_nombre', 
    'legal_id', 'legal_nombre'
  )
ORDER BY column_name;

-- ✅ RESULTADO ESPERADO: "total_columnas_creadas: 10"

