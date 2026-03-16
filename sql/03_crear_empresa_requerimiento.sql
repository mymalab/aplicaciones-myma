-- 🔧 PASO 3: CREAR TABLA empresa_requerimiento (OPCIONAL)
-- Esta tabla almacena los requerimientos estándar por empresa
-- Si NO la creas, el sistema usará tareas por defecto

-- Crear tabla
CREATE TABLE IF NOT EXISTS empresa_requerimiento (
  id SERIAL PRIMARY KEY,
  empresa TEXT NOT NULL,
  requerimiento TEXT NOT NULL,
  categoria_requerimiento TEXT NOT NULL,
  responsable TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_empresa_req_empresa ON empresa_requerimiento(empresa);
CREATE INDEX IF NOT EXISTS idx_empresa_req_responsable ON empresa_requerimiento(responsable);

-- Datos de ejemplo para CMP
INSERT INTO empresa_requerimiento (empresa, requerimiento, categoria_requerimiento, responsable, orden) 
VALUES
  ('CMP', 'Inducción General CMP', 'Capacitación', 'JPRO', 1),
  ('CMP', 'Examen Pre-ocupacional', 'Salud', 'EPR', 2),
  ('CMP', 'Licencia de Conducir Clase B', 'Conducción', 'JPRO', 3),
  ('CMP', 'Curso Trabajo en Altura', 'Capacitación', 'EPR', 4),
  ('CMP', 'Contrato de Trabajo', 'Legal', 'RRHH', 5),
  ('CMP', 'Certificado Antecedentes', 'Legal', 'Legal', 6)
ON CONFLICT DO NOTHING;

-- Verificar
SELECT 
  '✅ Tabla empresa_requerimiento creada' as mensaje,
  COUNT(*) as total_requerimientos
FROM empresa_requerimiento
WHERE empresa = 'CMP';

-- ✅ RESULTADO ESPERADO: "total_requerimientos: 6"

