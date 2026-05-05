import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@shared/api-client/supabase';

const EXTENSION_ID =
  (import.meta.env.VITE_NOTEBOOK_LM_EXTENSION_ID as string | undefined)?.trim() ||
  'klgfnedjofnmlcfkndbehjhpbbahdnhc';

const EXTENSION_BACKEND_URL =
  (import.meta.env.VITE_NOTEBOOK_LM_EXTENSION_BACKEND_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BASE_URL as string | undefined)?.trim() ||
  'http://34.74.6.124';

const EXTENSION_BEARER =
  (import.meta.env.VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN as string | undefined)?.trim() || '';

const EXTENSION_DEFAULT_INTERVAL_MIN = Number(
  import.meta.env.VITE_NOTEBOOK_LM_EXTENSION_INTERVAL_MIN || 10,
);

const EXTENSION_INSTALL_DOC_URL =
  (import.meta.env.VITE_NOTEBOOK_LM_EXTENSION_DOC_URL as string | undefined)?.trim() ||
  'https://github.com/CamiloMans/api-notebooklm-filtrar-y-descargar-documentos-seia/tree/main/chrome-extension';

interface ExtensionStatus {
  backendUrl?: string;
  intervalMin?: number;
  lastSync?: string | null;
  lastError?: string | null;
  hasBearer?: boolean;
  hasRefreshToken?: boolean;
  accessTokenExpiresAt?: number;
}

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback?: (response: unknown) => void,
  ) => void;
  lastError?: { message?: string };
};

interface NotebookLmExtensionPanelProps {
  onSynced?: () => void | Promise<void>;
}

function getChromeRuntime(): ChromeRuntime | null {
  const w = window as unknown as { chrome?: { runtime?: ChromeRuntime } };
  if (!w.chrome || !w.chrome.runtime || typeof w.chrome.runtime.sendMessage !== 'function') {
    return null;
  }
  return w.chrome.runtime;
}

function callExtension<T = unknown>(message: unknown, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime();
    if (!runtime) {
      reject(new Error('Chrome extension API no disponible (browser sin Chrome o extension no instalada).'));
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Sin respuesta de la extension. Verifica que este instalada y habilitada.'));
    }, timeoutMs);
    try {
      runtime.sendMessage(EXTENSION_ID, message, (response) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message || 'Error de runtime extension.'));
          return;
        }
        if (!response || typeof response !== 'object') {
          reject(new Error('Respuesta vacia de la extension.'));
          return;
        }
        const ok = (response as { ok?: boolean }).ok;
        if (!ok) {
          const errMsg = (response as { error?: string }).error || 'La extension reporto un error.';
          reject(new Error(errMsg));
          return;
        }
        resolve(response as T);
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

const NotebookLmExtensionPanel: React.FC<NotebookLmExtensionPanelProps> = ({ onSynced }) => {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string>('');
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const refreshStatus = useCallback(async () => {
    try {
      const ping = await callExtension<{ ok: true; version?: string }>({ type: 'ping' });
      setInstalled(true);
      setVersion(ping.version || '');
      try {
        const statusResp = await callExtension<{ ok: true; status: ExtensionStatus }>({
          type: 'get_status',
        });
        setStatus(statusResp.status);
      } catch {
        // Ignore status errors; install flag is enough for the UI.
      }
    } catch {
      setInstalled(false);
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleConfigure = useCallback(
    async (alsoSync: boolean) => {
      setBusy(true);
      setError('');
      setInfo('');
      try {
        const sessionResp = await supabase.auth.getSession();
        const refreshToken = sessionResp.data.session?.refresh_token;
        if (!refreshToken) {
          throw new Error('No hay sesion Supabase activa. Vuelve a iniciar sesion.');
        }
        if (!EXTENSION_BEARER) {
          throw new Error(
            'Falta VITE_NOTEBOOK_LM_LOCAL_API_BEARER_TOKEN en el frontend para configurar la extension.',
          );
        }
        await callExtension({
          type: 'configure',
          config: {
            backendUrl: EXTENSION_BACKEND_URL,
            bearerToken: EXTENSION_BEARER,
            refreshToken,
            intervalMin: Number.isFinite(EXTENSION_DEFAULT_INTERVAL_MIN)
              ? EXTENSION_DEFAULT_INTERVAL_MIN
              : 10,
          },
        });
        setInfo('Extension configurada.');
        if (alsoSync) {
          await callExtension({ type: 'sync_now' });
          await onSynced?.();
          setInfo('Extension configurada y primer sync ejecutado.');
        }
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [onSynced, refreshStatus],
  );

  if (installed === null) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Verificando extension...
      </div>
    );
  }

  if (installed === false) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Extension Myma NotebookLM Cookie Sync no detectada</p>
        <p className="mt-1 leading-6">
          Instalala una sola vez para que el browser sincronice cookies automaticamente y no
          tengas que pegar nada cada hora.
        </p>
        <a
          href={EXTENSION_INSTALL_DOC_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          <span className="material-symbols-outlined text-base leading-none">extension</span>
          Como instalar la extension
        </a>
      </div>
    );
  }

  const lastSyncLabel = status?.lastSync
    ? new Date(status.lastSync).toLocaleString()
    : 'nunca';
  const expiresAtLabel = status?.accessTokenExpiresAt
    ? new Date(status.accessTokenExpiresAt * 1000).toLocaleString()
    : '—';

  return (
    <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
      <p className="font-semibold">
        Extension Myma NotebookLM Cookie Sync detectada{version ? ` (v${version})` : ''}
      </p>
      <ul className="mt-2 space-y-1 leading-6">
        <li>Backend: {status?.backendUrl || '—'}</li>
        <li>Intervalo: {status?.intervalMin || '—'} min</li>
        <li>Bearer configurado: {status?.hasBearer ? 'si' : 'no'}</li>
        <li>Refresh token guardado: {status?.hasRefreshToken ? 'si' : 'no'}</li>
        <li>Ultimo sync: {lastSyncLabel}</li>
        <li>Access token expira: {expiresAtLabel}</li>
        {status?.lastError && (
          <li className="text-red-700">Ultimo error: {status.lastError}</li>
        )}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleConfigure(true)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base leading-none">
            {busy ? 'progress_activity' : 'sync'}
          </span>
          {busy ? 'Configurando...' : 'Configurar y sincronizar ahora'}
        </button>
        <button
          type="button"
          onClick={() => void handleConfigure(false)}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base leading-none">tune</span>
          Solo configurar
        </button>
        <button
          type="button"
          onClick={() => void refreshStatus()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base leading-none">refresh</span>
          Recargar estado
        </button>
      </div>
      {info && <p className="mt-2 text-xs">{info}</p>}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
};

export default NotebookLmExtensionPanel;
