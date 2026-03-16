import React, { useEffect, useMemo, useState } from 'react';
import { fetchAvailableModules, formatModuleName, RBACModule } from './modulesService';
import {
  CreateAccessRequestsResult,
  MyAccessRequest,
  createAccessRequests,
  fetchMyAccessRequests,
  fetchMyPendingRequestModuleCodes,
} from './accessRequestsService';
import { getUserPermissions, hasModuleAccessPermission } from './permissionsService';

const normalizeModuleCode = (moduleCode: string): string =>
  moduleCode.toLowerCase().trim();

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadgeClass = (status: string): string => {
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus === 'aprobado') {
    return 'bg-green-100 text-green-700 border border-green-200';
  }
  if (normalizedStatus === 'rechazado') {
    return 'bg-red-100 text-red-700 border border-red-200';
  }
  if (normalizedStatus === 'pendiente') {
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  }
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

const AccessRequestPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestableModules, setRequestableModules] = useState<RBACModule[]>([]);
  const [modulesByCode, setModulesByCode] = useState<Record<string, RBACModule>>({});
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [myRequests, setMyRequests] = useState<MyAccessRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastSubmitResult, setLastSubmitResult] =
    useState<CreateAccessRequestsResult | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const [availableModules, userPermissions, pendingModuleCodes, recentRequests] =
        await Promise.all([
          fetchAvailableModules(),
          getUserPermissions(),
          fetchMyPendingRequestModuleCodes(),
          fetchMyAccessRequests(10),
        ]);

      const pendingSet = new Set(
        pendingModuleCodes.map((code) => normalizeModuleCode(code))
      );

      const moduleMap = availableModules.reduce<Record<string, RBACModule>>((acc, module) => {
        const code = normalizeModuleCode(module.code || '');
        if (code) {
          acc[code] = module;
        }
        return acc;
      }, {});

      const requestable = availableModules
        .filter((module) => {
          const normalizedCode = normalizeModuleCode(module.code || '');
          if (!normalizedCode) return false;

          const hasAccess = hasModuleAccessPermission(userPermissions, normalizedCode);
          const hasPending = pendingSet.has(normalizedCode);
          return !hasAccess && !hasPending;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setModulesByCode(moduleMap);
      setRequestableModules(requestable);
      setMyRequests(recentRequests);
      setSelectedModules((prev) =>
        prev.filter((moduleCode) =>
          requestable.some(
            (module) => normalizeModuleCode(module.code) === normalizeModuleCode(moduleCode)
          )
        )
      );
    } catch (error: any) {
      console.error('Error loading access request panel data:', error);
      setErrorMessage(error?.message || 'Error al cargar informacion de permisos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleModule = (moduleCode: string) => {
    const normalizedCode = normalizeModuleCode(moduleCode);
    setSelectedModules((current) =>
      current.includes(normalizedCode)
        ? current.filter((code) => code !== normalizedCode)
        : [...current, normalizedCode]
    );
    setErrorMessage('');
    setSuccessMessage('');
  };

  const requestableModuleCodes = useMemo(
    () => new Set(requestableModules.map((module) => normalizeModuleCode(module.code))),
    [requestableModules]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (selectedModules.length === 0) {
      setErrorMessage('Selecciona al menos un modulo para enviar la solicitud.');
      return;
    }

    const validSelected = selectedModules.filter((code) =>
      requestableModuleCodes.has(normalizeModuleCode(code))
    );

    if (validSelected.length === 0) {
      setErrorMessage(
        'Los modulos seleccionados ya no estan disponibles. Actualiza e intenta nuevamente.'
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const result = await createAccessRequests({
        moduleCodes: validSelected,
        message: message.trim() || null,
      });

      setLastSubmitResult(result);
      setSelectedModules([]);
      setMessage('');

      if (result.createdModuleCodes.length > 0 && result.skippedPendingModuleCodes.length > 0) {
        setSuccessMessage(
          `Se enviaron ${result.createdModuleCodes.length} solicitud(es). ${result.skippedPendingModuleCodes.length} modulo(s) ya tenian solicitud pendiente.`
        );
      } else if (result.createdModuleCodes.length > 0) {
        setSuccessMessage(
          `Solicitud enviada correctamente para ${result.createdModuleCodes.length} modulo(s).`
        );
      } else if (result.skippedPendingModuleCodes.length > 0) {
        setSuccessMessage(
          'No se crearon nuevas solicitudes porque los modulos seleccionados ya estaban pendientes.'
        );
      } else {
        setSuccessMessage('No hay cambios para enviar.');
      }

      await loadData();
    } catch (error: any) {
      console.error('Error creating access requests:', error);
      setErrorMessage(error?.message || 'No se pudo enviar la solicitud de acceso.');
    } finally {
      setSubmitting(false);
    }
  };

  const getModuleDisplayName = (moduleCode: string): string => {
    const normalizedCode = normalizeModuleCode(moduleCode);
    const module = modulesByCode[normalizedCode];
    if (!module) {
      return formatModuleName(normalizedCode);
    }
    return formatModuleName(module.name || module.code || normalizedCode);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
        <h3 className="text-sm font-semibold text-[#111318] flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-600 text-base">lock_open_right</span>
          Solicitar permisos a otros modulos
        </h3>
        <p className="text-xs text-[#4f5f7a] mt-1">
          Selecciona los modulos que necesitas. Se muestran solo modulos sin acceso y sin
          solicitudes pendientes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-[#111318]">
              Modulos disponibles <span className="text-red-500">*</span>
            </label>
            {!loading && requestableModules.length > 0 && (
              <span className="text-xs text-[#616f89]">
                Seleccionados: {selectedModules.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center gap-2 text-sm text-[#616f89]">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              Cargando modulos disponibles...
            </div>
          ) : requestableModules.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-[#616f89]">
              No tienes modulos pendientes por solicitar en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requestableModules.map((module) => {
                const normalizedCode = normalizeModuleCode(module.code);
                const selected = selectedModules.includes(normalizedCode);

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => toggleModule(module.code)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-primary/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`material-symbols-outlined text-base mt-0.5 ${
                          selected ? 'text-primary' : 'text-[#616f89]'
                        }`}
                      >
                        {selected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#111318] leading-tight">
                          {formatModuleName(module.name || module.code)}
                        </div>
                        {module.description && (
                          <p className="text-xs text-[#616f89] mt-1">{module.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="request_message" className="text-sm font-medium text-[#111318]">
            Mensaje o motivo (opcional)
          </label>
          <textarea
            id="request_message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Explica brevemente por que necesitas acceso..."
            className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <div>{successMessage}</div>
            {lastSubmitResult && lastSubmitResult.skippedPendingModuleCodes.length > 0 && (
              <div className="mt-1 text-xs text-green-700/80">
                Pendientes previas:{' '}
                {lastSubmitResult.skippedPendingModuleCodes
                  .map((moduleCode) => getModuleDisplayName(moduleCode))
                  .join(', ')}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading || selectedModules.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/20 hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">send</span>
                Enviar solicitud
              </>
            )}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h4 className="text-sm font-semibold text-[#111318]">Mis solicitudes recientes</h4>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-[#616f89]">Cargando historial...</div>
          ) : myRequests.length === 0 ? (
            <div className="text-sm text-[#616f89]">Aun no tienes solicitudes registradas.</div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-[#111318]">
                      {getModuleDisplayName(request.modulo_solicitado)}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeClass(
                        request.estado
                      )}`}
                    >
                      {request.estado}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#616f89]">
                    Creada: {formatDateTime(request.created_at)}
                    {request.resuelto_at && ` · Resuelta: ${formatDateTime(request.resuelto_at)}`}
                  </div>
                  {request.mensaje && (
                    <p className="mt-2 text-xs text-[#4f5f7a] bg-gray-50 rounded-md px-2.5 py-2 border border-gray-100">
                      {request.mensaje}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessRequestPanel;
