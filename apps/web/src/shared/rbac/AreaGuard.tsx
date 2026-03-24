import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAreas } from '@shared/rbac/useAreas';
import { AreaId } from '@contracts/areas';

interface AreaGuardProps {
  children: React.ReactNode;
}

/**
 * Protege las rutas por area segun los permisos del usuario.
 */
const AreaGuard: React.FC<AreaGuardProps> = ({ children }) => {
  const { areaId } = useParams<{ areaId: string }>();
  const { hasAccessToArea, loading, areas } = useAreas();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!areaId || !hasAccessToArea(areaId as AreaId)) {
    if (areas.length > 0) {
      return <Navigate to={`/app/area/${areas[0]}`} replace />;
    }

    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
};

export default AreaGuard;
