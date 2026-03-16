-- Script SQL para agregar columnas de responsables y empresa a la tabla solicitud_acreditacion
-- Ejecutar este script en Supabase SQL Editor si las columnas no existen

-- Agregar columna de empresa (si no existe)
ALTER TABLE solicitud_acreditacion 
ADD COLUMN IF NOT EXISTS empresa_id TEXT,
ADD COLUMN IF NOT EXISTS empresa_nombre TEXT;

-- Agregar columnas de responsables (si no existen)
ALTER TABLE solicitud_acreditacion 
ADD COLUMN IF NOT EXISTS jpro_id INTEGER,
ADD COLUMN IF NOT EXISTS jpro_nombre TEXT,
ADD COLUMN IF NOT EXISTS epr_id INTEGER,
ADD COLUMN IF NOT EXISTS epr_nombre TEXT,
ADD COLUMN IF NOT EXISTS rrhh_id INTEGER,
ADD COLUMN IF NOT EXISTS rrhh_nombre TEXT,
ADD COLUMN IF NOT EXISTS legal_id INTEGER,
ADD COLUMN IF NOT EXISTS legal_nombre TEXT;

-- Agregar índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitud_empresa ON solicitud_acreditacion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_jpro ON solicitud_acreditacion(jpro_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_epr ON solicitud_acreditacion(epr_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_rrhh ON solicitud_acreditacion(rrhh_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_legal ON solicitud_acreditacion(legal_id);

-- Agregar comentarios para documentación
COMMENT ON COLUMN solicitud_acreditacion.empresa_id IS 'ID de la empresa contratista';
COMMENT ON COLUMN solicitud_acreditacion.empresa_nombre IS 'Nombre de la empresa contratista';
COMMENT ON COLUMN solicitud_acreditacion.jpro_id IS 'ID del Jefe de Proyecto';
COMMENT ON COLUMN solicitud_acreditacion.jpro_nombre IS 'Nombre del Jefe de Proyecto';
COMMENT ON COLUMN solicitud_acreditacion.epr_id IS 'ID del Especialista en Prevención de Riesgo';
COMMENT ON COLUMN solicitud_acreditacion.epr_nombre IS 'Nombre del Especialista en Prevención de Riesgo';
COMMENT ON COLUMN solicitud_acreditacion.rrhh_id IS 'ID del responsable de Recursos Humanos';
COMMENT ON COLUMN solicitud_acreditacion.rrhh_nombre IS 'Nombre del responsable de Recursos Humanos';
COMMENT ON COLUMN solicitud_acreditacion.legal_id IS 'ID del responsable Legal';
COMMENT ON COLUMN solicitud_acreditacion.legal_nombre IS 'Nombre del responsable Legal';

-- Verificar que las columnas se crearon correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'solicitud_acreditacion' 
  AND column_name IN ('empresa_id', 'empresa_nombre', 'jpro_id', 'jpro_nombre', 'epr_id', 'epr_nombre', 'rrhh_id', 'rrhh_nombre', 'legal_id', 'legal_nombre')
ORDER BY column_name;

