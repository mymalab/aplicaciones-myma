import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessRequest,
  ManagedUserModulePermission,
  PermissionLevel,
  PermissionType,
  approveAccessRequest,
  fetchManagedUsersPermissions,
  fetchManageableModuleCodes,
  fetchPendingAccessRequests,
  rejectAccessRequest,
  revokeManagedUserModuleAccess,
  updateManagedUserPermissionLevel,
} from './accessRequestsService';
import { formatModuleName } from './modulesService';

interface AccessRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'pending' | 'permissions';
type EditUserPanel = 'manage' | 'add';

interface UserPermissionsGroup {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  permissions: ManagedUserModulePermission[];
}

const ACREDITACION_MODULE_CODE = 'acreditacion';

const getPermissionLevelLabel = (level: PermissionLevel): string => {
  if (level === 'admin') return 'Admin';
  if (level === 'acreditar') return 'Acreditar';
  if (level === 'editor') return 'Editor';
  return 'Viewer';
};

const getPermissionTypeLabel = (permission: PermissionType): string => {
  if (permission === 'admin') return 'Admin';
  if (permission === 'acreditar') return 'Acreditar';
  if (permission === 'edit') return 'Editor';
  return 'Viewer';
};

const getAvailablePermissionLevels = (moduleCode: string): PermissionLevel[] => {
  if (moduleCode.toLowerCase().trim() === ACREDITACION_MODULE_CODE) {
    return ['viewer', 'editor', 'acreditar', 'admin'];
  }

  return ['viewer', 'editor', 'admin'];
};

const getAvailableApprovalPermissions = (moduleCode: string): PermissionType[] => {
  if (moduleCode.toLowerCase().trim() === ACREDITACION_MODULE_CODE) {
    return ['edit', 'acreditar', 'admin'];
  }

  return ['edit', 'admin'];
};

const getUserDisplayName = (
  userName: string | null,
  userEmail: string | null,
  _userId: string
): string => {
  if (userName) return userName;
  if (userEmail) return userEmail;
  return 'Usuario sin nombre';
};

