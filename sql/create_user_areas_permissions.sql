-- ============================================
-- Configuración de Permisos por Área
-- ============================================
-- Este script crea la estructura necesaria para el sistema de permisos RBAC
-- por área en Supabase.

-- 1. Crear tabla user_areas
-- Esta tabla almacena las áreas a las que tiene acceso cada usuario
CREATE TABLE IF NOT EXISTS user_areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id TEXT NOT NULL CHECK (area_id IN ('acreditacion', 'finanzas', 'operaciones')),
  permissions JSONB DEFAULT '[]'::jsonb, -- Array de permisos específicos del área
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, area_id)
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE user_areas ENABLE ROW LEVEL SECURITY;

-- 3. Política: Los usuarios solo pueden ver sus propias áreas
CREATE POLICY "Users can view their own areas"
  ON user_areas
  FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Política: Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "Only admins can manage user areas"
  ON user_areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Crear función RPC para obtener áreas del usuario
CREATE OR REPLACE FUNCTION get_user_areas(p_user_id UUID)
RETURNS TABLE (
  area_id TEXT,
  permissions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.area_id,
    ua.permissions
  FROM user_areas ua
  WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear función para verificar si un usuario tiene acceso a un área
CREATE OR REPLACE FUNCTION has_area_access(p_user_id UUID, p_area_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_areas
    WHERE user_id = p_user_id
    AND area_id = p_area_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Crear función para verificar un permiso específico
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_area_id TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_areas
    WHERE user_id = p_user_id
    AND area_id = p_area_id
    AND permissions::text LIKE '%' || p_permission || '%'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_areas_user_id ON user_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_areas_area_id ON user_areas(area_id);

-- 9. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_areas_updated_at
  BEFORE UPDATE ON user_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_user_areas_updated_at();

-- ============================================
-- Datos de Ejemplo (Opcional)
-- ============================================
-- Descomenta y ajusta según tus necesidades:

-- INSERT INTO user_areas (user_id, area_id, permissions)
-- VALUES
--   ('user-uuid-here', 'acreditacion', '["acreditacion:view", "acreditacion:create"]'::jsonb),
--   ('user-uuid-here', 'finanzas', '["finanzas:view"]'::jsonb);

-- ============================================
-- Notas
-- ============================================
-- 1. Asegúrate de que la tabla 'profiles' existe y tiene una columna 'role'
-- 2. Los permisos se almacenan como JSONB array: ["area:view", "area:create", ...]
-- 3. Los admins tienen acceso a todas las áreas (verificar en código de la app)
-- 4. Las políticas RLS pueden necesitar ajustes según tus necesidades de seguridad











