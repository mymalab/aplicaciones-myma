import { supabase } from '@shared/api-client/supabase';

export interface NotebookOption {
  id: string;
  nombre: string;
  notebook_id: string;
}

export type NotebookExpertOption = NotebookOption;

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
  notebooklm_id?: string;
  nombre_notebooklm?: string;
  retry_attempts?: number;
  retry_documents_count?: number;
  retry_document_ids?: string[];
  documents?: DownloadSeiaDocumentItem[];
  error_message?: string;
  [key: string]: unknown;
}

export interface CreateAndLoadNotebookFilteredPayload {
  run_id: string;
  nombre_notebook?: string;
  notebook_id?: string;
  selected_document_ids: string[];
}

export interface CreateAndLoadNotebookFilteredResponse {
  run_id?: string;
  notebook_id?: string;
  notebooklm_id?: string;
  nombre_notebooklm?: string;
  retry_attempts?: number;
  retry_documents_count?: number;
  retry_document_ids?: string[];
  id?: string;
  status?: string;
  message?: string;
  detail?: string;
  data?: Record<string, unknown>;
  result?: Record<string, unknown>;
  notebook?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RetryNotebookUploadPayload {
  run_id: string;
}

export interface RetryNotebookUploadResponse {
  run_id?: string;
  notebooklm_id?: string;
  retry_attempts?: number;
  retry_documents_count?: number;
  retry_document_ids?: string[];
  documents_uploaded_ok?: number;
  documents_uploaded_failed?: number;
  status?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface DownloadRetryDocumentsZipResponse {
  blob: Blob;
  filename: string;
}

export type NotebookSharePermission = 'viewer' | 'editor';

export interface ShareNotebookUserPayload {
  email: string;
  permission: NotebookSharePermission;
  notify: true;
  welcome_message: string;
}

export interface ShareNotebookUserResponse {
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

interface NotebookChatResponse {
  answer?: string | null;
  conversation_id?: string | null;
  conversationId?: string | null;
  detail?:
    | string
    | string[]
    | {
        message?: string | null;
        error_type?: string | null;
        next_step?: string | null;
      }
    | Array<{
        message?: string | null;
        msg?: string | null;
        type?: string | null;
      }>
    | null;
  error?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  conversation?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface NotebookChatRequestPayload {
  notebookId: string;
  prompt: string;
  conversationId?: string;
}

export interface NotebookChatResult {
  answer: string;
  conversationId: string;
  raw: Record<string, unknown> | null;
}

const NOTEBOOK_LM_LOCAL_API_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BASE_URL || 'http://127.0.0.1:8000'
)
  .trim()
  .replace(/\/+$/, '');

const NOTEBOOK_LM_CHAT_API_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_CHAT_API_BASE_URL ||
  import.meta.env.VITE_NOTEBOOK_LM_SHARE_API_BASE_URL ||
  'http://127.0.0.1:8001'
)
  .trim()
  .replace(/\/+$/, '');

const NOTEBOOK_LM_SHARE_API_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_SHARE_API_BASE_URL || NOTEBOOK_LM_CHAT_API_BASE_URL
)
  .trim()
  .replace(/\/+$/, '');

const NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN = (
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN || ''
).trim();

const NOTEBOOK_LM_CHAT_API_BEARER_TOKEN = (
  import.meta.env.VITE_NOTEBOOK_LM_CHAT_API_BEARER_TOKEN ||
  import.meta.env.VITE_NOTEBOOK_LM_SHARE_API_BEARER_TOKEN ||
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN ||
  ''
).trim();

const NOTEBOOK_LM_SHARE_API_BEARER_TOKEN = (
  import.meta.env.VITE_NOTEBOOK_LM_SHARE_API_BEARER_TOKEN ||
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN ||
  ''
).trim();

export const NOTEBOOK_LM_CHAT_API_DOCS_URL = `${NOTEBOOK_LM_CHAT_API_BASE_URL}/docs`;

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getResponseContentType = (response: Response) =>
  response.headers.get('content-type')?.toLowerCase() ?? '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getNotebookChatErrorMessage = (response: NotebookChatResponse | null): string | null => {
  if (!response) return null;

