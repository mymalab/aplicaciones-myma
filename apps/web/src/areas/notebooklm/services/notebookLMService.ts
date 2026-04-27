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

export interface DownloadSelectedDocumentsZipPayload {
  selected_document_ids: string[];
}

interface SelectedDocumentsZipExportResponse {
  export_id: string;
  filename: string;
  size_bytes: number;
  part_size_bytes: number;
  parts: number;
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

export interface NotebookLmAuthPayload {
  version: 1;
  cookies: Record<string, string>;
  cookie_names: string[];
  cookie_domains: string[];
}

export interface NotebookLmCookieValidationResponse {
  ok: boolean;
  message: string;
  format_detected: string;
  cookie_domains: string[];
  selected_cookie_names: string[];
  missing_required_cookies: string[];
  token_fetch_ok: boolean;
  auth_payload: NotebookLmAuthPayload | null;
}

export interface NotebookLmCredentialsStatusResponse {
  has_credentials: boolean;
  valid: boolean;
  status: string;
  validated_at: string | null;
  last_checked_at: string | null;
  last_used_at: string | null;
  cookie_names: string[];
  days_until_soft_expiry: number | null;
  last_error: string;
  failure_count: number;
  keepalive_enabled: boolean;
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
  import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BASE_URL || '/api/notebooklm/local'
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

const NOTEBOOK_LM_PROXY_CHAT_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_PROXY_CHAT_BASE_URL || '/api/notebooklm/chat'
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

const NOTEBOOK_LM_AUTH_HEADER_NAME = 'X-NotebookLM-Auth';
const NOTEBOOK_LM_USER_JWT_HEADER_NAME = 'X-Myma-User-JWT';
const SESSION_INVALID_MESSAGE =
  'Tu sesion expiro o ya no es valida. Recarga la pagina o vuelve a iniciar sesion.';

export const NOTEBOOK_LM_CHAT_API_DOCS_URL = `${NOTEBOOK_LM_CHAT_API_BASE_URL}/docs`;

const buildNotebookLmLocalApiUrl = (path: string) =>
  `${NOTEBOOK_LM_LOCAL_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const buildNotebookLmChatProxyUrl = (path: string) =>
  `${NOTEBOOK_LM_PROXY_CHAT_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const getNotebookLmLocalApiBearerToken = () =>
  /^https?:\/\//i.test(NOTEBOOK_LM_LOCAL_API_BASE_URL) ? NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN : '';

const getNotebookLmChatProxyBearerToken = () =>
  /^https?:\/\//i.test(NOTEBOOK_LM_PROXY_CHAT_BASE_URL) ? NOTEBOOK_LM_CHAT_API_BEARER_TOKEN : '';

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getResponseContentType = (response: Response) =>
  response.headers.get('content-type')?.toLowerCase() ?? '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getSupabaseAccessToken = async (forceRefresh = false): Promise<string> => {
  if (forceRefresh) {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error) {
      throw new Error(error.message || SESSION_INVALID_MESSAGE);
    }

    const refreshedAccessToken = session?.access_token?.trim();
    if (!refreshedAccessToken) {
      throw new Error(SESSION_INVALID_MESSAGE);
    }

    return refreshedAccessToken;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'No fue posible validar la sesion actual.');
  }

  const accessToken = session?.access_token?.trim();
  if (accessToken) {
    return accessToken;
  }

  if (session?.refresh_token?.trim()) {
    return getSupabaseAccessToken(true);
  }

  throw new Error(SESSION_INVALID_MESSAGE);
};

const tryGetSupabaseAccessToken = async (): Promise<string | null> => {
  try {
    return await getSupabaseAccessToken();
  } catch {
    return null;
  }
};

const NETSCAPE_REQUIRED_COLUMNS = 7;
const NETSCAPE_HTTP_ONLY_PREFIX = '#HttpOnly_';

interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Lax' | 'None' | 'Strict';
}

const splitNetscapeLine = (line: string): string[] => {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  return line.split(/\s+/);
};

