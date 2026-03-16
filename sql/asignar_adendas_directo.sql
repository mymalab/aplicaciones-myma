-- ============================================
-- Asignar Permisos de Adendas - Script Directo
-- ============================================
-- ⚠️ IMPORTANTE: Reemplaza 'TU_EMAIL_AQUI@ejemplo.com' con tu email real
-- Ejecuta este script en Supabase SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_roles_created INT := 0;
  v_roles_assigned INT := 0;
BEGIN
  -- 1. Obtener el user_id del usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI@ejemplo.com'; -- ⚠️ REEMPLAZA CON TU EMAIL
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuario no encontrado. Verifica que el email sea correcto.';
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado: %', v_user_id;
  
  -- 2. Crear los roles de adendas si no existen
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
  
  GET DIAGNOSTICS v_roles_created = ROW_COUNT;
  
  IF v_roles_created > 0 THEN
    RAISE NOTICE '✅ Roles creados: %', v_roles_created;
  ELSE
    RAISE NOTICE 'ℹ️ Todos los roles ya existían';
  END IF;
  
  -- 3. Asignar todos los roles de adendas al usuario
  INSERT INTO rbac_user_role (user_id, role_id)
  SELECT 
    v_user_id as user_id,
    r.id as role_id
  FROM rbac_role r
  WHERE r.code IN ('adendas:view', 'adendas:create', 'adendas:edit', 'adendas:delete', 'adendas:admin')
    AND r.active = true
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  GET DIAGNOSTICS v_roles_assigned = ROW_COUNT;
  
  IF v_roles_assigned > 0 THEN
    RAISE NOTICE '✅ Roles asignados al usuario: %', v_roles_assigned;
  ELSE
    RAISE NOTICE 'ℹ️ Todos los roles ya estaban asignados';
  END IF;
  
  RAISE NOTICE '🎉 Proceso completado. Recarga la aplicación para ver los cambios.';
END $$;

-- Verificar que todo se asignó correctamente
SELECT 
  'Verificación final:' as info,
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac_user_role ur ON u.id = ur.user_id
JOIN rbac_role r ON ur.role_id = r.id
WHERE u.email = 'TU_EMAIL_AQUI@ejemplo.com' -- ⚠️ REEMPLAZA CON TU EMAIL
  AND r.code LIKE 'adendas:%'
ORDER BY r.code;

