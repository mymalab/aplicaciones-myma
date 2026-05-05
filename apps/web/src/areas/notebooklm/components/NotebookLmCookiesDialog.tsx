import React, { useEffect, useState } from 'react';
import {
  fetchNotebookLmCredentialsStatus,
  fetchNotebookLmAccountNotebooks,
  storeNotebookLmCredentials,
  validateNotebookLmCookies,
} from '../services/notebookLMService';
import type {
  NotebookLmAuthPayload,
  NotebookLmCookieValidationResponse,
  NotebookOption,
} from '../services/notebookLMService';
import {
  readStoredNotebookLmAuthPayload,
  readStoredNotebookLmRawCookies,
  readStoredSelectedNotebook,
  writeStoredNotebookLmAuthPayload,
  writeStoredNotebookLmRawCookies,
  writeStoredNotebookLmValidation,
  writeStoredSelectedNotebook,
} from '../services/notebookLmCookieStorage';
import type { StoredSelectedNotebook } from '../services/notebookLmCookieStorage';
import NotebookLmExtensionPanel from './NotebookLmExtensionPanel';

interface NotebookLmCookiesDialogProps {
  open: boolean;
  onClose: () => void;
  onValidated?: (payload: NotebookLmAuthPayload) => void;
  onNotebookSelected?: (notebook: StoredSelectedNotebook) => void;
}