const getNetscapeCookieDataLine = (
  rawLine: string
): { line: string; httpOnly: boolean } | null => {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(NETSCAPE_HTTP_ONLY_PREFIX)) {
    return {
      line: trimmed.slice(NETSCAPE_HTTP_ONLY_PREFIX.length),
      httpOnly: true,
    };
  }

  if (trimmed.startsWith('#')) return null;

  return {
    line: trimmed,
    httpOnly: false,
  };
};

export const convertNetscapeCookiesToStorageStateJson = (
  rawText: string
): string | null => {
  if (!rawText) return null;
  const cookies: PlaywrightCookie[] = [];

  for (const rawLine of rawText.split(/\r?\n/)) {
    const cookieDataLine = getNetscapeCookieDataLine(rawLine);
    if (!cookieDataLine) continue;

    const parts = splitNetscapeLine(cookieDataLine.line).filter((part) => part !== undefined);
    if (parts.length < NETSCAPE_REQUIRED_COLUMNS) continue;

    const [domainRaw, _includeSub, pathRaw, secureRaw, expiresRaw, nameRaw, ...valueParts] =
      parts;

    const name = (nameRaw || '').trim();
    if (!name) continue;

    const value = valueParts.join('\t').trim();
    const domain = (domainRaw || '').trim();
    if (!domain) continue;

    const expiresNumber = Number((expiresRaw || '').trim());
    const secureFlag = (secureRaw || '').trim().toUpperCase() === 'TRUE';

    cookies.push({
      name,
      value,
      domain,
      path: (pathRaw || '').trim() || '/',
      expires: Number.isFinite(expiresNumber) && expiresNumber > 0 ? expiresNumber : -1,
      httpOnly: cookieDataLine.httpOnly,
      secure: secureFlag,
      sameSite: secureFlag ? 'None' : 'Lax',
    });
  }

  if (!cookies.length) return null;
  return JSON.stringify({ cookies, origins: [] }, null, 2);
};

const looksLikeStorageStateJson = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.length > 0 && isRecord(parsed[0]);
    return isRecord(parsed);
  } catch {
    return false;
  }
};

const looksLikeNetscapeCookieText = (text: string): boolean => {
  if (!text) return false;
  for (const line of text.split(/\r?\n/)) {
    const cookieDataLine = getNetscapeCookieDataLine(line);
    if (!cookieDataLine) continue;
    const parts = splitNetscapeLine(cookieDataLine.line);
    if (parts.length >= NETSCAPE_REQUIRED_COLUMNS) return true;
  }
  return false;
};

export const normalizeCookiesInputForValidation = (rawText: string): string => {
  const trimmed = rawText.trim();
  if (!trimmed) return trimmed;
  if (looksLikeStorageStateJson(trimmed)) return trimmed;
  if (looksLikeNetscapeCookieText(trimmed)) {
    const converted = convertNetscapeCookiesToStorageStateJson(trimmed);
    if (converted) return converted;
  }
  return trimmed;
};

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

const readApiErrorMessage = async (response: Response) => {
  const rawBody = await response.text();
  if (!rawBody) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsedBody = JSON.parse(rawBody) as unknown;
    if (isRecord(parsedBody) && parsedBody.detail) {
      return String(parsedBody.detail);
    }
  } catch {
    // Si no es JSON, devolvemos el texto plano recortado para evitar mensajes enormes.
  }

  return rawBody.slice(0, 500);
};

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const buildNotebookLmAuthHeaderValue = (authPayload?: NotebookLmAuthPayload | null) => {
  if (!authPayload) {
    return '';
  }

  const cookies = Object.entries(authPayload.cookies || {}).reduce<Record<string, string>>(
    (accumulator, [rawName, rawValue]) => {
      const name = rawName.trim();
      const value = rawValue.trim();
      if (name && value) {
        accumulator[name] = value;
      }
      return accumulator;
    },
    {}
  );

  if (!Object.keys(cookies).length) {
    return '';
  }

  return encodeBase64Url(
    JSON.stringify({
      version: 1,
      cookies,
      cookie_names: Array.from(new Set(authPayload.cookie_names.map(normalizeString).filter(Boolean))),
      cookie_domains: Array.from(
        new Set(authPayload.cookie_domains.map(normalizeString).filter(Boolean))
      ),
    })
  );
};

