import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchPreguntasByCodigoMyma,
  normalizeComplejidadPregunta,
  normalizeEstadoPregunta,
} from '../services/preguntasService';
import type {
  ComplejidadPregunta,
  EstadoPregunta,
  PreguntaGestion,
} from '../types';
import { adendasList, adendasPregunta } from '../utils/routes';

type SortField = 'numero' | 'estado' | 'complejidad';
type SortDirection = 'asc' | 'desc';

interface FiltrosPregunta {
  estado: 'Todos' | EstadoPregunta;
  complejidad: 'Todas' | ComplejidadPregunta;
  especialidad: 'Todas' | string;
}

const SORT_SEQUENCE: SortField[] = ['numero', 'estado', 'complejidad'];

const COMPLEJIDAD_RANK: Record<ComplejidadPregunta, number> = {
  Baja: 1,
  Media: 2,
  Alta: 3,
};

const GestionAdendaView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma } = useParams<{ codigoMyma: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaGestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtros, setFiltros] = useState<FiltrosPregunta>({
    estado: 'Todos',
    complejidad: 'Todas',
    especialidad: 'Todas',
  });
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    let isMounted = true;

    const loadPreguntas = async () => {
      if (!codigoMyma) {
        if (isMounted) {
          setError('No se recibió el identificador de adenda.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { preguntas: data } = await fetchPreguntasByCodigoMyma(codigoMyma);

        if (!isMounted) return;

        setPreguntas(data);
      } catch (err: any) {
        if (!isMounted) return;

        console.error('Error loading preguntas:', err);
        setError(err?.message || 'No fue posible cargar las preguntas.');
        setPreguntas([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPreguntas();

    return () => {
      isMounted = false;
    };
  }, [codigoMyma]);

  const especialidadesDisponibles = useMemo(() => {
    const all = preguntas
      .map((pregunta) => pregunta.especialidad_nombre || 'Sin especialidad')
      .filter(Boolean);

    return Array.from(new Set(all)).sort((a, b) => a.localeCompare(b));
  }, [preguntas]);

  const filteredPreguntas = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return preguntas.filter((pregunta) => {
      const estadoUi = normalizeEstadoPregunta(pregunta.estado);
      const complejidadUi = normalizeComplejidadPregunta(pregunta.complejidad);
      const especialidadUi = pregunta.especialidad_nombre || 'Sin especialidad';
      const encargadoUi = pregunta.encargado_nombre || 'Sin encargado';
      const estrategiaUi = (pregunta.estrategia || '').trim();
      const respuestaIaUi = (pregunta.respuesta_ia || '').trim();

      const matchSearch =
        !searchLower ||
        pregunta.numero_formateado.toLowerCase().includes(searchLower) ||
        pregunta.texto.toLowerCase().includes(searchLower) ||
        pregunta.capitulo.toLowerCase().includes(searchLower) ||
        pregunta.temas_principales_texto.toLowerCase().includes(searchLower) ||
        pregunta.temas_secundarios_texto.toLowerCase().includes(searchLower) ||
        estadoUi.toLowerCase().includes(searchLower) ||
        complejidadUi.toLowerCase().includes(searchLower) ||
        encargadoUi.toLowerCase().includes(searchLower) ||
        especialidadUi.toLowerCase().includes(searchLower) ||
        estrategiaUi.toLowerCase().includes(searchLower) ||
        respuestaIaUi.toLowerCase().includes(searchLower);

      const matchEstado = filtros.estado === 'Todos' || estadoUi === filtros.estado;
      const matchComplejidad =
        filtros.complejidad === 'Todas' || complejidadUi === filtros.complejidad;
      const matchEspecialidad =
        filtros.especialidad === 'Todas' || especialidadUi === filtros.especialidad;

      return matchSearch && matchEstado && matchComplejidad && matchEspecialidad;
    });
  }, [preguntas, searchTerm, filtros]);

  const sortedPreguntas = useMemo(() => {
    const items = [...filteredPreguntas];

    items.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'numero') {
        comparison = (a.numero || 0) - (b.numero || 0);
      }

      if (sortField === 'estado') {
        comparison = normalizeEstadoPregunta(a.estado).localeCompare(
          normalizeEstadoPregunta(b.estado)
        );
      }

      if (sortField === 'complejidad') {
        comparison =
          COMPLEJIDAD_RANK[normalizeComplejidadPregunta(a.complejidad)] -
          COMPLEJIDAD_RANK[normalizeComplejidadPregunta(b.complejidad)];
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [filteredPreguntas, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedPreguntas.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtros, sortField, sortDirection]);

  const paginatedPreguntas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPreguntas.slice(start, start + pageSize);
  }, [sortedPreguntas, currentPage]);

  const visiblePages = useMemo(() => {
    const maxPages = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxPages - 1);
    const adjustedStart = Math.max(1, end - maxPages + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  const handleBack = () => {
    navigate(adendasList());
  };

  const handlePreguntaClick = (preguntaId: number) => {
    if (!codigoMyma) {
      navigate(adendasList());
      return;
    }

    navigate(adendasPregunta(codigoMyma, String(preguntaId)));
  };

  const handleSortClick = () => {
    const currentFieldIndex = SORT_SEQUENCE.indexOf(sortField);
    const nextField = SORT_SEQUENCE[(currentFieldIndex + 1) % SORT_SEQUENCE.length];

    setSortField(nextField);
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleClearFilters = () => {
    setFiltros({ estado: 'Todos', complejidad: 'Todas', especialidad: 'Todas' });
  };

  const getEstadoColor = (estado: EstadoPregunta) => {
    switch (estado) {
      case 'En revisión':
        return 'bg-gray-100 text-gray-800';
      case 'Pendientes':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completadas':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplejidadColor = (complejidad: ComplejidadPregunta) => {
    switch (complejidad) {
      case 'Baja':
        return 'bg-green-100 text-green-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'Alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEspecialidadColor = (especialidad: string) => {
    const normalized = especialidad.toLowerCase();

    if (normalized.includes('proyecto')) return 'bg-orange-100 text-orange-800';
    if (normalized.includes('sectoriales')) return 'bg-blue-100 text-blue-800';
    if (normalized.includes('ambiental')) return 'bg-green-100 text-green-800';
    if (normalized.includes('planific')) return 'bg-indigo-100 text-indigo-800';

    return 'bg-gray-100 text-gray-800';
  };

  const enRevision = preguntas.filter(
    (pregunta) => normalizeEstadoPregunta(pregunta.estado) === 'En revisión'
  ).length;
  const pendientes = preguntas.filter(
    (pregunta) => normalizeEstadoPregunta(pregunta.estado) === 'Pendientes'
  ).length;
  const completadas = preguntas.filter(
    (pregunta) => normalizeEstadoPregunta(pregunta.estado) === 'Completadas'
  ).length;
  const total = preguntas.length;
  const avanceGlobal = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const baja = preguntas.filter(
    (pregunta) => normalizeComplejidadPregunta(pregunta.complejidad) === 'Baja'
  ).length;
  const media = preguntas.filter(
    (pregunta) => normalizeComplejidadPregunta(pregunta.complejidad) === 'Media'
  ).length;
  const alta = preguntas.filter(
    (pregunta) => normalizeComplejidadPregunta(pregunta.complejidad) === 'Alta'
  ).length;

  const resultStart = sortedPreguntas.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const resultEnd = Math.min(currentPage * pageSize, sortedPreguntas.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando preguntas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-[95rem] mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#111318] mb-2">Gestión de Adenda</h1>
            <p className="text-gray-600">Monitoreo y respuesta de observaciones ICSARA</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar en preguntas..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Total de preguntas: <span className="font-semibold text-[#111318]">{preguntas.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de Preguntas</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span className="text-sm text-gray-600">En revisión</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{enRevision}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span className="text-sm text-gray-600">Pendientes</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{pendientes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-sm text-gray-600">Completadas</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{completadas}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Progreso de Adenda</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#111318] mb-1">{avanceGlobal}%</p>
                <p className="text-xs text-gray-500">Avance global</p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#059669"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - avanceGlobal / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#111318]">{avanceGlobal}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Complejidad de Preguntas</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Baja</span>
                <span className="text-sm font-semibold text-[#111318]">{baja}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Media</span>
                <span className="text-sm font-semibold text-[#111318]">{media}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Alta</span>
                <span className="text-sm font-semibold text-[#111318]">{alta}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                  <span>Filtros</span>
                </button>
                <button
                  onClick={handleSortClick}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  <span className="material-symbols-outlined text-sm">sort</span>
                  <span>Ordenar: {sortField}</span>
                  <span className="text-xs text-gray-500 uppercase">{sortDirection}</span>
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <select
                  value={filtros.estado}
                  onChange={(event) =>
                    setFiltros((prev) => ({
                      ...prev,
                      estado: event.target.value as FiltrosPregunta['estado'],
                    }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Pendientes">Pendientes</option>
                  <option value="Completadas">Completadas</option>
                </select>

                <select
                  value={filtros.complejidad}
                  onChange={(event) =>
                    setFiltros((prev) => ({
                      ...prev,
                      complejidad: event.target.value as FiltrosPregunta['complejidad'],
                    }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todas">Complejidad: Todas</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>

                <select
                  value={filtros.especialidad}
                  onChange={(event) =>
                    setFiltros((prev) => ({ ...prev, especialidad: event.target.value }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todas">Especialidad: Todas</option>
                  {especialidadesDisponibles.map((especialidad) => (
                    <option key={especialidad} value={especialidad}>
                      {especialidad}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Complejidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pregunta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capítulo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temas principales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temas secundarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encargado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPreguntas.map((pregunta) => {
                  const estadoUi = normalizeEstadoPregunta(pregunta.estado);
                  const complejidadUi = normalizeComplejidadPregunta(pregunta.complejidad);
                  const especialidadUi = pregunta.especialidad_nombre || 'Sin especialidad';
                  const encargadoUi = pregunta.encargado_nombre || 'Sin encargado';
                  return (
                    <tr
                      key={pregunta.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePreguntaClick(pregunta.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#111318]">
                          {pregunta.numero_formateado}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(estadoUi)}`}
                        >
                          {estadoUi}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getComplejidadColor(
                            complejidadUi
                          )}`}
                        >
                          {complejidadUi}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <div className="text-sm text-[#111318] line-clamp-3" title={pregunta.texto}>
                          {pregunta.texto}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-xs text-gray-700">{pregunta.capitulo}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-xs text-gray-700">{pregunta.temas_principales_texto}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-xs text-gray-700">{pregunta.temas_secundarios_texto}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#111318]">{encargadoUi}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getEspecialidadColor(
                            especialidadUi
                          )}`}
                        >
                          {especialidadUi}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {paginatedPreguntas.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-500 text-center" colSpan={9}>
                      No hay preguntas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {resultStart} a {resultEnd} de {sortedPreguntas.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {visiblePages.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    currentPage === page
                      ? 'bg-primary text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionAdendaView;

