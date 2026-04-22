import { AreaId } from '@contracts/areas';

export const SUPPORTED_AREA_IDS: AreaId[] = [
  AreaId.ACREDITACION,
  AreaId.PROVEEDORES,
  AreaId.PERSONAS,
  AreaId.ADENDAS,
  AreaId.FINANZAS,
  AreaId.NOTEBOOKLM,
];

export const filterSupportedAreas = (areas: AreaId[]): AreaId[] => {
  return areas.filter((areaId) => SUPPORTED_AREA_IDS.includes(areaId));
};
