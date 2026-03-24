import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAreas } from '@shared/rbac/useAreas';

const AppHomeView: React.FC = () => {
  const navigate = useNavigate();
  const { areas, loading: areasLoading } = useAreas();

  const handleOperativasClick = () => {
    if (areasLoading) return;

    if (areas.length > 0) {
      navigate(`/app/area/${areas[0]}`);
      return;
    }

    navigate('/app/onboarding');
  };

  const handleOnboardingClick = () => {
    navigate('/app/onboarding/videos');
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
            className="group text-left rounded-2xl border border-teal-200 bg-white/95 backdrop-blur-sm p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
                : areas.length > 0
                  ? `Acceso disponible a ${areas.length} area(s)`
                  : 'Sin acceso operativo: te llevaremos a solicitud de permisos'}
            </div>
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
      </div>
    </div>
  );
};

export default AppHomeView;
