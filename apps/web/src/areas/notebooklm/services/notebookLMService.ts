import { supabase } from '@shared/api-client/supabase';

export interface NotebookOption {
  id: string;
  nombre: string;
  notebook_id: string;
}

export interface NotebookAuthorizedPerson {
  id: number;
  rut: string;
  nombre_completo: string;
  correo: string;
}

export interface DownloadSeiaDocumentsPayload {
  documento_seia: string;
  tipo: string;
  exclude_keywords: string[];
}

export interface DownloadSeiaDocumentsRunResponse {
  run_id: string;
  status?: string;
  message?: string;
}

export interface DownloadSeiaDocumentItem {
  [key: string]: unknown;
}

export interface DownloadSeiaDocumentsStatusResponse {
  run_id?: string;
  status?: string;
  progress_stage?: string;
  progress_current?: number;
  progress_total?: number;
  progress_percent?: number;
  progress_message?: string;
  documents?: DownloadSeiaDocumentItem[];
  error_message?: string;
  [key: string]: unknown;
}

const NOTEBOOK_LM_LOCAL_API_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BASE_URL || 'http://127.0.0.1:8000'
)
  .trim()
  .replace(/\/+$/, '');

const NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN = (
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN || ''
).trim();

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getResponseContentType = (response: Response) =>
  response.headers.get('content-type')?.toLowerCase() ?? '';

export const fetchNotebookOptions = async (): Promise<NotebookOption[]> => {
  const parseRows = (rows: Array<Record<string, unknown>> | null): NotebookOption[] => {
    const mapped = (rows || [])
      .map((row) => {
        const nombre = normalizeString(row.nombre);
        const notebookId =
          normalizeString(row.notebooklm_id) ||
          normalizeString(row.notebook_id) ||
          (typeof row.id === 'number' || typeof row.id === 'string'
            ? String(row.id).trim()
            : '');
        const id =
          (typeof row.id === 'number' || typeof row.id === 'string'
            ? String(row.id).trim()
            : '') || notebookId;

        return {
          id,
          nombre,
          notebook_id: notebookId,
        };
      })
      .filter((item) => item.nombre && item.notebook_id);

    const uniqueByNotebookId = new Map<string, NotebookOption>();
    for (const item of mapped) {
      if (!uniqueByNotebookId.has(item.notebook_id)) {
        uniqueByNotebookId.set(item.notebook_id, item);
      }
    }

    return Array.from(uniqueByNotebookId.values());
  };

  const attempts = [
    'id,nombre,notebooklm_id',
    'id,nombre,notebook_id',
    'id,nombre',
  ];

  let lastError: unknown = null;
  for (const selectClause of attempts) {
    const { data, error } = await supabase
      .from('dim_adenda_notebook_experto')
      .select(selectClause)
      .order('nombre', { ascending: true });

    if (!error) {
      return parseRows((data || null) as unknown as Array<Record<string, unknown>> | null);
    }

    lastError = error;
  }

  throw lastError;
};

export const fetchNotebookAuthorizedPeople = async (): Promise<
  NotebookAuthorizedPerson[]
> => {
  const { data, error } = await supabase
    .from('dim_core_persona')
    .select('id,rut,nombre_completo,correo,estado')
    .eq('estado', 'Activo')
    .order('nombre_completo', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    rut: normalizeString(row.rut),
    nombre_completo: normalizeString(row.nombre_completo),
    correo: normalizeString(row.correo),
  }));
};

export const downloadSeiaDocuments = async (
  payload: DownloadSeiaDocumentsPayload
): Promise<DownloadSeiaDocumentsRunResponse> => {
  const endpoint = `${NOTEBOOK_LM_LOCAL_API_BASE_URL}/api/v1/adenda/descarga-documentos-seia`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN
          ? {
              Authorization: `Bearer ${NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo conectar con ${endpoint}. Verifica que la API local este disponible.`
      );
    }

    throw error;
  }

  const contentType = getResponseContentType(response);
  const rawBody = await response.text();

  let parsedBody: unknown = null;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const apiMessage =
      typeof parsedBody === 'object' && parsedBody && 'detail' in parsedBody
        ? String((parsedBody as { detail?: unknown }).detail)
        : rawBody || `${response.status} ${response.statusText}`;

    throw new Error(`Error al generar DOM: ${apiMessage}`);
  }

  if (contentType.includes('application/json') && parsedBody && typeof parsedBody === 'object') {
    return parsedBody as DownloadSeiaDocumentsRunResponse;
  }

  throw new Error('La API no devolvio un JSON valido al iniciar la generacion del DOM.');
};

export const getDownloadSeiaDocumentsStatus = async (
  runId: string
): Promise<DownloadSeiaDocumentsStatusResponse> => {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) {
    throw new Error('No se recibio un run_id valido para consultar el estado.');
  }

  const endpoint = `${NOTEBOOK_LM_LOCAL_API_BASE_URL}/api/v1/adenda/descarga-documentos-seia/${encodeURIComponent(
    normalizedRunId
  )}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN
          ? {
              Authorization: `Bearer ${NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN}`,
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo consultar ${endpoint}. Verifica que la API local este disponible.`
      );
    }

    throw error;
  }

  const contentType = getResponseContentType(response);
  const rawBody = await response.text();

  let parsedBody: unknown = null;
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const apiMessage =
      typeof parsedBody === 'object' && parsedBody && 'detail' in parsedBody
        ? String((parsedBody as { detail?: unknown }).detail)
        : rawBody || `${response.status} ${response.statusText}`;

    throw new Error(`Error al consultar el estado del DOM: ${apiMessage}`);
  }

  if (contentType.includes('application/json') && parsedBody && typeof parsedBody === 'object') {
    return parsedBody as DownloadSeiaDocumentsStatusResponse;
  }

  throw new Error('La API no devolvio un JSON valido al consultar el estado del DOM.');
};
