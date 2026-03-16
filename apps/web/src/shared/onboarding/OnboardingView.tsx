import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { fetchAvailableModules, formatModuleName, RBACModule } from '../rbac/modulesService';
import {
  CreateAccessRequestsResult,
  createAccessRequests,
} from '../rbac/accessRequestsService';

/**
 * Vista de onboarding que se muestra cuando el usuario no tiene permisos
 */
const OnboardingView: React.FC = () => {
  const { user } = useAuth();
  const [availableModules, setAvailableModules] = useState<RBACModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitResult, setSubmitResult] = useState<CreateAccessRequestsResult | null>(
    null
  );

  // Cargar módulos disponibles desde rbac_module
  useEffect(() => {
    const loadModules = async () => {
      try {
        setLoadingModules(true);
        const modules = await fetchAvailableModules();
        setAvailableModules(modules);
      } catch (error) {
        console.error('Error loading modules:', error);
        setErrorMessage('Error al cargar los módulos disponibles.');
      } finally {
        setLoadingModules(false);
      }
    };

    loadModules();
  }, []);

  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode)
        ? prev.filter((code) => code !== moduleCode)
        : [...prev, moduleCode]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedModules.length === 0) {
      setErrorMessage('Por favor, selecciona al menos un módulo.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    setSubmitResult(null);

    try {
      const result = await createAccessRequests({
        moduleCodes: selectedModules,
        message: message.trim() || null,
      });

      setSubmitStatus('success');
      setSubmitResult(result);
      setSelectedModules([]);
      setMessage('');
    } catch (error: any) {
      console.error('Error submitting access request:', error);
      setSubmitStatus('error');
      setErrorMessage(
        error.message || 'Error al enviar la solicitud. Por favor, inténtalo de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 mb-4 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sin acceso
          </h1>
          <p className="text-gray-600 text-lg">
            Aún no tienes acceso a ninguna aplicación o módulo del sistema.
          </p>
        </div>

        {/* Mensaje informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>¿Necesitas acceso?</strong> Completa el formulario a continuación para
            solicitar acceso a los módulos que necesitas. Un administrador revisará tu
            solicitud y te notificará cuando se apruebe.
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de módulos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Selecciona los módulos a los que necesitas acceso:
              <span className="text-red-500 ml-1">*</span>
            </label>
            {loadingModules ? (
              <div className="flex items-center justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-3 text-gray-600">Cargando módulos...</span>
              </div>
            ) : availableModules.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  No hay módulos disponibles para solicitar en este momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableModules.map((module) => {
                  const isSelected = selectedModules.includes(module.code);
                  const displayName = formatModuleName(module.name);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => toggleModule(module.code)}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 text-left
                        ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${
                              isSelected
                                ? 'border-teal-500 bg-teal-500'
                                : 'border-gray-300'
                            }
                          `}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {displayName}
                          </div>
                          {module.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {module.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedModules.length === 0 && !loadingModules && availableModules.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Selecciona al menos un módulo para continuar
              </p>
            )}
          </div>

          {/* Mensaje opcional */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Mensaje o motivo (opcional):
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
              placeholder="Explica brevemente por qué necesitas acceso a estos módulos..."
            />
          </div>

          {/* Mensaje de error */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-semibold">
                ✓ Solicitud enviada correctamente
              </p>
              <p className="text-green-700 text-sm mt-1">
                {submitResult && submitResult.createdModuleCodes.length > 0
                  ? `Se enviaron ${submitResult.createdModuleCodes.length} solicitud(es). Un administrador las revisara y te notificara cuando se apruebe tu acceso.`
                  : 'No se crearon nuevas solicitudes.'}
              </p>
              {submitResult && submitResult.skippedPendingModuleCodes.length > 0 && (
                <p className="text-green-700 text-sm mt-2">
                  Ya estaban pendientes:{' '}
                  {submitResult.skippedPendingModuleCodes
                    .map((moduleCode) => formatModuleName(moduleCode))
                    .join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={isSubmitting || selectedModules.length === 0}
            className={`
              w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200
              ${
                isSubmitting || selectedModules.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Enviando solicitud...
              </span>
            ) : (
              'Enviar solicitud de acceso'
            )}
          </button>
        </form>

        {/* Información del usuario */}
        {user && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Usuario: <span className="font-semibold text-gray-700">{user.email}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingView;


