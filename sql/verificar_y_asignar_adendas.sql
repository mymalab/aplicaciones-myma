-- ============================================
-- Verificar y Asignar Permisos de Adendas
-- ============================================
-- Este script verifica el estado actual y asigna permisos de adendas
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar que el módulo existe
SELECT '1. Verificando módulo adendas...' as paso;
SELECT id, code, name, active, rol_modulo_admin 
FROM rbac_module 
WHERE code = 'adendas';

-- PASO 2: Verificar si existen los roles de adendas
SELECT '2. Verificando roles de adendas...' as paso;
SELECT id, code, name, active 
FROM rbac_role 
WHERE code LIKE 'adendas:%'
ORDER BY code;

-- PASO 3: Si no existen los roles, crearlos
-- (Ejecuta esto solo si el paso 2 no retorna resultados)
INSERT INTO rbac_role (code, name, description, active)
SELECT * FROM (VALUES
  ('adendas:view', 'Ver Adendas', 'Permite ver adendas', true),
  ('adendas:create', 'Crear Adendas', 'Permite crear nuevas adendas', true),
  ('adendas:edit', 'Editar Adendas', 'Permite editar adendas existentes', true),
  ('adendas:delete', 'Eliminar Adendas', 'Permite eliminar adendas', true),
  ('adendas:admin', 'Admin Adendas', 'Permisos administrativos completos en adendas', true)
) AS v(code, name, description, active)
WHERE NOT EXISTS (
  SELECT 1 FROM rbac_role WHERE rbac_role.code = v.code
);

-- PASO 4: Obtener tu user_id (reemplaza con tu email)
SELECT '3. Buscando tu usuario...' as paso;
SELECT id, email 
FROM auth.users 
WHERE email = 'TU_EMAIL_AQUI@ejemplo.com'; -- ⚠️ REEMPLAZA CON TU EMAIL

-- PASO 5: Verificar qué roles tienes actualmente asignados
-- (Reemplaza 'TU_USER_ID_AQUI' con el UUID de tu usuario del paso 4)
SELECT '4. Verificando tus roles actuales...' as paso;
SELECT 
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac_user_role ur ON u.id = ur.user_id
JOIN rbac_role r ON ur.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI@ejemplo.com' -- ⚠️ REEMPLAZA CON TU EMAIL
ORDER BY r.code;

-- PASO 6: Asignar todos los roles de adendas a tu usuario
-- (Reemplaza 'TU_USER_ID_AQUI' con el UUID de tu usuario del paso 4)
DO $$
DECLARE
  v_user_id UUID;
  v_roles_count INT;
BEGIN
  -- Obtener el user_id del usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI@ejemplo.com'; -- ⚠️ REEMPLAZA CON TU EMAIL
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado. Verifica que el email sea correcto.';
  END IF;
  
  -- Asignar todos los roles de adendas al usuario
  INSERT INTO rbac_user_role (user_id, role_id)
  SELECT 
    v_user_id as user_id,
    r.id as role_id
  FROM rbac_role r
  WHERE r.code IN ('adendas:view', 'adendas:create', 'adendas:edit', 'adendas:delete', 'adendas:admin')
    AND r.active = true
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  GET DIAGNOSTICS v_roles_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Permisos de adendas asignados. Roles insertados: %', v_roles_count;
END $$;

-- PASO 7: Verificar que los permisos se asignaron correctamente
SELECT '5. Verificando permisos asignados...' as paso;
SELECT 
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac_user_role ur ON u.id = ur.user_id
JOIN rbac_role r ON ur.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI@ejemplo.com' -- ⚠️ REEMPLAZA CON TU EMAIL
  AND r.code LIKE 'adendas:%'
ORDER BY r.code;

-- PASO 8: Verificar la vista v_my_permissions
-- (Esto debería mostrar los permisos de adendas si la vista está configurada correctamente)
SELECT '6. Verificando v_my_permissions...' as paso;
SELECT 
  module_code,
  action_code
FROM v_my_permissions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'TU_EMAIL_AQUI@ejemplo.com') -- ⚠️ REEMPLAZA CON TU EMAIL
  AND module_code = 'adendas'
ORDER BY action_code;

