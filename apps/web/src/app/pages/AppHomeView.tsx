import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AREAS, AreaId } from '@contracts/areas';
import { useAreas } from '@shared/rbac/useAreas';
import { filterSupportedAreas } from '@shared/rbac/supportedAreas';

const AppHomeView: React.FC = () => {
  const navigate = useNavigate();
  const { areas, loading: areasLoading, error: areasError } = useAreas();
  const [showOperationalApps, setShowOperationalApps] = useState(false);

  const handleOperativasClick = () => {
    if (areasLoading) return;
    setShowOperationalApps((current) => !current);
  };

  const handleOnboardingClick = () => {
    navigate('/app/onboarding/videos');
  };

  const availableOperationalAreas = filterSupportedAreas(areas);

  const handleAreaClick = (areaId: AreaId) => {
    navigate(`/app/area/${areaId}`);
  };

  return (
    <div
      className="bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 px-4 py-10 md:px-6 md:py-14"
      style={{ minHeight: 'calc(100vh - 81px)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[#111318] tracking-tight">
            Centro de Aplicaciones
          </h1>
          <p className="mt-3 text-[#616f89] max-w-2xl mx-auto">
            Selecciona la categoria que necesitas para continuar.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <button
            type="button"
            onClick={handleOperativasClick}
            disabled={areasLoading}
            aria-expanded={showOperationalApps}
            aria-controls="operativas-panel"
            className={`group text-left rounded-2xl border bg-white/95 backdrop-blur-sm p-6 shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
              showOperationalApps
                ? 'border-teal-400 shadow-xl shadow-teal-100'
                : 'border-teal-200 hover:-translate-y-1 hover:shadow-xl'
            }`}
          >
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-500 text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">dashboard</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#111318]">Apps Operativas</h2>
            <p className="mt-2 text-sm text-[#616f89]">
              Accede a los modulos operativos segun tus permisos actuales.
            </p>
            <div className="mt-4 text-xs font-medium text-teal-700">
              {areasLoading
                ? 'Verificando accesos...'
                : availableOperationalAreas.length > 0
                  ? `Acceso disponible a ${availableOperationalAreas.length} area(s)`
                  : 'Sin acceso operativo: revisa onboarding o solicita permisos'}
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
              {showOperationalApps ? 'Ocultar aplicaciones' : 'Ver aplicaciones disponibles'}
              <span className="material-symbols-outlined text-base">
                {showOperationalApps ? 'expand_less' : 'expand_more'}
              </span>
            </div>
            {areasError ? (
              <p className="mt-3 text-xs text-rose-600">
                No pudimos refrescar todos los accesos en este momento.
              </p>
            ) : null}
          </button>

          <div className="relative rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm opacity-85">
            <div className="absolute top-4 right-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Proximamente
            </div>
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">clinical_notes</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#111318]">Apps Especialistas</h2>
            <p className="mt-2 text-sm text-[#616f89]">
              Esta categoria quedara habilitada en una siguiente etapa.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOnboardingClick}
            className="group text-left rounded-2xl border border-blue-200 bg-white/95 backdrop-blur-sm p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <div className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
              <span className="material-symbols-outlined text-2xl">smart_display</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#111318]">Onboarding</h2>
            <p className="mt-2 text-sm text-[#616f89]">
              Revisa videos y guias para usar la aplicacion de forma mas eficiente.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              Abrir onboarding
              <span className="material-symbols-outlined text-base">north_east</span>
            </div>
          </button>
        </div>

        {showOperationalApps && (
          <section
            id="operativas-panel"
            className="mt-8 overflow-hidden rounded-[28px] border border-teal-200/80 bg-white/90 shadow-xl shadow-teal-100/60 backdrop-blur-sm"
          >
            <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-white to-blue-50 px-6 py-5 md:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Apps operativas
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#111318]">
                    Elige la aplicacion a la que quieres ingresar
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#616f89]">
                    Mostramos solo los modulos que hoy estan habilitados para tu usuario.
                  </p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm">
                  <span className="material-symbols-outlined text-base">apps</span>
                  {availableOperationalAreas.length} disponible
                  {availableOperationalAreas.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>

            <div className="px-6 py-6 md:px-8 md:py-8">
              {availableOperationalAreas.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {availableOperationalAreas.map((areaId) => {
                    const area = AREAS[areaId];

                    return (
                      <button
                        key={areaId}
                        type="button"
                        onClick={() => handleAreaClick(areaId)}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-blue-400 to-indigo-400 opacity-0 transition-opacity group-hover:opacity-100" />

                        <div className="flex items-start justify-between gap-4">
                          <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-500 text-white shadow-md">
                            <span className="material-symbols-outlined text-2xl">{area.icon}</span>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                            Ingresar
                            <span className="material-symbols-outlined text-sm">arrow_outward</span>
                          </span>
                        </div>

                        <div className="mt-5">
                          <h3 className="text-lg font-semibold text-[#111318]">{area.displayName}</h3>
                          <p className="mt-2 text-sm leading-6 text-[#616f89]">
                            {area.description || 'Acceso directo a tu aplicacion operativa.'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/70 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#111318]">
                        Aun no tienes aplicaciones operativas habilitadas
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-[#616f89]">
                        Puedes continuar al onboarding para revisar material disponible y
                        solicitar permisos de acceso.
                      </p>
                      {areasError ? (
                        <p className="mt-3 text-sm text-rose-600">{areasError}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/app/onboarding')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-teal-700"
                    >
                      Solicitar permisos
                      <span className="material-symbols-outlined text-base">east</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AppHomeView;
