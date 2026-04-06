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
import { adendasList, adendasPrompts, adendasReporte } from '../utils/routes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView?: 'list' | 'create' | 'edit' | 'prompts';
  hideOnDesktop?: boolean;
}

const AdendasSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, hideOnDesktop = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.ADENDAS);
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isReporteRoute = location.pathname.includes('/reporte');
  const isPromptsRoute = location.pathname.includes('/prompts');
  const isListRoute =
    location.pathname.includes('/adendas') &&
    !location.pathname.includes('/create') &&
    !location.pathname.includes('/edit') &&
    !isReporteRoute &&
    !isPromptsRoute;
  const isListActive =
    !isReporteRoute &&
    !isPromptsRoute &&
    (activeView === 'list' || (!activeView && isListRoute));
  const isReporteActive = isReporteRoute;
  const isPromptsActive = isPromptsRoute || activeView === 'prompts';

  // Obtener información del usuario y verificar si es admin del módulo de Adendas
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setPendingRequestsCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Actualizar contador periódicamente si es admin de Adendas
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

  const handleListClick = () => {
    navigate(adendasList());
    onClose();
  };

  const handleReporteClick = () => {
    navigate(adendasReporte());
    onClose();
  };

  const handlePromptsClick = () => {
    navigate(adendasPrompts());
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
      navigate('/login');
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
          position: 'fixed',
        }}
      >
        <div className="flex h-full flex-col justify-between py-6 w-full items-center">
          <div className="flex flex-col gap-6 w-full items-center">
            {/* Logo MyMA */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="size-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-lg border-2 border-teal-600"
                title="MyMA - Adendas"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-3 w-full px-3">
              {/* Adendas List */}
              <button
                onClick={handleListClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isListActive
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Adendas"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isListActive ? 'fill' : ''}`}>
                  edit_document
                </span>
                <span
                  className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                    isListActive
                      ? 'bg-primary text-white opacity-0 group-hover:opacity-100'
                      : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  Adendas
                </span>
              </button>

              {/* Reporte */}
              <button
                onClick={handleReporteClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isReporteActive
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Reporte"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isReporteActive ? 'fill' : ''}`}>
                  bar_chart
                </span>
                <span
                  className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                    isReporteActive
                      ? 'bg-primary text-white opacity-0 group-hover:opacity-100'
                      : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  Reporte
                </span>
              </button>

              {/* Prompts */}
              <button
                onClick={handlePromptsClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isPromptsActive
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Gestion de prompts"
              >
                <span
                  className={`material-symbols-outlined text-2xl pointer-events-none ${
                    isPromptsActive ? 'fill' : ''
                  }`}
                >
                  psychology
                </span>
                <span
                  className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                    isPromptsActive
                      ? 'bg-primary text-white opacity-0 group-hover:opacity-100'
                      : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  Prompts IA
                </span>
              </button>

              {/* Solicitudes de acceso (solo para admins) */}
              {isAdmin && (
                <button 
                  onClick={() => setShowAccessRequestsModal(true)}
                  className="group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative text-[#616f89] hover:bg-gray-100"
                  title="Solicitudes de acceso pendientes"
                >
                  <span className="material-symbols-outlined text-2xl pointer-events-none relative">
                    gavel
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                      </span>
                    )}
                  </span>
                  <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                    Solicitudes de acceso
                    {pendingRequestsCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </span>
                </button>
              )}
            </nav>
          </div>

          {/* User Menu / Logout Button */}
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
              className="group flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors relative"
              title={user ? `Usuario: ${user.email}` : 'Cerrar Sesión'}
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                {user?.user_metadata?.full_name || user?.email || 'Usuario'}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                {/* User Info */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-teal-50 to-blue-50">
                  <div className="flex items-center gap-3">
                    {user?.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center border-2 border-white shadow-sm">
                        <span className="text-white text-lg font-semibold">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#111318] truncate">
                        {user?.user_metadata?.full_name || 'Usuario'}
                      </p>
                      <p className="text-sm text-[#616f89] truncate">{user?.email}</p>
                      {user?.user_metadata?.hd && (
                        <p className="text-xs text-teal-600 mt-1 truncate">{user.user_metadata.hd}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">Cerrando sesión...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-medium">Cerrar Sesión</span>
                      </>
                    )}
                  </button>
                </div>
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
      <AccessRequestsModal
        isOpen={showAccessRequestsModal}
        onClose={() => {
          setShowAccessRequestsModal(false);
          // Actualizar contador al cerrar
          if (isAdmin) {
            fetchPendingAccessRequests().then((requests) => {
              setPendingRequestsCount(requests.length);
            });
          }
        }}
      />
    </>
  );
};

export default AdendasSidebar;