const buildNotebookLmAuthHeaders = (
  authPayload?: NotebookLmAuthPayload | null
): Record<string, string> => {
  const headerValue = buildNotebookLmAuthHeaderValue(authPayload);
  return headerValue
    ? {
        [NOTEBOOK_LM_AUTH_HEADER_NAME]: headerValue,
      }
    : {};
};

export const getNotebookLmAuthHeaderName = (): string => NOTEBOOK_LM_AUTH_HEADER_NAME;

export const getNotebookLmAuthHeaderEntries = (
  authPayload?: NotebookLmAuthPayload | null
): Record<string, string> => buildNotebookLmAuthHeaders(authPayload);

const buildNotebookLmRequestHeaders = (
  baseHeaders: Record<string, string>,
  options?: {
    bearerToken?: string;
    authPayload?: NotebookLmAuthPayload | null;
    userAccessToken?: string | null;
    targetBaseUrl?: string;
  }
) => {
  const headers: Record<string, string> = {
    ...baseHeaders,
  };

  const targetBaseUrl = options?.targetBaseUrl || '';
  if (options?.userAccessToken) {
    if (isAbsoluteHttpUrl(targetBaseUrl)) {
      headers[NOTEBOOK_LM_USER_JWT_HEADER_NAME] = options.userAccessToken;
    } else {
      headers.Authorization = `Bearer ${options.userAccessToken}`;
    }
  }

  if (options?.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }

  return {
    ...headers,
    ...buildNotebookLmAuthHeaders(options?.authPayload),
  };
};

const parseNotebookLmCredentialsStatusResponse = (
  payload: unknown
): NotebookLmCredentialsStatusResponse => {
  if (!isRecord(payload)) {
    throw new Error('La API no devolvio un JSON valido para el estado de credenciales.');
  }

  return {
    has_credentials: Boolean(payload.has_credentials),
    valid: Boolean(payload.valid),
    status: normalizeString(payload.status) || 'missing',
    validated_at: normalizeString(payload.validated_at) || null,
    last_checked_at: normalizeString(payload.last_checked_at) || null,
    last_used_at: normalizeString(payload.last_used_at) || null,
    cookie_names: Array.isArray(payload.cookie_names)
      ? payload.cookie_names.map(normalizeString).filter(Boolean)
      : [],
    days_until_soft_expiry:
      typeof payload.days_until_soft_expiry === 'number' &&
      Number.isFinite(payload.days_until_soft_expiry)
        ? payload.days_until_soft_expiry
        : null,
    last_error: normalizeString(payload.last_error),
    failure_count:
      typeof payload.failure_count === 'number' && Number.isFinite(payload.failure_count)
        ? payload.failure_count
        : 0,
    keepalive_enabled: Boolean(payload.keepalive_enabled),
  };
};

const executeNotebookLmUserRequest = async (
  endpoint: string,
  options: RequestInit = {},
  fallbackBearerToken = ''
): Promise<Response> => {
  let accessToken = await getSupabaseAccessToken();
  const targetBaseUrl = endpoint.startsWith(NOTEBOOK_LM_LOCAL_API_BASE_URL)
    ? NOTEBOOK_LM_LOCAL_API_BASE_URL
    : endpoint.startsWith(NOTEBOOK_LM_PROXY_CHAT_BASE_URL)
      ? NOTEBOOK_LM_PROXY_CHAT_BASE_URL
      : endpoint.startsWith(NOTEBOOK_LM_CHAT_API_BASE_URL)
        ? NOTEBOOK_LM_CHAT_API_BASE_URL
        : '';

  const doRequest = async (token: string) => {
    const incomingHeaders =
      options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : Array.isArray(options.headers)
          ? Object.fromEntries(options.headers)
          : (options.headers || {});

    return fetch(endpoint, {
      ...options,
      headers: buildNotebookLmRequestHeaders(
        {
          ...incomingHeaders,
        },
        {
          bearerToken: isAbsoluteHttpUrl(targetBaseUrl) ? fallbackBearerToken : '',
          authPayload: undefined,
          userAccessToken: token,
          targetBaseUrl,
        }
      ),
    });
  };

  let response = await doRequest(accessToken);
  if (response.status === 401) {
    accessToken = await getSupabaseAccessToken(true);
    response = await doRequest(accessToken);
  }

  return response;
};

