import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchProveedorById, ProveedorResponse, fetchEspecialidades, fetchEvaluacionesByRutProveedor, EvaluacionProveedor, fetchServiciosCatalogoByRut, ProveedorServicioCatalogo, fetchServiciosCatalogoDisponibles, ServicioCatalogoDisponible, createProveedorServicioCatalogo, updateProveedorServicioCatalogo, deleteProveedorServicioCatalogo, markProveedorCruceInformacionActualizadaByRut } from '../services/proveedoresService';
import { Clasificacion } from '../types';
import { normalizeSearchText } from '../utils/search';

interface Servicio {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  tarifaRef: number | null;
  ordenCompra: string | null;
  fechaEvaluacion: string | null;
  evaluadorResponsable: string | null;
  estado: 'Vigente' | 'En revisión' | 'Inactivo';
  clasificacion?: 'A' | 'B' | 'C' | null;
  documentacionUrl?: string | null;
  notaTotalPonderada?: number | null;
}

interface ContactoDetalleProveedor {
  nombre: string;
  correo: string;
  telefono: string;
  cargo: string;
}

type ProveedorDetalleView = 'ejecutados' | 'catalogo';

const toPlainObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Si no es JSON valido, retorna objeto vacio.
      }
    }
  }

  return {};
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const toContactoDetalleProveedor = (value: unknown): ContactoDetalleProveedor => {
  const obj = toPlainObject(value);

  return {
    nombre: toText(obj.nombre),
    correo: toText(obj.correo),
    telefono: toText(obj.telefono),
    cargo: toText(obj.cargo),
  };
};

const hasContactoDetalleData = (value: ContactoDetalleProveedor): boolean => {
  return Object.values(value).some((item) => item.trim() !== '');
};

