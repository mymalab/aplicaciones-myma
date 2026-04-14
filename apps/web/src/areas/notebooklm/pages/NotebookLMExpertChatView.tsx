import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  createNotebookChatSession,
  fetchNotebookChatExperts,
  fetchNotebookChatSession,
  fetchNotebookChatSessions,
  sendNotebookChatSessionMessage,
} from '../services/notebookChatApi';
import type { NotebookChatExpert, NotebookChatMessage, NotebookChatSession } from '../services/notebookChatApi';

type ChatMessageStatus = 'ready' | 'loading' | 'error';
type DisplayMessage = NotebookChatMessage & { status: ChatMessageStatus };
type SessionDetail = NotebookChatSession & { messages: DisplayMessage[]; hydrated: boolean };

const SUGGESTED_PROMPTS = [
  'Resume los hallazgos clave del experto.',
  'Que riesgos deberia revisar primero?',
  'Dame una lista de tareas priorizadas.',
  'Explica el contexto en lenguaje simple.',
];

const messageTimeFormatter = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' });
const sessionTimeFormatter = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const createClientId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const toDisplayMessage = (message: NotebookChatMessage, status: ChatMessageStatus = 'ready'): DisplayMessage => ({ ...message, status });
const optimisticMessage = (role: DisplayMessage['role'], content: string, status: ChatMessageStatus): DisplayMessage => ({
  id: createClientId(),
  role,
  content,
  createdAt: new Date().toISOString(),
  status,
});
const getSessionTitle = (session: Pick<NotebookChatSession, 'title'> | null) => session?.title?.trim() || 'Nueva conversacion';
const formatMessageTime = (value: string) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? '' : messageTimeFormatter.format(parsedDate);
};
const formatSessionTime = (value: string) => {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? '' : sessionTimeFormatter.format(parsedDate);
};
const reorderSessions = (sessions: NotebookChatSession[], updated: NotebookChatSession) => [
  updated,
  ...sessions.filter((session) => session.id !== updated.id),
];