const mapNotebookLmItemsToOptions = (items: unknown): NotebookOption[] => {
  if (!Array.isArray(items)) {
    return [];
  }

  const uniqueByNotebookId = new Map<string, NotebookOption>();
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    const notebookId =
      normalizeString(item.notebook_id) || normalizeString(item.id) || normalizeString(item.value);
    const notebookTitle =
      normalizeString(item.title) ||
      normalizeString(item.nombre) ||
      normalizeString(item.name) ||
      notebookId;

    if (!notebookId || !notebookTitle || uniqueByNotebookId.has(notebookId)) {
      continue;
    }

    uniqueByNotebookId.set(notebookId, {
      id: notebookId,
      nombre: notebookTitle,
      notebook_id: notebookId,
    });
  }

  return Array.from(uniqueByNotebookId.values());
};

export const validateNotebookLmCookies = async (
  rawCookiesText: string
): Promise<NotebookLmCookieValidationResponse> => {
  const cookiesText = normalizeCookiesInputForValidation(rawCookiesText);
  if (!cookiesText) {
    throw new Error('Pega cookies antes de validarlas.');
  }

  const endpoint = buildNotebookLmChatProxyUrl('/validate-cookies');
  const userAccessToken = await tryGetSupabaseAccessToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildNotebookLmRequestHeaders(
        {
          'Content-Type': 'application/json',
        },
        {
          bearerToken: isAbsoluteHttpUrl(NOTEBOOK_LM_PROXY_CHAT_BASE_URL)
            ? getNotebookLmChatProxyBearerToken()
            : '',
          userAccessToken,
          targetBaseUrl: NOTEBOOK_LM_PROXY_CHAT_BASE_URL,
        }
      ),
      body: JSON.stringify({
        cookies_text: cookiesText,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo conectar con ${endpoint}. Verifica que la API de NotebookLM este disponible.`
      );
    }

    throw error;
  }

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
      isRecord(parsedBody) && typeof parsedBody.detail === 'string'
        ? parsedBody.detail
        : rawBody || `${response.status} ${response.statusText}`;
    throw new Error(`Error validando cookies: ${apiMessage}`);
  }

  if (!isRecord(parsedBody)) {
    throw new Error('La API no devolvio un JSON valido al validar las cookies.');
  }

  const authPayload =
    isRecord(parsedBody.auth_payload) && isRecord(parsedBody.auth_payload.cookies)
      ? ({
          version: 1,
          cookies: Object.entries(parsedBody.auth_payload.cookies).reduce<Record<string, string>>(
            (accumulator, [rawName, rawValue]) => {
              const name = rawName.trim();
              const value =
                typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue);
              if (name && value) {
                accumulator[name] = value;
              }
              return accumulator;
            },
            {}
          ),
          cookie_names: Array.isArray(parsedBody.auth_payload.cookie_names)
            ? parsedBody.auth_payload.cookie_names.map(normalizeString).filter(Boolean)
            : [],
          cookie_domains: Array.isArray(parsedBody.auth_payload.cookie_domains)
            ? parsedBody.auth_payload.cookie_domains.map(normalizeString).filter(Boolean)
            : [],
        } satisfies NotebookLmAuthPayload)
      : null;

  return {
    ok: Boolean(parsedBody.ok),
    message:
      typeof parsedBody.message === 'string' && parsedBody.message.trim()
        ? parsedBody.message.trim()
        : 'No se obtuvo un mensaje de validacion.',
    format_detected:
      typeof parsedBody.format_detected === 'string' && parsedBody.format_detected.trim()
        ? parsedBody.format_detected.trim()
        : 'unknown',
    cookie_domains: Array.isArray(parsedBody.cookie_domains)
      ? parsedBody.cookie_domains.map(normalizeString).filter(Boolean)
      : [],
    selected_cookie_names: Array.isArray(parsedBody.selected_cookie_names)
      ? parsedBody.selected_cookie_names.map(normalizeString).filter(Boolean)
      : [],
    missing_required_cookies: Array.isArray(parsedBody.missing_required_cookies)
      ? parsedBody.missing_required_cookies.map(normalizeString).filter(Boolean)
      : [],
    token_fetch_ok: Boolean(parsedBody.token_fetch_ok),
    auth_payload: authPayload,
  };
};

export const fetchNotebookLmAccountNotebooks = async (
  authPayload?: NotebookLmAuthPayload | null
): Promise<NotebookOption[]> => {
  const endpoint = buildNotebookLmChatProxyUrl('/notebooks');
  const userAccessToken = authPayload
    ? await tryGetSupabaseAccessToken()
    : await getSupabaseAccessToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: buildNotebookLmRequestHeaders(
        {
          Accept: 'application/json',
        },
        {
          bearerToken: isAbsoluteHttpUrl(NOTEBOOK_LM_PROXY_CHAT_BASE_URL)
            ? getNotebookLmChatProxyBearerToken()
            : '',
          authPayload,
          userAccessToken,
          targetBaseUrl: NOTEBOOK_LM_PROXY_CHAT_BASE_URL,
        }
      ),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo conectar con ${endpoint}. Verifica que la API de NotebookLM este disponible.`
      );
    }

    throw error;
  }

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
      isRecord(parsedBody) && parsedBody.detail
        ? String(parsedBody.detail)
        : rawBody || `${response.status} ${response.statusText}`;
    throw new Error(`Error al listar notebooks de la cuenta: ${apiMessage}`);
  }

  if (!isRecord(parsedBody)) {
    throw new Error('La API no devolvio un JSON valido al listar los notebooks.');
  }

  return mapNotebookLmItemsToOptions(parsedBody.items);
};