const NotebookLmCookiesDialog: React.FC<NotebookLmCookiesDialogProps> = ({
  open,
  onClose,
  onValidated,
  onNotebookSelected,
}) => {
  const [input, setInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<NotebookLmCookieValidationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeAuthPayload, setActiveAuthPayload] = useState<NotebookLmAuthPayload | null>(
    null
  );
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);
  const [notebooksError, setNotebooksError] = useState('');
  const [selectedNotebookId, setSelectedNotebookId] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!open) return;
    setInput(readStoredNotebookLmRawCookies());
    setErrorMessage('');
    setResult(null);
    setNotebooks([]);
    setNotebooksError('');

    const storedSelection = readStoredSelectedNotebook();
    setSelectedNotebookId(storedSelection?.id || '');

    void (async () => {
      try {
        const status = await fetchNotebookLmCredentialsStatus();
        if (status.valid) {
          writeStoredNotebookLmAuthPayload(null);
          setActiveAuthPayload(null);
          await loadNotebooks(null);
          return;
        }
      } catch {
        // No interrumpimos la UI si no hay credenciales server-side o si la sesion expiro.
      }

      const storedPayload = readStoredNotebookLmAuthPayload();
      setActiveAuthPayload(storedPayload);
      if (storedPayload) {
        await loadNotebooks(storedPayload);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadNotebooks = async (payload?: NotebookLmAuthPayload | null) => {
    setLoadingNotebooks(true);
    setNotebooksError('');
    try {
      const items = await fetchNotebookLmAccountNotebooks(payload);
      setNotebooks(items);
      if (items.length === 0) {
        setNotebooksError('La cuenta no tiene notebooks disponibles.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo listar notebooks.';
      setNotebooksError(message);
      setNotebooks([]);
    } finally {
      setLoadingNotebooks(false);
    }
  };

  if (!open) return null;

  const handleValidate = async () => {
    const raw = input.trim();
    if (!raw) {
      setErrorMessage('Pega cookies antes de validarlas.');
      return;
    }
    setValidating(true);
    setErrorMessage('');
    setNotebooks([]);
    setNotebooksError('');
    try {
      const response = await validateNotebookLmCookies(raw);
      setResult(response);
      writeStoredNotebookLmRawCookies(raw);
      writeStoredNotebookLmValidation(response);
      if (response.ok && response.token_fetch_ok && response.auth_payload) {
        try {
          await storeNotebookLmCredentials(raw);
          writeStoredNotebookLmAuthPayload(null);
          setActiveAuthPayload(null);
          await loadNotebooks(null);
        } catch (storeError) {
          writeStoredNotebookLmAuthPayload(response.auth_payload);
          setActiveAuthPayload(response.auth_payload);
          onValidated?.(response.auth_payload);
          const storeMessage =
            storeError instanceof Error
              ? storeError.message
              : 'Las cookies se validaron, pero no pudimos guardarlas en tu cuenta.';
          setErrorMessage(storeMessage);
          await loadNotebooks(response.auth_payload);
        }
      } else {
        writeStoredNotebookLmAuthPayload(null);
        setActiveAuthPayload(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo validar.';
      setErrorMessage(message);
      writeStoredNotebookLmAuthPayload(null);
      setActiveAuthPayload(null);
    } finally {
      setValidating(false);
    }
  };

  const handleSelectNotebook = (nextId: string) => {
    setSelectedNotebookId(nextId);
    const match = notebooks.find((item) => item.id === nextId);
    if (match) {
      const stored: StoredSelectedNotebook = {
        id: match.id,
        nombre: match.nombre,
        notebook_id: match.notebook_id,
      };
      writeStoredSelectedNotebook(stored);
      onNotebookSelected?.(stored);
    } else {
      writeStoredSelectedNotebook(null);
    }
  };

  const hasValidAuth = Boolean(
    result?.ok && result.token_fetch_ok && result.auth_payload
  );

  const showNotebookPicker = Boolean(activeAuthPayload || notebooks.length > 0 || loadingNotebooks);
  const selectedNotebook = notebooks.find((item) => item.id === selectedNotebookId) || null;
  const selectedNotebookUrl = selectedNotebook
    ? `https://notebooklm.google.com/notebook/${encodeURIComponent(selectedNotebook.notebook_id)}`
    : '';

  const handleCopyNotebookUrl = async () => {
    if (!selectedNotebookUrl) return;
    try {
      await navigator.clipboard.writeText(selectedNotebookUrl);
      setCopyFeedback('Link copiado');
      window.setTimeout(() => setCopyFeedback(''), 2000);
    } catch {
      setCopyFeedback('No se pudo copiar');
      window.setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111318]">
            Cookies NotebookLM
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#111318] hover:bg-gray-100"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Recomendado: usa la extension de Chrome para sincronizar cookies sin pegar nada.
          Si no podes instalar la extension, abajo tenes la opcion manual: pega cookies en
          formato Netscape o storage JSON de Playwright.
        </p>
        <NotebookLmExtensionPanel />
        <hr className="my-4 border-gray-200" />
        <p className="mb-3 text-xs uppercase tracking-wide text-gray-500">
          Alternativa manual
        </p>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pega aqui cookies en formato Netscape o storage JSON de Playwright"
          spellCheck={false}
          className="min-h-[180px] w-full rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void handleValidate();
            }}
            disabled={validating}
            className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base leading-none">
              {validating ? 'progress_activity' : 'verified_user'}
            </span>
            {validating ? 'Validando...' : 'Validar cookie'}
          </button>
        </div>
        {errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
        {result && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              hasValidAuth
                ? 'border-teal-200 bg-teal-50 text-teal-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <p className="font-semibold">
              {hasValidAuth
                ? 'Cookies listas para usar'
                : 'Cookies pendientes de correccion'}
            </p>
            <p className="mt-1 leading-6">{result.message}</p>
            {result.missing_required_cookies.length > 0 && (
              <p className="mt-2 text-xs">
                Faltan: {result.missing_required_cookies.join(', ')}
              </p>
            )}
          </div>
        )}

        {showNotebookPicker && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label
                htmlFor="notebook-picker"
                className="text-sm font-semibold text-[#111318]"
              >
                Notebook a usar
              </label>
              <button
                type="button"
                onClick={() => {
                  void loadNotebooks(activeAuthPayload || null);
                }}
                disabled={loadingNotebooks}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-[#111318] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                title="Recargar lista de notebooks"
              >
                <span className="material-symbols-outlined text-sm leading-none">
                  {loadingNotebooks ? 'progress_activity' : 'refresh'}
                </span>
                {loadingNotebooks ? 'Cargando...' : 'Recargar'}
              </button>
            </div>
            <select
              id="notebook-picker"
              value={selectedNotebookId}
              onChange={(event) => handleSelectNotebook(event.target.value)}
              disabled={loadingNotebooks || notebooks.length === 0}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111318] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {loadingNotebooks
                  ? 'Cargando notebooks...'
                  : notebooks.length === 0
                  ? 'Sin notebooks disponibles'
                  : 'Selecciona un notebook'}
              </option>
              {notebooks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            {selectedNotebookUrl && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <a
                  href={selectedNotebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-xs font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800"
                  title={selectedNotebookUrl}
                >
                  {selectedNotebookUrl}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyNotebookUrl();
                  }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-[#111318] hover:bg-gray-100"
                  title="Copiar link del notebook"
                >
                  <span className="material-symbols-outlined text-sm leading-none">content_copy</span>
                </button>
              </div>
            )}
            {notebooksError && (
              <p className="mt-2 text-xs text-amber-700">{notebooksError}</p>
            )}
            {copyFeedback && <p className="mt-2 text-xs text-teal-700">{copyFeedback}</p>}
            {selectedNotebookId && (
              <p className="mt-2 text-xs text-teal-700">
                Notebook guardado. Se usara en las proximas llamadas de IA.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#111318] hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotebookLmCookiesDialog;
