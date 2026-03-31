import React, { useEffect, useMemo, useState } from 'react';
import { AreaId } from '@contracts/areas';
import { usePermissions } from '@shared/rbac/usePermissions';
import {
  ServicioCatalogoDisponible,
  createServicioCatalogoDisponible,
  deleteServicioCatalogoDisponible,
  fetchEspecialidades,
  fetchServiciosCatalogoDisponibles,
  updateServicioCatalogoDisponible,
} from '../services/proveedoresService';
import { normalizeSearchText } from '../utils/search';

type ModalMode = 'create' | 'edit';
type ServicioCatalogoVisual = Omit<ServicioCatalogoDisponible, 'especialidad'> & {
  especialidadRaw: unknown;
  especialidades: string[];
};

const getEspecialidadesFromJsonb = (value: unknown): string[] => {
  const values: string[] = [];

  const pushValue = (input: unknown): void => {
    if (input === null || input === undefined) return;

    if (Array.isArray(input)) {
      input.forEach(pushValue);
      return;
    }

    if (typeof input === 'object') {
      const record = input as Record<string, unknown>;
      const priorityKeys = ['especialidad', 'especialidades', 'values', 'value', 'items', 'lista'];
      const key = priorityKeys.find((k) => k in record);

      if (key) {
        pushValue(record[key]);
      } else {
        Object.values(record).forEach(pushValue);
      }
      return;
    }

    if (typeof input !== 'string') {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) return;

    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        pushValue(parsed);
        return;
      } catch {
        // Si no es JSON valido, se trata como texto plano.
      }
    }

    values.push(trimmed);
  };

  pushValue(value);

  return Array.from(new Set(values));
};