const AccessRequestsModal: React.FC<AccessRequestsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [tab, setTab] = useState<Tab>('pending');

  const [pending, setPending] = useState<AccessRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<ManagedUserModulePermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const [manageableModules, setManageableModules] = useState<string[]>([]);

  const [search, setSearch] = useState('');

  const [approveRequest, setApproveRequest] = useState<AccessRequest | null>(null);
  const [approvePermissions, setApprovePermissions] = useState<PermissionType[]>([
    'view',
  ]);

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserPanel, setEditUserPanel] = useState<EditUserPanel>('manage');
  const [draftLevelsByModule, setDraftLevelsByModule] = useState<
    Record<string, PermissionLevel>
  >({});
  const [draftRevokeRoleByModule, setDraftRevokeRoleByModule] = useState<
    Record<string, string>
  >({});
  const [addModuleCode, setAddModuleCode] = useState('');
  const [addLevel, setAddLevel] = useState<PermissionLevel>('viewer');

  const [processingPermissionKey, setProcessingPermissionKey] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) return;

    setTab('pending');
    setSearch('');
    setEditUserId(null);
    setEditUserPanel('manage');
    setDraftLevelsByModule({});
    setDraftRevokeRoleByModule({});
    setAddModuleCode('');
    setAddLevel('viewer');

    void Promise.all([
      loadPending(),
      loadPermissions(),
      loadManageableModules(),
    ]);
  }, [isOpen]);

  const loadPending = async () => {
    try {
      setLoadingPending(true);
      setPendingError(null);
      setPending(await fetchPendingAccessRequests());
    } catch (error) {
      console.error('Error loading pending access requests:', error);
      setPendingError('Error al cargar solicitudes pendientes.');
    } finally {
      setLoadingPending(false);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      setPermissionsError(null);
      setPermissions(await fetchManagedUsersPermissions());
    } catch (error) {
      console.error('Error loading managed permissions:', error);
      setPermissionsError('Error al cargar permisos actuales.');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const loadManageableModules = async () => {
    try {
      const modules = await fetchManageableModuleCodes();
      setManageableModules(modules.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading manageable modules:', error);
      setManageableModules([]);
    }
  };

  const openApproveModal = (request: AccessRequest) => {
    setApproveRequest(request);
    setApprovePermissions(['view']);
  };

  const toggleApprovePermission = (permission: PermissionType) => {
    setApprovePermissions((current) => {
      if (permission === 'view') return current;
      if (current.includes(permission)) {
        return current.filter((item) => item !== permission);
      }
      return [...current, permission];
    });
  };

  const submitApprove = async () => {
    if (!approveRequest) return;

    try {
      setProcessingRequestId(approveRequest.id);
      await approveAccessRequest(approveRequest.id, approvePermissions);
      setApproveRequest(null);
      await Promise.all([loadPending(), loadPermissions()]);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('No se pudo aprobar la solicitud.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const submitReject = async (request: AccessRequest) => {
    const confirmed = window.confirm(
      'Esta accion rechazara la solicitud de acceso. Deseas continuar?'
    );
    if (!confirmed) return;

    try {
      setProcessingRequestId(request.id);
      await rejectAccessRequest(request.id);
      await loadPending();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('No se pudo rechazar la solicitud.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const usersById = useMemo(() => {
    const grouped = new Map<string, UserPermissionsGroup>();

    permissions.forEach((entry) => {
      if (!grouped.has(entry.user_id)) {
        grouped.set(entry.user_id, {
          user_id: entry.user_id,
          user_name: entry.user_name,
          user_email: entry.user_email,
          permissions: [],
        });
      }

      grouped.get(entry.user_id)!.permissions.push(entry);
    });

    grouped.forEach((group) => {
      group.permissions.sort((a, b) =>
        a.module_code.localeCompare(b.module_code)
      );
    });

    return grouped;
  }, [permissions]);

  const userGroups = useMemo(() => {
    return Array.from(usersById.values()).sort((a, b) => {
      const labelA = (a.user_name || a.user_email || '').toLowerCase();
      const labelB = (b.user_name || b.user_email || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [usersById]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return userGroups;

    return userGroups.filter((user) => {
      const haystack = `${user.user_name || ''} ${user.user_email || ''} ${user.user_id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [userGroups, search]);

  const selectedUser = useMemo(() => {
    if (!editUserId) return null;
    return usersById.get(editUserId) || null;
  }, [editUserId, usersById]);

  const selectedUserRoleCodes = useMemo(() => {
    if (!selectedUser) return [];
    return Array.from(
      new Set(selectedUser.permissions.flatMap((entry) => entry.role_codes))
    ).sort();
  }, [selectedUser]);

  useEffect(() => {
    if (!editUserId) return;

    const user = usersById.get(editUserId);
    if (!user) return;

    const nextDrafts: Record<string, PermissionLevel> = {};
    const nextRevokeRoleDrafts: Record<string, string> = {};

    user.permissions.forEach((entry) => {
      nextDrafts[entry.module_code] = entry.level;

      if (entry.role_codes.length > 0) {
        nextRevokeRoleDrafts[entry.module_code] = entry.role_codes[0];
      }
    });

    setDraftLevelsByModule(nextDrafts);
    setDraftRevokeRoleByModule(nextRevokeRoleDrafts);
  }, [editUserId, usersById]);

  const addableModules = useMemo(() => {
    if (!selectedUser) return manageableModules;
    const assigned = new Set(selectedUser.permissions.map((entry) => entry.module_code));
    return manageableModules.filter((moduleCode) => !assigned.has(moduleCode));
  }, [manageableModules, selectedUser]);

  useEffect(() => {
    if (!editUserId) return;

    if (addableModules.length > 0) {
      setAddModuleCode((current) => {
        if (current && addableModules.includes(current)) return current;
        return addableModules[0];
      });
    } else {
      setAddModuleCode('');
    }
  }, [editUserId, addableModules]);

  useEffect(() => {
    if (!addModuleCode) return;

    const availableLevels = getAvailablePermissionLevels(addModuleCode);
    if (!availableLevels.includes(addLevel)) {
      setAddLevel(availableLevels[0]);
    }
  }, [addModuleCode, addLevel]);

  const submitUpdateModulePermission = async (
    entry: ManagedUserModulePermission
  ) => {
    if (!selectedUser) return;

    const targetLevel = draftLevelsByModule[entry.module_code] || entry.level;
    const key = `update:${selectedUser.user_id}:${entry.module_code}`;

    try {
      setProcessingPermissionKey(key);
      await updateManagedUserPermissionLevel({
        userId: selectedUser.user_id,
        moduleCode: entry.module_code,
        level: targetLevel,
      });
      await loadPermissions();
    } catch (error: any) {
      console.error('Error updating module permission:', error);
      alert(error?.message || 'No se pudo actualizar el permiso.');
    } finally {
      setProcessingPermissionKey(null);
    }
  };

  const submitRevokeModulePermission = async (
    entry: ManagedUserModulePermission
  ) => {
    if (!selectedUser) return;

    const selectedRoleCode =
      draftRevokeRoleByModule[entry.module_code] || entry.role_codes[0] || '';

    if (!selectedRoleCode) {
      alert('No hay un rol seleccionado para revocar.');
      return;
    }

    const confirmed = window.confirm(
      `Se revocara el rol ${selectedRoleCode} del modulo ${formatModuleName(entry.module_code)} para ${getUserDisplayName(
        selectedUser.user_name,
        selectedUser.user_email,
        selectedUser.user_id
      )}. Deseas continuar?`
    );
    if (!confirmed) return;

    const key = `revoke:${selectedUser.user_id}:${entry.module_code}:${selectedRoleCode}`;

    try {
      setProcessingPermissionKey(key);
      await revokeManagedUserModuleAccess({
        userId: selectedUser.user_id,
        moduleCode: entry.module_code,
        roleCode: selectedRoleCode,
      });
      await loadPermissions();
    } catch (error: any) {
      console.error('Error revoking module permission:', error);
      alert(error?.message || 'No se pudo revocar el permiso.');
    } finally {
      setProcessingPermissionKey(null);
    }
  };

  const submitAddModulePermission = async () => {
    if (!selectedUser || !addModuleCode) return;

    const key = `add:${selectedUser.user_id}:${addModuleCode}`;

    try {
      setProcessingPermissionKey(key);
      await updateManagedUserPermissionLevel({
        userId: selectedUser.user_id,
        moduleCode: addModuleCode,
        level: addLevel,
      });
      await loadPermissions();
    } catch (error: any) {
      console.error('Error adding module permission:', error);
      alert(error?.message || 'No se pudo agregar el permiso.');
    } finally {
      setProcessingPermissionKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestion de accesos</h2>
              <p className="text-sm text-gray-500">Solicitudes y permisos actuales</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="px-6 py-3 border-b border-gray-200 flex gap-2">
            <button
              onClick={() => setTab('pending')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                tab === 'pending' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Pendientes ({pending.length})
            </button>
            <button
              onClick={() => setTab('permissions')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                tab === 'permissions' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Permisos por persona ({userGroups.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === 'pending' && (
              <>
                {loadingPending && <p className="text-sm text-gray-600">Cargando solicitudes...</p>}
                {pendingError && <p className="text-sm text-red-600">{pendingError}</p>}
                {!loadingPending && !pendingError && pending.length === 0 && (
                  <p className="text-sm text-gray-600">No hay solicitudes pendientes.</p>
                )}

                <div className="space-y-3">
                  {pending.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {getUserDisplayName(
                            request.user_name || null,
                            request.user_email || null,
                            request.user_id
                          )}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {request.user_email || 'Sin correo'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Modulo: {formatModuleName(request.modulo_solicitado)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openApproveModal(request)}
                          disabled={processingRequestId === request.id}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => submitReject(request)}
                          disabled={processingRequestId === request.id}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'permissions' && (
              <>
                <div className="mb-5">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por persona (nombre o correo)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {loadingPermissions && <p className="text-sm text-gray-600">Cargando permisos...</p>}
                {permissionsError && <p className="text-sm text-red-600">{permissionsError}</p>}
                {!loadingPermissions && !permissionsError && filteredUsers.length === 0 && (
                  <p className="text-sm text-gray-600">No hay usuarios para mostrar.</p>
                )}

                <div className="space-y-4">
                  {filteredUsers.map((user) => {
                    const allRoleCodes = Array.from(
                      new Set(user.permissions.flatMap((entry) => entry.role_codes))
                    ).sort();

                    return (
                      <div
                        key={user.user_id}
                        className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-gray-900 truncate">
                              {getUserDisplayName(user.user_name, user.user_email, user.user_id)}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {user.user_email || 'Sin correo'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setEditUserPanel('manage');
                              setEditUserId(user.user_id);
                            }}
                            className="px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700"
                          >
                            Editar permisos
                          </button>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600">Modulos y nivel actual</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {user.permissions.map((entry) => (
                              <span
                                key={`${user.user_id}-${entry.module_code}-level`}
                                className="text-xs px-2.5 py-1 rounded-md bg-[#e9f7f4] text-[#0f766e] border border-[#cdeee7]"
                              >
                                {formatModuleName(entry.module_code)} - {getPermissionLevelLabel(entry.level)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-600">Roles asignados</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {allRoleCodes.map((roleCode) => (
                              <span
                                key={`${user.user_id}-${roleCode}`}
                                className="text-xs px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700"
                              >
                                {roleCode}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {approveRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setApproveRequest(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Aprobar solicitud</h3>
            <p className="text-sm text-gray-600">
              Usuario:{' '}
              {getUserDisplayName(
                approveRequest.user_name || null,
                approveRequest.user_email || null,
                approveRequest.user_id
              )}
            </p>
            <p className="text-sm text-gray-600">
              Modulo: {formatModuleName(approveRequest.modulo_solicitado)}
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked readOnly />
                <span>Viewer (requerido)</span>
              </label>
              {getAvailableApprovalPermissions(approveRequest.modulo_solicitado).map(
                (permission) => (
                  <label
                    key={`approve-option-${permission}`}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={approvePermissions.includes(permission)}
                      onChange={() => toggleApprovePermission(permission)}
                    />
                    <span>{getPermissionTypeLabel(permission)}</span>
                  </label>
                )
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setApproveRequest(null)}
                className="px-3 py-2 bg-gray-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={submitApprove}
                className="px-3 py-2 bg-green-600 text-white rounded-lg"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => { setEditUserPanel('manage'); setEditUserId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-blue-50">
              <h3 className="text-xl font-semibold text-gray-900">Editar permisos por modulo</h3>
              <p className="text-sm text-gray-600 mt-1">
                {getUserDisplayName(
                  selectedUser.user_name,
                  selectedUser.user_email,
                  selectedUser.user_id
                )}
                {' - '}
                {selectedUser.user_email || 'Sin correo'}
              </p>
            </div>

            <div className="border-b border-gray-200 px-5 py-3 bg-white">
              <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 gap-1">
                <button
                  onClick={() => setEditUserPanel('manage')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    editUserPanel === 'manage'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Gestionar permisos
                </button>
                <button
                  onClick={() => setEditUserPanel('add')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    editUserPanel === 'add'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Agregar modulo
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="border border-teal-100 rounded-xl bg-teal-50/70 p-4">
                <h4 className="text-sm font-semibold text-teal-800 mb-2">
                  Roles actuales del usuario
                </h4>
                {selectedUserRoleCodes.length === 0 ? (
                  <p className="text-sm text-teal-700">Sin roles asignados.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedUserRoleCodes.map((roleCode) => (
                      <span
                        key={`${selectedUser.user_id}-summary-${roleCode}`}
                        className="text-xs px-2.5 py-1 rounded-md bg-white border border-teal-200 text-teal-800"
                      >
                        {roleCode}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {editUserPanel === 'manage' ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Permisos actuales</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Actualiza niveles por modulo o revoca un rol especifico sin afectar los demas.
                  </p>
                  <div className="space-y-3 mt-3">
                    {selectedUser.permissions.length === 0 && (
                      <p className="text-sm text-gray-500">El usuario no tiene permisos asignados.</p>
                    )}

                    {selectedUser.permissions.map((entry) => {
                      const updateKey = `update:${selectedUser.user_id}:${entry.module_code}`;
                      const selectedRevokeRoleCode =
                        draftRevokeRoleByModule[entry.module_code] || entry.role_codes[0] || '';
                      const revokeKey = `revoke:${selectedUser.user_id}:${entry.module_code}:${selectedRevokeRoleCode}`;
                      const updating = processingPermissionKey === updateKey;
                      const revoking = processingPermissionKey === revokeKey;
                      const currentDraft = draftLevelsByModule[entry.module_code] || entry.level;

                      return (
                        <div
                          key={`${selectedUser.user_id}-${entry.module_code}`}
                          className="border border-gray-200 rounded-xl p-4 bg-white"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatModuleName(entry.module_code)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Nivel actual: {getPermissionLevelLabel(entry.level)}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {entry.role_codes.map((roleCode) => (
                                  <span
                                    key={`${selectedUser.user_id}-${entry.module_code}-${roleCode}`}
                                    className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700"
                                  >
                                    {roleCode}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="w-full xl:w-[380px] space-y-3">
                              <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                                <p className="text-xs font-semibold text-blue-800">Actualizar nivel del modulo</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <select
                                    value={currentDraft}
                                    onChange={(event) =>
                                      setDraftLevelsByModule((prev) => ({
                                        ...prev,
                                        [entry.module_code]: event.target.value as PermissionLevel,
                                      }))
                                    }
                                    className="px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm flex-1 min-w-[170px]"
                                    disabled={updating || revoking}
                                  >
                                    {getAvailablePermissionLevels(entry.module_code).map(
                                      (levelOption) => (
                                        <option key={levelOption} value={levelOption}>
                                          {getPermissionLevelLabel(levelOption)}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <button
                                    onClick={() => submitUpdateModulePermission(entry)}
                                    disabled={updating || revoking}
                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {updating ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>

                              <div className="rounded-lg border border-red-100 bg-red-50/70 p-3">
                                <p className="text-xs font-semibold text-red-800">Revocar rol especifico</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <select
                                    value={selectedRevokeRoleCode}
                                    onChange={(event) =>
                                      setDraftRevokeRoleByModule((prev) => ({
                                        ...prev,
                                        [entry.module_code]: event.target.value,
                                      }))
                                    }
                                    className="px-3 py-2 border border-red-200 rounded-lg bg-white text-sm flex-1 min-w-[220px]"
                                    disabled={updating || revoking || entry.role_codes.length === 0}
                                  >
                                    {entry.role_codes.map((roleCode) => (
                                      <option key={`${selectedUser.user_id}-${entry.module_code}-revoke-${roleCode}`} value={roleCode}>
                                        Revocar {roleCode}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => submitRevokeModulePermission(entry)}
                                    disabled={updating || revoking || !selectedRevokeRoleCode}
                                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {revoking ? 'Revocando...' : 'Revocar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-xl p-4 bg-white">
                    <h4 className="text-sm font-semibold text-gray-700">Agregar permiso a modulo</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecciona un modulo disponible y el nivel de acceso que deseas asignar.
                    </p>
                    {addableModules.length === 0 ? (
                      <p className="text-sm text-gray-500 mt-3">
                        No hay mas modulos disponibles para agregar a este usuario.
                      </p>
                    ) : (
                      <div className="space-y-3 mt-3">
                        <div className="rounded-lg border border-teal-100 bg-teal-50/70 p-3">
                          <p className="text-xs font-semibold text-teal-800">Seleccion de modulo</p>
                          <select
                            value={addModuleCode}
                            onChange={(event) => setAddModuleCode(event.target.value)}
                            className="mt-2 w-full px-3 py-2 border border-teal-200 rounded-lg bg-white text-sm"
                          >
                            {addableModules.map((moduleCode) => (
                              <option key={moduleCode} value={moduleCode}>
                                {formatModuleName(moduleCode)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                          <p className="text-xs font-semibold text-blue-800">Nivel de acceso</p>
                          <select
                            value={addLevel}
                            onChange={(event) => setAddLevel(event.target.value as PermissionLevel)}
                            className="mt-2 w-full px-3 py-2 border border-blue-200 rounded-lg bg-white text-sm"
                          >
                            {getAvailablePermissionLevels(addModuleCode).map((levelOption) => (
                              <option key={`add-level-${levelOption}`} value={levelOption}>
                                {getPermissionLevelLabel(levelOption)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                          <p className="text-xs font-semibold text-emerald-800">Confirmar asignacion</p>
                          <button
                            onClick={submitAddModulePermission}
                            disabled={!addModuleCode || processingPermissionKey === `add:${selectedUser.user_id}:${addModuleCode}`}
                            className="mt-2 px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
                          >
                            {processingPermissionKey === `add:${selectedUser.user_id}:${addModuleCode}`
                              ? 'Agregando...'
                              : 'Agregar permiso'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-700">Modulos asignados actualmente</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedUser.permissions.map((entry) => (
                        <span
                          key={`${selectedUser.user_id}-assigned-${entry.module_code}`}
                          className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700"
                        >
                          {formatModuleName(entry.module_code)} - {getPermissionLevelLabel(entry.level)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setEditUserPanel('manage');
                  setEditUserId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccessRequestsModal;
