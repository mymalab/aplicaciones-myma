import React, { useEffect, useMemo, useState } from 'react';
import { AreaId } from '@contracts/areas';
import { usePermissions } from '@shared/rbac/usePermissions';
import {
  createPromptCatalogItem,
  deletePromptCatalogItem,
  fetchPromptCatalog,
  type PromptCatalogItem,
  updatePromptCatalogItem,
} from '../services/promptCatalogService';

type ModalMode = 'create' | 'edit';
type EstadoFiltro = 'Todos' | 'Activos' | 'Inactivos';

const normalizeSearchText = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const truncateText = (value: string | null | undefined, maxLength: number): string => {
  const safeValue = (value || '').trim();
  if (safeValue.length <= maxLength) {
    return safeValue || '-';
  }

  return `${safeValue.slice(0, maxLength - 1)}...`;
};

const formatDate = (value?: string | null): string => {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const PromptsCatalogoGestion: React.FC = () => {
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.ADENDAS);

  const [prompts, setPrompts] = useState<PromptCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptCatalogItem | null>(null);

  const [formNombrePrompt, setFormNombrePrompt] = useState('');
  const [formVersion, setFormVersion] = useState('1');
  const [formActivo, setFormActivo] = useState(true);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [promptToDelete, setPromptToDelete] = useState<PromptCatalogItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = !loadingPermissions && hasPermission(`${AreaId.ADENDAS}:create`);
  const canEdit = !loadingPermissions && hasPermission(`${AreaId.ADENDAS}:edit`);
  const canDelete = !loadingPermissions && hasPermission(`${AreaId.ADENDAS}:delete`);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPromptCatalog();
      setPrompts(data);
    } catch (err) {
      console.error('Error al cargar dim_prompt:', err);
      setError('Error al cargar el catalogo de prompts. Intenta nuevamente.');
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFiltro]);

  const filteredPrompts = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return prompts.filter((item) => {
      const matchesEstado =
        estadoFiltro === 'Todos' ||
        (estadoFiltro === 'Activos' && item.activo) ||
        (estadoFiltro === 'Inactivos' && !item.activo);

      if (!matchesEstado) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        item.nombre_prompt,
        item.prompt,
        item.descripcion || '',
        String(item.version),
        item.activo ? 'activo' : 'inactivo',
      ]
        .map((value) => normalizeSearchText(value))
        .join(' ');

      return searchableText.includes(normalizedSearch);
    });
  }, [prompts, searchTerm, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrompts = filteredPrompts.slice(startIndex, endIndex);

  const closeModal = (force = false) => {
    if (saving && !force) return;

    setIsModalOpen(false);
    setModalMode('create');
    setSelectedPrompt(null);
    setFormNombrePrompt('');
    setFormVersion('1');
    setFormActivo(true);
    setFormDescripcion('');
    setFormPrompt('');
    setFormError(null);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedPrompt(null);
    setFormNombrePrompt('');
    setFormVersion('1');
    setFormActivo(true);
    setFormDescripcion('');
    setFormPrompt('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PromptCatalogItem) => {
    setModalMode('edit');
    setSelectedPrompt(item);
    setFormNombrePrompt(item.nombre_prompt);
    setFormVersion(String(item.version));
    setFormActivo(item.activo);
    setFormDescripcion(item.descripcion || '');
    setFormPrompt(item.prompt);
    setFormError(null);
    setIsModalOpen(true);
  };

  const buildPayloadFromForm = () => {
    const nombrePrompt = formNombrePrompt.trim();
    const prompt = formPrompt.trim();
    const descripcion = formDescripcion.trim();
    const version = Number(formVersion);

    if (!nombrePrompt) {
      setFormError('Debes ingresar un nombre para el prompt.');
      return null;
    }

    if (nombrePrompt.length > 150) {
      setFormError('El nombre del prompt no puede superar 150 caracteres.');
      return null;
    }

    if (!prompt) {
      setFormError('Debes ingresar el contenido del prompt.');
      return null;
    }

    if (!Number.isFinite(version) || version < 1) {
      setFormError('La version debe ser un numero entero mayor o igual a 1.');
      return null;
    }

    const normalizedName = normalizeSearchText(nombrePrompt);
    const parsedVersion = Math.floor(version);
    const exists = prompts.some((item) => {
      const sameName = normalizeSearchText(item.nombre_prompt) === normalizedName;
      const sameVersion = item.version === parsedVersion;
      const differentRecord = modalMode === 'create' || item.id !== selectedPrompt?.id;
      return sameName && sameVersion && differentRecord;
    });

    if (exists) {
      setFormError('Ya existe un prompt con ese nombre y version.');
      return null;
    }

    return {
      nombre_prompt: nombrePrompt,
      prompt,
      descripcion: descripcion || null,
      version: parsedVersion,
      activo: formActivo,
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildPayloadFromForm();
    if (!payload) {
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      if (modalMode === 'create') {
        await createPromptCatalogItem(payload);
      } else {
        if (!selectedPrompt) {
          setFormError('No se encontro el registro a editar.');
          return;
        }

        await updatePromptCatalogItem(selectedPrompt.id, payload);
      }

      await loadPrompts();
      closeModal(true);
    } catch (err: any) {
      console.error('Error guardando prompt:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible guardar el prompt.';
      setFormError(backendMessage);
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (item: PromptCatalogItem) => {
    if (!canDelete || deletingId !== null) return;
    setPromptToDelete(item);
  };

  const closeDeleteModal = () => {
    if (deletingId !== null) return;
    setPromptToDelete(null);
  };

  const handleDelete = async () => {
    if (!canDelete || deletingId !== null || !promptToDelete) return;

    try {
      setDeletingId(promptToDelete.id);
      await deletePromptCatalogItem(promptToDelete.id);
      await loadPrompts();
      setPromptToDelete(null);
    } catch (err: any) {
      console.error('Error eliminando prompt:', err);
      const backendMessage =
        err?.message && typeof err.message === 'string'
          ? err.message
          : 'No fue posible eliminar el prompt.';
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
                Gestion de Prompts
              </h1>
              <p className="text-sm text-gray-500">
                Administra registros de la tabla dim_prompt para el modulo de Adendas.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canCreate || loadingPermissions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Nuevo Prompt</span>
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
                  placeholder="Nombre, prompt o descripcion"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">ESTADO</label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todos">Todos</option>
                <option value="Activos">Solo activos</option>
                <option value="Inactivos">Solo inactivos</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando catalogo de prompts...</p>
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
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">NOMBRE</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">VERSION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESTADO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">DESCRIPCION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">PROMPT</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACTUALIZADO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrompts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          {prompts.length === 0
                            ? 'No hay prompts registrados en el catalogo.'
                            : 'No hay resultados para los filtros aplicados.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedPrompts.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6 text-sm text-[#111318] font-medium">
                            {truncateText(item.nombre_prompt, 48)}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700">v{item.version}</td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                item.activo
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {item.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700" title={item.descripcion || ''}>
                            {truncateText(item.descripcion, 80)}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700" title={item.prompt}>
                            {truncateText(item.prompt, 120)}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                            {formatDate(item.updated_at || item.created_at)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                disabled={!canEdit || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Editar prompt"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete(item)}
                                disabled={!canDelete || deletingId === item.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar prompt"
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

              {filteredPrompts.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPrompts.length)} de{' '}
                    {filteredPrompts.length} resultados
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
          <p>&copy; {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>

      {promptToDelete && (
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
                <h3 className="text-lg font-semibold text-[#111318] mb-1">Eliminar prompt</h3>
                <p className="text-sm text-gray-600">
                  Se eliminara el registro{' '}
                  <span className="font-semibold">"{truncateText(promptToDelete.nombre_prompt, 60)}"</span>. Esta
                  accion no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] text-sm font-medium"
                disabled={deletingId === promptToDelete.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deletingId === promptToDelete.id}
              >
                {deletingId === promptToDelete.id ? 'Eliminando...' : 'Eliminar definitivamente'}
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
            className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  {modalMode === 'create' ? 'Nuevo prompt' : 'Editar prompt'}
                </h3>
                <p className="text-sm text-gray-500">
                  {modalMode === 'create'
                    ? 'Agrega un nuevo registro en dim_prompt.'
                    : 'Actualiza el contenido del prompt seleccionado.'}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del prompt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formNombrePrompt}
                    onChange={(e) => setFormNombrePrompt(e.target.value)}
                    placeholder="Ej: Resumen ejecutivo IA"
                    maxLength={150}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">{formNombrePrompt.length}/150</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripcion</label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Contexto de uso del prompt (opcional)."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Escribe el prompt completo..."
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  id="prompt-activo"
                  type="checkbox"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="prompt-activo" className="text-sm text-gray-700">
                  Prompt activo
                </label>
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
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear prompt' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptsCatalogoGestion;