const ProveedorDetalle: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [proveedor, setProveedor] = useState<ProveedorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas las categorías');
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([]);
  const [activeView, setActiveView] = useState<ProveedorDetalleView>('ejecutados');
  const [catalogoServicios, setCatalogoServicios] = useState<ProveedorServicioCatalogo[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [searchCatalogo, setSearchCatalogo] = useState('');
  const [filterEspecialidadCatalogo, setFilterEspecialidadCatalogo] = useState<string>('Todas');
  const [currentPageCatalogo, setCurrentPageCatalogo] = useState(1);
  const [showAddCatalogoModal, setShowAddCatalogoModal] = useState(false);
  const [catalogoDisponibles, setCatalogoDisponibles] = useState<ServicioCatalogoDisponible[]>([]);
  const [loadingCatalogoDisponibles, setLoadingCatalogoDisponibles] = useState(false);
  const [savingCatalogoServicio, setSavingCatalogoServicio] = useState(false);
  const [errorCatalogoDisponibles, setErrorCatalogoDisponibles] = useState<string | null>(null);
  const [searchCatalogoDisponibles, setSearchCatalogoDisponibles] = useState('');
  const [selectedCatalogoDisponible, setSelectedCatalogoDisponible] = useState<ServicioCatalogoDisponible | null>(null);
  const [showEditCatalogoModal, setShowEditCatalogoModal] = useState(false);
  const [editingCatalogoServicio, setEditingCatalogoServicio] = useState<ProveedorServicioCatalogo | null>(null);
  const [selectedEditCatalogoDisponible, setSelectedEditCatalogoDisponible] = useState<ServicioCatalogoDisponible | null>(null);
  const [searchEditCatalogoDisponibles, setSearchEditCatalogoDisponibles] = useState('');
  const [savingEditCatalogoServicio, setSavingEditCatalogoServicio] = useState(false);
  const [deletingCatalogoServicioId, setDeletingCatalogoServicioId] = useState<number | null>(null);
  const [errorEditCatalogoServicio, setErrorEditCatalogoServicio] = useState<string | null>(null);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
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
        const key = priorityKeys.find((candidate) => candidate in record);

        if (key) {
          pushValue(record[key]);
        } else {
          Object.values(record).forEach(pushValue);
        }
        return;
      }

      if (typeof input !== 'string') return;

      const trimmed = input.trim();
      if (!trimmed) return;

      const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
      if (looksLikeJson) {
        try {
          const parsed = JSON.parse(trimmed);
          pushValue(parsed);
          return;
        } catch {
          // Mantener string original si no es JSON valido.
        }
      }

      values.push(trimmed);
    };

    pushValue(value);
    return Array.from(new Set(values));
  };

  const getEspecialidadLabel = (value: unknown): string => {
    const especialidades = getEspecialidadesFromJsonb(value);
    if (especialidades.length > 0) {
      return especialidades.join(', ');
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    return '';
  };

  const buildCatalogoKey = (servicio: string, especialidad: unknown) => {
    return `${normalizeSearchText(servicio)}::${normalizeSearchText(getEspecialidadLabel(especialidad))}`;
  };

  // Cargar categorías (especialidades)
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const data = await fetchEspecialidades();
        setCategorias(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        setLoadingCategorias(false);
      }
    };

    loadCategorias();
  }, []);

  // Cargar datos del proveedor
  useEffect(() => {
    const loadProveedor = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await fetchProveedorById(Number(id));
        
        if (!data) {
          setError('Proveedor no encontrado');
          return;
        }

        setProveedor(data);
      } catch (err: any) {
        console.error('Error al cargar proveedor:', err);
        setError('Error al cargar los datos del proveedor');
      } finally {
        setLoading(false);
      }
    };

    loadProveedor();
  }, [id]);

  // Cargar evaluaciones (servicios) del proveedor
  useEffect(() => {
    const loadEvaluaciones = async () => {
      if (!proveedor) return;

      try {
        setLoadingServicios(true);
        console.log('[DEBUG] Cargando evaluaciones para proveedor:', {
          id: proveedor.id,
          nombre: proveedor.nombre_proveedor,
          rut: proveedor.rut,
        });
        
        // Buscar evaluaciones solo por RUT
        let evaluaciones: EvaluacionProveedor[] = [];
        const rutProveedor = proveedor.rut?.trim() || '';

        if (rutProveedor) {
          console.log('[DEBUG] Buscando por RUT:', rutProveedor);
          evaluaciones = await fetchEvaluacionesByRutProveedor(rutProveedor);
        } else {
          console.log('[DEBUG] Proveedor sin RUT, no se consultan evaluaciones.');
        }

        console.log(`[DEBUG] Total de evaluaciones encontradas: ${evaluaciones.length}`);
        
        // Guardar las evaluaciones originales para poder pasarlas al formulario de edición
        setEvaluaciones(evaluaciones);
        
        // Convertir evaluaciones a formato Servicio
        const serviciosMapeados: Servicio[] = evaluaciones.map((evaluacion) => ({
          id: evaluacion.id,
          nombre: evaluacion.nombre_proyecto || evaluacion.nombre || evaluacion.nombre_proveedor || 'Sin nombre',
          codigo: evaluacion.codigo_proyecto || evaluacion.orden_compra || `EVAL-${evaluacion.id}`,
          descripcion: evaluacion.actividad || evaluacion.observacion || 'Sin descripción',
          categoria: getEspecialidadLabel(evaluacion.especialidad) || evaluacion.actividad || 'Sin categoría',
          tarifaRef: evaluacion.precio_servicio || null,
          ordenCompra: evaluacion.orden_compra || null,
          fechaEvaluacion: evaluacion.fecha_evaluacion || null,
          evaluadorResponsable: evaluacion.evaluador || null,
          estado: 'Vigente' as const, // Por defecto
          clasificacion: (evaluacion.categoria_proveedor as 'A' | 'B' | 'C') || null,
          documentacionUrl: evaluacion.link_servicio_ejecutado || null,
          notaTotalPonderada: evaluacion.nota_total_ponderada || null,
        }));

        setServicios(serviciosMapeados);
      } catch (err: any) {
        console.error('Error al cargar evaluaciones:', err);
        // No mostrar error, solo dejar array vacío
        setServicios([]);
      } finally {
        setLoadingServicios(false);
      }
    };

    if (proveedor) {
      loadEvaluaciones();
    }
  }, [proveedor]);

  useEffect(() => {
    const loadCatalogo = async () => {
      if (!proveedor) return;

      setCatalogoServicios([]);
      setErrorCatalogo(null);
      setSearchCatalogo('');
      setFilterEspecialidadCatalogo('Todas');
      setCurrentPageCatalogo(1);

      if (!proveedor.rut) {
        setLoadingCatalogo(false);
        return;
      }

      try {
        setLoadingCatalogo(true);
        const data = await fetchServiciosCatalogoByRut(proveedor.rut);
        setCatalogoServicios(data);
      } catch (err: any) {
        console.error('Error al cargar catalogo de servicios del proveedor:', err);
        setErrorCatalogo('Error al cargar el catalogo del proveedor.');
        setCatalogoServicios([]);
      } finally {
        setLoadingCatalogo(false);
      }
    };

    if (proveedor) {
      loadCatalogo();
    }
  }, [proveedor]);
  // Filtrar servicios
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredServicios = servicios.filter((servicio) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      normalizeSearchText(servicio.nombre).includes(normalizedSearchTerm) ||
      normalizeSearchText(servicio.codigo).includes(normalizedSearchTerm) ||
      normalizeSearchText(servicio.descripcion).includes(normalizedSearchTerm);

    const matchesCategoria =
      normalizeSearchText(filterCategoria) === 'todas las categorias' ||
      servicio.categoria === filterCategoria;

    return matchesSearch && matchesCategoria;
  });

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);

  const catalogoServiciosVisuales = catalogoServicios.map((item) => {
    const especialidades = getEspecialidadesFromJsonb(item.especialidad);
    const especialidadLabel = getEspecialidadLabel(item.especialidad);
    return { ...item, especialidades, especialidadLabel };
  });

  const catalogoDisponiblesVisuales = catalogoDisponibles.map((item) => {
    const especialidades = getEspecialidadesFromJsonb(item.especialidad);
    const especialidadLabel = getEspecialidadLabel(item.especialidad);
    return { ...item, especialidades, especialidadLabel };
  });

  const especialidadesCatalogo = Array.from(
    new Set(
      catalogoServiciosVisuales
        .flatMap((item) => item.especialidades)
        .map((especialidad) => especialidad.trim())
        .filter((especialidad) => especialidad.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const filteredCatalogo = catalogoServiciosVisuales.filter((item) => {
    const normalizedCatalogoSearch = normalizeSearchText(searchCatalogo);
    const matchesSearch =
      !normalizedCatalogoSearch ||
      normalizeSearchText(item.servicio).includes(normalizedCatalogoSearch) ||
      item.especialidades.some((especialidad) =>
        normalizeSearchText(especialidad).includes(normalizedCatalogoSearch)
      ) ||
      normalizeSearchText(item.especialidadLabel).includes(normalizedCatalogoSearch);

    const matchesEspecialidad =
      filterEspecialidadCatalogo === 'Todas' || item.especialidades.includes(filterEspecialidadCatalogo);

    return matchesSearch && matchesEspecialidad;
  });

  const catalogoExistenteSet = new Set(
    catalogoServiciosVisuales.map((item) => buildCatalogoKey(item.servicio, item.especialidad))
  );

  const catalogoDisponiblesFiltrados = catalogoDisponiblesVisuales
    .filter((item) => !catalogoExistenteSet.has(buildCatalogoKey(item.servicio, item.especialidad)))
    .filter((item) => {
      const normalizedCatalogoDisponiblesSearch = normalizeSearchText(searchCatalogoDisponibles);
      if (!normalizedCatalogoDisponiblesSearch) return true;
      return (
        normalizeSearchText(item.servicio).includes(normalizedCatalogoDisponiblesSearch) ||
        item.especialidades.some((especialidad) =>
          normalizeSearchText(especialidad).includes(normalizedCatalogoDisponiblesSearch)
        ) ||
        normalizeSearchText(item.especialidadLabel).includes(normalizedCatalogoDisponiblesSearch)
      );
    });

  const editingCatalogoCurrentKey = editingCatalogoServicio
    ? buildCatalogoKey(editingCatalogoServicio.servicio, editingCatalogoServicio.especialidad)
    : null;

  const editCatalogoBase = catalogoDisponiblesVisuales.filter((item) => {
    const itemKey = buildCatalogoKey(item.servicio, item.especialidad);
    return itemKey === editingCatalogoCurrentKey || !catalogoExistenteSet.has(itemKey);
  });

  const currentEditingOption = editingCatalogoServicio
    ? (() => {
        const especialidades = getEspecialidadesFromJsonb(editingCatalogoServicio.especialidad);
        const especialidadLabel = getEspecialidadLabel(editingCatalogoServicio.especialidad);
        return {
          id: editingCatalogoServicio.id,
          servicio: editingCatalogoServicio.servicio,
          especialidad: editingCatalogoServicio.especialidad,
          especialidades,
          especialidadLabel,
        };
      })()
    : null;

  const hasCurrentEditingOption =
    !!currentEditingOption &&
    editCatalogoBase.some(
      (item) =>
        buildCatalogoKey(item.servicio, item.especialidad) ===
        buildCatalogoKey(currentEditingOption.servicio, currentEditingOption.especialidad)
    );

  const editCatalogoDisponibles =
    currentEditingOption && !hasCurrentEditingOption
      ? [currentEditingOption, ...editCatalogoBase]
      : editCatalogoBase;

  const editCatalogoDisponiblesFiltrados = editCatalogoDisponibles.filter((item) => {
    const normalizedEditSearch = normalizeSearchText(searchEditCatalogoDisponibles);
    if (!normalizedEditSearch) return true;
    return (
      normalizeSearchText(item.servicio).includes(normalizedEditSearch) ||
      item.especialidades.some((especialidad) =>
        normalizeSearchText(especialidad).includes(normalizedEditSearch)
      ) ||
      normalizeSearchText(item.especialidadLabel).includes(normalizedEditSearch)
    );
  });

  const totalPagesCatalogo = Math.max(1, Math.ceil(filteredCatalogo.length / itemsPerPage));
  const startIndexCatalogo = (currentPageCatalogo - 1) * itemsPerPage;
  const endIndexCatalogo = startIndexCatalogo + itemsPerPage;
  const paginatedCatalogo = filteredCatalogo.slice(startIndexCatalogo, endIndexCatalogo);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoria]);

  useEffect(() => {
    setCurrentPageCatalogo(1);
  }, [searchCatalogo, filterEspecialidadCatalogo]);

  const loadCatalogoDisponibles = async (): Promise<ServicioCatalogoDisponible[]> => {
    setLoadingCatalogoDisponibles(true);
    try {
      const data = await fetchServiciosCatalogoDisponibles();
      setCatalogoDisponibles(data);
      return data;
    } finally {
      setLoadingCatalogoDisponibles(false);
    }
  };

  const handleCloseAddCatalogoModal = () => {
    if (savingCatalogoServicio) return;
    setShowAddCatalogoModal(false);
    setErrorCatalogoDisponibles(null);
    setSearchCatalogoDisponibles('');
    setSelectedCatalogoDisponible(null);
  };

  const handleOpenAddCatalogoModal = async () => {
    if (!proveedor?.rut) return;

    setShowAddCatalogoModal(true);
    setErrorCatalogoDisponibles(null);
    setSearchCatalogoDisponibles('');
    setSelectedCatalogoDisponible(null);

    try {
      await loadCatalogoDisponibles();
    } catch (err) {
      console.error('Error al cargar servicios disponibles para catalogo:', err);
      setErrorCatalogoDisponibles('No fue posible cargar los servicios disponibles.');
      setCatalogoDisponibles([]);
    }
  };

  const handleCreateCatalogoServicio = async () => {
    if (!proveedor?.rut || !selectedCatalogoDisponible) return;

    try {
      setSavingCatalogoServicio(true);
      setErrorCatalogoDisponibles(null);

      await createProveedorServicioCatalogo({
        servicio: selectedCatalogoDisponible.servicio,
        especialidad: selectedCatalogoDisponible.especialidad,
        nombre_proveedor: proveedor.nombre_proveedor,
        rut: proveedor.rut,
      });

      let cruceWarning = false;
      try {
        await markProveedorCruceInformacionActualizadaByRut(proveedor.rut);
      } catch (cruceError) {
        cruceWarning = true;
        console.error('Error al actualizar estado de cruce tras agregar servicio:', cruceError);
      }

      const refreshedCatalogo = await fetchServiciosCatalogoByRut(proveedor.rut);
      setCatalogoServicios(refreshedCatalogo);
      setErrorCatalogo(null);
      setCurrentPageCatalogo(1);
      setShowAddCatalogoModal(false);
      setSelectedCatalogoDisponible(null);
      setSearchCatalogoDisponibles('');

      if (cruceWarning) {
        setErrorCatalogo('Servicio agregado, pero no fue posible actualizar el estado de cruce.');
      }
    } catch (err: any) {
      console.error('Error al crear asociacion de servicio en catalogo:', err);
      const errorMessage = typeof err?.message === 'string' ? normalizeSearchText(err.message) : '';

      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        setErrorCatalogoDisponibles('Ese servicio ya esta asociado a este proveedor.');
      } else {
        setErrorCatalogoDisponibles('No fue posible agregar el servicio al proveedor.');
      }
    } finally {
      setSavingCatalogoServicio(false);
    }
  };
  const handleCloseEditCatalogoModal = () => {
    if (savingEditCatalogoServicio) return;
    setShowEditCatalogoModal(false);
    setEditingCatalogoServicio(null);
    setSelectedEditCatalogoDisponible(null);
    setSearchEditCatalogoDisponibles('');
    setErrorEditCatalogoServicio(null);
  };

  const handleOpenEditCatalogoModal = async (item: ProveedorServicioCatalogo) => {
    if (!proveedor?.rut) return;

    setEditingCatalogoServicio(item);
    setSelectedEditCatalogoDisponible({
      id: item.id,
      servicio: item.servicio,
      especialidad: item.especialidad,
    });
    setSearchEditCatalogoDisponibles('');
    setErrorEditCatalogoServicio(null);
    setShowEditCatalogoModal(true);

    try {
      await loadCatalogoDisponibles();
    } catch (err) {
      console.error('Error al cargar servicios disponibles para edicion:', err);
      setErrorEditCatalogoServicio('No fue posible cargar los servicios disponibles.');
      setCatalogoDisponibles([]);
    }
  };

  const handleUpdateCatalogoServicio = async () => {
    if (!proveedor?.rut || !editingCatalogoServicio || !selectedEditCatalogoDisponible) return;

    try {
      setSavingEditCatalogoServicio(true);
      setErrorEditCatalogoServicio(null);

      await updateProveedorServicioCatalogo(editingCatalogoServicio.id, {
        servicio: selectedEditCatalogoDisponible.servicio,
        especialidad: selectedEditCatalogoDisponible.especialidad,
        nombre_proveedor: proveedor.nombre_proveedor,
        rut: proveedor.rut,
      });

      const refreshedCatalogo = await fetchServiciosCatalogoByRut(proveedor.rut);
      setCatalogoServicios(refreshedCatalogo);
      setErrorCatalogo(null);
      setCurrentPageCatalogo(1);
      setShowEditCatalogoModal(false);
      setEditingCatalogoServicio(null);
      setSelectedEditCatalogoDisponible(null);
      setSearchEditCatalogoDisponibles('');
    } catch (err) {
      console.error('Error al actualizar servicio del catalogo:', err);
      setErrorEditCatalogoServicio('No fue posible guardar los cambios del servicio.');
    } finally {
      setSavingEditCatalogoServicio(false);
    }
  };

  const handleDeleteCatalogoServicio = async (item: ProveedorServicioCatalogo) => {
    if (!proveedor?.rut) return;

    const especialidadLabel = getEspecialidadLabel(item.especialidad) || 'Sin especialidad';
    const confirmed = window.confirm(
      'Se eliminara el registro del servicio "' + item.servicio + '" (' + especialidadLabel + '). ?Deseas continuar?'
    );

    if (!confirmed) return;

    try {
      setDeletingCatalogoServicioId(item.id);
      await deleteProveedorServicioCatalogo(item.id);

      const refreshedCatalogo = await fetchServiciosCatalogoByRut(proveedor.rut);
      setCatalogoServicios(refreshedCatalogo);
      setErrorCatalogo(null);

      if (editingCatalogoServicio?.id === item.id) {
        handleCloseEditCatalogoModal();
      }
    } catch (err) {
      console.error('Error al eliminar servicio del catalogo:', err);
      setErrorCatalogo('No fue posible eliminar el registro del catalogo.');
    } finally {
      setDeletingCatalogoServicioId(null);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Vigente':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'En revisión':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Inactivo':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    // Paleta de colores para especialidades (misma que en ProveedoresActuales)
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

    // Función hash simple para asignar color de forma consistente
    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    // Asignar color basado en el hash del nombre de la categoría
    const hash = hashString(categoria.toLowerCase());
    const colorIndex = hash % colorPalette.length;
    return colorPalette[colorIndex];
  };

  const getEvaluacionColor = (evaluacion: number | null | undefined) => {
    if (!evaluacion) return 'bg-gray-500';
    // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
    const cumplimiento = evaluacion / 100;
    if (cumplimiento > 0.764) return 'bg-green-500';
    if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getClasificacionColor = (clasificacion: string | null | undefined) => {
    if (!clasificacion) return 'bg-gray-100 text-gray-700';
    switch (clasificacion.toUpperCase()) {
      case 'A':
        return 'bg-green-100 text-green-700';
      case 'B':
        return 'bg-yellow-100 text-yellow-700';
      case 'C':
        return 'bg-orange-100 text-orange-700';
      case 'D':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Proveedor no encontrado'}
          </div>
          <button
            onClick={() => navigate(getAreaPath('actuales'))}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Volver a Proveedores
          </button>
        </div>
      </div>
    );
  }

  const informacionContactoObj = toPlainObject(proveedor.informacion_contacto);
  const contactoComercial = toContactoDetalleProveedor(informacionContactoObj.contacto_comercial);
  const contactoAdicional1 = toContactoDetalleProveedor(informacionContactoObj.contacto_adicional_1);
  const contactoAdicional2 = toContactoDetalleProveedor(informacionContactoObj.contacto_adicional_2);
  const correoContactoFallback = toText(proveedor.correo_contacto);
  const tieneInformacionContacto =
    hasContactoDetalleData(contactoComercial) ||
    hasContactoDetalleData(contactoAdicional1) ||
    hasContactoDetalleData(contactoAdicional2);
  const contactoCorreo = tieneInformacionContacto
    ? contactoComercial.correo
    : correoContactoFallback;
  const contactoCargo = tieneInformacionContacto ? contactoComercial.cargo : '';

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Botón Volver */}
        <button
          onClick={() => navigate(getAreaPath('actuales'))}
          className="mb-4 flex items-center gap-2 text-primary hover:text-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Volver a Gestión de Proveedores</span>
        </button>

        {/* Información del Proveedor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">business</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#111318] mb-2">{proveedor.nombre_proveedor}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">RUT:</span> {proveedor.rut || 'N/A'}
                  </div>
                  {proveedor.razon_social && (
                    <div>
                      <span className="font-medium">Razón Social:</span> {proveedor.razon_social}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {contactoCorreo ? (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-gray-400">email</span>
                        <span className="text-sm text-[#111318]">{contactoCorreo}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-gray-400">email</span>
                        <span className="text-sm text-gray-400">Sin correo comercial</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-gray-400">badge</span>
                      <span className={`text-sm ${contactoCargo ? 'text-gray-600' : 'text-gray-400'}`}>
                        {contactoCargo || 'Sin cargo comercial'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {(() => {
                // Usar promedio_nota_total_ponderada si está disponible, sino usar evaluacion
                // El promedio_nota_total_ponderada viene en formato decimal (0-1), multiplicar por 100 para porcentaje
                const evaluacionMostrar = proveedor.promedio_nota_total_ponderada !== null && proveedor.promedio_nota_total_ponderada !== undefined
                  ? Math.round(proveedor.promedio_nota_total_ponderada * 100) // Convertir de decimal (0-1) a porcentaje (0-100) y redondear
                  : (proveedor.evaluacion !== null && proveedor.evaluacion !== undefined ? proveedor.evaluacion : null);
                
                return evaluacionMostrar !== null && evaluacionMostrar !== undefined ? (
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">EVALUACION</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getEvaluacionColor(evaluacionMostrar)}`}
                          style={{ width: `${evaluacionMostrar}%` }}
                        />
                      </div>
                      <span className="text-lg font-semibold text-[#111318]">{evaluacionMostrar}%</span>
                    </div>
                  </div>
                ) : null;
              })()}
              {proveedor.clasificacion && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">CLASIFICACION</div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${getClasificacionColor(
                      proveedor.clasificacion
                    )}`}
                  >
                    {proveedor.clasificacion}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selector de vista */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('ejecutados')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                activeView === 'ejecutados'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-base">task_alt</span>
              <span>Servicios Ejecutados</span>
            </button>
            <button
              onClick={() => setActiveView('catalogo')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                activeView === 'catalogo'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>Catalogo del Proveedor</span>
            </button>
          </div>
        </div>

        {activeView === 'ejecutados' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#111318] mb-1">Servicios Ejecutados</h2>
              <p className="text-sm text-gray-500">
                Listado de servicios evaluados y realizados por este proveedor.
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR SERVICIO</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Nombre, código o descripción del servicio"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">CATEGORÍA</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  disabled={loadingCategorias}
                >
                  <option value="Todas las categorías">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Servicios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
            {loadingServicios ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-500">Cargando servicios ejecutados...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">NOMBRE DEL SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">DESCRIPCION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">FECHA</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUADOR</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ORDEN DE SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">MONTO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ORDEN SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUACION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CALIFICACION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">DOCUMENTACION</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServicios.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-gray-500">
                          No hay servicios ejecutados registrados para este proveedor.
                        </td>
                      </tr>
                    ) : (
                      paginatedServicios.map((servicio) => (
                    <tr
                      key={servicio.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Buscar la evaluación original en el array de evaluaciones
                        const evaluacionOriginal = evaluaciones.find(
                          (e) => e.id === servicio.id
                        );
                        if (evaluacionOriginal) {
                          navigate(getAreaPath('evaluacion'), {
                            state: { 
                              evaluacionData: evaluacionOriginal,
                              returnPath: getAreaPath(`actuales/${id}`),
                              proveedorId: id,
                              readOnly: true // Modo solo lectura
                            }
                          });
                        }
                      }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111318]">{servicio.nombre}</span>
                          <span className="text-xs text-gray-500">COD: {servicio.codigo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">{servicio.descripcion}</span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.fechaEvaluacion ? (
                          <span className="text-sm text-[#111318]">
                            {new Date(servicio.fechaEvaluacion).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.evaluadorResponsable ? (
                          <span className="text-sm text-[#111318]">{servicio.evaluadorResponsable}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoriaColor(
                            servicio.categoria
                          )}`}
                        >
                          {servicio.categoria}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.ordenCompra ? (
                          <span className="text-sm text-[#111318]">{servicio.ordenCompra}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.tarifaRef !== null ? (
                          <span className="text-sm font-medium text-[#111318]">{formatCurrency(servicio.tarifaRef)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-gray-500">{servicio.codigo}</span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.notaTotalPonderada !== null && servicio.notaTotalPonderada !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                              <div
                                className={`h-2 rounded-full transition-all ${getEvaluacionColor(servicio.notaTotalPonderada * 100)}`}
                                style={{ width: `${Math.round(servicio.notaTotalPonderada * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#111318] min-w-[40px]">
                              {Math.round(servicio.notaTotalPonderada * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.clasificacion ? (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getClasificacionColor(
                              servicio.clasificacion
                            )}`}
                          >
                            {servicio.clasificacion}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.documentacionUrl ? (
                          <a
                            href={servicio.documentacionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Ver documentación"
                          >
                            <span className="material-symbols-outlined text-lg">description</span>
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se active el onClick de la fila
                            // Buscar la evaluación original en el array de evaluaciones
                            const evaluacionOriginal = evaluaciones.find(
                              (e) => e.id === servicio.id
                            );
                            if (evaluacionOriginal) {
                              navigate(getAreaPath('evaluacion'), {
                                state: { 
                                  evaluacionData: evaluacionOriginal,
                                  returnPath: getAreaPath(`actuales/${id}`),
                                  proveedorId: id,
                                  readOnly: false // Modo edición
                                }
                              });
                            } else {
                              navigate(getAreaPath('evaluacion'), {
                                state: {
                                  returnPath: getAreaPath(`actuales/${id}`),
                                  proveedorId: id,
                                  readOnly: false
                                }
                              });
                            }
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </td>
                    </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {filteredServicios.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredServicios.length)} de{' '}
                  {filteredServicios.length} servicios
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                    const page = i + 1;
                    if (totalPages > 8 && page === 8) {
                      return (
                        <span key="ellipsis" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {activeView === 'catalogo' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#111318] mb-1">Catalogo del Proveedor</h2>
                <p className="text-sm text-gray-500">
                  Listado completo de servicios asociados al proveedor (entregados o no).
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddCatalogoModal}
                disabled={!proveedor.rut}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Nuevo servicio</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR SERVICIO</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Nombre del servicio o especialidad"
                      value={searchCatalogo}
                      onChange={(e) => setSearchCatalogo(e.target.value)}
                      disabled={!proveedor.rut || loadingCatalogo}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">ESPECIALIDAD</label>
                  <select
                    value={filterEspecialidadCatalogo}
                    onChange={(e) => setFilterEspecialidadCatalogo(e.target.value)}
                    disabled={!proveedor.rut || loadingCatalogo}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="Todas">Todas las especialidades</option>
                    {especialidadesCatalogo.map((especialidad) => (
                      <option key={especialidad} value={especialidad}>
                        {especialidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
              {loadingCatalogo ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm text-gray-500">Cargando catalogo del proveedor...</p>
                </div>
              ) : !proveedor.rut ? (
                <div className="p-8 text-center text-gray-500">
                  No se puede consultar catalogo sin RUT.
                </div>
              ) : errorCatalogo ? (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorCatalogo}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">SERVICIO</th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCatalogo.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            {catalogoServicios.length === 0
                              ? 'No hay servicios asociados para este proveedor.'
                              : 'No hay resultados para los filtros aplicados.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedCatalogo.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-medium text-[#111318]">{item.servicio}</span>
                            </td>
                            <td className="py-4 px-6">
                              {item.especialidades.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.especialidades.map((especialidad) => (
                                    <span
                                      key={item.id + '-' + especialidad}
                                      className={
                                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ' +
                                        getCategoriaColor(especialidad)
                                      }
                                    >
                                      {especialidad}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCatalogoModal(item)}
                                  disabled={deletingCatalogoServicioId === item.id}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                  title="Editar servicio"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCatalogoServicio(item)}
                                  disabled={deletingCatalogoServicioId === item.id}
                                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                  title="Eliminar registro"
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {deletingCatalogoServicioId === item.id ? 'hourglass_top' : 'delete'}
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
              )}

              {!loadingCatalogo && proveedor.rut && !errorCatalogo && filteredCatalogo.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {startIndexCatalogo + 1} a{' '}
                    {Math.min(endIndexCatalogo, filteredCatalogo.length)} de {filteredCatalogo.length} servicios
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPageCatalogo((prev) => Math.max(1, prev - 1))}
                      disabled={currentPageCatalogo === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    {Array.from({ length: Math.min(totalPagesCatalogo, 8) }, (_, i) => {
                      const page = i + 1;
                      if (totalPagesCatalogo > 8 && page === 8) {
                        return (
                          <span key="ellipsis-catalogo" className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPageCatalogo(page)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentPageCatalogo === page
                              ? 'bg-primary text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPageCatalogo((prev) => Math.min(totalPagesCatalogo, prev + 1))}
                      disabled={currentPageCatalogo === totalPagesCatalogo}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showAddCatalogoModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={handleCloseAddCatalogoModal}
          >
            <div
              className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#111318]">Agregar servicio al proveedor</h3>
                  <p className="text-sm text-gray-500">
                    Selecciona un servicio desde dim_core_proveedores_servicios.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddCatalogoModal}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR SERVICIO</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Nombre del servicio o especialidad"
                      value={searchCatalogoDisponibles}
                      onChange={(e) => setSearchCatalogoDisponibles(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {errorCatalogoDisponibles && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorCatalogoDisponibles}
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl max-h-[380px] overflow-y-auto">
                  {loadingCatalogoDisponibles ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-3"></div>
                      <p className="text-sm text-gray-500">Cargando servicios disponibles...</p>
                    </div>
                  ) : catalogoDisponiblesFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      {catalogoDisponibles.length === 0
                        ? 'No hay servicios disponibles para asociar.'
                        : searchCatalogoDisponibles.trim()
                        ? 'No hay resultados para tu busqueda.'
                        : 'Este proveedor ya tiene todos los servicios del catalogo asociados.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {catalogoDisponiblesFiltrados.map((item) => {
                        const isSelected =
                          !!selectedCatalogoDisponible &&
                          buildCatalogoKey(selectedCatalogoDisponible.servicio, selectedCatalogoDisponible.especialidad) ===
                            buildCatalogoKey(item.servicio, item.especialidad);

                        return (
                          <button
                            type="button"
                            key={'modal-' + item.id + '-' + item.servicio + '-' + item.especialidadLabel}
                            onClick={() => setSelectedCatalogoDisponible(item)}
                            className={
                              isSelected
                                ? 'w-full text-left px-4 py-3 transition-colors bg-primary/10'
                                : 'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50'
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111318]">{item.servicio}</p>
                                <p className="text-xs text-gray-500">{item.especialidadLabel || 'Sin especialidad'}</p>
                              </div>
                              <span
                                className={
                                  isSelected
                                    ? 'mt-0.5 h-4 w-4 rounded-full border-2 border-primary bg-primary'
                                    : 'mt-0.5 h-4 w-4 rounded-full border-2 border-gray-300'
                                }
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCloseAddCatalogoModal}
                  disabled={savingCatalogoServicio}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateCatalogoServicio}
                  disabled={savingCatalogoServicio || !selectedCatalogoDisponible}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCatalogoServicio ? 'Guardando...' : 'Agregar servicio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditCatalogoModal && editingCatalogoServicio && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={handleCloseEditCatalogoModal}
          >
            <div
              className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#111318]">Editar servicio del proveedor</h3>
                  <p className="text-sm text-gray-500">
                    Selecciona un nuevo servicio/especialidad para actualizar este registro.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditCatalogoModal}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Registro actual: <span className="font-semibold text-[#111318]">{editingCatalogoServicio.servicio}</span>{' '}
                  <span className="text-gray-500">({getEspecialidadLabel(editingCatalogoServicio.especialidad) || 'Sin especialidad'})</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR SERVICIO</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Nombre del servicio o especialidad"
                      value={searchEditCatalogoDisponibles}
                      onChange={(e) => setSearchEditCatalogoDisponibles(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {errorEditCatalogoServicio && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errorEditCatalogoServicio}
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl max-h-[380px] overflow-y-auto">
                  {loadingCatalogoDisponibles ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-3"></div>
                      <p className="text-sm text-gray-500">Cargando servicios disponibles...</p>
                    </div>
                  ) : editCatalogoDisponiblesFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No hay resultados para tu busqueda.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {editCatalogoDisponiblesFiltrados.map((item) => {
                        const isSelected =
                          !!selectedEditCatalogoDisponible &&
                          buildCatalogoKey(selectedEditCatalogoDisponible.servicio, selectedEditCatalogoDisponible.especialidad) ===
                            buildCatalogoKey(item.servicio, item.especialidad);

                        return (
                          <button
                            type="button"
                            key={'edit-modal-' + item.id + '-' + item.servicio + '-' + item.especialidadLabel}
                            onClick={() => setSelectedEditCatalogoDisponible(item)}
                            className={
                              isSelected
                                ? 'w-full text-left px-4 py-3 transition-colors bg-primary/10'
                                : 'w-full text-left px-4 py-3 transition-colors hover:bg-gray-50'
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111318]">{item.servicio}</p>
                                <p className="text-xs text-gray-500">{item.especialidadLabel || 'Sin especialidad'}</p>
                              </div>
                              <span
                                className={
                                  isSelected
                                    ? 'mt-0.5 h-4 w-4 rounded-full border-2 border-primary bg-primary'
                                    : 'mt-0.5 h-4 w-4 rounded-full border-2 border-gray-300'
                                }
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCloseEditCatalogoModal}
                  disabled={savingEditCatalogoServicio}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateCatalogoServicio}
                  disabled={savingEditCatalogoServicio || !selectedEditCatalogoDisponible}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingEditCatalogoServicio ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ProveedorDetalle;

