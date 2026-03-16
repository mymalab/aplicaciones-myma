import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchAllEvaluaciones, EvaluacionProveedor, fetchEspecialidades } from '../services/proveedoresService';
import { Clasificacion } from '../types';
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
  notaTotalPonderada: number | null;
  categoria: string | null;
  ordenCompra: string | null;
  precioServicio: number | null;
  linkServicioEjecutado: string | null;
}

interface ServiciosEvaluadosProps {
  onDashboardChange?: (dashboard: 'proveedores' | 'servicios') => void;
  activeDashboard?: 'proveedores' | 'servicios';
}

const ServiciosEvaluados: React.FC<ServiciosEvaluadosProps> = ({ onDashboardChange, activeDashboard: externalActiveDashboard }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [servicios, setServicios] = useState<ServicioEvaluado[]>([]);
  
  // Si se usa desde Dashboard, usar el estado externo, sino usar el de la ruta
  const isDashboardProveedores = externalActiveDashboard ? externalActiveDashboard === 'proveedores' : location.pathname.includes('/dashboard');
  const isDashboardServicios = externalActiveDashboard ? externalActiveDashboard === 'servicios' : location.pathname.includes('/servicios-evaluados');
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('Todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [searchEspecialidad, setSearchEspecialidad] = useState('');
  const [showAllEspecialidades, setShowAllEspecialidades] = useState(false);
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

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

  // Calcular KPIs
  const kpis = useMemo(() => {
    // Filtrar servicios excluyendo proveedor "PRUEBA"
    const serviciosFiltrados = servicios.filter(s => 
      s.nombreProveedor.toUpperCase() !== 'PRUEBA' && 
      s.nombreProveedor.toUpperCase() !== 'PRUEBAS'
    );
    
    const total = serviciosFiltrados.length;
    
    // Calcular promedio de nota_total_ponderada
    const serviciosConNota = serviciosFiltrados.filter(s => s.notaTotalPonderada !== null && s.notaTotalPonderada !== undefined);
    const promedio = serviciosConNota.length > 0
      ? Math.round(serviciosConNota.reduce((sum, s) => sum + (s.notaTotalPonderada || 0), 0) / serviciosConNota.length * 100)
      : 0;

    // Contar servicios con categoría A
    const categoriaA = serviciosFiltrados.filter(s => s.categoria === 'A').length;
    
    // Contar servicios con categoría C
    const categoriaC = serviciosFiltrados.filter(s => s.categoria === 'C').length;

    // Calcular servicios nuevos este mes
    const ahora = new Date();
    const primerDiaMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const serviciosHastaMesAnterior = serviciosFiltrados.filter(s => {
      if (!s.fechaEvaluacion) return false;
      const fechaEval = new Date(s.fechaEvaluacion);
      return fechaEval < primerDiaMesActual;
    }).length;
    const nuevosEsteMes = total - serviciosHastaMesAnterior;

    return {
      total,
      promedio,
      categoriaA,
      categoriaC,
      nuevosEsteMes,
      porcentajeA: total > 0 ? Math.round((categoriaA / total) * 100) : 0,
    };
  }, [servicios]);

  // Servicios por especialidad
  const serviciosPorEspecialidad = useMemo(() => {
    // Filtrar servicios excluyendo proveedor "PRUEBA"
    const serviciosFiltrados = servicios.filter(s => 
      s.nombreProveedor.toUpperCase() !== 'PRUEBA' && 
      s.nombreProveedor.toUpperCase() !== 'PRUEBAS'
    );
    
    const especialidadesMap = especialidades.map(especialidad => {
      const cantidad = serviciosFiltrados.filter(servicio => 
        servicio.especialidad === especialidad.nombre
      ).length;
      return { nombre: especialidad.nombre, cantidad };
    });

    // Filtrar solo las que tienen servicios y ordenar por cantidad (mayor a menor)
    let filtered = especialidadesMap
      .filter(item => item.cantidad > 0)
      .sort((a, b) => {
        if (b.cantidad !== a.cantidad) {
          return b.cantidad - a.cantidad;
        }
        return a.nombre.localeCompare(b.nombre);
      });

    // Aplicar filtro de búsqueda si existe
    if (searchEspecialidad.trim()) {
      const normalizedSearchEspecialidad = normalizeSearchText(searchEspecialidad);
      filtered = filtered.filter((item) =>
        normalizeSearchText(item.nombre).includes(normalizedSearchEspecialidad)
      );
    }

    return filtered;
  }, [servicios, especialidades, searchEspecialidad]);

  const isSearchingEspecialidad = searchEspecialidad.trim().length > 0;
  const showOnlyTopEspecialidades = !showAllEspecialidades && !isSearchingEspecialidad;
  const especialidadesVisibles = showOnlyTopEspecialidades
    ? serviciosPorEspecialidad.slice(0, 10)
    : serviciosPorEspecialidad;
  const canToggleEspecialidades = !isSearchingEspecialidad && serviciosPorEspecialidad.length > 10;

  // Filtrar servicios excluyendo proveedor "PRUEBA" para cálculos
  const serviciosSinPrueba = useMemo(() => {
    return servicios.filter(s => 
      s.nombreProveedor.toUpperCase() !== 'PRUEBA' && 
      s.nombreProveedor.toUpperCase() !== 'PRUEBAS'
    );
  }, [servicios]);

  // Mejores especialidades evaluadas
  const mejoresEspecialidades = useMemo(() => {
    // Agrupar servicios por especialidad
    const especialidadesMap = new Map<string, {
      nombre: string;
      servicios: ServicioEvaluado[];
      promedio: number;
      cantidadA: number;
      totalServicios: number;
    }>();

    serviciosSinPrueba.forEach(servicio => {
      if (!servicio.especialidad) return;
      
      if (!especialidadesMap.has(servicio.especialidad)) {
        especialidadesMap.set(servicio.especialidad, {
          nombre: servicio.especialidad,
          servicios: [],
          promedio: 0,
          cantidadA: 0,
          totalServicios: 0,
        });
      }

      const especialidad = especialidadesMap.get(servicio.especialidad)!;
      especialidad.servicios.push(servicio);
      especialidad.totalServicios++;
      
      if (servicio.categoria === 'A') {
        especialidad.cantidadA++;
      }
    });

    // Calcular promedio para cada especialidad
    especialidadesMap.forEach((especialidad) => {
      const serviciosConNota = especialidad.servicios.filter(
        s => s.notaTotalPonderada !== null && s.notaTotalPonderada !== undefined
      );
      
      if (serviciosConNota.length > 0) {
        const suma = serviciosConNota.reduce(
          (sum, s) => sum + (s.notaTotalPonderada || 0), 
          0
        );
        especialidad.promedio = suma / serviciosConNota.length;
      }
    });

    // Convertir a array y ordenar por mejor rendimiento
    // Priorizar: más servicios categoría A, luego mayor promedio
    const especialidadesArray = Array.from(especialidadesMap.values())
      .filter(esp => esp.totalServicios > 0)
      .sort((a, b) => {
        // Primero por cantidad de servicios categoría A (más es mejor)
        if (b.cantidadA !== a.cantidadA) {
          return b.cantidadA - a.cantidadA;
        }
        // Luego por promedio más alto (mayor es mejor)
        return b.promedio - a.promedio;
      })
      .slice(0, 10); // Top 10 mejores

    return especialidadesArray;
  }, [serviciosSinPrueba]);

  // Peores especialidades evaluadas
  const peoresEspecialidades = useMemo(() => {
    // Agrupar servicios por especialidad
    const especialidadesMap = new Map<string, {
      nombre: string;
      servicios: ServicioEvaluado[];
      promedio: number;
      cantidadC: number;
      totalServicios: number;
    }>();

    serviciosSinPrueba.forEach(servicio => {
      if (!servicio.especialidad) return;
      
      if (!especialidadesMap.has(servicio.especialidad)) {
        especialidadesMap.set(servicio.especialidad, {
          nombre: servicio.especialidad,
          servicios: [],
          promedio: 0,
          cantidadC: 0,
          totalServicios: 0,
        });
      }

      const especialidad = especialidadesMap.get(servicio.especialidad)!;
      especialidad.servicios.push(servicio);
      especialidad.totalServicios++;
      
      if (servicio.categoria === 'C') {
        especialidad.cantidadC++;
      }
    });

    // Calcular promedio para cada especialidad
    especialidadesMap.forEach((especialidad) => {
      const serviciosConNota = especialidad.servicios.filter(
        s => s.notaTotalPonderada !== null && s.notaTotalPonderada !== undefined
      );
      
      if (serviciosConNota.length > 0) {
        const suma = serviciosConNota.reduce(
          (sum, s) => sum + (s.notaTotalPonderada || 0), 
          0
        );
        especialidad.promedio = suma / serviciosConNota.length;
      }
    });

    // Convertir a array y ordenar por peor rendimiento
    // Ordenar SOLO por promedio más bajo (menor es peor)
    const especialidadesArray = Array.from(especialidadesMap.values())
      .filter(esp => esp.totalServicios > 0 && esp.promedio > 0) // Solo las que tienen promedio calculado
      .sort((a, b) => {
        // Ordenar solo por promedio más bajo (menor es peor)
        return a.promedio - b.promedio;
      })
      .slice(0, 10); // Top 10 peores

    return especialidadesArray;
  }, [serviciosSinPrueba]);

  // Iconos para especialidades (mapeo basado en palabras clave del nombre)
  const getComponentIcon = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    
    // Mapeo basado en palabras clave
    if (nombreLower.includes('aire') || nombreLower.includes('calidad del aire')) return 'air';
    if (nombreLower.includes('agua') && !nombreLower.includes('hidrogeología')) return 'water_drop';
    if (nombreLower.includes('hidrogeología')) return 'waves';
    if (nombreLower.includes('hidrología') || nombreLower.includes('hidrologia')) return 'water_drop';
    if (nombreLower.includes('ruido') || nombreLower.includes('acústica') || nombreLower.includes('acustica')) return 'hearing';
    if (nombreLower.includes('geología') || nombreLower.includes('geologia')) return 'terrain';
    if (nombreLower.includes('lumínica') || nombreLower.includes('luminica') || nombreLower.includes('luminotecnia')) return 'lightbulb';
    if (nombreLower.includes('medio humano')) return 'people';
    if (nombreLower.includes('antropología') || nombreLower.includes('antropologia')) return 'account_circle';
    if (nombreLower.includes('topografía') || nombreLower.includes('topografia')) return 'map';
    if (nombreLower.includes('arquitectura')) return 'architecture';
    if (nombreLower.includes('cartografía') || nombreLower.includes('cartografia')) return 'public';
    if (nombreLower.includes('paisaje') || nombreLower.includes('paisajismo')) return 'landscape';
    if (nombreLower.includes('turismo')) return 'explore';
    if (nombreLower.includes('laboratorio')) return 'science';
    if (nombreLower.includes('glaciares')) return 'ac_unit';
    if (nombreLower.includes('olores')) return 'mood';
    if (nombreLower.includes('fauna') || nombreLower.includes('vegetación') || nombreLower.includes('vegetacion') || nombreLower.includes('flora')) return 'category';
    if (nombreLower.includes('suelo') || nombreLower.includes('suelos')) return 'terrain';
    if (nombreLower.includes('difusión') || nombreLower.includes('difusion')) return 'campaign';
    if (nombreLower.includes('erosión') || nombreLower.includes('erosion')) return 'terrain';
    if (nombreLower.includes('eólica') || nombreLower.includes('eolica')) return 'air';
    if (nombreLower.includes('campo electromagnético') || nombreLower.includes('campo electromagnetico')) return 'bolt';
    if (nombreLower.includes('hongos') || nombreLower.includes('líquenes') || nombreLower.includes('liquenes')) return 'eco';
    
    // Por defecto
    return 'category';
  };

  // Filtrar servicios
  const filteredServicios = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    return servicios.filter((servicio) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        normalizeSearchText(servicio.nombreProveedor).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.nombreProyecto).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.codigoProyecto).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.actividad).includes(normalizedSearchTerm) ||
        normalizeSearchText(servicio.rut).includes(normalizedSearchTerm);
      
      const matchesEspecialidad = filterEspecialidad === 'Todas' || servicio.especialidad === filterEspecialidad;
      const matchesCategoria = filterCategoria === 'Todas' || servicio.categoria === filterCategoria;

      return matchesSearch && matchesEspecialidad && matchesCategoria;
    });
  }, [servicios, searchTerm, filterEspecialidad, filterCategoria]);

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const paginatedServicios = filteredServicios.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando servicios evaluados...</p>
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

  const content = (
    <>
        {/* Header - Solo mostrar si NO se usa desde Dashboard */}
        {!onDashboardChange && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                  Dashboard de Servicios
                </h1>
                <p className="text-sm text-gray-500">
                  Listado de todos los servicios evaluados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(getAreaPath('dashboard'))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isDashboardProveedores
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">groups</span>
                  <span>Dashboard de Proveedores</span>
                </button>
                <button
                  onClick={() => navigate(getAreaPath('servicios-evaluados'))}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isDashboardServicios
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">description</span>
                  <span>Dashboard de Servicios</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Servicios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Servicios</p>
                <p className="text-3xl font-bold text-[#111318]">{kpis.total}</p>
                <p className={`text-xs mt-2 ${kpis.nuevosEsteMes >= 0 ? 'text-gray-500' : 'text-red-500'}`}>
                  {kpis.nuevosEsteMes >= 0 ? '+' : ''}{kpis.nuevosEsteMes} este mes
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">description</span>
              </div>
            </div>
          </div>

          {/* Promedio General */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Promedio General</p>
                <p className="text-3xl font-bold text-[#111318]">{kpis.promedio}%</p>
                <p className="text-xs text-gray-500 mt-2">cumplimiento mes actual</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-yellow-600 text-2xl">star</span>
              </div>
            </div>
          </div>

          {/* Top Performers (A) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Top Performers (A)</p>
                <p className="text-3xl font-bold text-[#111318]">{kpis.categoriaA}</p>
                <p className="text-xs text-gray-500 mt-2">{kpis.porcentajeA}% del total</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">diamond</span>
              </div>
            </div>
          </div>

          {/* Inhabilitados (C) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Inhabilitados (C)</p>
                <p className="text-3xl font-bold text-[#111318]">{kpis.categoriaC}</p>
                <p className="text-xs text-red-500 mt-2">No Contratar</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">block</span>
              </div>
            </div>
          </div>
        </div>

        {/* Servicios por Especialidad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">groups</span>
              <h2 className="text-lg font-bold text-[#111318]">Servicios por Especialidad</h2>
            </div>
            <span className="text-sm text-gray-500">
              {showOnlyTopEspecialidades
                ? `Mostrando 10 de ${serviciosPorEspecialidad.length} especialidades`
                : `${serviciosPorEspecialidad.length} especialidades`}
            </span>
          </div>
          <div className="mb-4">
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                value={searchEspecialidad}
                onChange={(e) => setSearchEspecialidad(e.target.value)}
                placeholder="Buscar especialidad..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {especialidadesVisibles.map((especialidad, index) => (
              <div
                key={index}
                onClick={() => {
                  if (onDashboardChange) {
                    // Si se usa desde Dashboard, navegar a EvaluacionesTabla
                    navigate(getAreaPath('evaluaciones-tabla'), {
                      state: { especialidad: especialidad.nombre }
                    });
                  } else {
                    // Si se usa como ruta independiente, filtrar en la misma vista
                    setFilterEspecialidad(especialidad.nombre);
                    setCurrentPage(1);
                  }
                }}
                className="flex flex-col items-center p-2 rounded-lg border border-gray-200 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                  <span className="material-symbols-outlined text-primary text-lg">
                    {getComponentIcon(especialidad.nombre)}
                  </span>
                </div>
                <p className="text-[11px] leading-tight font-medium text-[#111318] text-center mb-0.5 min-h-[2rem] flex items-center">
                  {especialidad.nombre}
                </p>
                <p className="text-base font-bold text-primary">{especialidad.cantidad}</p>
              </div>
            ))}
          </div>
          {canToggleEspecialidades && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowAllEspecialidades((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {showAllEspecialidades ? 'Ver menos' : 'Ver más'}
                <span className="material-symbols-outlined text-base">
                  {showAllEspecialidades ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Distribución por Clasificación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#111318] mb-4">Distribución por Clasificación</h2>
          <div className="mb-4">
            <div className="flex h-8 rounded-lg overflow-hidden">
              {(() => {
                // Filtrar servicios excluyendo proveedor "PRUEBA"
                const serviciosFiltrados = servicios.filter(s => 
                  s.nombreProveedor.toUpperCase() !== 'PRUEBA' && 
                  s.nombreProveedor.toUpperCase() !== 'PRUEBAS'
                );
                const categoriaA = serviciosFiltrados.filter(s => s.categoria === 'A').length;
                const categoriaB = serviciosFiltrados.filter(s => s.categoria === 'B').length;
                const categoriaC = serviciosFiltrados.filter(s => s.categoria === 'C').length;
                const total = categoriaA + categoriaB + categoriaC;
                
                const distribucion = [
                  { nombre: 'Categoría A', cantidad: categoriaA, porcentaje: total > 0 ? Math.round((categoriaA / total) * 100) : 0, color: '#10b981' },
                  { nombre: 'Categoría B', cantidad: categoriaB, porcentaje: total > 0 ? Math.round((categoriaB / total) * 100) : 0, color: '#eab308' },
                  { nombre: 'Categoría C', cantidad: categoriaC, porcentaje: total > 0 ? Math.round((categoriaC / total) * 100) : 0, color: '#ef4444' },
                ];

                return distribucion.map((item, index) => {
                  const clasificacion = item.nombre === 'Categoría A' ? 'A' : 
                                       item.nombre === 'Categoría B' ? 'B' : 'C';
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-center text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        width: `${item.porcentaje}%`,
                        backgroundColor: item.color,
                      }}
                      onClick={() => {
                        navigate(getAreaPath('evaluaciones-tabla'), {
                          state: { categoria: clasificacion }
                        });
                      }}
                      title={`Ver servicios ${item.nombre}`}
                    >
                      {item.porcentaje > 0 && `${item.porcentaje}%`}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {(() => {
              // Filtrar servicios excluyendo proveedor "PRUEBA"
              const serviciosFiltrados = servicios.filter(s => 
                s.nombreProveedor.toUpperCase() !== 'PRUEBA' && 
                s.nombreProveedor.toUpperCase() !== 'PRUEBAS'
              );
              const categoriaA = serviciosFiltrados.filter(s => s.categoria === 'A').length;
              const categoriaB = serviciosFiltrados.filter(s => s.categoria === 'B').length;
              const categoriaC = serviciosFiltrados.filter(s => s.categoria === 'C').length;
              
              const distribucion = [
                { nombre: 'Categoría A', cantidad: categoriaA, color: '#10b981' },
                { nombre: 'Categoría B', cantidad: categoriaB, color: '#eab308' },
                { nombre: 'Categoría C', cantidad: categoriaC, color: '#ef4444' },
              ];

              return distribucion.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {item.nombre} ({item.cantidad} servicios)
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top 10 Mejores Especialidades Evaluadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600">trending_up</span>
                <h2 className="text-lg font-bold text-[#111318]">Top 10 Mejores Especialidades Evaluadas</h2>
              </div>
            </div>
            {mejoresEspecialidades.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {mejoresEspecialidades.map((especialidad, index) => (
                  <div
                    key={especialidad.nombre}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(getAreaPath('evaluaciones-tabla'), {
                        state: { especialidad: especialidad.nombre }
                      });
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-green-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111318] truncate">{especialidad.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {especialidad.totalServicios} {especialidad.totalServicios === 1 ? 'servicio' : 'servicios'}
                        </span>
                        {especialidad.cantidadA > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                              {especialidad.cantidadA} categoría A
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-sm font-semibold whitespace-nowrap ${
                        especialidad.promedio > 0.764 ? 'text-green-600' :
                        especialidad.promedio > 0.5 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {especialidad.promedio > 0
                          ? `${Math.round(especialidad.promedio * 100)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No hay especialidades con evaluaciones</p>
              </div>
            )}
          </div>

          {/* Peores Especialidades Evaluadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">trending_down</span>
                <h2 className="text-lg font-bold text-[#111318]">Peores Especialidades Evaluadas</h2>
              </div>
            </div>
            {peoresEspecialidades.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {peoresEspecialidades.map((especialidad, index) => (
                  <div
                    key={especialidad.nombre}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-red-300 transition-colors cursor-pointer"
                    onClick={() => {
                      navigate(getAreaPath('evaluaciones-tabla'), {
                        state: { especialidad: especialidad.nombre }
                      });
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      index === 0 ? 'bg-red-500 text-white' :
                      index === 1 ? 'bg-red-400 text-white' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-orange-300 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111318] truncate">{especialidad.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {especialidad.totalServicios} {especialidad.totalServicios === 1 ? 'servicio' : 'servicios'}
                        </span>
                        {especialidad.cantidadC > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                              {especialidad.cantidadC} categoría C
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-sm font-semibold whitespace-nowrap ${
                        especialidad.promedio < 0.5 ? 'text-red-600' :
                        especialidad.promedio < 0.764 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {especialidad.promedio > 0
                          ? `${Math.round(especialidad.promedio * 100)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No hay especialidades con evaluaciones</p>
              </div>
            )}
          </div>
        </div>
    </>
  );

  // Si se usa desde Dashboard (con onDashboardChange), no incluir el wrapper
  if (onDashboardChange) {
    return content;
  }

  // Si se usa como ruta independiente, incluir el wrapper completo
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {content}
      </div>
    </div>
  );
};

export default ServiciosEvaluados;

