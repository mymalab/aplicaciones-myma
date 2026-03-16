-- ============================================
-- Tabla de Solicitudes de Acceso
-- ============================================
-- Esta tabla almacena las solicitudes de acceso a módulos que realizan los usuarios
-- cuando no tienen permisos en ningún módulo.

-- Crear tabla access_requests
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  requested_modules TEXT[] NOT NULL, -- Array de módulos solicitados (ej: ['acreditacion', 'proveedores'])
  message TEXT, -- Mensaje opcional del usuario
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id), -- Usuario que revisó la solicitud
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT, -- Notas del revisor
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);

-- Crear índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- Crear índice para búsquedas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view their own access requests"
  ON access_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden crear sus propias solicitudes
CREATE POLICY "Users can create their own access requests"
  ON access_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Solo admins pueden ver todas las solicitudes
CREATE POLICY "Admins can view all access requests"
  ON access_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política: Solo admins pueden actualizar solicitudes (aprobar/rechazar)
CREATE POLICY "Admins can update access requests"
  ON access_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_access_requests_updated_at();

-- Comentarios
COMMENT ON TABLE access_requests IS 'Solicitudes de acceso a módulos del sistema';
COMMENT ON COLUMN access_requests.requested_modules IS 'Array de módulos solicitados (ej: [acreditacion, proveedores])';
COMMENT ON COLUMN access_requests.status IS 'Estado de la solicitud: pending, approved, rejected';
COMMENT ON COLUMN access_requests.reviewed_by IS 'ID del usuario administrador que revisó la solicitud';

