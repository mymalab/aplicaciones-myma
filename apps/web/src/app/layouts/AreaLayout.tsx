import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import AreaSelector from '@shared/rbac/AreaSelector';

// Importar sidebars de cada área dinámicamente
import AcreditacionSidebar from '@areas/acreditacion/components/Sidebar';
import ProveedoresSidebar from '@areas/proveedores/components/Sidebar';
import PersonasSidebar from '@areas/personas/components/Sidebar';
import AdendasSidebar from '@areas/adendas/components/Sidebar';

interface AreaLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout que envuelve el contenido de un área específica
 * Renderiza el sidebar correspondiente al área
 */
const AreaLayout: React.FC<AreaLayoutProps> = ({ children }) => {
  const { areaId } = useParams<{ areaId: string }>();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Determinar la vista activa basada en la ruta
  const getActiveView = (): 'list' | 'create' | 'fieldRequest' | 'reports' | 'dashboards' | 'dashboard' | 'actuales' | 'evaluacion' | 'evaluacion-2025' | 'evaluaciones-tabla' | 'catalogo-servicios' | 'catalogo-especialidades' | 'directorio' | 'experiencia-profesional' | 'formacion-academica' | 'organigrama' | 'curriculum' | 'edit' | 'prompts' => {
    const path = location.pathname;
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboards')) return 'dashboards';
    if (path.includes('/field-request')) return 'fieldRequest';
    if (path.includes('/requests/create') || path.includes('/requests/edit')) return 'create';
    if (path.includes('/prompts')) return 'prompts';
    if (path.includes('/evaluaciones-tabla')) return 'evaluaciones-tabla';
    if (path.includes('/catalogo-especialidades')) return 'catalogo-especialidades';
    if (path.includes('/catalogo-servicios')) return 'catalogo-servicios';
    if (path.includes('/servicios-evaluados')) return 'dashboard'; // Servicios evaluados ahora está en dashboard
    if (path.includes('/actuales')) return 'actuales';
    if (path.includes('/evaluacion-2025')) return 'evaluacion-2025';
    if (path.includes('/evaluacion')) return 'evaluacion';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/curriculum')) return 'curriculum';
    if (path.includes('/organigrama')) return 'organigrama';
    if (path.includes('/formacion-academica')) return 'formacion-academica';
    if (path.includes('/experiencia-profesional')) return 'experiencia-profesional';
    if (path.includes('/directorio')) return 'directorio';
    if (path.includes('/edit')) return 'edit';
    if (path.includes('/create')) return 'create';
    return 'list';
  };

  // Renderizar el sidebar correspondiente al área
  const renderSidebar = () => {
    if (!areaId) return null;

    switch (areaId as AreaId) {
      case AreaId.ACREDITACION:
        return (
          <AcreditacionSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeView={getActiveView() as any}
            hideOnDesktop={isFilterSidebarOpen}
          />
        );
      case AreaId.PROVEEDORES:
        return (
          <ProveedoresSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeView={getActiveView() as any}
            hideOnDesktop={isFilterSidebarOpen}
          />
        );
      case AreaId.PERSONAS:
        return (
          <PersonasSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeView={getActiveView() as any}
            hideOnDesktop={isFilterSidebarOpen}
          />
        );
      case AreaId.ADENDAS:
        return (
          <AdendasSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeView={getActiveView() as any}
            hideOnDesktop={isFilterSidebarOpen}
          />
        );
      // Agregar más casos para otras áreas cuando se implementen
      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-row">
      {renderSidebar()}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600">menu</span>
        </button>
        <h2 className="text-lg font-semibold text-[#111318]">MyMA</h2>
        <div className="w-10"></div>
      </div>

      <main
        className={`flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc] pt-[60px] lg:pt-0 overflow-x-hidden ${
          !isFilterSidebarOpen ? 'lg:ml-[80px]' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default AreaLayout;
