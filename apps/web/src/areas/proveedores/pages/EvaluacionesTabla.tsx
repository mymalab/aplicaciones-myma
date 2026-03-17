import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchAllEvaluaciones, EvaluacionProveedor, fetchEspecialidades } from '../services/proveedoresService';
import { normalizeSearchText } from '../utils/search';

interface ServicioEvaluado {
  id: number;
  nombreProveedor: string;
  rut: string | null;
  nombreProyecto: string | null;
  codigoProyecto: string | null;
  especialidad: string | null;
  actividad: string | null;
  fechaEvaluacion: string | null;
  evaluador: string | null;
   creadoPor: string | null;
  notaTotalPonderada: number | null;
  categoria: string | null;
  ordenCompra: string | null;
  precioServicio: number | null;
  linkServicioEjecutado: string | null;
}

const EvaluacionesTabla: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [servicios, setServicios] = useState<ServicioEvaluado[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProveedor, setFilterProveedor] = useState<string>('Todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('Todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Leer parámetro de categoría desde el estado de navegación
  useEffect(() => {
    const categoriaParam = (location.state as any)?.categoria;
    if (categoriaParam && (categoriaParam === 'A' || categoriaParam === 'B' || categoriaParam === 'C')) {
      setFilterCategoria(categoriaParam);
      setCurrentPage(1);
      // Limpiar el estado después de aplicarlo
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Leer parámetro de especialidad desde el estado de navegación
  useEffect(() => {
    const especialidadParam = (location.state as any)?.especialidad;
    if (especialidadParam) {
      setFilterEspecialidad(especialidadParam);
      setCurrentPage(1);
      // Limpiar el estado después de aplicarlo
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Cargar especialidades
  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        const data = await fetchEspecialidades();
        setEspecialidades(data);
      } catch (err) {
        console.error('Error al cargar especialidades:', err);
      }
    };
    loadEspecialidades();
  }, []);

  // Cargar todos los servicios evaluados
  useEffect(() => {
    const loadServicios = async () => {
      try {
        setLoading(true);
        const evaluaciones = await fetchAllEvaluaciones();
        
        // Guardar las evaluaciones originales para poder pasarlas al formulario
        setEvaluaciones(evaluaciones);
        
        const serviciosMapeados: ServicioEvaluado[] = evaluaciones.map((evaluacion) => ({
          id: evaluacion.id,
          nombreProveedor: evaluacion.nombre_proveedor || evaluacion.nombre || 'Sin nombre',
          rut: evaluacion.rut || null,
          nombreProyecto: evaluacion.nombre_proyecto || null,
          codigoProyecto: evaluacion.codigo_proyecto || null,
          especialidad: evaluacion.especialidad || null,
          actividad: evaluacion.actividad || null,
          fechaEvaluacion: evaluacion.fecha_evaluacion || null,
          evaluador: evaluacion.evaluador || null,
          creadoPor: evaluacion.profiles?.full_name || null,
          notaTotalPonderada: evaluacion.nota_total_ponderada || null,
          categoria: evaluacion.categoria_proveedor || null,
          ordenCompra: evaluacion.orden_compra || null,
          precioServicio: evaluacion.precio_servicio || null,
          linkServicioEjecutado: evaluacion.link_servicio_ejecutado || null,
        }));

        setServicios(serviciosMapeados);
      } catch (err) {
        console.error('Error al cargar servicios evaluados:', err);
        setError('Error al cargar los servicios evaluados');
      } finally {
        setLoading(false);
      }
    };

    loadServicios();
  }, []);

  // Obtener lista única de proveedores
  const proveedoresUnicos = useMemo(() => {
    const proveedores = Array.from(new Set(servicios.map(s => s.nombreProveedor).filter(Boolean)));
    return proveedores.sort();
  }, [servicios]);

  // Filtrar servicios y agrupar/ordenar por proveedor (alfabético)
  const filteredServicios = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    const result = servicios.filter((servicio) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        normalizeSearchText(servicio.nombreProveedor).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.nombreProyecto).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.codigoProyecto).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.actividad).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.rut).includes(normalizedSearchTerm);
      
      const matchesProveedor = filterProveedor === 'Todos' || servicio.nombreProveedor === filterProveedor;
      const matchesEspecialidad = filterEspecialidad === 'Todas' || servicio.especialidad === filterEspecialidad;
      const matchesCategoria = filterCategoria === 'Todas' || servicio.categoria === filterCategoria;

      return matchesSearch && matchesProveedor && matchesEspecialidad && matchesCategoria;
    });

    // Ordenar alfabeticamente por nombre de proveedor para que queden agrupados
    return result.sort((a, b) => a.nombreProveedor.localeCompare(b.nombreProveedor));
  }, [servicios, searchTerm, filterProveedor, filterEspecialidad, filterCategoria]);

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const paginatedServicios = filteredServicios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getEspecialidadColor = (especialidad: string) => {
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

    // Asignar color basado en el hash del nombre de la especialidad
    const hash = hashString(especialidad.toLowerCase());
    const colorIndex = hash % colorPalette.length;
    return colorPalette[colorIndex];
  };

  const getEvaluacionColor = (evaluacion: number | null | undefined) => {
    if (!evaluacion) return 'bg-gray-500';
    const cumplimiento = evaluacion;
    if (cumplimiento > 0.764) return 'bg-green-500';
    if (cumplimiento >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCategoriaColor = (categoria: string | null) => {
    if (!categoria) return 'bg-gray-100 text-gray-700 border-gray-300';
    switch (categoria) {
      case 'A':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'B':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'C':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenEvaluacionDetalle = (servicio: ServicioEvaluado) => {
    const evaluacionOriginal = evaluaciones.find((e) => e.id === servicio.id);
    if (!evaluacionOriginal) {
      return;
    }

    // Determinar la ruta según el año de la fecha de evaluación.
    let rutaEvaluacion = 'evaluacion'; // Por defecto, vista normal (2026+)
    if (servicio.fechaEvaluacion) {
      const fechaEvaluacion = new Date(servicio.fechaEvaluacion);
      const anioEvaluacion = fechaEvaluacion.getFullYear();
      if (anioEvaluacion <= 2025) {
        rutaEvaluacion = 'evaluacion-2025';
      }
    }

    navigate(getAreaPath(rutaEvaluacion), {
      state: {
        evaluacionData: evaluacionOriginal,
        returnPath: getAreaPath('evaluaciones-tabla'),
        readOnly: true,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando evaluaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Evaluaciones de Servicios
              </h1>
              <p className="text-sm text-gray-500">
                Tabla de evaluaciones de servicios
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BUSCAR</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por proveedor, proyecto, código..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PROVEEDOR</label>
              <select
                value={filterProveedor}
                onChange={(e) => {
                  setFilterProveedor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              >
                <option value="Todos">Todos los proveedores</option>
                {proveedoresUnicos.map((proveedor) => (
                  <option key={proveedor} value={proveedor}>
                    {proveedor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ESPECIALIDAD</label>
              <select
                value={filterEspecialidad}
                onChange={(e) => {
                  setFilterEspecialidad(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              >
                <option value="Todas">Todas las especialidades</option>
                {especialidades.map((esp) => (
                  <option key={esp.id} value={esp.nombre}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CATEGORÍA</label>
              <select
                value={filterCategoria}
                onChange={(e) => {
                  setFilterCategoria(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
              >
                <option value="Todas">Todas las categorías</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Servicios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          <div className="relative">
            {/* Flecha izquierda */}
            <button
              type="button"
              className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/80 shadow-md border border-gray-200 hover:bg-white hover:shadow-lg transition-all"
              onClick={() => {
                const container = scrollContainerRef.current;
                if (container) {
                  container.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
            >
              <span className="material-symbols-outlined text-lg text-gray-700">chevron_left</span>
            </button>

            <div
              ref={scrollContainerRef}
              className="overflow-x-auto"
            >
              <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">FECHA</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">PROVEEDOR</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">PROYECTO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ACTIVIDAD</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUADOR</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CREADO POR</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUACIÓN</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CATEGORÍA</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ORDEN SERVICIO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">MONTO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedServicios.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-gray-500">
                      No hay servicios evaluados que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  paginatedServicios.map((servicio) => (
                    <tr
                      key={servicio.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleOpenEvaluacionDetalle(servicio)}
                    >
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
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111318]">{servicio.nombreProveedor}</span>
                          {servicio.rut && (
                            <span className="text-xs text-gray-500">RUT: {servicio.rut}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-[#111318]">{servicio.nombreProyecto || '—'}</span>
                          {servicio.codigoProyecto && (
                            <span className="text-xs text-gray-500">{servicio.codigoProyecto}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.especialidad ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEspecialidadColor(servicio.especialidad)}`}
                          >
                            {servicio.especialidad}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">{servicio.actividad || '—'}</span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.evaluador ? (
                          <span className="text-sm text-[#111318]">{servicio.evaluador}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.creadoPor ? (
                          <span className="text-sm text-[#111318]">{servicio.creadoPor}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.notaTotalPonderada !== null && servicio.notaTotalPonderada !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                              <div
                                className={`h-2 rounded-full transition-all ${getEvaluacionColor(servicio.notaTotalPonderada)}`}
                                style={{ width: `${Math.round(servicio.notaTotalPonderada * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-[#111318] whitespace-nowrap">
                              {Math.round(servicio.notaTotalPonderada * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.categoria ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoriaColor(servicio.categoria)}`}
                          >
                            {servicio.categoria}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.ordenCompra ? (
                          <span className="text-sm text-[#111318]">{servicio.ordenCompra}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.precioServicio !== null ? (
                          <span className="text-sm font-medium text-[#111318]">{formatCurrency(servicio.precioServicio)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEvaluacionDetalle(servicio);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* Flecha derecha */}
            <button
              type="button"
              className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/80 shadow-md border border-gray-200 hover:bg-white hover:shadow-lg transition-all"
              onClick={() => {
                const container = scrollContainerRef.current;
                if (container) {
                  container.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
            >
              <span className="material-symbols-outlined text-lg text-gray-700">chevron_right</span>
            </button>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredServicios.length)} de {filteredServicios.length} servicios
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluacionesTabla;
