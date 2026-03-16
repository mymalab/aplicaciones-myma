import { AreaId } from '@contracts/areas';

/**
 * Utilidades para construir rutas del área de acreditaciones
 */
export const getAcreditacionPath = (path: string): string => {
  return `/app/area/${AreaId.ACREDITACION}/${path}`;
};

export const ACREDITACION_ROUTES = {
  requests: getAcreditacionPath('requests'),
  requestsCreate: getAcreditacionPath('requests/create'),
  requestsEdit: getAcreditacionPath('requests/edit'),
  fieldRequest: getAcreditacionPath('field-request'),
  reports: getAcreditacionPath('reports'),
  dashboards: getAcreditacionPath('dashboards'),
};











