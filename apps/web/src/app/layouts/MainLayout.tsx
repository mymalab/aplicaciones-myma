import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAreas } from '@shared/rbac/useAreas';
import AreaSelector from '@shared/rbac/AreaSelector';
import AppShellHeader from '@shared/layout/AppShellHeader';

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout usado por las rutas internas de cada area.
 */
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { areas, loading } = useAreas();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Verificando areas disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {areas.length > 1 && (
        <AppShellHeader
          beforeUserContent={
            <>
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
                title="Volver al inicio"
              >
                <span className="material-symbols-outlined text-lg text-[#616f89]">home</span>
                <span className="font-medium text-[#111318]">Home</span>
              </button>
              <AreaSelector />
            </>
          }
        />
      )}
      {children}
    </div>
  );
};

export default MainLayout;
