import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAreas } from '@shared/rbac/useAreas';
import AreaSelector from '@shared/rbac/AreaSelector';
import { useAuth } from '@shared/auth/useAuth';
import { useHasPermissions } from '@shared/rbac/useHasPermissions';
import OnboardingView from '@shared/onboarding/OnboardingView';
import TutorialVideosModal from '@shared/tutorials/TutorialVideosModal';
import { AreaId, AREAS } from '@contracts/areas';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout principal de la aplicación
 * Incluye el header con selector de área y maneja la navegación inicial
 * Muestra OnboardingView si el usuario no tiene permisos en ningún módulo
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { areas, loading: areasLoading } = useAreas();
  const { hasPermissions, loading: permissionsLoading } = useHasPermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { areaId } = useParams<{ areaId: string }>();
  const [isTutorialsModalOpen, setIsTutorialsModalOpen] = React.useState(false);

  const loading = areasLoading || permissionsLoading;
  const currentArea = areaId && Object.values(AreaId).includes(areaId as AreaId)
    ? AREAS[areaId as AreaId]
    : null;

  // Si está en la ruta raíz /app (sin /area/), redirigir a la primera área disponible
  React.useEffect(() => {
    if (location.pathname === '/app' && !loading && areas.length > 0 && hasPermissions) {
      navigate(`/app/area/${areas[0]}`, { replace: true });
    }
  }, [location.pathname, areas, loading, hasPermissions, navigate]);

  React.useEffect(() => {
    if (!areaId && isTutorialsModalOpen) {
      setIsTutorialsModalOpen(false);
    }
  }, [areaId, isTutorialsModalOpen]);

  // Mostrar loading mientras se verifican los permisos
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si el usuario no tiene permisos, mostrar la vista de onboarding
  if (hasPermissions === false) {
    return <OnboardingView />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header con selector de área (solo si hay múltiples áreas) */}
      {areas.length > 1 && (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-md border-2 border-teal-600">
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AreaSelector />
            <button
              onClick={() => setIsTutorialsModalOpen(true)}
              disabled={!currentArea}
              title={
                currentArea
                  ? `Ver tutoriales de ${currentArea.displayName}`
                  : 'Selecciona un modulo para ver tutoriales'
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px] text-[#616f89]">smart_display</span>
              <span className="text-sm font-medium text-[#111318]">Tutoriales</span>
            </button>
            {user && (
              <div className="flex items-center gap-2">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <span className="text-sm text-[#616f89] hidden md:block">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Contenido */}
      {children}

      <TutorialVideosModal
        isOpen={isTutorialsModalOpen}
        onClose={() => setIsTutorialsModalOpen(false)}
        areaId={currentArea?.id ?? null}
        areaDisplayName={currentArea?.displayName}
      />
    </div>
  );
};

export default MainLayout;
