import { useEffect, useState } from 'react';
import { supabase } from '../api-client/supabase';
import {
  getUserPermissions,
  hasAnyModuleAccessPermissions,
  PermissionsByModule,
} from './permissionsService';
import { getCachedPermissions, saveCachedPermissions, clearCachedPermissions } from './permissionsCache';

/**
 * Hook para verificar si el usuario tiene permisos en algun modulo
 * Retorna true si tiene al menos un permiso efectivo en algun modulo
 * Usa cache en sessionStorage para evitar verificaciones innecesarias
 */
export const useHasPermissions = () => {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setHasPermissions(false);
          setPermissions({});
          setLoading(false);
          return;
        }

        const cached = getCachedPermissions(user.id);
        if (cached) {
          console.log('Usando permisos desde cache');
          setHasPermissions(cached.hasPermissions);
          setPermissions(cached.permissions);
          setLoading(false);
          return;
        }

        console.log('Consultando permisos desde la base de datos');
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);

        const hasAnyPermission = hasAnyModuleAccessPermissions(userPermissions);

        setHasPermissions(hasAnyPermission);
        saveCachedPermissions(user.id, hasAnyPermission, userPermissions);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermissions(false);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    void checkPermissions();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCachedPermissions();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    hasPermissions,
    loading,
    permissions,
  };
};
