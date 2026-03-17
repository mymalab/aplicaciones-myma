import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Proveedor, TipoProveedor, Especialidad, Clasificacion } from '../types';
import { AreaId } from '@contracts/areas';
import { fetchProveedores, ProveedorResponse, fetchEspecialidadesPriorizadasByRuts, fetchEspecialidades } from '../services/proveedoresService';
import { usePermissions } from '@shared/rbac/usePermissions';
import { normalizeSearchText } from '../utils/search';


interface ContactoDetalleProveedor {
  nombre: string;
  correo: string;
  telefono: string;
  cargo: string;
}

interface InformacionContactoProveedor {
  contacto_comercial: ContactoDetalleProveedor;
  contacto_adicional_1: ContactoDetalleProveedor;
  contacto_adicional_2: ContactoDetalleProveedor;
}

interface ProveedorConContacto extends Proveedor {
  contactoCorreo: string;
  contactoCargo: string;
  contactoSinValidar: boolean;
  informacionContacto: InformacionContactoProveedor;
}

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

const displayOrPlaceholder = (value: string): string => {
  const trimmed = value.trim();
  return trimmed === '' ? 'Sin definir' : trimmed;
};

const ProveedoresActuales: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, loading: loadingPermissions } = usePermissions(AreaId.PROVEEDORES);
  const [proveedores, setProveedores] = useState<ProveedorConContacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('Todas');
  const [filterClasificacion, setFilterClasificacion] = useState<string>('Todas');
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [contactoDetalleProveedor, setContactoDetalleProveedor] = useState<ProveedorConContacto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Verificar si solo tiene permiso de view (no tiene create, edit, delete)
  // TambiAn deshabilitar mientras se cargan los permisos
  const onlyViewPermission = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:view`) &&
    !hasPermission(`${AreaId.PROVEEDORES}:create`) &&
    !hasPermission(`${AreaId.PROVEEDORES}:edit`) &&
    !hasPermission(`${AreaId.PROVEEDORES}:delete`);

  // Solo el admin de proveedores puede crear nuevos proveedores
  const isProveedoresAdmin = !loadingPermissions && hasPermission(`${AreaId.PROVEEDORES}:admin`);

  // Mapear ProveedorResponse a Proveedor
  const mapProveedorResponseToProveedor = (
    response: ProveedorResponse,
    especialidadesPorRut: Record<string, string[]>
  ): ProveedorConContacto => {
    // Mapear tipo_proveedor a TipoProveedor enum
    let tipo: TipoProveedor = TipoProveedor.EMPRESA;
    if (response.tipo_proveedor === 'Persona natural') {
      tipo = TipoProveedor.PERSONA;
    }

    // Usar categoria_proveedor directamente de la base de datos
    // Mapear categoria_proveedor string a Clasificacion enum
    let clasificacion: Clasificacion = Clasificacion.A;
    const categoriaProveedor = response.categoria_proveedor || response.clasificacion;
    if (categoriaProveedor) {
      switch (categoriaProveedor.toUpperCase()) {
        case 'A':
          clasificacion = Clasificacion.A;
          break;
        case 'B':
          clasificacion = Clasificacion.B;
          break;
        case 'C':
          clasificacion = Clasificacion.C;
          break;
        case 'D':
          clasificacion = Clasificacion.D;
          break;
        default:
          clasificacion = Clasificacion.A;
      }
    }
    // Obtener especialidades priorizadas por RUT
    const rut = response.rut?.trim() || '';
    const especialidades = rut ? (especialidadesPorRut[rut] ?? []) : [];
    const informacionContactoObj = toPlainObject(response.informacion_contacto);
    const contactoComercial = toContactoDetalleProveedor(informacionContactoObj.contacto_comercial);
    const contactoAdicional1 = toContactoDetalleProveedor(informacionContactoObj.contacto_adicional_1);
    const contactoAdicional2 = toContactoDetalleProveedor(informacionContactoObj.contacto_adicional_2);

    const correoContactoFallback = toText(response.correo_contacto);
    const tieneInformacionContacto =
      hasContactoDetalleData(contactoComercial) ||
      hasContactoDetalleData(contactoAdicional1) ||
      hasContactoDetalleData(contactoAdicional2);

    const contactoCorreo = tieneInformacionContacto
      ? contactoComercial.correo
      : correoContactoFallback;
    const contactoCargo = tieneInformacionContacto ? contactoComercial.cargo : '';
    const contactoSinValidar = !tieneInformacionContacto && correoContactoFallback.length > 0;

    // Usar promedio_nota_total_ponderada si estA disponible, sino usar evaluacion
    // El promedio_nota_total_ponderada viene en formato decimal (0-1), SIEMPRE multiplicar por 100 para porcentaje
    let evaluacionPromedio: number | null = null;
    if (response.promedio_nota_total_ponderada !== null && response.promedio_nota_total_ponderada !== undefined) {
      // Siempre multiplicar por 100 porque viene en formato decimal (0-1)
      // Ejemplo: 1.0 en decimal = 100%, 0.01 en decimal = 1%
      evaluacionPromedio = response.promedio_nota_total_ponderada * 100;
      console.log('Evaluacion promedio:', {
        valorOriginal: response.promedio_nota_total_ponderada,
        valorConvertido: evaluacionPromedio,
        proveedor: response.nombre_proveedor,
        rut: response.rut,
      });
    } else {
      evaluacionPromedio = response.evaluacion !== null && response.evaluacion !== undefined ? response.evaluacion : null;
    }
    
    // Generar dato dummy para tieneServiciosEjecutados
    // Si tiene evaluaciAn promedio, asumimos que tiene servicios ejecutados
    const tieneEvaluacion = evaluacionPromedio !== null && evaluacionPromedio !== undefined && evaluacionPromedio > 0;
    const tieneServiciosEjecutados = tieneEvaluacion 
      ? true 
      : (response.id % 10 < 7); // 70% de probabilidad basado en el ID

    // Si no tiene servicios ejecutados, no deberAa tener evaluaciAn ni clasificaciAn
    // evaluacionPromedio ya estA en formato porcentaje (0-100) despuAs de multiplicar por 100
    const evaluacionFinal = tieneServiciosEjecutados 
      ? (evaluacionPromedio !== null && evaluacionPromedio !== undefined 
          ? Math.round(evaluacionPromedio) // Redondear a entero para mostrar como porcentaje
          : 0)
      : 0;
    const clasificacionFinal = tieneServiciosEjecutados ? clasificacion : Clasificacion.A; // Mantener tipo pero no se mostrarA
    
    console.log('Evaluacion final para mostrar:', {
      proveedor: response.nombre_proveedor,
      rut: response.rut,
      promedioOriginal: response.promedio_nota_total_ponderada,
      evaluacionPromedio,
      evaluacionFinal,
      tieneServiciosEjecutados,
    });

    return {
      id: response.id,
      nombre: response.nombre_proveedor,
      razonSocial: response.razon_social || undefined,
      rut,
      tipo,
      especialidad: especialidades.length > 0 ? especialidades : [], // Array de especialidades
      email: contactoCorreo || undefined,
      contacto: contactoCorreo || undefined,
      contactoCorreo,
      contactoCargo,
      contactoSinValidar,
      informacionContacto: {
        contacto_comercial: contactoComercial,
        contacto_adicional_1: contactoAdicional1,
        contacto_adicional_2: contactoAdicional2,
      },
      evaluacion: evaluacionFinal,
      clasificacion: clasificacionFinal,
      activo: true,
      tieneServiciosEjecutados,
      cantidad_a: response.cantidad_a ?? 0,
      cantidad_b: response.cantidad_b ?? 0,
      cantidad_c: response.cantidad_c ?? 0,
      total_evaluaciones: response.total_evaluaciones ?? 0,
      cruce: (response as any).cruce ?? (response as any).Cruce ?? null,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  };

  // Cargar categorAas desde Supabase
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const data = await fetchEspecialidades();
        setCategorias(data);
      } catch (err) {
        console.error('Error al cargar categorAas:', err);
      } finally {
        setLoadingCategorias(false);
      }
    };

    loadCategorias();
  }, []);

  // Cargar proveedores desde Supabase
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProveedores();
        const ruts = Array.from(
          new Set(
            data
              .map((proveedor) => proveedor.rut?.trim() || '')
              .filter((rut) => rut.length > 0)
          )
        );
        const especialidadesPorRut = await fetchEspecialidadesPriorizadasByRuts(ruts);
        const mappedProveedores = data.map((proveedor) =>
          mapProveedorResponseToProveedor(proveedor, especialidadesPorRut)
        );
        setProveedores(mappedProveedores);
      } catch (err: any) {
        console.error('Error al cargar proveedores:', err);
        setError('Error al cargar los proveedores. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadProveedores();
  }, []);

  // Leer parAmetro de especialidad de la URL y aplicar filtro
  useEffect(() => {
    const especialidadParam = searchParams.get('especialidad');
    if (especialidadParam && proveedores.length > 0) {
      // Buscar si existe una especialidad que coincida con el parAmetro
      const especialidadesUnicas = Array.from(new Set(proveedores.flatMap((p) => p.especialidad)));
      const especialidadParamNormalized = normalizeSearchText(especialidadParam);
      const especialidadEncontrada = especialidadesUnicas.find(
        (esp) => normalizeSearchText(esp) === especialidadParamNormalized
      );
      
      if (especialidadEncontrada) {
        setFilterEspecialidad(especialidadEncontrada);
        // Limpiar el parAmetro de la URL despuAs de aplicarlo
        searchParams.delete('especialidad');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, proveedores, setSearchParams]);

  // Leer parametro de RUT de la URL y aplicarlo al buscador
  useEffect(() => {
    const rutParam = searchParams.get('rut');
    if (!rutParam) {
      return;
    }

    setSearchTerm(rutParam);
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('rut');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Leer parAmetro de clasificaciAn de la URL
  useEffect(() => {
    const clasificacionParam = searchParams.get('clasificacion');
    if (clasificacionParam && (clasificacionParam === 'A' || clasificacionParam === 'B' || clasificacionParam === 'C')) {
      setFilterClasificacion(clasificacionParam as Clasificacion);
    }
  }, [searchParams]);

  // Leer parAmetro de evaluaciAn menor a 60% y aplicar filtro de clasificaciAn C
  useEffect(() => {
    const evaluacionMenor60 = searchParams.get('evaluacionMenor60');
    if (evaluacionMenor60 === 'true') {
      setFilterClasificacion(Clasificacion.C);
      // Limpiar el parAmetro de la URL despuAs de aplicarlo
      searchParams.delete('evaluacionMenor60');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Filtrar proveedores
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredProveedores = proveedores.filter((proveedor) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      normalizeSearchText(proveedor.nombre).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.razonSocial).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.rut).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.email).includes(normalizedSearchTerm);

    const matchesTipo = filterTipo === 'Todos' || proveedor.tipo === filterTipo;
    const matchesEspecialidad = filterEspecialidad === 'Todas' || proveedor.especialidad.includes(filterEspecialidad);
    const matchesClasificacion = filterClasificacion === 'Todas' || proveedor.clasificacion === filterClasificacion;

    return matchesSearch && matchesTipo && matchesEspecialidad && matchesClasificacion;
  });

  // PaginaciAn
  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProveedores = filteredProveedores.slice(startIndex, endIndex);

  const getEspecialidadColor = (especialidad: string) => {
    // Paleta de colores para especialidades
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

    // FunciAn hash simple para asignar color de forma consistente
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

  const getClasificacionColor = (clasificacion: Clasificacion) => {
    const colors: Record<Clasificacion, string> = {
      [Clasificacion.A]: 'bg-green-100 text-green-700',
      [Clasificacion.B]: 'bg-yellow-100 text-yellow-700',
      [Clasificacion.C]: 'bg-orange-100 text-orange-700',
      [Clasificacion.D]: 'bg-red-100 text-red-700',
    };
    return colors[clasificacion];
  };

  const getEvaluacionColor = (evaluacion: number) => {
    // Nueva lAgica: convertir porcentaje a decimal (0-1) y aplicar umbrales
    const cumplimiento = evaluacion / 100;
    if (cumplimiento > 0.764) return 'bg-green-500';
    if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isInformacionActualizada = (cruce: string | null | undefined): boolean => {
    const normalizedCruce = normalizeSearchText(cruce).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalizedCruce.includes('informacion actualizada');
  };

  const showContactoAdicional1 = contactoDetalleProveedor
    ? hasContactoDetalleData(contactoDetalleProveedor.informacionContacto.contacto_adicional_1)
    : false;
  const showContactoAdicional2 = contactoDetalleProveedor
    ? hasContactoDetalleData(contactoDetalleProveedor.informacionContacto.contacto_adicional_2)
    : false;

  const contactosVisiblesCount = 1 + (showContactoAdicional1 ? 1 : 0) + (showContactoAdicional2 ? 1 : 0);

  const contactoModalMaxWidthClass =
    contactosVisiblesCount === 1
      ? 'max-w-2xl'
      : contactosVisiblesCount === 2
      ? 'max-w-4xl'
      : 'max-w-5xl';

  const contactoModalGridClass =
    contactosVisiblesCount === 1
      ? 'grid-cols-1'
      : contactosVisiblesCount === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-3';

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Proveedores Actuales
              </h1>
              <p className="text-sm text-gray-500">
                Gestion y control de la base de datos de proveedores activos y vigentes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(getAreaPath('actuales/nuevo'))}
                disabled={loadingPermissions || !isProveedoresAdmin}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Nuevo Proveedor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* BAsqueda */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                BUSCAR
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Nombre, RUT o Email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Tipo de Proveedor */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                TIPO DE PROVEEDOR
              </label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todos">Todos los tipos</option>
                <option value={TipoProveedor.EMPRESA}>Empresa</option>
                <option value={TipoProveedor.PERSONA}>Persona</option>
              </select>
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                ESPECIALIDAD
              </label>
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas las especialidades</option>
                {Array.from(new Set(proveedores.flatMap((p) => p.especialidad)))
                  .sort()
                  .map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
              </select>
            </div>

            {/* ClasificaciAn */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                CLASIFICACION
              </label>
              <select
                value={filterClasificacion}
                onChange={(e) => setFilterClasificacion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas las clasificaciones</option>
                <option value={Clasificacion.A}>A</option>
                <option value={Clasificacion.B}>B</option>
                <option value={Clasificacion.C}>C</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando proveedores...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No se encontraron proveedores.</p>
            </div>
          ) : (
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
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-20 text-left py-4 px-6 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50">
                      NOMBRE / RAZON SOCIAL
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                      CLASIFICACION
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">RUT / TIPO</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CONTACTO</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 w-[132px] min-w-[132px]">
                      ESTADO
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUACION</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"># EVALUACIONES</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"># A</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"># B</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"># C</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProveedores.map((proveedor) => (
                    <tr
                      key={proveedor.id}
                      onClick={() => navigate(getAreaPath(`actuales/${proveedor.id}`))}
                      className="group border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="sticky left-0 z-10 py-4 px-6 bg-white group-hover:bg-blue-50">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111318]">{proveedor.nombre}</span>
                          {proveedor.razonSocial && proveedor.razonSocial !== proveedor.nombre && (
                            <span className="text-sm text-gray-500">{proveedor.razonSocial}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {proveedor.tieneServiciosEjecutados ? (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getClasificacionColor(
                              proveedor.clasificacion
                            )}`}
                          >
                            {proveedor.clasificacion}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-[#111318]">{proveedor.rut}</span>
                          <span className="text-xs text-gray-500">{proveedor.tipo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {proveedor.especialidad.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {proveedor.especialidad.map((esp, index) => (
                              <span
                                key={index}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEspecialidadColor(esp)}`}
                              >
                                {esp}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          {proveedor.contactoCorreo ? (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400 text-sm">email</span>
                              <span className="text-sm text-[#111318] truncate max-w-[200px]">{proveedor.contactoCorreo}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin correo comercial</span>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400 text-sm">badge</span>
                            <span className={`text-xs ${proveedor.contactoCargo ? 'text-gray-600' : 'text-gray-400'}`}>
                              {proveedor.contactoCargo || 'Sin cargo comercial'}
                            </span>
                          </div>

                          {proveedor.contactoSinValidar && (
                            <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Sin validar
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContactoDetalleProveedor(proveedor);
                            }}
                            className="self-start text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                          >
                            Ver detalle
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 bg-white group-hover:bg-blue-50 w-[132px] min-w-[132px]">
                        <div className="flex items-center justify-center">
                          {isInformacionActualizada(proveedor.cruce) ? (
                            <span className="material-symbols-outlined text-xl text-green-600" title="Informacion actualizada">
                              check_circle
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-xl text-amber-500" title="Informacion no actualizada">
                              warning
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {proveedor.tieneServiciosEjecutados ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                              <div
                                className={`h-2 rounded-full transition-all ${getEvaluacionColor(proveedor.evaluacion)}`}
                                style={{ width: `${proveedor.evaluacion}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#111318] min-w-[40px]">
                              {proveedor.evaluacion}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-[#111318]">
                          {proveedor.total_evaluaciones ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-[#111318]">
                          {proveedor.cantidad_a ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-[#111318]">
                          {proveedor.cantidad_b ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-[#111318]">
                          {proveedor.cantidad_c ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {isProveedoresAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getAreaPath(`actuales/${proveedor.id}/editar`));
                            }}
                            disabled={loadingPermissions}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
          )}

          {/* PaginaciAn */}
          {!loading && !error && filteredProveedores.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProveedores.length)} de{' '}
              {filteredProveedores.length} resultados
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


        {contactoDetalleProveedor && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setContactoDetalleProveedor(null)}
          >
            <div
              className={`w-full ${contactoModalMaxWidthClass} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-gray-200`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-lg font-bold text-[#111318]">Detalle de Informacion de Contacto</h3>
                  <p className="text-sm text-gray-500">{contactoDetalleProveedor.nombre}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactoDetalleProveedor(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar detalle de contacto"
                >
                  <span className="material-symbols-outlined text-gray-600">close</span>
                </button>
              </div>

              <div className={`p-6 grid ${contactoModalGridClass} gap-4`}>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800 mb-3">Contacto Comercial</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Nombre:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_comercial.nombre)}</p>
                    <p><span className="font-medium text-gray-700">Correo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_comercial.correo)}</p>
                    <p><span className="font-medium text-gray-700">Telefono:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_comercial.telefono)}</p>
                    <p><span className="font-medium text-gray-700">Cargo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_comercial.cargo)}</p>
                  </div>
                </div>

                {showContactoAdicional1 && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Contacto Adicional 1</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium text-gray-700">Nombre:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_1.nombre)}</p>
                      <p><span className="font-medium text-gray-700">Correo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_1.correo)}</p>
                      <p><span className="font-medium text-gray-700">Telefono:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_1.telefono)}</p>
                      <p><span className="font-medium text-gray-700">Cargo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_1.cargo)}</p>
                    </div>
                  </div>
                )}

                {showContactoAdicional2 && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Contacto Adicional 2</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium text-gray-700">Nombre:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_2.nombre)}</p>
                      <p><span className="font-medium text-gray-700">Correo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_2.correo)}</p>
                      <p><span className="font-medium text-gray-700">Telefono:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_2.telefono)}</p>
                      <p><span className="font-medium text-gray-700">Cargo:</span> {displayOrPlaceholder(contactoDetalleProveedor.informacionContacto.contacto_adicional_2.cargo)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ProveedoresActuales;





