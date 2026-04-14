import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://pugasfsnckeyitjemvju.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2FzZnNuY2tleWl0amVtdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTM5MTMsImV4cCI6MjA4MTQ2OTkxM30.XDAdVZOenvzsJRxXbDkfuxIUxkGgxKWo6q6jFFPCNjg';
const DEFAULT_NOTEBOOK_API_BASE_URL = 'http://127.0.0.1:8001';
const DEFAULT_REQUEST_TIMEOUT_MS = 120000;
const MAX_CONTEXT_WORDS = 520;
const MAX_SUMMARY_WORDS = 150;
const MAX_LAST_USER_WORDS = 90;
const MAX_LAST_ASSISTANT_WORDS = 130;
const MAX_NEW_QUESTION_WORDS = 150;
const FALLBACK_SESSION_TITLE = 'Nueva conversacion';

let authClient;
let adminClient;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseInteger = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
};

const getSupabaseUrl = () =>
  normalizeString(process.env.SUPABASE_URL) ||
  normalizeString(process.env.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const getSupabaseAnonKey = () =>
  normalizeString(process.env.SUPABASE_ANON_KEY) ||
  normalizeString(process.env.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

const getSupabaseServiceRoleKey = () =>
  normalizeString(process.env.SUPABASE_SERVICE_ROLE_KEY);

const getNotebookApiBaseUrl = () =>
  (
    normalizeString(process.env.NOTEBOOK_LM_CHAT_API_BASE_URL) ||
    normalizeString(process.env.VITE_ADENDAS_NOTEBOOK_CHAT_BASE_URL) ||
    DEFAULT_NOTEBOOK_API_BASE_URL
  ).replace(/\/+$/, '');

const getNotebookApiBearerToken = () =>
  normalizeString(process.env.NOTEBOOK_LM_CHAT_API_BEARER_TOKEN) ||
  normalizeString(process.env.VITE_NOTEBOOK_LM_CHAT_API_BEARER_TOKEN) ||
  normalizeString(process.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN);

const getRequestTimeoutMs = () => {
  const parsedValue = Number.parseInt(
    process.env.NOTEBOOK_CHAT_UPSTREAM_TIMEOUT_MS ?? '',
    10
  );

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : DEFAULT_REQUEST_TIMEOUT_MS;
};

const getAuthClient = () => {
  if (!authClient) {
    authClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return authClient;
};

const getAdminClient = () => {
  if (adminClient) {
    return adminClient;
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw createHttpError(
      500,
      'Falta SUPABASE_SERVICE_ROLE_KEY para habilitar el chat seguro de expertos.'
    );
  }

  adminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
};

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sendJsonError = (res, error, fallbackMessage) => {
  const statusCode =
    typeof error?.statusCode === 'number' && error.statusCode >= 400
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    error:
      normalizeString(error?.message) ||
      fallbackMessage ||
      'No fue posible completar la solicitud.',
  });
};

const extractBearerToken = (authorizationHeader) => {
  const normalizedHeader = normalizeString(authorizationHeader);
  if (!normalizedHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return normalizedHeader.slice(7).trim();
};

const getNotebookChatErrorMessage = (responseBody) => {
  if (!responseBody || typeof responseBody !== 'object') {
    return null;
  }

  if (typeof responseBody.error === 'string' && responseBody.error.trim()) {
    return responseBody.error.trim();
  }

  if (typeof responseBody.message === 'string' && responseBody.message.trim()) {
    return responseBody.message.trim();
  }

  if (typeof responseBody.detail === 'string' && responseBody.detail.trim()) {
    return responseBody.detail.trim();
  }

  if (Array.isArray(responseBody.detail)) {
    const detailMessage = responseBody.detail
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

    return detailMessage || null;
  }

  if (isRecord(responseBody.detail)) {
    const detailMessage = normalizeString(responseBody.detail.message);
    const nextStep = normalizeString(responseBody.detail.next_step);

    if (detailMessage && nextStep) {
      return `${detailMessage} ${nextStep}`;
    }

    return detailMessage || nextStep || null;
  }

  return null;
};

const getConversationIdCandidate = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (!isRecord(value)) {
    return '';
  }

  const directCandidates = [
    value.conversation_id,
    value.conversationId,
    value.chat_id,
    value.chatId,
    value.id,
  ];

  for (const candidate of directCandidates) {
    const normalizedCandidate = normalizeString(candidate);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  const nestedCandidates = [value.data, value.result, value.conversation];
  for (const nestedCandidate of nestedCandidates) {
    const nestedConversationId = getConversationIdCandidate(nestedCandidate);
    if (nestedConversationId) {
      return nestedConversationId;
    }
  }

  return '';
};

const normalizeAnswer = (rawAnswer) =>
  rawAnswer
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(\d+)\]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeContextText = (rawText) =>
  normalizeString(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(\d+)\]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

const splitIntoWords = (text) => normalizeString(text).split(/\s+/g).filter(Boolean);

const countWords = (text) => splitIntoWords(text).length;

const truncateWords = (text, limit) => {
  if (limit <= 0) {
    return '';
  }

  const words = splitIntoWords(text);
  if (words.length <= limit) {
    return words.join(' ');
  }

  return `${words.slice(0, limit).join(' ')}...`;
};

const composeContextText = ({ summaryText, lastUserText, lastAssistantText, currentQuestion }) => {
  const sections = [];

  if (summaryText) {
    sections.push(`Resumen acumulado:\n${summaryText}`);
  }

  if (lastUserText || lastAssistantText) {
    const exchangeLines = [];
    if (lastUserText) {
      exchangeLines.push(`Usuario: ${lastUserText}`);
    }
    if (lastAssistantText) {
      exchangeLines.push(`Asistente: ${lastAssistantText}`);
    }
    sections.push(`Ultimo intercambio relevante:\n${exchangeLines.join('\n')}`);
  }

  sections.push(`Pregunta actual:\n${currentQuestion}`);

  return sections.join('\n\n').trim();
};

const buildCompactContext = ({ summaryText, recentMessages, userQuestion }) => {
  const normalizedQuestion = normalizeContextText(userQuestion);
  const questionWords = countWords(normalizedQuestion);

  if (!normalizedQuestion) {
    throw createHttpError(400, 'Escribe un mensaje antes de enviarlo.');
  }

  if (questionWords > MAX_NEW_QUESTION_WORDS) {
    throw createHttpError(
      400,
      `La pregunta supera el limite del MVP (${MAX_NEW_QUESTION_WORDS} palabras). Dividela en una consulta mas corta.`
    );
  }

  const normalizedSummary = normalizeContextText(summaryText);
  const lastUserText = normalizeContextText(
    recentMessages.findLast((message) => message.role === 'user')?.content
  );
  const lastAssistantText = normalizeContextText(
    recentMessages.findLast((message) => message.role === 'assistant')?.content
  );

  let summaryBudget = MAX_SUMMARY_WORDS;
  let lastUserBudget = MAX_LAST_USER_WORDS;
  let lastAssistantBudget = MAX_LAST_ASSISTANT_WORDS;

  let compactContext = composeContextText({
    summaryText: truncateWords(normalizedSummary, summaryBudget),
    lastUserText: truncateWords(lastUserText, lastUserBudget),
    lastAssistantText: truncateWords(lastAssistantText, lastAssistantBudget),
    currentQuestion: normalizedQuestion,
  });

  while (countWords(compactContext) > MAX_CONTEXT_WORDS && summaryBudget > 60) {
    summaryBudget -= 15;
    compactContext = composeContextText({
      summaryText: truncateWords(normalizedSummary, summaryBudget),
      lastUserText: truncateWords(lastUserText, lastUserBudget),
      lastAssistantText: truncateWords(lastAssistantText, lastAssistantBudget),
      currentQuestion: normalizedQuestion,
    });
  }

  while (countWords(compactContext) > MAX_CONTEXT_WORDS && lastAssistantBudget > 70) {
    lastAssistantBudget -= 15;
    compactContext = composeContextText({
      summaryText: truncateWords(normalizedSummary, summaryBudget),
      lastUserText: truncateWords(lastUserText, lastUserBudget),
      lastAssistantText: truncateWords(lastAssistantText, lastAssistantBudget),
      currentQuestion: normalizedQuestion,
    });
  }

  while (countWords(compactContext) > MAX_CONTEXT_WORDS && lastUserBudget > 50) {
    lastUserBudget -= 10;
    compactContext = composeContextText({
      summaryText: truncateWords(normalizedSummary, summaryBudget),
      lastUserText: truncateWords(lastUserText, lastUserBudget),
      lastAssistantText: truncateWords(lastAssistantText, lastAssistantBudget),
      currentQuestion: normalizedQuestion,
    });
  }

  return compactContext;
};

const buildSummaryText = ({ previousSummary, userQuestion, assistantAnswer }) => {
  const normalizedPreviousSummary = truncateWords(
    normalizeContextText(previousSummary),
    70
  );
  const normalizedQuestion = truncateWords(normalizeContextText(userQuestion), 28);
  const normalizedAnswer = truncateWords(normalizeContextText(assistantAnswer), 48);

  return truncateWords(
    [
      normalizedPreviousSummary,
      normalizedQuestion ? `Nueva pregunta: ${normalizedQuestion}.` : '',
      normalizedAnswer ? `Respuesta entregada: ${normalizedAnswer}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim(),
    140
  );
};

const buildSessionTitle = (userQuestion) => {
  const normalizedQuestion = truncateWords(normalizeContextText(userQuestion), 10);
  return normalizedQuestion || FALLBACK_SESSION_TITLE;
};

const buildNotebookChatPayloadCandidates = (prompt, conversationId) => {
  const normalizedConversationId = normalizeString(conversationId);
  const baseCandidates = [{ question: prompt }, { prompt }];

  if (!normalizedConversationId) {
    return baseCandidates;
  }

  return baseCandidates.flatMap((candidate) => [
    {
      ...candidate,
      conversation_id: normalizedConversationId,
    },
    {
      ...candidate,
      conversationId: normalizedConversationId,
    },
  ]);
};

const mapExpertRow = (row) => {
  if (!isRecord(row)) {
    return null;
  }

  const publicId = parseInteger(row.id);
  const notebookId = normalizeString(row.notebook_id) || normalizeString(row.notebooklm_id);
  const name = normalizeString(row.nombre);
  const description =
    normalizeString(row.descripcion) || normalizeString(row.description) || null;

  if (!publicId || !name || !notebookId) {
    return null;
  }

  return {
    id: String(publicId),
    name,
    description,
    notebookId,
  };
};

const mapSessionRow = (row) => ({
  id: row.id,
  expertId: String(row.expert_id),
  title: normalizeString(row.title) || FALLBACK_SESSION_TITLE,
  summaryText: normalizeString(row.summary_text),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMessageRow = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

const reorderSessions = (sessions, updatedSession) => {
  const filteredSessions = sessions.filter((session) => session.id !== updatedSession.id);
  return [updatedSession, ...filteredSessions];
};

const fetchExpertRows = async (queryBuilderFactory) => {
  const selectAttempts = [
    'id,nombre,descripcion,notebook_id',
    'id,nombre,descripcion,notebooklm_id',
    'id,nombre,notebook_id',
    'id,nombre,notebooklm_id',
  ];

  let lastError = null;

  for (const selectClause of selectAttempts) {
    const { data, error } = await queryBuilderFactory(selectClause);
    if (!error) {
      return data || [];
    }

    lastError = error;
  }

  throw lastError;
};

const listExperts = async () => {
  const admin = getAdminClient();
  const rows = await fetchExpertRows((selectClause) =>
    admin
      .from('dim_adenda_notebook_experto')
      .select(selectClause)
      .order('nombre', { ascending: true })
  );

  const mappedExperts = rows
    .map(mapExpertRow)
    .filter(Boolean)
    .map(({ notebookId, ...publicExpert }) => publicExpert);

  return mappedExperts;
};

const resolveExpertById = async (expertId) => {
  const admin = getAdminClient();
  const numericExpertId = parseInteger(expertId);

  if (!numericExpertId) {
    throw createHttpError(400, 'Debes seleccionar un experto valido.');
  }

  const rows = await fetchExpertRows((selectClause) =>
    admin
      .from('dim_adenda_notebook_experto')
      .select(selectClause)
      .eq('id', numericExpertId)
      .limit(1)
  );

  const expert = mapExpertRow(rows[0] || null);
  if (!expert) {
    throw createHttpError(404, 'No encontramos el experto solicitado.');
  }

  return expert;
};

const getOwnedSession = async (userId, sessionId) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('expert_chat_session')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
};

const getSessionMessages = async (sessionId) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('expert_chat_message')
    .select('id,role,content,created_at,position')
    .eq('session_id', sessionId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapMessageRow);
};

const getRecentMessages = async (sessionId) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('expert_chat_message')
    .select('role,content,position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(2);

  if (error) {
    throw error;
  }

  return [...(data || [])].reverse();
};

const getNextMessagePosition = async (sessionId) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('expert_chat_message')
    .select('position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data?.position || 0) + 1;
};

const listSessionsForUser = async (userId, expertId) => {
  const admin = getAdminClient();
  const numericExpertId = parseInteger(expertId);

  if (!numericExpertId) {
    throw createHttpError(400, 'Debes indicar un expertId valido para listar sesiones.');
  }

  const { data, error } = await admin
    .from('expert_chat_session')
    .select('id,expert_id,title,summary_text,created_at,updated_at,last_message_at')
    .eq('user_id', userId)
    .eq('expert_id', numericExpertId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSessionRow);
};

const createSessionForUser = async (userId, expertId) => {
  const expert = await resolveExpertById(expertId);
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('expert_chat_session')
    .insert({
      user_id: userId,
      expert_id: Number.parseInt(expert.id, 10),
      title: FALLBACK_SESSION_TITLE,
      summary_text: '',
      adapter_conversation_id: null,
      notebook_id_snapshot: expert.notebookId,
      created_at: now,
      updated_at: now,
      last_message_at: now,
    })
    .select('id,expert_id,title,summary_text,created_at,updated_at,last_message_at')
    .single();

  if (error) {
    throw error;
  }

  return mapSessionRow(data);
};

const callNotebookAdapter = async ({ notebookId, prompt, conversationId }) => {
  const endpoint = `${getNotebookApiBaseUrl()}/notebooks/${encodeURIComponent(notebookId)}/chat`;
  const payloadCandidates = buildNotebookChatPayloadCandidates(prompt, conversationId);
  const errors = [];

  for (const payloadCandidate of payloadCandidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getNotebookApiBearerToken()
            ? {
                Authorization: `Bearer ${getNotebookApiBearerToken()}`,
              }
            : {}),
        },
        body: JSON.stringify(payloadCandidate),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let parsedBody = null;
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = null;
        }
      }

      if (!response.ok) {
        const apiMessage = getNotebookChatErrorMessage(parsedBody);
        const statusMessage = apiMessage
          ? `${response.status}: ${apiMessage}`
          : `${response.status}: la API no pudo procesar la solicitud.`;

        if (response.status === 401 || response.status === 403) {
          throw createHttpError(502, statusMessage);
        }

        errors.push(statusMessage);
        continue;
      }

      const answer =
        parsedBody && typeof parsedBody.answer === 'string' ? parsedBody.answer.trim() : '';

      if (!answer) {
        errors.push('La API respondio correctamente, pero no entrego el campo answer.');
        continue;
      }

      return {
        answer: normalizeAnswer(answer),
        conversationId: getConversationIdCandidate(parsedBody) || normalizeString(conversationId),
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        errors.push('La consulta al adaptador NotebookLM excedio el tiempo de espera.');
        continue;
      }

      if (typeof error?.statusCode === 'number') {
        throw error;
      }

      errors.push(
        normalizeString(error?.message) ||
          'No fue posible comunicarse con el adaptador NotebookLM.'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw createHttpError(
    502,
    errors[0] || 'No fue posible obtener respuesta desde el adaptador NotebookLM.'
  );
};

const sendMessageForSession = async ({ userId, sessionId, content }) => {
  const session = await getOwnedSession(userId, sessionId);
  if (!session) {
    throw createHttpError(404, 'No encontramos la sesion solicitada.');
  }

  const normalizedContent = normalizeString(content);
  if (!normalizedContent) {
    throw createHttpError(400, 'Escribe un mensaje antes de enviarlo.');
  }

  const recentMessages = await getRecentMessages(sessionId);
  const compactContext = buildCompactContext({
    summaryText: session.summary_text,
    recentMessages,
    userQuestion: normalizedContent,
  });

  const adapterResponse = await callNotebookAdapter({
    notebookId: session.notebook_id_snapshot,
    prompt: compactContext,
    conversationId: session.adapter_conversation_id,
  });

  const nextPosition = await getNextMessagePosition(sessionId);
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const title =
    normalizeString(session.title) && normalizeString(session.title) !== FALLBACK_SESSION_TITLE
      ? normalizeString(session.title)
      : buildSessionTitle(normalizedContent);

  const { data: insertedMessages, error: insertError } = await admin
    .from('expert_chat_message')
    .insert([
      {
        session_id: sessionId,
        position: nextPosition,
        role: 'user',
        content: normalizedContent,
        created_at: now,
      },
      {
        session_id: sessionId,
        position: nextPosition + 1,
        role: 'assistant',
        content: adapterResponse.answer,
        created_at: now,
      },
    ])
    .select('id,role,content,created_at,position')
    .order('position', { ascending: true });

  if (insertError) {
    throw insertError;
  }

  const updatedSummaryText = buildSummaryText({
    previousSummary: session.summary_text,
    userQuestion: normalizedContent,
    assistantAnswer: adapterResponse.answer,
  });

  const { data: updatedSession, error: updateError } = await admin
    .from('expert_chat_session')
    .update({
      title,
      summary_text: updatedSummaryText,
      adapter_conversation_id: normalizeString(adapterResponse.conversationId) || null,
      updated_at: now,
      last_message_at: now,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('id,expert_id,title,summary_text,created_at,updated_at,last_message_at')
    .single();

  if (updateError) {
    throw updateError;
  }

  const persistedMessages = (insertedMessages || []).map(mapMessageRow);
  return {
    session: mapSessionRow(updatedSession),
    userMessage: persistedMessages.find((message) => message.role === 'user') || null,
    assistantMessage:
      persistedMessages.find((message) => message.role === 'assistant') || null,
  };
};

export const requireSupabaseAuth = async (req, res, next) => {
  const accessToken = extractBearerToken(req.headers.authorization);
  if (!accessToken) {
    res.status(401).json({ error: 'Debes iniciar sesion para usar este chat.' });
    return;
  }

  try {
    const {
      data: { user },
      error,
    } = await getAuthClient().auth.getUser(accessToken);

    if (error || !user) {
      throw createHttpError(401, 'Tu sesion ya no es valida. Vuelve a iniciar sesion.');
    }

    req.auth = {
      userId: user.id,
      email: normalizeString(user.email),
    };
    next();
  } catch (error) {
    sendJsonError(res, error, 'No fue posible validar la sesion del usuario.');
  }
};

export const registerNotebookChatRoutes = (app) => {
  app.get('/api/notebook-experts', requireSupabaseAuth, async (_req, res) => {
    try {
      const experts = await listExperts();
      res.json({ items: experts });
    } catch (error) {
      sendJsonError(res, error, 'No pudimos cargar el catalogo de expertos.');
    }
  });

  app.get('/api/notebook-chat/sessions', requireSupabaseAuth, async (req, res) => {
    try {
      const sessions = await listSessionsForUser(req.auth.userId, req.query.expertId);
      res.json({ items: sessions });
    } catch (error) {
      sendJsonError(res, error, 'No pudimos cargar las sesiones del experto.');
    }
  });

  app.post('/api/notebook-chat/sessions', requireSupabaseAuth, async (req, res) => {
    try {
      const session = await createSessionForUser(req.auth.userId, req.body?.expertId);
      res.status(201).json({ session });
    } catch (error) {
      sendJsonError(res, error, 'No pudimos crear la sesion del chat.');
    }
  });

  app.get('/api/notebook-chat/sessions/:sessionId', requireSupabaseAuth, async (req, res) => {
    try {
      const session = await getOwnedSession(req.auth.userId, req.params.sessionId);
      if (!session) {
        throw createHttpError(404, 'No encontramos la sesion solicitada.');
      }

      const messages = await getSessionMessages(req.params.sessionId);
      res.json({
        session: {
          ...mapSessionRow(session),
          messages,
        },
      });
    } catch (error) {
      sendJsonError(res, error, 'No pudimos cargar la sesion del chat.');
    }
  });

  app.post(
    '/api/notebook-chat/sessions/:sessionId/messages',
    requireSupabaseAuth,
    async (req, res) => {
      try {
        const result = await sendMessageForSession({
          userId: req.auth.userId,
          sessionId: req.params.sessionId,
          content: req.body?.content,
        });

        res.status(201).json(result);
      } catch (error) {
        sendJsonError(res, error, 'No pudimos enviar el mensaje al experto.');
      }
    }
  );
};

export const __private__ = {
  buildCompactContext,
  buildSummaryText,
  buildSessionTitle,
  reorderSessions,
};
