import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/auth/useAuth';

interface AppShellHeaderProps {
  beforeUserContent?: React.ReactNode;
}

const AppShellHeader: React.FC<AppShellHeaderProps> = ({ beforeUserContent }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      setIsUserMenuOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
      alert('No pudimos cerrar sesion. Intenta nuevamente.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 shadow-sm">
      <div className="mx-auto w-full max-w-7xl flex items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          {beforeUserContent}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((previous) => !previous)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
              title={user ? `Usuario: ${user.email}` : 'Cuenta'}
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
              <span className="text-sm text-[#616f89] hidden md:block max-w-[240px] truncate">
                {user?.user_metadata?.full_name || user?.email || 'Usuario'}
              </span>
              <span className="material-symbols-outlined text-base text-gray-400 hidden md:block">
                {isUserMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-[90]">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-teal-50 to-blue-50">
                  <p className="font-semibold text-[#111318] truncate">
                    {user?.user_metadata?.full_name || 'Usuario'}
                  </p>
                  <p className="text-sm text-[#616f89] truncate mt-1">{user?.email}</p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSigningOut ? (
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
    </header>
  );
};

export default AppShellHeader;
