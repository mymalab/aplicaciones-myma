import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@shared/api-client/supabase';
import SidebarSettingsButton from '@shared/layout/SidebarSettingsButton';
import SidebarSettingsModal from '@shared/layout/SidebarSettingsModal';
import { notebookLMChat, notebookLMCreate } from '../utils/routes';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView?: 'list' | 'create' | 'chat';
  hideOnDesktop?: boolean;
}

const NotebookLMSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeView,
  hideOnDesktop = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isChatRoute = location.pathname.includes('/area/notebooklm/chat');
  const isCreateRoute =
    location.pathname.includes('/area/notebooklm') && !isChatRoute;
  const isCreateActive = activeView === 'create' || isCreateRoute;
  const isChatActive = activeView === 'chat' || isChatRoute;

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error obteniendo usuario:', error);
      }
    };

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const handleCreateClick = () => {
    navigate(notebookLMCreate());
    onClose();
  };

  const handleChatClick = () => {
    navigate(notebookLMChat());
    onClose();
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setShowUserMenu(false);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
      alert('Error al cerrar sesion. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

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
            <div className="flex flex-col items-center justify-center">
              <div
                className="size-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-lg border-2 border-teal-600"
                title="MyMA - NotebookLM"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>

            <nav className="flex flex-col gap-3 w-full px-3">
              <button
                type="button"
                onClick={handleCreateClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isCreateActive
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Crear Notebook"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none ${isCreateActive ? 'fill' : ''}`}>
                  add_notes
                </span>
                <span
                  className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                    isCreateActive
                      ? 'bg-primary text-white opacity-0 group-hover:opacity-100'
                      : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  Crear Notebook
                </span>
              </button>

              <button
                type="button"
                onClick={handleChatClick}
                className={`group flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors relative ${
                  isChatActive
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Chat expertos"
              >
                <span
                  className={`material-symbols-outlined text-2xl pointer-events-none ${
                    isChatActive ? 'fill' : ''
                  }`}
                >
                  forum
                </span>
                <span
                  className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                    isChatActive
                      ? 'bg-primary text-white opacity-0 group-hover:opacity-100'
                      : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                  }`}
                >
                  Chat expertos
                </span>
              </button>
            </nav>
          </div>

          <div className="w-full px-3 flex flex-col gap-2">
            <SidebarSettingsButton
              onClick={() => {
                setShowUserMenu(false);
                setShowSettingsModal(true);
              }}
            />
            <div className="relative w-full" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((previous) => !previous)}
                className="group flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors relative"
                title={user ? `Usuario: ${user.email}` : 'Cerrar sesion'}
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

              {showUserMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-teal-50 to-blue-50">
                    <p className="font-semibold text-[#111318] truncate">
                      {user?.user_metadata?.full_name || 'Usuario'}
                    </p>
                    <p className="text-sm text-[#616f89] truncate mt-1">{user?.email}</p>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium">Cerrando sesion...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">logout</span>
                          <span className="font-medium">Cerrar sesion</span>
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
    </>
  );
};

export default NotebookLMSidebar;
