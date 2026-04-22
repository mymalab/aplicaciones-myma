import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Login from '@shared/auth/Login';
import AuthCallback from '@shared/auth/AuthCallback';
import ProtectedRoute from '@shared/auth/ProtectedRoute';
import OnboardingView from '@shared/onboarding/OnboardingView';
import OnboardingVideosView from '@shared/onboarding/OnboardingVideosView';
import MainLayout from './layouts/MainLayout';
import PostLoginLayout from './layouts/PostLoginLayout';
import AreaLayout from './layouts/AreaLayout';
import AreaGuard from '@shared/rbac/AreaGuard';
import AcreditacionRoutes from '@areas/acreditacion/routes';
import ProveedoresRoutes from '@areas/proveedores/routes';
import PersonasRoutes from '@areas/personas/routes';
import AdendasRoutes from '@areas/adendas/routes';
import FinanzasRoutes from '@areas/finanzas/routes';
import NotebookLMRoutes from '@areas/notebooklm/routes';
import AppHomeView from './pages/AppHomeView';
import { AreaId } from '@contracts/areas';

// Renderiza las rutas segun el area seleccionada.
const AreaRoutes: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();

  switch (areaId) {
    case AreaId.ACREDITACION:
      return <AcreditacionRoutes />;
    case AreaId.PROVEEDORES:
      return <ProveedoresRoutes />;
    case AreaId.FINANZAS:
      return <FinanzasRoutes />;
    case AreaId.PERSONAS:
      return <PersonasRoutes />;
    case AreaId.ADENDAS:
      return <AdendasRoutes />;
    case AreaId.NOTEBOOKLM:
      return <NotebookLMRoutes />;
    default:
      return <AcreditacionRoutes />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas publicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Home principal post-login */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <PostLoginLayout>
                <AppHomeView />
              </PostLoginLayout>
            </ProtectedRoute>
          }
        />

        {/* Onboarding para usuarios sin acceso operativo */}
        <Route
          path="/app/onboarding"
          element={
            <ProtectedRoute>
              <PostLoginLayout>
                <OnboardingView mode="embedded" />
              </PostLoginLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/onboarding/videos"
          element={
            <ProtectedRoute>
              <PostLoginLayout>
                <OnboardingVideosView />
              </PostLoginLayout>
            </ProtectedRoute>
          }
        />

        {/* Rutas internas por area */}
        <Route
          path="/app/area/:areaId/*"
          element={
            <ProtectedRoute>
              <AreaGuard>
                <MainLayout>
                  <AreaLayout>
                    <AreaRoutes />
                  </AreaLayout>
                </MainLayout>
              </AreaGuard>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
