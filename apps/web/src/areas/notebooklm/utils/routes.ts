import { AreaId } from '@contracts/areas';

const NOTEBOOKLM_BASE_PATH = `/app/area/${AreaId.NOTEBOOKLM}`;

export const notebookLMHome = () => NOTEBOOKLM_BASE_PATH;

export const notebookLMCreate = () => `${NOTEBOOKLM_BASE_PATH}/create`;
