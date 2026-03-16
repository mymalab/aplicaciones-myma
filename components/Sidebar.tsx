import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import type { User } from '@supabase/supabase-js';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToFieldRequest?: () => void;
  onNavigateToReports?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToDashboards?: () => void;
  activeView?: 'list' | 'create' | 'fieldRequest' | 'reports' | 'login' | 'dashboards';
  hideOnDesktop?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToRequests, onNavigateToFieldRequest, onNavigateToReports, onNavigateToLogin, onNavigateToDashboards, activeView, hideOnDesktop = false }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isRequestsActive = activeView === 'list' || activeView === 'create';
  const isFieldRequestActive = activeView === 'fieldRequest';
  const isReportsActive = activeView === 'reports';
  const isDashboardsActive = activeView === 'dashboards';

  // Obtener información del usuario
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    };

    getUser();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  const handleRequestsClick = () => {
    console.log('🖱️ Click en Solicitudes detectado!');
    if (onNavigateToRequests) {
      onNavigateToRequests();
    }
    onClose();
  };

  const handleFieldRequestClick = () => {
    console.log('🖱️ Click en Proyectos detectado!');
    if (onNavigateToFieldRequest) {
      onNavigateToFieldRequest();
    }
    onClose();
  };

  const handleReportsClick = () => {
    console.log('🖱️ Click en Reportes detectado!');
    if (onNavigateToReports) {
      onNavigateToReports();
    }
    onClose();
  };

  const handleDashboardsClick = () => {
    console.log('🖱️ Click en Gráficos detectado!');
    if (onNavigateToDashboards) {
      onNavigateToDashboards();
    }
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
              {/* Solicitudes */}
              <button 
                onClick={handleRequestsClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isRequestsActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Solicitudes"
              >
                <span className={`material-symbols-outlined fill text-2xl pointer-events-none ${isRequestsActive ? 'fill' : ''}`}>description</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isRequestsActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Solicitudes
                </span>
              </button>
              
              {/* Proyectos */}
              <button 
                onClick={handleFieldRequestClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isFieldRequestActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Proyectos"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isFieldRequestActive ? 'fill' : ''}`}>engineering</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isFieldRequestActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Proyectos
                </span>
              </button>
              
              {/* Reportes */}
              <button 
                onClick={handleReportsClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isReportsActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Reportes"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isReportsActive ? 'fill' : ''}`}>assessment</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isReportsActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Reportes
                </span>
              </button>
              
              {/* Gráficos */}
              <button 
                onClick={handleDashboardsClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isDashboardsActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Gráficos"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isDashboardsActive ? 'fill' : ''}`}>bar_chart</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isDashboardsActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Gráficos
                </span>
              </button>
            </nav>
          </div>
          
          {/* User Menu / Logout Button */}
          <div className="w-full px-3 relative" ref={menuRef}>
            <button 
              onClick={handleLogoutClick}
              className="group flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors relative" 
              title={user ? `Usuario: ${user.email}` : "Cerrar Sesión"}
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
                      <p className="text-sm text-[#616f89] truncate">
                        {user?.email}
                      </p>
                      {user?.user_metadata?.hd && (
                        <p className="text-xs text-teal-600 mt-1 truncate">
                          {user.user_metadata.hd}
                        </p>
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
      </aside>
    </>
  );
};

export default Sidebar;
