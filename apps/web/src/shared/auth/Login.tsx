import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api-client/supabase';
import type { User } from '@supabase/supabase-js';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Verificar si ya hay una sesión activa
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          // Si ya está autenticado, redirigir a la app
          navigate('/app', { replace: true });
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        }
      } catch (error) {
        console.error('Error verificando usuario:', error);
      }
    };

    checkUser();
    
    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
        navigate('/app', { replace: true });
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, onLoginSuccess]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Redirigir al callback de autenticación después de OAuth
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      console.log('🔗 URL de redirección:', redirectUrl);

      // Iniciar sesión con Google
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: '', // Permite cualquier dominio de Google Workspace (empresarial)
          },
        },
      });

      if (signInError) {
        throw signInError;
      }

      // Si hay una URL de redirección, el navegador será redirigido automáticamente
      // No necesitamos hacer nada más aquí
    } catch (err: any) {
      console.error('Error en login con Google:', err);
      setError(err.message || 'Error al iniciar sesión con Google. Por favor, intente nuevamente.');
      setLoading(false);
    }
  };


  // Si el usuario ya está autenticado, no mostrar el formulario (será redirigido)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-teal-600 to-blue-600 px-8 pt-6 pb-6 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg border-2 border-white/30">
            <span className="text-white font-bold text-2xl tracking-tight">MyMA</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Bienvenido</h1>
          <p className="text-white/90 text-xs">Sistema de Gestión de Acreditaciones</p>
        </div>

        <div className="p-8">
          {/* Descripción profesional */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-teal-600">business</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111318] mb-2">
                  Acceso Corporativo Requerido
                </h2>
                <p className="text-sm text-[#616f89] leading-relaxed">
                  Para acceder a la plataforma MyMA, es necesario iniciar sesión con tu cuenta de Google corporativa (Google Workspace). 
                  Esta medida garantiza la seguridad y el control de acceso a los recursos de la organización.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg flex-shrink-0 mt-0.5">info</span>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Requisito de acceso
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Solo se permiten cuentas de Google Workspace asociadas a tu organización. 
                    Las cuentas personales de Gmail no tienen acceso a esta plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600 flex-shrink-0">error</span>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-4 bg-white border-2 border-gray-300 hover:border-teal-500 text-[#111318] font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:bg-gray-50 group"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#111318] border-t-transparent rounded-full animate-spin"></div>
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continuar con Google Workspace</span>
              </>
            )}
          </button>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-xs text-[#616f89]">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>Acceso seguro y protegido</span>
            </div>
            <p className="text-xs text-center text-[#616f89] mt-3">
              Al continuar, aceptas los términos y condiciones de uso de la plataforma MyMA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;











