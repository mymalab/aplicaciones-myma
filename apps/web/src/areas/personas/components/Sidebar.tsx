import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@shared/api-client/supabase';
import type { User } from '@supabase/supabase-js';
import { AreaId } from '@contracts/areas';
import { usePermissions } from '@shared/rbac/usePermissions';
import {
  getUserPermissions,
  hasAnyAdminPermission,
} from '@shared/rbac/permissionsService';
import { fetchPendingAccessRequests } from '@shared/rbac/accessRequestsService';
import AccessRequestsModal from '@shared/rbac/AccessRequestsModal';
import SidebarSettingsButton from '@shared/layout/SidebarSettingsButton';
import SidebarSettingsModal from '@shared/layout/SidebarSettingsModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView?: 'dashboard' | 'directorio' | 'experiencia-profesional' | 'formacion-academica' | 'organigrama' | 'curriculum';
  hideOnDesktop?: boolean;
}

const PersonasSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, hideOnDesktop = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.PERSONAS);
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDashboardActive = activeView === 'dashboard' || location.pathname.includes('/dashboard');
  const isDirectorioActive = activeView === 'directorio' || location.pathname.includes('/directorio');
  const isExperienciaProfesionalActive = activeView === 'experiencia-profesional' || location.pathname.includes('/experiencia-profesional');
  const isFormacionAcademicaActive = activeView === 'formacion-academica' || location.pathname.includes('/formacion-academica');
  const isOrganigramaActive = activeView === 'organigrama' || location.pathname.includes('/organigrama');
  const isCurriculumActive = activeView === 'curriculum' || location.pathname.includes('/curriculum');

  // Construir rutas del área
  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PERSONAS}/${path}`;
  };

  // Obtener información del usuario y verificar si es admin del módulo de Personas
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Verificar si el usuario tiene al menos un rol admin en cualquier modulo
        if (user) {
          const permissions = await getUserPermissions();
          const canManageAccess = hasAnyAdminPermission(permissions);
          setIsAdmin(canManageAccess);

          // Si puede gestionar accesos, cargar el total de solicitudes pendientes gestionables
          if (canManageAccess) {
            const requests = await fetchPendingAccessRequests();
            setPendingRequestsCount(requests.length);
          } else {
            setPendingRequestsCount(0);
          }
        } else {
          setIsAdmin(false);
          setPendingRequestsCount(0);
        }
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    };

    getUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getUser();
      } else {
        setIsAdmin(false);
        setPendingRequestsCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Actualizar contador periódicamente si es admin de Personas
  useEffect(() => {
    if (!isAdmin) return;

    const updateCount = async () => {
      try {
        const requests = await fetchPendingAccessRequests();
        setPendingRequestsCount(requests.length);
      } catch (error) {
        console.error('Error updating requests count:', error);
      }
    };

    // Actualizar inmediatamente y luego cada 30 segundos
    updateCount();
    const interval = setInterval(updateCount, 30000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  // Cerrar el menú cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleDirectorioClick = () => {
    navigate(getAreaPath('directorio'));
    onClose();
  };

  const handleLogoutClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 flex-col border-r border-[#e5e7eb] bg-white
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : hideOnDesktop ? '-translate-x-full' : '-translate-x-full lg:translate-x-0'}
          flex
        `}
        style={{ 
          zIndex: 9999, 
          width: '80px', 
          minWidth: '80px', 
          maxWidth: '80px',
          height: '100vh',
          position: 'fixed'
        }}
      >
        <div className="flex h-full flex-col justify-between py-6 w-full items-center">
          <div className="flex flex-col gap-6 w-full items-center">
            {/* Logo MyMA */}
            <div className="flex flex-col items-center justify-center">
              <div 
                className="size-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-lg border-2 border-teal-600"
                title="MyMA - Sistema de Gestión"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex flex-col gap-3 w-full px-3">
              {/* Dashboard */}
              <button 
                onClick={() => {
                  navigate(getAreaPath('dashboard'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isDashboardActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Dashboard Ejecutivo"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isDashboardActive ? 'fill' : ''}`}>dashboard</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isDashboardActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Dashboard
                </span>
              </button>
              
              {/* Directorio */}
              <button 
                onClick={handleDirectorioClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isDirectorioActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Directorio"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isDirectorioActive ? 'fill' : ''}`}>people</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isDirectorioActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Directorio
                </span>
              </button>
              
              {/* Experiencia Profesional */}
              <button 
                onClick={() => {
                  navigate(getAreaPath('experiencia-profesional'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isExperienciaProfesionalActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Experiencia Profesional"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isExperienciaProfesionalActive ? 'fill' : ''}`}>work_history</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isExperienciaProfesionalActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Experiencia Profesional
                </span>
              </button>
              
              {/* Formación Académica */}
              <button 
                onClick={() => {
                  navigate(getAreaPath('formacion-academica'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isFormacionAcademicaActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Formación Académica"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isFormacionAcademicaActive ? 'fill' : ''}`}>school</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isFormacionAcademicaActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Formación Académica
                </span>
              </button>
              
              {/* Organigrama */}
              <button 
                onClick={() => {
                  navigate(getAreaPath('organigrama'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isOrganigramaActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Organigrama"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isOrganigramaActive ? 'fill' : ''}`}>account_tree</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isOrganigramaActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Organigrama
                </span>
              </button>
              
              {/* Currículo */}
              <button 
                onClick={() => {
                  navigate(getAreaPath('curriculum'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isCurriculumActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Currículo"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isCurriculumActive ? 'fill' : ''}`}>description</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isCurriculumActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Currículo
                </span>
              </button>
            </nav>
          </div>

          {/* User Menu */}
          <div className="w-full px-3 flex flex-col gap-2">
            <SidebarSettingsButton
              onClick={() => {
                setShowUserMenu(false);
                setShowSettingsModal(true);
              }}
            />
            <div className="relative w-full" ref={menuRef}>
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors relative group"
              title={user?.email || 'Usuario'}
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.email || 'Usuario'}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              {isAdmin && pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.user_metadata?.full_name || 'Administrador'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">MyMA Chile</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowAccessRequestsModal(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Solicitudes de acceso</span>
                    {pendingRequestsCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cerrando sesión...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">logout</span>
                      <span>Cerrar sesión</span>
                    </>
                  )}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </aside>

      <SidebarSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Modal de solicitudes de acceso */}
      {showAccessRequestsModal && (
        <AccessRequestsModal
          isOpen={showAccessRequestsModal}
          onClose={() => {
            setShowAccessRequestsModal(false);
            if (isAdmin) {
              fetchPendingAccessRequests().then((requests) => {
                setPendingRequestsCount(requests.length);
              });
            }
          }}
        />
      )}
    </>
  );
};

export default PersonasSidebar;