export const storeNotebookLmCredentials = async (
  cookiesText: string
): Promise<NotebookLmCredentialsStatusResponse> => {
  const normalizedCookiesText = normalizeCookiesInputForValidation(cookiesText);
  if (!normalizedCookiesText) {
    throw new Error('Pega cookies antes de guardarlas.');
  }

  const endpoint = buildNotebookLmLocalApiUrl('/credentials');
  const response = await executeNotebookLmUserRequest(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cookies_text: normalizedCookiesText,
      }),
    },
    getNotebookLmLocalApiBearerToken()
  );

  if (!response.ok) {
    const apiMessage = await readApiErrorMessage(response);
    throw new Error(`Error guardando credenciales NotebookLM: ${apiMessage}`);
  }

  return parseNotebookLmCredentialsStatusResponse(await response.json());
};

export const fetchNotebookLmCredentialsStatus = async (): Promise<NotebookLmCredentialsStatusResponse> => {
  const endpoint = buildNotebookLmLocalApiUrl('/credentials/status');
  const response = await executeNotebookLmUserRequest(
    endpoint,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    getNotebookLmLocalApiBearerToken()
  );

  if (!response.ok) {
    const apiMessage = await readApiErrorMessage(response);
    throw new Error(`Error consultando credenciales NotebookLM: ${apiMessage}`);
  }

  return parseNotebookLmCredentialsStatusResponse(await response.json());
};

