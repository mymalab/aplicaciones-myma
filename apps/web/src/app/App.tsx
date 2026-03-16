import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Login from '@shared/auth/Login';
import AuthCallback from '@shared/auth/AuthCallback';
import ProtectedRoute from '@shared/auth/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import AreaLayout from './layouts/AreaLayout';
import AreaGuard from '@shared/rbac/AreaGuard';
import AcreditacionRoutes from '@areas/acreditacion/routes';
import ProveedoresRoutes from '@areas/proveedores/routes';
import PersonasRoutes from '@areas/personas/routes';
import AdendasRoutes from '@areas/adendas/routes';
import { AreaId } from '@contracts/areas';

// Componente que renderiza las rutas según el área
const AreaRoutes: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();

  switch (areaId) {
    case AreaId.ACREDITACION:
      return <AcreditacionRoutes />;
    case AreaId.PROVEEDORES:
      return <ProveedoresRoutes />;
    case AreaId.PERSONAS:
      return <PersonasRoutes />;
    case AreaId.ADENDAS:
      return <AdendasRoutes />;
    default:
      return <AcreditacionRoutes />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Rutas protegidas */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  {/* Redirigir /app a la primera área disponible */}
                  <Route path="*" element={<Navigate to="/app/area/acreditacion" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />

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

        {/* Redirigir la ruta raíz */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