  if (typeof response.error === 'string' && response.error.trim()) {
    return response.error.trim();
  }

  if (typeof response.message === 'string' && response.message.trim()) {
    return response.message.trim();
  }

  if (typeof response.detail === 'string' && response.detail.trim()) {
    return response.detail.trim();
  }

  if (Array.isArray(response.detail)) {
    const detailMessage = response.detail
      .map((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        if (isRecord(item)) {
          if (typeof item.message === 'string' && item.message.trim()) {
            return item.message.trim();
          }
          if (typeof item.msg === 'string' && item.msg.trim()) {
            return item.msg.trim();
          }
        }
        return '';
      })
      .find(Boolean);

    if (detailMessage) {
      return detailMessage;
    }
  }

  if (isRecord(response.detail)) {
    const message =
      typeof response.detail.message === 'string' ? response.detail.message.trim() : '';
    const nextStep =
      typeof response.detail.next_step === 'string' ? response.detail.next_step.trim() : '';

    if (message && nextStep) {
      return `${message} ${nextStep}`;
    }
    if (message) {
      return message;
    }
    if (nextStep) {
      return nextStep;
    }
  }

  return null;
};

const normalizeNotebookAnswer = (rawAnswer: string): string => {
  return rawAnswer
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(\d+)\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getConversationIdCandidate = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (!isRecord(value)) {
    return '';
  }

  const directCandidates = [
    value.conversation_id,
    value.conversationId,
    value.id,
    value.chat_id,
    value.chatId,
  ];

  const resolvedDirectCandidate = directCandidates.map(normalizeString).find(Boolean);
  if (resolvedDirectCandidate) {
    return resolvedDirectCandidate;
  }

  const nestedCandidates = [value.data, value.result, value.conversation];
  for (const candidate of nestedCandidates) {
    const resolvedNestedCandidate = getConversationIdCandidate(candidate);
    if (resolvedNestedCandidate) {
      return resolvedNestedCandidate;
    }
  }

  return '';
};

const buildNotebookChatPayloadCandidates = (prompt: string, conversationId?: string) => {
  const normalizedPrompt = prompt.trim();
  const normalizedConversationId = normalizeString(conversationId);

  const promptVariants = [
    { question: normalizedPrompt },
    { prompt: normalizedPrompt },
    { message: normalizedPrompt },
    { query: normalizedPrompt },
    { input: normalizedPrompt },
  ];

  if (!normalizedConversationId) {
    return promptVariants;
  }

  return promptVariants.flatMap((payload) => [
    {
      ...payload,
      conversation_id: normalizedConversationId,
    },
    {
      ...payload,
      conversationId: normalizedConversationId,
    },
  ]);
};

const getFilenameFromContentDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return '';
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim();
    } catch {
      return utf8Match[1].trim();
    }
  }

  const basicMatch = contentDisposition.match(/filename\s*=\s*\"?([^\";]+)\"?/i);
  return basicMatch?.[1]?.trim() || '';
};

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

