import React, { useEffect, useState } from 'react';
import { AreaId } from '@contracts/areas';
import { useAreas } from './useAreas';
import { fetchUserPermissions } from './permissionsService';

interface PermissionsDebugProps {
  variant?: 'floating' | 'inline';
  defaultExpanded?: boolean;
}

const PermissionsDebug: React.FC<PermissionsDebugProps> = ({
  variant = 'floating',
  defaultExpanded = false,
}) => {
  const { areas, permissions, loading } = useAreas();
  const [rawPermissions, setRawPermissions] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    const loadRawPermissions = async () => {
      const raw = await fetchUserPermissions();
      setRawPermissions(raw);
    };

    void loadRawPermissions();
  }, []);

  const isFloating = variant === 'floating';
  const loadingWrapperClass = isFloating
    ? 'fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs z-50'
    : 'bg-white border border-gray-200 rounded-xl shadow-sm p-3 text-xs';
  const wrapperClass = isFloating
    ? 'fixed bottom-4 right-4 bg-white border-2 border-blue-300 rounded-lg shadow-xl p-4 text-xs z-50 max-w-md'
    : 'bg-white border border-blue-200 rounded-xl shadow-sm p-4 text-xs';

  if (loading) {
    return (
      <div className={loadingWrapperClass}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          <span>Cargando permisos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 font-semibold text-blue-700 hover:text-blue-900"
      >
        <span>Debug: Permisos del usuario</span>
        <span className="material-symbols-outlined text-sm">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div>
            <div className="font-semibold text-gray-700 mb-1">Areas visibles:</div>
            <div className="flex flex-wrap gap-1">
              {areas.length > 0 ? (
                areas.map((areaId) => (
                  <span
                    key={areaId}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                  >
                    {areaId}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">Ninguna</span>
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-700 mb-1">Permisos por modulo:</div>
            <div className="space-y-2">
              {Object.keys(permissions).length > 0 ? (
                Object.entries(permissions).map(([module, perms]) => {
                  const modulePermissions = perms as {
                    view?: boolean;
                    create?: boolean;
                    edit?: boolean;
                    delete?: boolean;
                    admin?: boolean;
                    acreditar?: boolean;
                  };

                  return (
                    <div key={module} className="bg-gray-50 p-2 rounded">
                      <div className="font-medium text-gray-800 mb-1">{module}:</div>
                      <div className="flex flex-wrap gap-1">
                        {modulePermissions.view && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">view</span>
                        )}
                        {modulePermissions.create && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">create</span>
                        )}
                        {modulePermissions.edit && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">edit</span>
                        )}
                        {modulePermissions.delete && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">delete</span>
                        )}
                        {modulePermissions.admin && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">admin</span>
                        )}
                        {modulePermissions.acreditar && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">acreditar</span>
                        )}
                        {!modulePermissions.view &&
                          !modulePermissions.create &&
                          !modulePermissions.edit &&
                          !modulePermissions.delete &&
                          !modulePermissions.admin &&
                          !modulePermissions.acreditar && (
                            <span className="text-gray-400 text-xs">Sin permisos</span>
                          )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-gray-500">No hay permisos configurados</span>
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-700 mb-1">Raw de v_my_permissions:</div>
            <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
              {rawPermissions.length > 0 ? (
                <pre className="text-xs text-gray-600">{JSON.stringify(rawPermissions, null, 2)}</pre>
              ) : (
                <span className="text-gray-500">No hay datos</span>
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold text-gray-700 mb-1">Verificacion de acceso:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.ACREDITACION) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.ACREDITACION) ? 'SI' : 'NO'}
                </span>
                <span>Acreditaciones: {areas.includes(AreaId.ACREDITACION) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.PROVEEDORES) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.PROVEEDORES) ? 'SI' : 'NO'}
                </span>
                <span>Proveedores: {areas.includes(AreaId.PROVEEDORES) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.PERSONAS) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.PERSONAS) ? 'SI' : 'NO'}
                </span>
                <span>Personas: {areas.includes(AreaId.PERSONAS) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.ADENDAS) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.ADENDAS) ? 'SI' : 'NO'}
                </span>
                <span>Adendas: {areas.includes(AreaId.ADENDAS) ? 'Visible' : 'Oculta'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsDebug;
