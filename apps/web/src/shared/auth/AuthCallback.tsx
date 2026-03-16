import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api-client/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Escuchar cambios en la autenticación - Supabase procesa automáticamente el hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        if (mounted) {
          // Limpiar la URL removiendo los parámetros de autenticación
          window.history.replaceState({}, document.title, '/auth/callback');
          // Redirigir al dashboard/app
          navigate('/app', { replace: true });
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          navigate('/login', { replace: true });
        }
      }
    });

    // Verificar si hay un error en la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    const errorParam = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
    
    if (errorParam) {
      console.error('Error en callback de OAuth:', errorParam, errorDescription);
      setError(errorDescription || errorParam);
      timeoutId = setTimeout(() => {
        if (mounted) {
          navigate('/login', { replace: true });
        }
      }, 5000);
    } else {
      // Timeout de seguridad: si después de 10 segundos no hay sesión, mostrar error
      timeoutId = setTimeout(async () => {
        if (mounted) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('Timeout: No se pudo obtener la sesión después del callback');
            setError('No se pudo iniciar sesión. Por favor, intente nuevamente.');
            setTimeout(() => {
              if (mounted) {
                navigate('/login', { replace: true });
              }
            }, 3000);
          }
        }
      }, 10000);
    }

    // Cleanup
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111318] mb-4">Error de Autenticación</h2>
          <p className="text-[#616f89] mb-6">{error}</p>
          <p className="text-sm text-[#616f89]">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-600">Procesando autenticación...</p>
        <p className="text-sm text-gray-500 mt-2">Por favor, espera un momento</p>
      </div>
    </div>
  );
};

export default AuthCallback;











