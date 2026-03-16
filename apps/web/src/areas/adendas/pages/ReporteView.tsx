import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPreguntasReporte,
  type PreguntaReporteData,
} from '../services/preguntasService';
import { adendasPregunta } from '../utils/routes';

interface AlertaPregunta {
  id: string;
  codigoMyma: string;
  preguntaId: number;
  pregunta: string;
  detalle: string;
  complejidad: 'Alta' | 'Media' | 'Baja';
  especialidad: string;
  estado: 'Retrasado' | 'En Proceso' | 'No iniciado';
  accion: string;
}

interface AvanceEspecialidad {
  nombre: string;
  completadas: number;
  total: number;
  porcentaje: number;
}

const ESTADO_ALERTA_RANK: Record<AlertaPregunta['estado'], number> = {
  Retrasado: 1,
  'En Proceso': 2,
  'No iniciado': 3,
};

const mapEstadoToAlerta = (
  estado: PreguntaReporteData['estado']
): AlertaPregunta['estado'] => {
  if (estado === 'En revisión') {
    return 'En Proceso';
  }
  if (estado === 'Pendientes') {
    return 'No iniciado';
  }
  return 'Retrasado';
};

const truncateText = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
};

const ReporteView: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaReporteData[]>([]);
  const [especialidadFiltro, setEspecialidadFiltro] = useState('Todas');
  const [showAllAlertas, setShowAllAlertas] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReporte = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchPreguntasReporte();

        if (!isMounted) return;
        setPreguntas(data);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error loading reporte preguntas:', err);
        setError(err?.message || 'No fue posible cargar el reporte de preguntas.');
        setPreguntas([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReporte();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalPreguntas = preguntas.length;
  const completadas = preguntas.filter(
    (pregunta) => pregunta.estado === 'Completadas'
  ).length;
  const enDesarrollo = preguntas.filter(
    (pregunta) => pregunta.estado === 'En revisión'
  ).length;
  const noIniciadas = preguntas.filter(
    (pregunta) => pregunta.estado === 'Pendientes'
  ).length;

  const altaComplejidad = preguntas.filter(
    (pregunta) => pregunta.complejidad === 'Alta'
  ).length;
  const mediaComplejidad = preguntas.filter(
    (pregunta) => pregunta.complejidad === 'Media'
  ).length;
  const bajaComplejidad = preguntas.filter(
    (pregunta) => pregunta.complejidad === 'Baja'
  ).length;

  const porcentajeCompletadas =
    totalPreguntas > 0 ? Math.round((completadas / totalPreguntas) * 100) : 0;
  const porcentajeEnDesarrollo =
    totalPreguntas > 0 ? Math.round((enDesarrollo / totalPreguntas) * 100) : 0;
  const porcentajeNoIniciadas =
    totalPreguntas > 0 ? Math.round((noIniciadas / totalPreguntas) * 100) : 0;

  const porcentajeAlta =
    totalPreguntas > 0 ? Math.round((altaComplejidad / totalPreguntas) * 100) : 0;
  const porcentajeMedia =
    totalPreguntas > 0 ? Math.round((mediaComplejidad / totalPreguntas) * 100) : 0;
  const porcentajeBaja =
    totalPreguntas > 0 ? Math.round((bajaComplejidad / totalPreguntas) * 100) : 0;

  const radio = 60;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDasharrayCompletadas = (porcentajeCompletadas / 100) * circunferencia;
  const strokeDasharrayEnDesarrollo = (porcentajeEnDesarrollo / 100) * circunferencia;
  const strokeDasharrayNoIniciadas = (porcentajeNoIniciadas / 100) * circunferencia;

  const avancePorEspecialidad = useMemo<AvanceEspecialidad[]>(() => {
    const grouped = new Map<string, { completadas: number; total: number }>();

    for (const pregunta of preguntas) {
      const key = pregunta.especialidad_nombre || 'Sin especialidad';
      const current = grouped.get(key) || { completadas: 0, total: 0 };
      current.total += 1;
      if (pregunta.estado === 'Completadas') {
        current.completadas += 1;
      }
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .map(([nombre, value]) => ({
        nombre,
        completadas: value.completadas,
        total: value.total,
        porcentaje:
          value.total > 0 ? Math.round((value.completadas / value.total) * 100) : 0,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [preguntas]);

  const opcionesEspecialidad = useMemo(() => {
    return avancePorEspecialidad.map((item) => item.nombre);
  }, [avancePorEspecialidad]);

  useEffect(() => {
    if (
      especialidadFiltro !== 'Todas' &&
      !opcionesEspecialidad.includes(especialidadFiltro)
    ) {
      setEspecialidadFiltro('Todas');
    }
  }, [especialidadFiltro, opcionesEspecialidad]);

  const alertasBase = useMemo<AlertaPregunta[]>(() => {
    return preguntas
      .filter(
        (pregunta) =>
          pregunta.complejidad === 'Alta' && pregunta.estado !== 'Completadas'
      )
      .map((pregunta) => {
        const codigoMyma =
          pregunta.codigo_myma ||
          (pregunta.adenda_id !== null ? String(pregunta.adenda_id) : '');

        return {
          id: pregunta.numero_formateado,
          codigoMyma,
          preguntaId: pregunta.id,
          pregunta: truncateText(pregunta.texto, 100),
          detalle: truncateText(
            pregunta.detalle_alerta || 'Sin detalle adicional.',
            120
          ),
          complejidad: pregunta.complejidad,
          especialidad: pregunta.especialidad_nombre || 'Sin especialidad',
          estado: mapEstadoToAlerta(pregunta.estado),
          accion: 'Revisar',
        };
      })
      .sort((a, b) => {
        const byEstado =
          ESTADO_ALERTA_RANK[a.estado] - ESTADO_ALERTA_RANK[b.estado];
        if (byEstado !== 0) {
          return byEstado;
        }
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      });
  }, [preguntas]);

  const alertasFiltradas = useMemo(() => {
    if (especialidadFiltro === 'Todas') return alertasBase;
    return alertasBase.filter(
      (alerta) => alerta.especialidad === especialidadFiltro
    );
  }, [especialidadFiltro, alertasBase]);

  const alertasVisibles = useMemo(() => {
    return showAllAlertas ? alertasFiltradas : alertasFiltradas.slice(0, 3);
  }, [showAllAlertas, alertasFiltradas]);

  const avanceFiltrado = useMemo(() => {
    if (especialidadFiltro === 'Todas') return avancePorEspecialidad;
    return avancePorEspecialidad.filter(
      (item) => item.nombre === especialidadFiltro
    );
  }, [especialidadFiltro, avancePorEspecialidad]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Retrasado':
        return 'bg-red-100 text-red-800';
      case 'En Proceso':
        return 'bg-yellow-100 text-yellow-800';
      case 'No iniciado':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoDot = (estado: string) => {
    switch (estado) {
      case 'Retrasado':
        return 'bg-red-500';
      case 'En Proceso':
        return 'bg-yellow-500';
      case 'No iniciado':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 80) return 'bg-green-500';
    if (porcentaje >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">
            Reporte de Cumplimiento y Avance
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Estado General de Preguntas
            </h3>
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#10b981"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayCompletadas} ${circunferencia}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#f59e0b"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayEnDesarrollo} ${circunferencia}`}
                    strokeDashoffset={-strokeDasharrayCompletadas}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#9ca3af"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayNoIniciadas} ${circunferencia}`}
                    strokeDashoffset={
                      -(strokeDasharrayCompletadas + strokeDasharrayEnDesarrollo)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#111318]">{totalPreguntas}</p>
                    <p className="text-xs text-gray-500">TOTAL</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  <span className="text-sm text-gray-600">Completadas</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {completadas} ({porcentajeCompletadas}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm text-gray-600">En desarrollo</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {enDesarrollo} ({porcentajeEnDesarrollo}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  <span className="text-sm text-gray-600">No iniciadas</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {noIniciadas} ({porcentajeNoIniciadas}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Resumen de Complejidad
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Alta</span>
                  <span className="text-sm font-semibold text-red-600">
                    {altaComplejidad} preg{' '}
                    <span className="text-gray-500">{porcentajeAlta}% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full"
                    style={{ width: `${porcentajeAlta}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Media</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {mediaComplejidad} preg{' '}
                    <span className="text-gray-500">{porcentajeMedia}% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full"
                    style={{ width: `${porcentajeMedia}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Baja</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {bajaComplejidad} preg{' '}
                    <span className="text-gray-500">{porcentajeBaja}% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${porcentajeBaja}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">warning</span>
              <h2 className="text-lg font-semibold text-[#111318]">
                Alertas: Preguntas Complejas Pendientes
              </h2>
            </div>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
              {alertasFiltradas.length} cr{alertasFiltradas.length === 1 ? 'ítica' : 'íticas'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PREGUNTA / TÍTULO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COMPLEJIDAD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESPECIALIDAD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESTADO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACCIÓN
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alertasVisibles.map((alerta) => (
                  <tr
                    key={`${alerta.codigoMyma}-${alerta.preguntaId}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#111318]">
                        {alerta.id}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-[#111318]">
                        {alerta.pregunta}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{alerta.detalle}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {alerta.complejidad}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#111318]">{alerta.especialidad}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${getEstadoDot(alerta.estado)}`}
                        ></span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(
                            alerta.estado
                          )}`}
                        >
                          {alerta.estado}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {alerta.codigoMyma ? (
                        <button
                          onClick={() =>
                            navigate(
                              adendasPregunta(alerta.codigoMyma, String(alerta.preguntaId))
                            )
                          }
                          className="text-sm text-primary hover:text-primary-hover hover:underline"
                        >
                          {alerta.accion}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">Sin ruta</span>
                      )}
                    </td>
                  </tr>
                ))}
                {alertasVisibles.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500 text-center" colSpan={6}>
                      No hay alertas para la especialidad seleccionada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-right">
            <button
              onClick={() => setShowAllAlertas((prev) => !prev)}
              className="text-sm text-primary hover:text-primary-hover hover:underline"
            >
              {showAllAlertas ? 'Ver menos alertas' : 'Ver todas las alertas ->'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#111318]">
              Avance por Especialidad
            </h2>
            <select
              value={especialidadFiltro}
              onChange={(event) => setEspecialidadFiltro(event.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="Todas">Todas</option>
              {opcionesEspecialidad.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {avanceFiltrado.map((especialidad) => (
              <div key={especialidad.nombre}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">
                    {especialidad.nombre}
                  </span>
                  <span className="text-sm font-semibold text-[#111318]">
                    {especialidad.porcentaje}% ({especialidad.completadas}/
                    {especialidad.total} completadas)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getProgressColor(
                      especialidad.porcentaje
                    )}`}
                    style={{ width: `${especialidad.porcentaje}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {avanceFiltrado.length === 0 && (
              <p className="text-sm text-gray-500">
                Sin datos de avance para la especialidad seleccionada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteView;
