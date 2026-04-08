import { useEffect, useRef, useState } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';
import {
  getUserPermissions,
  hasAreaAccess,
  hasAnyModuleAccessPermissions,
  PermissionsByModule,
} from './permissionsService';
import { getCachedPermissions, saveCachedPermissions, clearCachedPermissions } from './permissionsCache';

export interface UserArea {
  areaId: AreaId;
  permissions: string[];
}

const DEBUG_RBAC = import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.log(...args);
  }
};

const debugWarn = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.warn(...args);
  }
};

const AREAS_WITHOUT_RBAC: AreaId[] = [AreaId.NOTEBOOKLM];

const getAllowedAreas = (userPermissions: PermissionsByModule): AreaId[] => {
  const allowedAreas: AreaId[] = [];

  (Object.values(AreaId) as AreaId[]).forEach((areaId) => {
    if (AREAS_WITHOUT_RBAC.includes(areaId)) {
      allowedAreas.push(areaId);
      debugLog(`Area ${areaId} permitida sin RBAC`);
      return;
    }

    const hasAccess = hasAreaAccess(userPermissions, areaId);

    debugLog(`Verificando área ${areaId}:`, {
      hasAccess,
      modulePermissions: userPermissions[areaId.toLowerCase()],
    });

    if (hasAccess) {
      allowedAreas.push(areaId);
    } else {
      debugWarn(`Área ${areaId} sin acceso (sin permiso view)`);
    }
  });

  debugLog('Áreas permitidas finales:', allowedAreas);
  return allowedAreas;
};

/**
 * Hook para obtener las áreas permitidas para el usuario actual
 * Basado en permisos de v_my_permissions
 */
export const useAreas = () => {
  const [areas, setAreas] = useState<AreaId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});
  const currentUserIdRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const fetchUserAreas = async (options?: { showLoading?: boolean; clearError?: boolean }) => {
      const showLoading = options?.showLoading ?? true;
      const clearError = options?.clearError ?? true;

      try {
        if (!mounted) return;
        if (showLoading) {
          setLoading(true);
        }
        if (clearError) {
          setError(null);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          currentUserIdRef.current = null;
          setAreas([]);
          setPermissions({});
          if (showLoading) {
            setLoading(false);
          }
          return;
        }

        currentUserIdRef.current = user.id;

        let userPermissions: PermissionsByModule;
        const cached = getCachedPermissions(user.id);

        if (cached) {
          debugLog('Usando permisos desde caché');
          userPermissions = cached.permissions;
        } else {
          debugLog('No hay caché, consultando permisos desde la base de datos');
          userPermissions = await getUserPermissions();

          const hasAnyPermission = hasAnyModuleAccessPermissions(userPermissions);

          saveCachedPermissions(user.id, hasAnyPermission, userPermissions);
        }

        if (!mounted) return;

        setPermissions(userPermissions);
        setAreas(getAllowedAreas(userPermissions));
        hasLoadedRef.current = true;
      } catch (err: any) {
        console.error('Error fetching user areas:', err);
        if (!mounted) return;
        setError(err?.message || 'Error al cargar áreas permitidas');
        setAreas(getAllowedAreas({}));
      } finally {
        if (mounted && showLoading) {
          setLoading(false);
        }
      }
    };

    void fetchUserAreas();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        clearCachedPermissions();
        currentUserIdRef.current = null;
        hasLoadedRef.current = false;
        setAreas([]);
        setPermissions({});
        setError(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        const nextUserId = session?.user?.id;
        if (!nextUserId) return;

        // Supabase puede emitir SIGNED_IN al volver al foco; ignorar si ya cargamos al mismo usuario.
        if (hasLoadedRef.current && currentUserIdRef.current === nextUserId) {
          debugLog('Ignorando SIGNED_IN duplicado para el mismo usuario');
          return;
        }

        void fetchUserAreas({ showLoading: false, clearError: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasAccessToArea = (areaId: AreaId): boolean => {
    return areas.includes(areaId);
  };

  const getAreaInfo = (areaId: AreaId) => {
    return AREAS[areaId];
  };

  const getModulePermissions = (moduleCode: string) => {
    return permissions[moduleCode.toLowerCase()] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
  };

  return {
    areas,
    loading,
    error,
    permissions,
    hasAccessToArea,
    getAreaInfo,
    getModulePermissions,
  };
};