const ServiciosCatalogoGestion: React.FC = () => {
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.PROVEEDORES);
  const [servicios, setServicios] = useState<ServicioCatalogoDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState('Todas');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedServicio, setSelectedServicio] = useState<ServicioCatalogoVisual | null>(null);
  const [formServicio, setFormServicio] = useState('');
  const [formEspecialidades, setFormEspecialidades] = useState<string[]>([]);
  const [searchEspecialidadModal, setSearchEspecialidadModal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [servicioToDelete, setServicioToDelete] = useState<ServicioCatalogoVisual | null>(null);

  const canCreate = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:create`);
  const canEdit = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:edit`);
  const canDelete = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:delete`);

  const loadServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchServiciosCatalogoDisponibles();
      setServicios(data);
    } catch (err) {
      console.error('Error al cargar catalogo base de servicios:', err);
      setError('Error al cargar el catalogo de servicios. Intenta nuevamente.');
      setServicios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        loadServicios(),
        (async () => {
          try {
            setLoadingEspecialidades(true);
            const data = await fetchEspecialidades();
            const names = data.map((item) => item.nombre);
            setEspecialidades(names);
          } catch (err) {
            console.error('Error al cargar especialidades para catalogo de servicios:', err);
            setEspecialidades([]);
          } finally {
            setLoadingEspecialidades(false);
          }
        })(),
      ]);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEspecialidad]);

  const serviciosVisuales = useMemo<ServicioCatalogoVisual[]>(() => {
    return servicios.map((item) => ({
      ...item,
      especialidadRaw: item.especialidad,
      especialidades: getEspecialidadesFromJsonb(item.especialidad),
    }));
  }, [servicios]);

  const especialidadesEnCatalogo = useMemo(() => {
    return Array.from(
      new Set(
        serviciosVisuales
          .flatMap((item) => item.especialidades)
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));
  }, [serviciosVisuales]);

  const filteredServicios = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return serviciosVisuales.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearchText(item.servicio).includes(normalizedSearch) ||
        item.especialidades.some((especialidad) =>
          normalizeSearchText(especialidad).includes(normalizedSearch)
        );

      const matchesEspecialidad =
        filterEspecialidad === 'Todas' || item.especialidades.includes(filterEspecialidad);

      return matchesSearch && matchesEspecialidad;
    });
  }, [serviciosVisuales, searchTerm, filterEspecialidad]);

  const totalPages = Math.max(1, Math.ceil(filteredServicios.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  const getEspecialidadColor = (especialidad: string) => {
    const colorPalette = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-lime-100 text-lime-700 border-lime-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-violet-100 text-violet-700 border-violet-200',
      'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      'bg-stone-100 text-stone-700 border-stone-200',
    ];

    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const hash = hashString(especialidad.toLowerCase());
    const colorIndex = hash % colorPalette.length;
    return colorPalette[colorIndex];
  };
  const especialidadesFiltradasModal = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchEspecialidadModal);
    if (!normalizedSearch) return especialidades;

    return especialidades.filter((especialidad) =>
      normalizeSearchText(especialidad).includes(normalizedSearch)
    );
  }, [especialidades, searchEspecialidadModal]);

  const toggleEspecialidadSelection = (especialidad: string) => {
    setFormEspecialidades((prev) => {
      if (prev.includes(especialidad)) {
        return prev.filter((item) => item !== especialidad);
      }
      return [...prev, especialidad];
    });
  };

  const removeEspecialidadSelection = (especialidad: string) => {
    setFormEspecialidades((prev) => prev.filter((item) => item !== especialidad));
  };

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setIsModalOpen(false);
    setSelectedServicio(null);
    setFormServicio('');
    setFormEspecialidades([]);
    setSearchEspecialidadModal('');
    setFormError(null);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedServicio(null);
    setFormServicio('');
    setFormEspecialidades([]);
    setSearchEspecialidadModal('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServicioCatalogoVisual) => {
    setModalMode('edit');
    setSelectedServicio(item);
    setFormServicio(item.servicio);
    setFormEspecialidades(getEspecialidadesFromJsonb(item.especialidadRaw));
    setSearchEspecialidadModal('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const servicio = formServicio.trim();
    const especialidadesSeleccionadas = Array.from(
      new Set(formEspecialidades.map((item) => item.trim()).filter(Boolean))
    );

    if (!servicio || especialidadesSeleccionadas.length === 0) {
      setFormError('Debes completar servicio y al menos una especialidad.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (modalMode === 'create') {
        await createServicioCatalogoDisponible({ servicio, especialidad: especialidadesSeleccionadas });
      } else {
        if (!selectedServicio) {
          setFormError('No se encontro el registro a editar.');
          return;
        }

        await updateServicioCatalogoDisponible(selectedServicio.id, {
          servicio,
          especialidad: especialidadesSeleccionadas,
        });
      }

      await loadServicios();
      closeModal(true);
    } catch (err: any) {
      console.error('Error guardando servicio en catalogo base:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible guardar el servicio.';
      setFormError(backendMessage);
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: ServicioCatalogoVisual) => {
    if (!canDelete || deletingId !== null) return;
    setServicioToDelete(item);
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) return;
    setServicioToDelete(null);
  };

  const handleDelete = async () => {
    if (!canDelete || deletingId !== null || !servicioToDelete) return;

    try {
      setDeletingId(servicioToDelete.id);
      await deleteServicioCatalogoDisponible(servicioToDelete.id);
      await loadServicios();
      setServicioToDelete(null);
    } catch (err: any) {
      console.error('Error eliminando servicio del catalogo base:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible eliminar el servicio.';
      setError(backendMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const especialidadesServicioAEliminar = servicioToDelete
    ? getEspecialidadesFromJsonb(servicioToDelete.especialidadRaw)
    : [];
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Catalogo de Servicios
              </h1>
              <p className="text-sm text-gray-500">
                Gestion de servicios base desde la tabla dim_core_proveedores_servicios.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canCreate || loadingPermissions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nuevo Servicio</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="Nombre del servicio o especialidad"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">ESPECIALIDAD</label>
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas las especialidades</option>
                {especialidadesEnCatalogo.map((especialidad) => (
                  <option key={especialidad} value={especialidad}>
                    {especialidad}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando catalogo de servicios...</p>
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
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CREADO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACTUALIZADO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServicios.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          {servicios.length === 0
                            ? 'No hay servicios registrados en el catalogo.'
                            : 'No hay resultados para los filtros aplicados.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedServicios.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 text-sm text-[#111318] font-medium">{item.servicio}</td>
                          <td className="py-4 px-6">
                            {item.especialidades.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.especialidades.map((especialidad) => (
                                  <span
                                    key={item.id + '-' + especialidad}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEspecialidadColor(especialidad)}`}
                                  >
                                    {especialidad}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">{formatDate(item.created_at)}</td>
                          <td className="py-4 px-6 text-sm text-gray-600">{formatDate(item.updated_at)}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                disabled={!canEdit || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Editar servicio"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete(item)}
                                disabled={!canDelete || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar servicio"
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

              {filteredServicios.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredServicios.length)} de{' '}
                    {filteredServicios.length} resultados
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
          <p>© {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>

      {servicioToDelete && (
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
                <h3 className="text-lg font-semibold text-[#111318] mb-1">Eliminar servicio del catalogo</h3>
                <p className="text-sm text-gray-600">
                  Se eliminara el registro del servicio{' '}
                  <span className="font-semibold">"{servicioToDelete.servicio}"</span> (
                  <span className="font-semibold">{especialidadesServicioAEliminar.join(', ') || 'Sin especialidad'}</span>). Esta accion no
                  se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] text-sm font-medium"
                disabled={deletingId === servicioToDelete.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deletingId === servicioToDelete.id}
              >
                {deletingId === servicioToDelete.id ? 'Eliminando...' : 'Eliminar definitivamente'}
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
                  {modalMode === 'create' ? 'Nuevo servicio del catalogo' : 'Editar servicio del catalogo'}
                </h3>
                <p className="text-sm text-gray-500">
                  {modalMode === 'create'
                    ? 'Agrega un nuevo registro en dim_core_proveedores_servicios.'
                    : 'Actualiza el servicio y su especialidad.'}
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
                  Servicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formServicio}
                  onChange={(e) => setFormServicio(e.target.value)}
                  placeholder="Nombre del servicio"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidades <span className="text-red-500">*</span>
                </label>
                {loadingEspecialidades ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                    Cargando especialidades...
                  </div>
                ) : especialidades.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        search
                      </span>
                      <input
                        type="text"
                        value={searchEspecialidadModal}
                        onChange={(e) => setSearchEspecialidadModal(e.target.value)}
                        placeholder="Buscar especialidad"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>

                    <div className="min-h-[2.5rem] border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      {formEspecialidades.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formEspecialidades.map((especialidad) => (
                            <span
                              key={especialidad}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getEspecialidadColor(especialidad)}`}
                            >
                              {especialidad}
                              <button
                                type="button"
                                onClick={() => removeEspecialidadSelection(especialidad)}
                                className="inline-flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                                aria-label={`Quitar ${especialidad}`}
                              >
                                <span className="material-symbols-outlined text-sm leading-none">close</span>
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No hay especialidades seleccionadas.</p>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                        {especialidadesFiltradasModal.length > 0 ? (
                          especialidadesFiltradasModal.map((especialidad) => {
                            const isSelected = formEspecialidades.includes(especialidad);
                            return (
                              <label
                                key={especialidad}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleEspecialidadSelection(especialidad)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-[#111318]">{especialidad}</span>
                              </label>
                            );
                          })
                        ) : (
                          <p className="px-3 py-3 text-sm text-gray-500">No se encontraron especialidades.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formEspecialidades.join(', ')}
                    onChange={(e) =>
                      setFormEspecialidades(
                        e.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Escribe especialidades separadas por coma"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                )}
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
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear servicio' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiciosCatalogoGestion;
