import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import RequestList from './RequestList';
import RequestForm from './RequestForm';
import FieldRequestForm from './FieldRequestForm';
import ProjectGalleryV2 from './ProjectGalleryV2';
import DashboardView from './DashboardView';
import { RequestItem, NewRequestPayload, ProjectGalleryItem } from '../types';
import { 
  fetchPersonaRequerimientos, 
  createPersonaRequerimiento, 
  updatePersonaRequerimiento,
  deletePersonaRequerimiento,
  checkUserIsAdmin,
  fetchProjectGalleryItems
} from '../services/supabaseService';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [editingItem, setEditingItem] = useState<RequestItem | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [projects, setProjects] = useState<ProjectGalleryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPersonaRequerimientos();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert('Error al cargar las solicitudes. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await fetchProjectGalleryItems();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      alert('Error al cargar los proyectos. Por favor, intente nuevamente.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleEdit = (item: RequestItem) => {
    setEditingItem(item);
    navigate('/app/requests/edit');
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    navigate('/app/requests/create');
  };

  const handleNavigateToList = () => {
    setEditingItem(null);
    navigate('/app/requests');
  };

  const handleNavigateToFieldRequest = () => {
    setEditingItem(null);
    navigate('/app/field-request');
  };

  const handleNavigateToReports = () => {
    setEditingItem(null);
    navigate('/app/reports');
    // Cargar proyectos cuando se navega a reportes
    loadProjects();
  };

  const handleNavigateToDashboards = () => {
    setEditingItem(null);
    navigate('/app/dashboards');
  };

  const handleSave = async (data: NewRequestPayload) => {
    console.log('🔥 handleSave recibió:', data);
    console.log('🔥 Estado en data:', data.estado);
    
    try {
      if (editingItem && editingItem.id) {
        console.log('✏️ Editando registro ID:', editingItem.id);
        // Actualizar registro existente
        await updatePersonaRequerimiento(
          parseInt(editingItem.id),
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.estado,
          data.link
        );
      } else {
        // Crear nuevo registro
        await createPersonaRequerimiento(
          data.persona_id,
          data.requerimiento_id,
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.link
        );
      }
      
      // Recargar la lista
      await loadRequests();
      setEditingItem(null);
      navigate('/app/requests');
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Error al guardar la solicitud. Por favor, intente nuevamente.');
    }
  };

  const handleDelete = async () => {
    if (!editingItem || !editingItem.id) {
      return;
    }

    try {
      // Verificar si el usuario es admin
      const isAdmin = await checkUserIsAdmin();
      
      if (!isAdmin) {
        alert('No tienes permisos para eliminar registros. Solo los administradores pueden realizar esta acción.');
        return;
      }
      
      // Eliminar el registro (solo admin puede hacerlo)
      await deletePersonaRequerimiento(parseInt(editingItem.id));
      
      console.log('✅ Registro eliminado (usuario admin)');
      
      // Recargar la lista
      await loadRequests();
      setEditingItem(null);
      navigate('/app/requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud. Por favor, intente nuevamente.');
    }
  };

  // Determinar la vista activa basada en la ruta
  const getActiveView = (): 'list' | 'create' | 'fieldRequest' | 'reports' | 'dashboards' | 'login' => {
    const path = location.pathname;
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/dashboards')) return 'dashboards';
    if (path.includes('/field-request')) return 'fieldRequest';
    if (path.includes('/requests/create') || path.includes('/requests/edit')) return 'create';
    return 'list';
  };

  return (
    <div className="relative flex min-h-screen w-full flex-row">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigateToRequests={handleNavigateToList}
        onNavigateToFieldRequest={handleNavigateToFieldRequest}
        onNavigateToReports={handleNavigateToReports}
        onNavigateToDashboards={handleNavigateToDashboards}
        onNavigateToLogin={() => navigate('/login')}
        activeView={getActiveView()}
        hideOnDesktop={isFilterSidebarOpen}
      />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600">menu</span>
        </button>
        <h2 className="text-lg font-semibold text-[#111318]">Gestión de Solicitudes</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <main className={`flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc] pt-[60px] lg:pt-0 overflow-x-hidden ${!isFilterSidebarOpen ? 'lg:ml-[80px]' : ''}`}>
        <Routes>
          <Route 
            path="/requests" 
            element={
              loading ? (
                <div className="flex items-center justify-center h-full min-h-screen">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-gray-600">Cargando solicitudes...</p>
                  </div>
                </div>
              ) : (
                <RequestList 
                  requests={requests} 
                  onCreateNew={handleCreateNew} 
                  onEdit={handleEdit}
                />
              )
            } 
          />
          <Route 
            path="/requests/create" 
            element={
              <RequestForm 
                onBack={() => navigate('/app/requests')} 
                onSave={handleSave} 
                initialData={null}
              />
            } 
          />
          <Route 
            path="/requests/edit" 
            element={
              editingItem ? (
                <RequestForm 
                  onBack={() => navigate('/app/requests')} 
                  onSave={handleSave}
                  onDelete={handleDelete}
                  initialData={editingItem}
                />
              ) : (
                <Navigate to="/app/requests" replace />
              )
            } 
          />
          <Route 
            path="/field-request" 
            element={
              <FieldRequestForm 
                onBack={() => navigate('/app/requests')} 
              />
            } 
          />
          <Route 
            path="/reports" 
            element={
              loadingProjects ? (
                <div className="flex items-center justify-center h-full min-h-screen">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-gray-600">Cargando proyectos...</p>
                  </div>
                </div>
              ) : (
                <ProjectGalleryV2 
                  projects={projects}
                  onProjectUpdate={loadProjects}
                  onFilterSidebarChange={setIsFilterSidebarOpen}
                />
              )
            } 
          />
          <Route 
            path="/dashboards" 
            element={<DashboardView />} 
          />
          <Route path="/" element={<Navigate to="/app/requests" replace />} />
          <Route path="*" element={<Navigate to="/app/requests" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AppContent;

