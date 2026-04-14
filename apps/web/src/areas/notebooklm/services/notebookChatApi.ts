import { supabase } from '@shared/api-client/supabase';

export interface NotebookChatExpert {
  id: string;
  name: string;
  description: string | null;
}

export interface NotebookChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface NotebookChatSession {
  id: string;
  expertId: string;
  title: string;
  summaryText: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookChatSessionDetail extends NotebookChatSession {
  messages: NotebookChatMessage[];
}

interface ApiErrorResponse {
  error?: string | null;
  message?: string | null;
  detail?: string | null;
}

const INTERNAL_API_BASE_URL = (
  import.meta.env.VITE_INTERNAL_API_BASE_URL || ''
)
  .trim()
  .replace(/\/+$/, '');

const buildApiUrl = (path: string) =>
  INTERNAL_API_BASE_URL ? `${INTERNAL_API_BASE_URL}${path}` : path;

const getAccessToken = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'No fue posible validar la sesion actual.');
  }

  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Tu sesion ya no es valida. Vuelve a iniciar sesion.');
  }

  return accessToken;
};

const parseApiErrorMessage = (payload: ApiErrorResponse | null, fallback: string) => {
  if (payload?.error && payload.error.trim()) {
    return payload.error.trim();
  }

  if (payload?.message && payload.message.trim()) {
    return payload.message.trim();
  }

  if (payload?.detail && payload.detail.trim()) {
    return payload.detail.trim();
  }

  return fallback;
};

const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const accessToken = await getAccessToken();
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const rawBody = await response.text();
  let parsedBody: T | ApiErrorResponse | null = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody) as T | ApiErrorResponse;
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      parseApiErrorMessage(
        parsedBody as ApiErrorResponse | null,
        `La solicitud fallo con estado ${response.status}.`
      )
    );
  }

  return (parsedBody || {}) as T;
};

export const fetchNotebookChatExperts = async (): Promise<NotebookChatExpert[]> => {
  const response = await apiRequest<{ items?: NotebookChatExpert[] }>('/api/notebook-experts');
  return response.items || [];
};

export const fetchNotebookChatSessions = async (
  expertId: string
): Promise<NotebookChatSession[]> => {
  const response = await apiRequest<{ items?: NotebookChatSession[] }>(
    `/api/notebook-chat/sessions?expertId=${encodeURIComponent(expertId)}`
  );

  return response.items || [];
};

export const createNotebookChatSession = async (
  expertId: string
): Promise<NotebookChatSession> => {
  const response = await apiRequest<{ session: NotebookChatSession }>(
    '/api/notebook-chat/sessions',
    {
      method: 'POST',
      body: JSON.stringify({ expertId }),
    }
  );

  return response.session;
};

export const fetchNotebookChatSession = async (
  sessionId: string
): Promise<NotebookChatSessionDetail> => {
  const response = await apiRequest<{ session: NotebookChatSessionDetail }>(
    `/api/notebook-chat/sessions/${encodeURIComponent(sessionId)}`
  );

  return response.session;
};

export const sendNotebookChatSessionMessage = async (
  sessionId: string,
  content: string
): Promise<{
  session: NotebookChatSession;
  userMessage: NotebookChatMessage;
  assistantMessage: NotebookChatMessage;
}> => {
  const response = await apiRequest<{
    session: NotebookChatSession;
    userMessage: NotebookChatMessage;
    assistantMessage: NotebookChatMessage;
  }>(`/api/notebook-chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return response;
};
