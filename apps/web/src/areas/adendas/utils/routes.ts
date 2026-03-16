import { AreaId } from '@contracts/areas';

const ADENDAS_BASE_PATH = `/app/area/${AreaId.ADENDAS}`;

export const adendasList = () => ADENDAS_BASE_PATH;

export const adendasCreate = () => `${ADENDAS_BASE_PATH}/create`;

export const adendasEdit = (id: string | number) =>
  `${ADENDAS_BASE_PATH}/edit/${encodeURIComponent(String(id))}`;

export const adendasDetail = (codigoMyma: string) =>
  `${ADENDAS_BASE_PATH}/detail/${encodeURIComponent(codigoMyma)}`;

export const adendasGestion = (codigoMyma: string) =>
  `${ADENDAS_BASE_PATH}/gestion/${encodeURIComponent(codigoMyma)}`;

export const adendasPregunta = (codigoMyma: string, preguntaId: string) =>
  `${ADENDAS_BASE_PATH}/gestion/${encodeURIComponent(
    codigoMyma
  )}/pregunta/${encodeURIComponent(preguntaId)}`;

export const adendasReporte = () => `${ADENDAS_BASE_PATH}/reporte`;
