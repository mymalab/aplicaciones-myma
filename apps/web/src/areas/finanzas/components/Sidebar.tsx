import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@shared/api-client/supabase';
import type { User } from '@supabase/supabase-js';
import { AreaId } from '@contracts/areas';
import SidebarSettingsButton from '@shared/layout/SidebarSettingsButton';
import SidebarSettingsModal from '@shared/layout/SidebarSettingsModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView?: string;
  hideOnDesktop?: boolean;
}

/**
 * Sidebar del área de Finanzas
 * 
 * Este es un ejemplo mínimo. Personaliza según tus necesidades.
 */
const FinanzasSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, hideOnDesktop = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.FINANZAS}/${path}`;
  };

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setShowUserMenu(false);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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
            {/* Logo */}
            <div className="flex flex-col items-center justify-center">
              <div
                className="size-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-lg border-2 border-teal-600"
                title="MyMA - Finanzas"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-3 w-full px-3">
              <button
                onClick={() => {
                  navigate(getAreaPath('dashboard'));
                  onClose();
                }}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  activeView === 'dashboard'
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Dashboard"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${activeView === 'dashboard' ? 'fill' : ''}`}>
                  account_balance
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
              onClick={() => setShowUserMenu(!showUserMenu)}
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
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined">logout</span>
                    <span className="font-medium">Cerrar Sesión</span>
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
    </>
  );
};

export default FinanzasSidebar;