export const revalidateNotebookLmCredentials = async (): Promise<NotebookLmCredentialsStatusResponse> => {
  const endpoint = buildNotebookLmLocalApiUrl('/credentials/revalidate');
  const response = await executeNotebookLmUserRequest(
    endpoint,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    },
    getNotebookLmLocalApiBearerToken()
  );

  if (!response.ok) {
    const apiMessage = await readApiErrorMessage(response);
    throw new Error(`Error revalidando credenciales NotebookLM: ${apiMessage}`);
  }

  return parseNotebookLmCredentialsStatusResponse(await response.json());
};

export const deleteNotebookLmCredentials = async (): Promise<void> => {
  const endpoint = buildNotebookLmLocalApiUrl('/credentials');
  const response = await executeNotebookLmUserRequest(
    endpoint,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    },
    getNotebookLmLocalApiBearerToken()
  );

  if (!response.ok) {
    const apiMessage = await readApiErrorMessage(response);
    throw new Error(`Error eliminando credenciales NotebookLM: ${apiMessage}`);
  }
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
  const endpoint = buildNotebookLmLocalApiUrl('/descarga-documentos-seia');
  const localApiBearerToken = getNotebookLmLocalApiBearerToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localApiBearerToken
          ? {
              Authorization: `Bearer ${localApiBearerToken}`,
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

  const endpoint = buildNotebookLmLocalApiUrl(
    `/descarga-documentos-seia/${encodeURIComponent(normalizedRunId)}`
  );
  const localApiBearerToken = getNotebookLmLocalApiBearerToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(localApiBearerToken
          ? {
              Authorization: `Bearer ${localApiBearerToken}`,
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
  payload: CreateAndLoadNotebookFilteredPayload,
  authPayload?: NotebookLmAuthPayload | null
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

  const endpoint = buildNotebookLmLocalApiUrl('/crear-y-cargar-notebook-filtrado');
  const userAccessToken = authPayload
    ? await tryGetSupabaseAccessToken()
    : await getSupabaseAccessToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildNotebookLmRequestHeaders(
        {
          'Content-Type': 'application/json',
        },
        {
          bearerToken: isAbsoluteHttpUrl(NOTEBOOK_LM_LOCAL_API_BASE_URL)
            ? getNotebookLmLocalApiBearerToken()
            : '',
          authPayload,
          userAccessToken,
          targetBaseUrl: NOTEBOOK_LM_LOCAL_API_BASE_URL,
        }
      ),
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
  payload: RetryNotebookUploadPayload,
  authPayload?: NotebookLmAuthPayload | null
): Promise<RetryNotebookUploadResponse> => {
  const normalizedPayload = {
    run_id: payload.run_id.trim(),
  };

  if (!normalizedPayload.run_id) {
    throw new Error('No se recibio un run_id valido para reintentar la carga.');
  }

  const endpoint = buildNotebookLmLocalApiUrl('/reintentar-carga-notebook');
  const userAccessToken = authPayload
    ? await tryGetSupabaseAccessToken()
    : await getSupabaseAccessToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildNotebookLmRequestHeaders(
        {
          'Content-Type': 'application/json',
        },
        {
          bearerToken: isAbsoluteHttpUrl(NOTEBOOK_LM_LOCAL_API_BASE_URL)
            ? getNotebookLmLocalApiBearerToken()
            : '',
          authPayload,
          userAccessToken,
          targetBaseUrl: NOTEBOOK_LM_LOCAL_API_BASE_URL,
        }
      ),
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

  const endpoint = buildNotebookLmLocalApiUrl(
    `/descarga-documentos-seia/${encodeURIComponent(normalizedRunId)}/documentos-fallidos.zip`
  );
  const localApiBearerToken = getNotebookLmLocalApiBearerToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/zip, application/octet-stream',
        ...(localApiBearerToken
          ? {
              Authorization: `Bearer ${localApiBearerToken}`,
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

export const downloadSelectedDocumentsZip = async (
  runId: string,
  payload: DownloadSelectedDocumentsZipPayload
): Promise<DownloadRetryDocumentsZipResponse> => {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) {
    throw new Error('No se recibio un run_id valido para descargar el zip de documentos.');
  }

  const normalizedDocumentIds = Array.from(
    new Set(payload.selected_document_ids.map(normalizeString).filter(Boolean))
  );
  if (normalizedDocumentIds.length === 0) {
    throw new Error('No se recibieron documentos validos para descargar el zip.');
  }

  const endpoint = buildNotebookLmLocalApiUrl(
    `/descarga-documentos-seia/${encodeURIComponent(normalizedRunId)}/documentos-seleccionados/export`
  );
  const localApiBearerToken = getNotebookLmLocalApiBearerToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/zip, application/octet-stream',
        ...(localApiBearerToken
          ? {
              Authorization: `Bearer ${localApiBearerToken}`,
            }
          : {}),
      },
      body: JSON.stringify({
        selected_document_ids: normalizedDocumentIds,
      }),
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
    const apiMessage = await readApiErrorMessage(response);

    throw new Error(`Error al preparar el zip de documentos: ${apiMessage}`);
  }

  const exportPayload = (await response.json()) as Partial<SelectedDocumentsZipExportResponse>;
  const exportId = normalizeString(exportPayload.export_id);
  const parts = Number(exportPayload.parts);
  if (!exportId || !Number.isFinite(parts) || parts < 1) {
    throw new Error('La API no devolvio una metadata valida para descargar el zip por partes.');
  }

  const blobParts: BlobPart[] = [];
  for (let partIndex = 0; partIndex < parts; partIndex += 1) {
    const partEndpoint = buildNotebookLmLocalApiUrl(
      `/descarga-documentos-seia/${encodeURIComponent(
        normalizedRunId
      )}/documentos-seleccionados/export/${encodeURIComponent(exportId)}/part/${partIndex}`
    );

    const partResponse = await fetch(partEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream',
        ...(localApiBearerToken
          ? {
              Authorization: `Bearer ${localApiBearerToken}`,
            }
          : {}),
      },
    });

    if (!partResponse.ok) {
      const apiMessage = await readApiErrorMessage(partResponse);
      throw new Error(
        `Error al descargar la parte ${partIndex + 1} de ${parts} del zip: ${apiMessage}`
      );
    }

    blobParts.push(await partResponse.blob());
  }

  const filename =
    normalizeString(exportPayload.filename) ||
    `documentos-para-notebook-${normalizedRunId.slice(0, 8) || 'corrida'}.zip`;

  return {
    blob: new Blob(blobParts, { type: 'application/zip' }),
    filename,
  };
};

