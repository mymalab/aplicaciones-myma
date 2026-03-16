-- ============================================
-- Agregar Módulo Adendas al Sistema RBAC
-- ============================================
-- Este script agrega el módulo "adendas" y crea los roles necesarios
-- Ejecutar en Supabase SQL Editor

-- 1. Insertar el módulo "adendas" en rbac_module
-- (Ajusta los valores según la estructura real de tu tabla)
INSERT INTO rbac_module (code, name, description, active)
VALUES ('adendas', 'Adendas', 'Gestión de adendas y adendas complementarias', true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- 2. Crear los roles necesarios para el módulo adendas
-- Los roles deben tener el formato: {modulo}:{permiso}
INSERT INTO rbac_role (code, name, description, active)
VALUES 
  ('adendas:view', 'Ver Adendas', 'Permite ver adendas', true),
  ('adendas:create', 'Crear Adendas', 'Permite crear nuevas adendas', true),
  ('adendas:edit', 'Editar Adendas', 'Permite editar adendas existentes', true),
  ('adendas:delete', 'Eliminar Adendas', 'Permite eliminar adendas', true),
  ('adendas:admin', 'Admin Adendas', 'Permisos administrativos completos en adendas', true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- 3. Para asignar permisos a un usuario específico, ejecuta lo siguiente
-- Reemplaza 'TU_USER_ID_AQUI' con el UUID del usuario desde auth.users
-- Puedes obtener tu user_id ejecutando: SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com';

-- Ejemplo: Asignar todos los permisos de adendas a un usuario
/*
INSERT INTO rbac_user_role (user_id, role_id)
SELECT 
  'TU_USER_ID_AQUI'::uuid as user_id,
  r.id as role_id
FROM rbac_role r
WHERE r.code IN ('adendas:view', 'adendas:create', 'adendas:edit', 'adendas:delete', 'adendas:admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
*/

-- 4. Verificar que todo se creó correctamente
SELECT 'Módulos creados:' as info;
SELECT id, code, name, active FROM rbac_module WHERE code = 'adendas';

SELECT 'Roles creados:' as info;
SELECT id, code, name, active FROM rbac_role WHERE code LIKE 'adendas:%';

-- 5. Para verificar los permisos de un usuario específico
-- Reemplaza 'TU_USER_ID_AQUI' con el UUID del usuario
/*
SELECT 
  r.code as role_code,
  r.name as role_name
FROM rbac_user_role ur
JOIN rbac_role r ON ur.role_id = r.id
WHERE ur.user_id = 'TU_USER_ID_AQUI'::uuid
  AND r.code LIKE 'adendas:%';
*/

