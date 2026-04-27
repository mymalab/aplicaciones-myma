import React from 'react';
import type { NotebookLmCredentialsStatusResponse } from '../services/notebookLMService';

interface NotebookLmAuthBannerProps {
  status: NotebookLmCredentialsStatusResponse | null;
  loading?: boolean;
  onOpenCookiesDialog?: () => void;
  onRefresh?: () => void;
}

const NotebookLmAuthBanner: React.FC<NotebookLmAuthBannerProps> = ({
  status,
  loading = false,
  onOpenCookiesDialog,
  onRefresh,
}) => {
  if (loading || !status) {
    return null;
  }

  let toneClasses = '';
  let title = '';
  let message = '';

  if (!status.has_credentials) {
    toneClasses = 'border-slate-200 bg-slate-50 text-slate-800';
    title = 'Conecta tu cuenta NotebookLM';
    message =
      'Todavia no hay credenciales guardadas en tu cuenta MyMA. Pega y valida cookies para listar notebooks, cargar documentos y compartirlos.';
  } else if (status.status === 'expired') {
    toneClasses = 'border-red-200 bg-red-50 text-red-800';
    title = 'La sesion de NotebookLM expiro';
    message =
      status.last_error ||
      'Las credenciales guardadas ya no son validas. Vuelve a pegar y validar cookies para continuar.';
  } else if (
    status.valid &&
    typeof status.days_until_soft_expiry === 'number' &&
    status.days_until_soft_expiry <= 3
  ) {
    toneClasses = 'border-amber-200 bg-amber-50 text-amber-800';
    title = 'Tu sesion de NotebookLM esta por expirar';
    message = `Quedan aproximadamente ${status.days_until_soft_expiry} dia(s) antes de la expiracion preventiva. Conviene renovar las cookies pronto.`;
  } else {
    return null;
  }

  return (
    <div className={`mb-4 rounded-lg border p-4 text-sm ${toneClasses}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 leading-6">{message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-sm font-semibold transition hover:bg-white"
            >
              <span className="material-symbols-outlined text-base leading-none">refresh</span>
              Revisar ahora
            </button>
          )}
          {onOpenCookiesDialog && (
            <button
              type="button"
              onClick={onOpenCookiesDialog}
              className="inline-flex items-center gap-2 rounded-lg bg-[#059669] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]"
            >
              <span className="material-symbols-outlined text-base leading-none">verified_user</span>
              Gestionar cookies
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookLmAuthBanner;
