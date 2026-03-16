import { AreaId, AREAS } from '@contracts/areas';

/**
 * Permisos disponibles por área
 */
export type AreaPermission = string;

/**
 * Configuración de permisos por área
 */
export interface AreaPermissionConfig {
  areaId: AreaId;
  permissions: AreaPermission[];
}

/**
 * Permisos específicos de cada área
 */
export const AREA_PERMISSIONS: Record<AreaId, AreaPermission[]> = {
  [AreaId.ACREDITACION]: [
    'acreditacion:view',
    'acreditacion:create',
    'acreditacion:edit',
    'acreditacion:delete',
    'acreditacion:admin',
    'acreditacion:acreditar',
  ],
  [AreaId.FINANZAS]: [
    'finanzas:view',
    'finanzas:create',
    'finanzas:edit',
    'finanzas:delete',
    'finanzas:admin',
  ],
  [AreaId.PROVEEDORES]: [
    'proveedores:view',
    'proveedores:create',
    'proveedores:edit',
    'proveedores:delete',
    'proveedores:admin',
  ],
  [AreaId.OPERACIONES]: [
    'operaciones:view',
    'operaciones:create',
    'operaciones:edit',
    'operaciones:delete',
    'operaciones:admin',
  ],
  [AreaId.PERSONAS]: [
    'personas:view',
    'personas:create',
    'personas:edit',
    'personas:delete',
    'personas:admin',
  ],
  [AreaId.ADENDAS]: [
    'adendas:view',
    'adendas:create',
    'adendas:edit',
    'adendas:delete',
    'adendas:admin',
  ],
};

/**
 * Obtener todas las áreas disponibles
 */
export const getAllAreas = () => Object.values(AREAS);

/**
 * Obtener área por ID
 */
export const getAreaById = (areaId: AreaId) => AREAS[areaId];