const NotebookLMExpertChatView: React.FC = () => {
  const [experts, setExperts] = useState<NotebookChatExpert[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);
  const [expertsError, setExpertsError] = useState('');
  const [expertSearch, setExpertSearch] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [sessionsByExpertId, setSessionsByExpertId] = useState<Record<string, NotebookChatSession[]>>({});
  const [selectedSessionIdByExpertId, setSelectedSessionIdByExpertId] = useState<Record<string, string>>({});
  const [sessionDetailsById, setSessionDetailsById] = useState<Record<string, SessionDetail>>({});
  const [loadingSessionsExpertId, setLoadingSessionsExpertId] = useState('');
  const [loadingSessionId, setLoadingSessionId] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatNotice, setChatNotice] = useState('');

  const deferredExpertSearch = useDeferredValue(expertSearch.trim().toLowerCase());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedExpert = experts.find((expert) => expert.id === selectedExpertId) || null;
  const selectedSessions = sessionsByExpertId[selectedExpertId] || [];
  const selectedSessionId = selectedSessionIdByExpertId[selectedExpertId] || '';
  const selectedSessionDetail = selectedSessionId ? sessionDetailsById[selectedSessionId] || null : null;
  const hasMessages = Boolean(selectedSessionDetail?.messages.length);
  const canSendMessage = Boolean(selectedExpert) && draftMessage.trim().length > 0 && !isSending && !isCreatingSession;

  const filteredExperts = useMemo(() => {
    if (!deferredExpertSearch) return experts;
    return experts.filter((expert) => [expert.name, expert.description || '', expert.id].join(' ').toLowerCase().includes(deferredExpertSearch));
  }, [deferredExpertSearch, experts]);

  const upsertSession = (expertId: string, session: NotebookChatSession) => {
    setSessionsByExpertId((current) => ({ ...current, [expertId]: reorderSessions(current[expertId] || [], session) }));
  };

  const loadSessionDetail = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      setLoadingSessionId(sessionId);
      const detail = await fetchNotebookChatSession(sessionId);
      setSessionDetailsById((current) => ({
        ...current,
        [detail.id]: { ...detail, messages: detail.messages.map((message) => toDisplayMessage(message)), hydrated: true },
      }));
      upsertSession(detail.expertId, detail);
    } catch (error: any) {
      setChatError(error?.message || 'No pudimos cargar la conversacion.');
    } finally {
      setLoadingSessionId((current) => (current === sessionId ? '' : current));
    }
  };

  const loadSessions = async (expertId: string) => {
    if (!expertId) return;
    try {
      setLoadingSessionsExpertId(expertId);
      const sessions = await fetchNotebookChatSessions(expertId);
      setSessionsByExpertId((current) => ({ ...current, [expertId]: sessions }));
      const nextSessionId = sessions[0]?.id || '';
      setSelectedSessionIdByExpertId((current) => ({ ...current, [expertId]: nextSessionId }));
      if (nextSessionId) {
        await loadSessionDetail(nextSessionId);
      }
    } catch (error: any) {
      setChatError(error?.message || 'No pudimos cargar las sesiones del experto.');
    } finally {
      setLoadingSessionsExpertId((current) => (current === expertId ? '' : current));
    }
  };

  const createSession = async () => {
    if (!selectedExpertId) return null;
    try {
      setIsCreatingSession(true);
      setChatError('');
      const session = await createNotebookChatSession(selectedExpertId);
      upsertSession(selectedExpertId, session);
      setSelectedSessionIdByExpertId((current) => ({ ...current, [selectedExpertId]: session.id }));
      setSessionDetailsById((current) => ({ ...current, [session.id]: { ...session, messages: [], hydrated: true } }));
      setChatNotice('Se creo una conversacion nueva para este experto.');
      return session;
    } catch (error: any) {
      setChatError(error?.message || 'No pudimos crear una conversacion nueva.');
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const data = await fetchNotebookChatExperts();
        if (!isMounted) return;
        setExperts(data);
        setSelectedExpertId((previous) => (previous && data.some((item) => item.id === previous) ? previous : data[0]?.id || ''));
      } catch (error: any) {
        if (!isMounted) return;
        setExpertsError(error?.message || 'No pudimos cargar el catalogo de expertos.');
      } finally {
        if (isMounted) setLoadingExperts(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedExpertId || Array.isArray(sessionsByExpertId[selectedExpertId])) return;
    void loadSessions(selectedExpertId);
  }, [selectedExpertId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [selectedSessionId, selectedSessionDetail?.messages.length]);

  const handleSendMessage = async () => {
    if (!selectedExpert || !draftMessage.trim() || isSending) return;
    const prompt = draftMessage.trim();
    let activeSession = selectedSessions.find((session) => session.id === selectedSessionId) || null;
    if (!activeSession) {
      activeSession = await createSession();
    }
    if (!activeSession) return;

    const optimisticUser = optimisticMessage('user', prompt, 'ready');
    const optimisticAssistant = optimisticMessage('assistant', 'Consultando al experto seleccionado...', 'loading');
    setDraftMessage('');
    setChatError('');
    setChatNotice('');
    setIsSending(true);
    setSessionDetailsById((current) => {
      const currentDetail = current[activeSession!.id] || { ...activeSession!, messages: [], hydrated: true };
      return { ...current, [activeSession!.id]: { ...currentDetail, messages: [...currentDetail.messages, optimisticUser, optimisticAssistant] } };
    });

    try {
      const response = await sendNotebookChatSessionMessage(activeSession.id, prompt);
      upsertSession(selectedExpert.id, response.session);
      setSessionDetailsById((current) => {
        const currentDetail = current[activeSession!.id] || { ...response.session, messages: [], hydrated: true };
        return {
          ...current,
          [activeSession!.id]: {
            ...currentDetail,
            ...response.session,
            hydrated: true,
            messages: currentDetail.messages.map((message) => {
              if (message.id === optimisticUser.id) return toDisplayMessage(response.userMessage);
              if (message.id === optimisticAssistant.id) return toDisplayMessage(response.assistantMessage);
              return message;
            }),
          },
        };
      });
    } catch (error: any) {
      const message = error?.message || 'No fue posible obtener respuesta desde el experto.';
      setChatError(message);
      setSessionDetailsById((current) => {
        const currentDetail = current[activeSession!.id] || { ...activeSession!, messages: [], hydrated: true };
        return {
          ...current,
          [activeSession!.id]: {
            ...currentDetail,
            messages: currentDetail.messages.map((item) =>
              item.id === optimisticAssistant.id ? { ...item, content: message, status: 'error' } : item
            ),
          },
        };
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-[#111318]">Chat Seguro de Expertos</h1>
              <p className="mt-2 text-sm leading-6 text-[#516072]">
                Conversa con expertos NotebookLM sin exponer notebooks ni documentos fuente al navegador.
              </p>
            </div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#616f89]" htmlFor="expert-search">
              Filtrar expertos
            </label>
            <input
              id="expert-search"
              type="text"
              value={expertSearch}
              onChange={(event) => setExpertSearch(event.target.value)}
              placeholder="Buscar por nombre o ID publico"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111318] shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
            />
            <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-[#616f89]" htmlFor="expert-select">
              Seleccionar experto
            </label>
            <select
              id="expert-select"
              value={selectedExpertId}
              onChange={(event) => startTransition(() => setSelectedExpertId(event.target.value))}
              disabled={loadingExperts || filteredExperts.length === 0}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111318] shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {filteredExperts.length === 0 ? (
                <option value="">{loadingExperts ? 'Cargando expertos...' : 'Sin expertos disponibles'}</option>
              ) : (
                filteredExperts.map((expert) => <option key={expert.id} value={expert.id}>{expert.name}</option>)
              )}
            </select>
            {expertsError && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{expertsError}</div>}
            {selectedExpert && (
              <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-[#111318]">{selectedExpert.name}</p>
                {selectedExpert.description && <p className="text-sm leading-6 text-[#516072]">{selectedExpert.description}</p>}
                <button
                  type="button"
                  onClick={() => void createSession()}
                  disabled={isCreatingSession || isSending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#111318] transition-colors hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-base">{isCreatingSession ? 'hourglass_top' : 'add_comment'}</span>
                  {isCreatingSession ? 'Creando...' : 'Nueva conversacion'}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#111318]">Conversaciones</h2>
              <p className="mt-1 text-xs text-[#616f89]">Historial persistido por experto</p>
            </div>
            {loadingSessionsExpertId === selectedExpertId ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[#516072]">Cargando conversaciones guardadas...</div>
            ) : selectedSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[#516072]">Aun no hay sesiones para este experto.</div>
            ) : (
              <div className="space-y-3">
                {selectedSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      setSelectedSessionIdByExpertId((current) => ({ ...current, [selectedExpertId]: session.id }));
                      setChatError('');
                      setChatNotice('');
                      if (!sessionDetailsById[session.id]?.hydrated) void loadSessionDetail(session.id);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      session.id === selectedSessionId ? 'border-teal-200 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#111318]">{getSessionTitle(session)}</p>
                    <p className="mt-1 text-xs text-[#616f89]">Actualizada {formatSessionTime(session.updatedAt)}</p>
                    {session.summaryText && <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#516072]">{session.summaryText}</p>}
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-[linear-gradient(180deg,_rgba(240,253,250,0.92)_0%,_rgba(255,255,255,1)_100%)] px-6 py-5">
            <h2 className="text-xl font-semibold text-[#111318]">Panel de conversacion</h2>
            <p className="mt-1 text-sm text-[#616f89]">El historial completo se guarda y solo se envia contexto compacto al adaptador.</p>
            {selectedSessionId && <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#516072]">{getSessionTitle(selectedSessions.find((session) => session.id === selectedSessionId) || null)}</div>}
          </div>

          <div className="flex min-h-[680px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfe] px-4 py-5 sm:px-6">
              {loadingSessionId === selectedSessionId && !hasMessages ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-[#cbd5e1] bg-white px-6 py-10 text-center text-sm text-[#516072]">Cargando conversacion...</div>
              ) : !hasMessages ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#cbd5e1] bg-white px-6 py-10 text-center">
                  <div className="flex size-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-700"><span className="material-symbols-outlined text-3xl">chat</span></div>
                  <h3 className="mt-5 text-xl font-semibold text-[#111318]">Elige un experto y empieza a conversar</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#616f89]">Cada conversacion se guarda como una sesion independiente y el backend reconstruye contexto corto antes de consultar al experto.</p>
                  <div className="mt-6 flex w-full max-w-2xl flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button key={prompt} type="button" onClick={() => { setDraftMessage(prompt); textareaRef.current?.focus(); }} className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111318] transition-colors hover:border-teal-200 hover:bg-teal-50">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                selectedSessionDetail?.messages.map((message) => {
                  const isUserMessage = message.role === 'user';
                  return (
                    <div key={message.id} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl rounded-[24px] px-4 py-3 shadow-sm ${
                        isUserMessage ? 'bg-[#0f766e] text-white' : message.status === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : message.status === 'loading' ? 'border border-teal-100 bg-teal-50 text-teal-900' : 'border border-slate-200 bg-white text-[#111318]'
                      }`}>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                          <span className="material-symbols-outlined text-sm">{isUserMessage ? 'person' : message.status === 'error' ? 'warning' : 'smart_toy'}</span>
                          <span>{isUserMessage ? 'Tu mensaje' : message.status === 'error' ? 'Error del experto' : 'Experto'}</span>
                          {formatMessageTime(message.createdAt) && <span>{formatMessageTime(message.createdAt)}</span>}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
              {chatNotice && <div className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{chatNotice}</div>}
              {chatError && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{chatError}</div>}
              <form onSubmit={(event) => { event.preventDefault(); void handleSendMessage(); }} className="space-y-3">
                <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-[#fbfcfe] shadow-sm transition focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-200">
                  <textarea
                    ref={textareaRef}
                    rows={5}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder={selectedExpert ? `Escribe tu consulta para ${selectedExpert.name}` : 'Selecciona un experto antes de conversar'}
                    disabled={!selectedExpert || isSending || isCreatingSession}
                    className="min-h-[140px] w-full resize-none border-0 bg-transparent px-5 py-4 text-sm leading-6 text-[#111318] outline-none placeholder:text-[#94a3b8] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-[#616f89]">Enter envia el mensaje. Shift + Enter agrega una nueva linea. Si no hay sesion activa, se crea al primer envio.</p>
                  <button type="submit" disabled={!canSendMessage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50">
                    <span className="material-symbols-outlined text-base">{isSending ? 'hourglass_top' : 'send'}</span>
                    {isSending ? 'Enviando...' : 'Enviar al experto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default NotebookLMExpertChatView;