export const fetchNotebookExpertOptions = async (): Promise<NotebookExpertOption[]> => {
  return fetchNotebookOptions();
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

export const createAndLoadNotebookFiltered = async (
  payload: CreateAndLoadNotebookFilteredPayload
): Promise<CreateAndLoadNotebookFilteredResponse> => {
  const normalizedNotebookName = normalizeString(payload.nombre_notebook);
  const normalizedNotebookId = normalizeString(payload.notebook_id);
  const normalizedPayload = {
    run_id: payload.run_id.trim(),
    selected_document_ids: Array.from(
      new Set(payload.selected_document_ids.map((id) => id.trim()).filter(Boolean))
    ),
    ...(normalizedNotebookName ? { nombre_notebook: normalizedNotebookName } : {}),
    ...(normalizedNotebookId ? { notebook_id: normalizedNotebookId } : {}),
  } as Record<string, unknown>;

  if (!normalizedPayload.run_id) {
    throw new Error('No se recibio un run_id valido para crear el notebook.');
  }

  if (Boolean(normalizedNotebookName) === Boolean(normalizedNotebookId)) {
    throw new Error(
      'Debes enviar exactamente uno: nombre_notebook para crear o notebook_id para reutilizar.'
    );
  }

  if ((normalizedPayload.selected_document_ids as string[]).length === 0) {
    throw new Error('No hay document_id seleccionados para cargar al notebook.');
  }

  const endpoint = `${NOTEBOOK_LM_LOCAL_API_BASE_URL}/api/v1/adenda/crear-y-cargar-notebook-filtrado`;

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
      body: JSON.stringify(normalizedPayload),
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

    throw new Error(`Error al crear y cargar el notebook: ${apiMessage}`);
  }

  if (contentType.includes('application/json') && parsedBody && typeof parsedBody === 'object') {
    return parsedBody as CreateAndLoadNotebookFilteredResponse;
  }

  throw new Error('La API no devolvio un JSON valido al crear y cargar el notebook.');
};

export const retryNotebookUpload = async (
  payload: RetryNotebookUploadPayload
): Promise<RetryNotebookUploadResponse> => {
  const normalizedPayload = {
    run_id: payload.run_id.trim(),
  };

  if (!normalizedPayload.run_id) {
    throw new Error('No se recibio un run_id valido para reintentar la carga.');
  }

  const endpoint = `${NOTEBOOK_LM_LOCAL_API_BASE_URL}/api/v1/adenda/reintentar-carga-notebook`;

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
      body: JSON.stringify(normalizedPayload),
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

    throw new Error(`Error al reintentar la carga del notebook: ${apiMessage}`);
  }

  if (contentType.includes('application/json') && parsedBody && typeof parsedBody === 'object') {
    return parsedBody as RetryNotebookUploadResponse;
  }

  throw new Error('La API no devolvio un JSON valido al reintentar la carga del notebook.');
};

export const downloadRetryDocumentsZip = async (
  runId: string
): Promise<DownloadRetryDocumentsZipResponse> => {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) {
    throw new Error('No se recibio un run_id valido para descargar los documentos fallidos.');
  }

  const endpoint = `${NOTEBOOK_LM_LOCAL_API_BASE_URL}/api/v1/adenda/descarga-documentos-seia/${encodeURIComponent(
    normalizedRunId
  )}/documentos-fallidos.zip`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/zip, application/octet-stream',
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
        `No se pudo conectar con ${endpoint}. Verifica que la API local este disponible.`
      );
    }

    throw error;
  }

  if (!response.ok) {
    const rawBody = await response.text();

    let parsedBody: unknown = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody) as unknown;
      } catch {
        parsedBody = rawBody;
      }
    }

    const apiMessage =
      typeof parsedBody === 'object' && parsedBody && 'detail' in parsedBody
        ? String((parsedBody as { detail?: unknown }).detail)
        : rawBody || `${response.status} ${response.statusText}`;

    throw new Error(`Error al descargar los documentos fallidos: ${apiMessage}`);
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromContentDisposition(response.headers.get('content-disposition')) ||
    `documentos-fallidos-${normalizedRunId.slice(0, 8) || 'corrida'}.zip`;

  return {
    blob,
    filename,
  };
};

export const shareNotebookWithUser = async (
  notebookId: string,
  payload: ShareNotebookUserPayload
): Promise<ShareNotebookUserResponse> => {
  const normalizedNotebookId = normalizeString(notebookId);
  const normalizedEmail = normalizeString(payload.email);

  if (!normalizedNotebookId) {
    throw new Error('No se recibio un notebook_id valido para compartir.');
  }

  if (!normalizedEmail) {
    throw new Error('No se recibio un correo valido para compartir el notebook.');
  }

  const endpoint = `${NOTEBOOK_LM_SHARE_API_BASE_URL}/notebooks/${encodeURIComponent(
    normalizedNotebookId
  )}/share/users`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(NOTEBOOK_LM_SHARE_API_BEARER_TOKEN
          ? {
              Authorization: `Bearer ${NOTEBOOK_LM_SHARE_API_BEARER_TOKEN}`,
            }
          : {}),
      },
      body: JSON.stringify({
        email: normalizedEmail,
        permission: payload.permission,
        notify: true,
        welcome_message: payload.welcome_message,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo conectar con ${endpoint}. Verifica que la API de comparticion este disponible.`
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

    throw new Error(`Error al compartir con ${normalizedEmail}: ${apiMessage}`);
  }

  if (contentType.includes('application/json') && parsedBody && typeof parsedBody === 'object') {
    return parsedBody as ShareNotebookUserResponse;
  }

  return rawBody ? { message: rawBody } : {};
};

export const buildNotebookChatEndpoint = (notebookId: string) => {
  const normalizedNotebookId = normalizeString(notebookId);
  if (!normalizedNotebookId) {
    return '';
  }

  return `${NOTEBOOK_LM_CHAT_API_BASE_URL}/notebooks/${encodeURIComponent(
    normalizedNotebookId
  )}/chat`;
};

export const sendNotebookChatMessage = async (
  payload: NotebookChatRequestPayload
): Promise<NotebookChatResult> => {
  const notebookId = normalizeString(payload.notebookId);
  const prompt = payload.prompt.trim();
  const conversationId = normalizeString(payload.conversationId);

  if (!notebookId) {
    throw new Error('No se recibio un notebook_id valido para conversar.');
  }

  if (!prompt) {
    throw new Error('Escribe un mensaje antes de enviarlo al notebook.');
  }

  const endpoint = buildNotebookChatEndpoint(notebookId);
  const payloadCandidates = buildNotebookChatPayloadCandidates(prompt, conversationId);
  const errors: string[] = [];

  for (const requestPayload of payloadCandidates) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(NOTEBOOK_LM_CHAT_API_BEARER_TOKEN
            ? {
                Authorization: `Bearer ${NOTEBOOK_LM_CHAT_API_BEARER_TOKEN}`,
              }
            : {}),
        },
        body: JSON.stringify(requestPayload),
      });

      const rawBody = await response.text();
      let parsedBody: NotebookChatResponse | null = null;
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody) as NotebookChatResponse;
        } catch {
          parsedBody = null;
        }
      }

      if (!response.ok) {
        const apiMessage = getNotebookChatErrorMessage(parsedBody);
        const statusMessage = apiMessage
          ? `${response.status}: ${apiMessage}`
          : `${response.status}: la API no pudo procesar la solicitud.`;

        if (response.status === 401) {
          throw new Error(
            apiMessage
              ? `401: ${apiMessage}`
              : "401: La sesion de NotebookLM no es valida. Ejecuta '.\\.venv\\Scripts\\notebooklm.exe login --browser msedge'."
          );
        }

        if (response.status === 403) {
          throw new Error(statusMessage);
        }

        errors.push(statusMessage);

        if (response.status === 422) {
          continue;
        }

        continue;
      }

      const answer =
        parsedBody && typeof parsedBody.answer === 'string'
          ? parsedBody.answer.trim()
          : '';

      if (!answer) {
        errors.push('La API respondio correctamente, pero no entrego el campo answer.');
        continue;
      }

      return {
        answer: normalizeNotebookAnswer(answer),
        conversationId: getConversationIdCandidate(parsedBody) || conversationId,
        raw: isRecord(parsedBody) ? parsedBody : null,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Error de red al llamar la API de chat.';

      if (
        typeof errorMessage === 'string' &&
        (errorMessage.startsWith('401:') || errorMessage.startsWith('403:'))
      ) {
        throw new Error(errorMessage);
      }

      errors.push(errorMessage);
    }
  }

  throw new Error(
    errors[0] || 'No fue posible obtener respuesta desde la API de chat del notebook.'
  );
};