export const shareNotebookWithUser = async (
  notebookId: string,
  payload: ShareNotebookUserPayload,
  authPayload?: NotebookLmAuthPayload | null
): Promise<ShareNotebookUserResponse> => {
  const normalizedNotebookId = normalizeString(notebookId);
  const normalizedEmail = normalizeString(payload.email);

  if (!normalizedNotebookId) {
    throw new Error('No se recibio un notebook_id valido para compartir.');
  }

  if (!normalizedEmail) {
    throw new Error('No se recibio un correo valido para compartir el notebook.');
  }

  const endpoint = buildNotebookLmLocalApiUrl(
    `/notebooks/${encodeURIComponent(normalizedNotebookId)}/share/users`
  );
  const localApiBearerToken = getNotebookLmLocalApiBearerToken();
  const userAccessToken = authPayload
    ? await tryGetSupabaseAccessToken()
    : await getSupabaseAccessToken();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: buildNotebookLmRequestHeaders(
        {
          'Content-Type': 'application/json',
        },
        {
          bearerToken: isAbsoluteHttpUrl(NOTEBOOK_LM_LOCAL_API_BASE_URL)
            ? localApiBearerToken
            : '',
          authPayload,
          userAccessToken,
          targetBaseUrl: NOTEBOOK_LM_LOCAL_API_BASE_URL,
        }
      ),
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
