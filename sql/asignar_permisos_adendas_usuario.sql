-- ============================================
-- Asignar Permisos de Adendas a un Usuario
-- ============================================
-- Este script asigna todos los permisos de adendas a un usuario específico
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_EMAIL_AQUI@ejemplo.com' con tu email de usuario
-- 2. Ejecuta este script en Supabase SQL Editor
-- 3. Asegúrate de que el módulo y roles de adendas ya existan (ejecuta primero agregar_modulo_adendas.sql)

-- Obtener el user_id del usuario por email
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtener el user_id del usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI@ejemplo.com';
  
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
  
  RAISE NOTICE 'Permisos de adendas asignados correctamente al usuario: %', v_user_id;
END $$;

-- Verificar que los permisos se asignaron correctamente
-- (Descomenta y ajusta el email para verificar)
/*
SELECT 
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac_user_role ur ON u.id = ur.user_id
JOIN rbac_role r ON ur.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI@ejemplo.com'
  AND r.code LIKE 'adendas:%'
ORDER BY r.code;
*/

