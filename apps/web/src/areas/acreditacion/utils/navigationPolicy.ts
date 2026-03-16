import { AreaId } from '@contracts/areas';
import type { PermissionsByModule } from '@shared/rbac/permissionsService';

export type AcreditacionAccessLevel =
  | 'none'
  | 'viewer'
  | 'editor'
  | 'accreditor'
  | 'admin';

export interface AcreditacionNavigationPolicy {
  accessLevel: AcreditacionAccessLevel;
  isAdmin: boolean;
  isAccreditor: boolean;
  isRestrictedCollaborator: boolean;
  canAccessDashboards: boolean;
  canAccessRequestsSst: boolean;
  canManageRequestsSst: boolean;
  canAccessFieldRequest: boolean;
  canAccessReports: boolean;
  defaultRoute: 'dashboards' | 'reports';
}

export const DEFAULT_ACREDITACION_NAVIGATION_POLICY: AcreditacionNavigationPolicy = {
  accessLevel: 'none',
  isAdmin: false,
  isAccreditor: false,
  isRestrictedCollaborator: false,
  canAccessDashboards: false,
  canAccessRequestsSst: false,
  canManageRequestsSst: false,
  // Fail-closed para botones restringidos; estos dos quedan visibles para evitar UI vacía
  // mientras se resuelven permisos del colaborador.
  canAccessFieldRequest: true,
  canAccessReports: true,
  defaultRoute: 'reports',
};

export const buildAcreditacionNavigationPolicy = (
  permissions: PermissionsByModule
): AcreditacionNavigationPolicy => {
  const moduleCode = AreaId.ACREDITACION.toLowerCase();
  const modulePerms = permissions[moduleCode] || {
    view: false,
    create: false,
    edit: false,
    delete: false,
    admin: false,
    acreditar: false,
  };

  const accessLevel: AcreditacionAccessLevel = modulePerms.admin
    ? 'admin'
    : modulePerms.acreditar
      ? 'accreditor'
    : modulePerms.edit || modulePerms.create || modulePerms.delete
      ? 'editor'
      : modulePerms.view
        ? 'viewer'
        : 'none';

  const isAdmin = modulePerms.admin === true;
  const isAccreditor = modulePerms.acreditar === true;
  const hasCollaboratorAccess = Boolean(
    modulePerms.view ||
      modulePerms.edit ||
      modulePerms.create ||
      modulePerms.delete ||
      modulePerms.acreditar
  );
  const isRestrictedCollaborator = !isAdmin && !isAccreditor && hasCollaboratorAccess;

  if (isAdmin) {
    return {
      accessLevel,
      isAdmin: true,
      isAccreditor: false,
      isRestrictedCollaborator: false,
      canAccessDashboards: true,
      canAccessRequestsSst: true,
      canManageRequestsSst: true,
      canAccessFieldRequest: true,
      canAccessReports: true,
      defaultRoute: 'dashboards',
    };
  }

  if (isAccreditor) {
    return {
      accessLevel,
      isAdmin: false,
      isAccreditor: true,
      isRestrictedCollaborator: false,
      canAccessDashboards: true,
      canAccessRequestsSst: true,
      canManageRequestsSst: true,
      canAccessFieldRequest: true,
      canAccessReports: true,
      defaultRoute: 'dashboards',
    };
  }

  if (isRestrictedCollaborator) {
    return {
      accessLevel,
      isAdmin: false,
      isAccreditor: false,
      isRestrictedCollaborator: true,
      canAccessDashboards: false,
      canAccessRequestsSst: true,
      canManageRequestsSst: false,
      canAccessFieldRequest: true,
      canAccessReports: true,
      defaultRoute: 'reports',
    };
  }

  return {
    accessLevel,
    isAdmin: false,
    isAccreditor: false,
    isRestrictedCollaborator: false,
    canAccessDashboards: false,
    canAccessRequestsSst: false,
    canManageRequestsSst: false,
    canAccessFieldRequest: false,
    canAccessReports: false,
    defaultRoute: 'reports',
  };
};
