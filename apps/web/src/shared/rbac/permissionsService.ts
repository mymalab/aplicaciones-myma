import { supabase } from '../api-client/supabase';
import { AreaId } from '@contracts/areas';

/**
 * Interfaz para los permisos devueltos por v_my_permissions
 */
export interface PermissionRow {
  module_code: string;
  action_code: string;
}

/**
 * Estructura de permisos por módulo
 */
export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  admin?: boolean;
  acreditar?: boolean;
}

/**
 * Permisos organizados por módulo
 */
export type PermissionsByModule = Record<string, ModulePermissions>;

const DEBUG_RBAC = import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.log(...args);
  }
};

const debugWarn = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.warn(...args);
  }
};

/**
 * Mapeo de action_code a tipo de permiso
 */
const ACTION_CODE_MAP: Record<string, keyof ModulePermissions> = {
  view: 'view',
  viewer: 'view',
  create: 'create',
  edit: 'edit',
  editor: 'edit',
  update: 'edit',
  delete: 'delete',
  remove: 'delete',
  admin: 'admin',
  acreditar: 'acreditar',
  accreditar: 'acreditar',
};

/**
 * Consultar permisos del usuario actual desde v_my_permissions
 */
export const fetchUserPermissions = async (): Promise<PermissionRow[]> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error obteniendo usuario autenticado:', userError);
      return [];
    }

    debugLog('Consultando permisos para user_id:', user.id);

    const { data, error } = await supabase
      .from('v_my_permissions')
      .select('module_code, action_code')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching permissions from v_my_permissions:', error);
      console.error('Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    debugLog('Permisos obtenidos:', data?.length || 0, 'registros');
    return data || [];
  } catch (error) {
    console.error('Error in fetchUserPermissions:', error);
    return [];
  }
};

/**
 * Transformar permisos de la vista en objeto estructurado por módulo
 */
export const transformPermissions = (
  permissions: PermissionRow[]
): PermissionsByModule => {
  const result: PermissionsByModule = {};

  permissions.forEach(({ module_code, action_code }) => {
    const module = module_code.toLowerCase().trim();
    const action = action_code.toLowerCase().trim();
    const permissionType =
      ACTION_CODE_MAP[action] || (action as keyof ModulePermissions);

    if (!result[module]) {
      result[module] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
        admin: false,
        acreditar: false,
      };
    }

    if (permissionType in result[module]) {
      result[module][permissionType] = true;
    } else {
      debugWarn(
        `Tipo de permiso no reconocido: ${permissionType} para módulo ${module}`
      );
    }
  });

  debugLog('Permisos transformados:', result);
  return result;
};

/**
 * Obtener permisos del usuario actual transformados
 */
export const getUserPermissions = async (): Promise<PermissionsByModule> => {
  const permissions = await fetchUserPermissions();
  return transformPermissions(permissions);
};

/**
 * Buscar el módulo en los permisos con variaciones del nombre
 */
const findModuleInPermissions = (
  permissions: PermissionsByModule,
  moduleCode: string
): string | null => {
  const normalized = moduleCode.toLowerCase().trim();

  if (permissions[normalized]) {
    return normalized;
  }

  const moduleKeys = Object.keys(permissions);
  const found = moduleKeys.find((key) => {
    const keyNormalized = key.toLowerCase().trim();
    return (
      keyNormalized === normalized ||
      keyNormalized.includes(normalized) ||
      normalized.includes(keyNormalized)
    );
  });

  return found || null;
};

/**
 * Verificar si el usuario tiene permiso de view en un módulo específico
 */
export const hasModuleViewPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = findModuleInPermissions(permissions, moduleCode);

  if (!module) {
    debugWarn(
      `Módulo "${moduleCode}" no encontrado en permisos. Módulos disponibles:`,
      Object.keys(permissions)
    );
    return false;
  }

  const hasView = permissions[module]?.view === true;
  if (!hasView) {
    debugWarn(
      `Módulo "${moduleCode}" encontrado pero sin permiso view.`,
      permissions[module]
    );
  }

  return hasView;
};

/**
 * Verificar si el usuario tiene cualquier permiso util en un modulo especifico
 */
export const hasModuleAccessPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = findModuleInPermissions(permissions, moduleCode);

  if (!module) {
    debugWarn(
      `Modulo "${moduleCode}" no encontrado en permisos. Modulos disponibles:`,
      Object.keys(permissions)
    );
    return false;
  }

  const modulePerms = permissions[module];
  const hasAccess = Boolean(
    modulePerms?.view ||
      modulePerms?.create ||
      modulePerms?.edit ||
      modulePerms?.delete ||
      modulePerms?.admin ||
      modulePerms?.acreditar
  );

  if (!hasAccess) {
    debugWarn(
      `Modulo "${moduleCode}" encontrado pero sin permisos de acceso.`,
      modulePerms
    );
  }

  return hasAccess;
};

/**
 * Verificar si el usuario tiene al menos un permiso util en algun modulo
 */
export const hasAnyModuleAccessPermissions = (
  permissions: PermissionsByModule
): boolean => {
  return Object.values(permissions).some((modulePerms) =>
    Boolean(
      modulePerms.view ||
        modulePerms.create ||
        modulePerms.edit ||
        modulePerms.delete ||
        modulePerms.admin ||
        modulePerms.acreditar
    )
  );
};

/**
 * Mapear AreaId a module_code
 */
export const areaIdToModuleCode = (areaId: AreaId): string => {
  return areaId.toLowerCase();
};

/**
 * Verificar si el usuario tiene acceso a un área basándose en permisos
 */
export const hasAreaAccess = (
  permissions: PermissionsByModule,
  areaId: AreaId
): boolean => {
  const moduleCode = areaIdToModuleCode(areaId);
  return hasModuleAccessPermission(permissions, moduleCode);
};

/**
 * Verificar si el usuario tiene permiso admin en un módulo específico
 */
export const hasModuleAdminPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = moduleCode.toLowerCase().trim();
  return permissions[module]?.admin === true;
};

/**
 * Obtener códigos de módulos donde el usuario tiene permiso admin
 */
export const getAdminModuleCodes = (
  permissions: PermissionsByModule
): string[] => {
  return Object.entries(permissions)
    .filter(([_, modulePerms]) => modulePerms.admin === true)
    .map(([moduleCode]) => moduleCode.toLowerCase().trim());
};

/**
 * Verificar si el usuario tiene al menos un permiso admin en cualquier módulo
 */
export const hasAnyAdminPermission = (
  permissions: PermissionsByModule
): boolean => {
  return getAdminModuleCodes(permissions).length > 0;
};

/**
 * Verificar si el usuario tiene permiso admin en un área específica
 */
export const hasAreaAdminPermission = (
  permissions: PermissionsByModule,
  areaId: AreaId
): boolean => {
  const moduleCode = areaIdToModuleCode(areaId);
  return hasModuleAdminPermission(permissions, moduleCode);
};

