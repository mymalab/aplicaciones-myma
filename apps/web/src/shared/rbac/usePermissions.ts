import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId } from '@contracts/areas';
import { AreaPermission } from './constants';
import { getUserPermissions, areaIdToModuleCode, PermissionsByModule } from './permissionsService';

/**
 * Hook para verificar permisos del usuario actual
 * Basado en permisos de v_my_permissions
 */
export const usePermissions = (areaId?: AreaId) => {
  const [permissions, setPermissions] = useState<AreaPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulePermissions, setModulePermissions] = useState<PermissionsByModule>({});

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPermissions([]);
          setModulePermissions({});
          setLoading(false);
          return;
        }

        if (!areaId) {
          setPermissions([]);
          setModulePermissions({});
          setLoading(false);
          return;
        }

        // Consultar permisos desde v_my_permissions
        const userPermissions = await getUserPermissions();
        setModulePermissions(userPermissions);

        // Obtener permisos del módulo específico
        const moduleCode = areaIdToModuleCode(areaId);
        const modulePerms = userPermissions[moduleCode] || {
          view: false,
          create: false,
          edit: false,
          delete: false,
          admin: false,
          acreditar: false,
        };

        // Convertir a formato de permisos (areaId:action)
        const permissionList: AreaPermission[] = [];
        if (modulePerms.view) permissionList.push(`${areaId}:view`);
        if (modulePerms.create) permissionList.push(`${areaId}:create`);
        if (modulePerms.edit) permissionList.push(`${areaId}:edit`);
        if (modulePerms.delete) permissionList.push(`${areaId}:delete`);
        if (modulePerms.admin) permissionList.push(`${areaId}:admin`);
        if (modulePerms.acreditar) permissionList.push(`${areaId}:acreditar`);

        setPermissions(permissionList);
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setPermissions([]);
        setModulePermissions({});
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [areaId]);

  const hasPermission = (permission: AreaPermission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: AreaPermission[]): boolean => {
    return permissionList.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (permissionList: AreaPermission[]): boolean => {
    return permissionList.every(perm => permissions.includes(perm));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};











