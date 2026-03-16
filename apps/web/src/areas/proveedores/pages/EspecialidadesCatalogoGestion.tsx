import React, { useEffect, useMemo, useState } from 'react';
import { AreaId } from '@contracts/areas';
import { usePermissions } from '@shared/rbac/usePermissions';
import {
  createEspecialidad,
  deleteEspecialidad,
  fetchEspecialidades,
  updateEspecialidad,
} from '../services/proveedoresService';
import { normalizeSearchText } from '../utils/search';

type ModalMode = 'create' | 'edit';

interface EspecialidadItem {
  id: number;
  nombre: string;
}

const EspecialidadesCatalogoGestion: React.FC = () => {
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.PROVEEDORES);

  const [especialidades, setEspecialidades] = useState<EspecialidadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<EspecialidadItem | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [especialidadToDelete, setEspecialidadToDelete] = useState<EspecialidadItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canCreate = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:create`);
  const canEdit = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:edit`);
  const canDelete = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:delete`);

  const loadEspecialidades = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEspecialidades();
      setEspecialidades(data);
    } catch (err) {
      console.error('Error al cargar catalogo de especialidades:', err);
      setError('Error al cargar el catalogo de especialidades. Intenta nuevamente.');
      setEspecialidades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEspecialidades();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredEspecialidades = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    if (!normalizedSearch) {
      return especialidades;
    }

    return especialidades.filter((item) =>
      normalizeSearchText(item.nombre).includes(normalizedSearch)
    );
  }, [especialidades, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredEspecialidades.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEspecialidades = filteredEspecialidades.slice(startIndex, endIndex);

  const closeModal = (force = false) => {
    if (saving && !force) return;

    setIsModalOpen(false);
    setModalMode('create');
    setSelectedEspecialidad(null);
    setFormNombre('');
    setFormError(null);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedEspecialidad(null);
    setFormNombre('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EspecialidadItem) => {
    setModalMode('edit');
    setSelectedEspecialidad(item);
    setFormNombre(item.nombre);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = formNombre.trim();
    if (!nombre) {
      setFormError('Debes ingresar un nombre para la especialidad.');
      return;
    }

    const nombreNormalized = normalizeSearchText(nombre);
    const exists = especialidades.some((item) => {
      const sameName = normalizeSearchText(item.nombre) === nombreNormalized;
      const differentRecord = modalMode === 'create' || item.id !== selectedEspecialidad?.id;
      return sameName && differentRecord;
    });

    if (exists) {
      setFormError('Ya existe una especialidad con ese nombre.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (modalMode === 'create') {
        await createEspecialidad(nombre);
      } else {
        if (!selectedEspecialidad) {
          setFormError('No se encontro el registro a editar.');
          return;
        }

        await updateEspecialidad(selectedEspecialidad.id, nombre);
      }

      await loadEspecialidades();
      closeModal(true);
    } catch (err: any) {
      console.error('Error guardando especialidad:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible guardar la especialidad.';
      setFormError(backendMessage);
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: EspecialidadItem) => {
    if (!canDelete || deletingId !== null) return;
    setEspecialidadToDelete(item);
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) return;
    setEspecialidadToDelete(null);
  };

  const handleDelete = async () => {
    if (!canDelete || deletingId !== null || !especialidadToDelete) return;

    try {
      setDeletingId(especialidadToDelete.id);
      await deleteEspecialidad(especialidadToDelete.id);
      await loadEspecialidades();
      setEspecialidadToDelete(null);
    } catch (err: any) {
      console.error('Error eliminando especialidad:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible eliminar la especialidad.';
      setError(backendMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Catalogo de Especialidades
              </h1>
              <p className="text-sm text-gray-500">
                Gestion de especialidades base desde la tabla dim_core_especialidad.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canCreate || loadingPermissions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nueva Especialidad</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre de la especialidad"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando catalogo de especialidades...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEspecialidades.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-12 text-center text-gray-500">
                          {especialidades.length === 0
                            ? 'No hay especialidades registradas en el catalogo.'
                            : 'No hay resultados para los filtros aplicados.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedEspecialidades.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 text-sm text-[#111318] font-medium">{item.nombre}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                disabled={!canEdit || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Editar especialidad"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete(item)}
                                disabled={!canDelete || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar especialidad"
                              >
                                <span className="material-symbols-outlined text-lg">
                                  {deletingId === item.id ? 'hourglass_top' : 'delete'}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredEspecialidades.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEspecialidades.length)} de{' '}
                    {filteredEspecialidades.length} resultados
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="text-sm text-gray-700 px-2">
                      Pagina {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>(c) {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>

      {especialidadToDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0">
                <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#111318] mb-1">Eliminar especialidad</h3>
                <p className="text-sm text-gray-600">
                  Se eliminara el registro de la especialidad{' '}
                  <span className="font-semibold">"{especialidadToDelete.nombre}"</span>. Esta accion no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] text-sm font-medium"
                disabled={deletingId === especialidadToDelete.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deletingId === especialidadToDelete.id}
              >
                {deletingId === especialidadToDelete.id ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => closeModal()}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  {modalMode === 'create' ? 'Nueva especialidad' : 'Editar especialidad'}
                </h3>
                <p className="text-sm text-gray-500">
                  {modalMode === 'create'
                    ? 'Agrega un nuevo registro en dim_core_especialidad.'
                    : 'Actualiza el nombre de la especialidad.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeModal()}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Nombre de la especialidad"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear especialidad' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EspecialidadesCatalogoGestion;
