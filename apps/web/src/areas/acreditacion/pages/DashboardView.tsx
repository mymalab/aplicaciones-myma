import React from 'react';
import {
  fetchDashboardKpis,
  fetchDashboardTiemposEvolucionAnual,
  fetchDashboardActividadEvolucionAnual,
  fetchDashboardTareasPendientesPorResponsable,
} from '../services/acreditacionService';
import type {
  DashboardKpis,
  DashboardTiempoMensual,
  DashboardActividadMensual,
  DashboardPendientesResponsableItem,
} from '../services/acreditacionService';
import {
  AreaChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardViewProps {
  // Por ahora no necesita props, pero se puede extender en el futuro
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RESPONSABLE_COLORS: Record<DashboardPendientesResponsableItem['responsable'], string> = {
  JPRO: 'hsl(217, 91%, 60%)',
  EPR: 'hsl(160, 72%, 42%)',
  RRHH: 'hsl(38, 92%, 50%)',
  Legal: 'hsl(4, 90%, 58%)',
  Otros: 'hsl(220, 9%, 46%)',
};

const buildEmptyTiemposData = (): DashboardTiempoMensual[] =>
  MONTH_LABELS.map((mes) => ({
    mes,
    promedio: null,
    minimo: null,
    maximo: null,
    cantidad: 0,
  }));

const buildEmptyActividadData = (): DashboardActividadMensual[] =>
  MONTH_LABELS.map((mes) => ({
    mes,
    solicitudes: 0,
    completadas: 0,
    pendientes: 0,
    atrasadas: 0,
    cumplimiento: 0,
  }));

const buildEmptyPendientesResponsableData = (): DashboardPendientesResponsableItem[] => [
  { responsable: 'JPRO', cantidad: 0 },
  { responsable: 'EPR', cantidad: 0 },
  { responsable: 'RRHH', cantidad: 0 },
  { responsable: 'Legal', cantidad: 0 },
  { responsable: 'Otros', cantidad: 0 },
];

const DashboardView: React.FC<DashboardViewProps> = () => {
  // Estado para controlar el modal del gráfico ampliado
  const [isActivityChartModalOpen, setIsActivityChartModalOpen] = React.useState(false);
  const [dashboardKpis, setDashboardKpis] = React.useState<DashboardKpis>({
    totalSolicitudes: 0,
    totalTasksCompleted: 0,
    totalTasksAll: 0,
    tasaCumplimiento: 0,
    solicitudesPendientes: 0,
    solicitudesAtrasadas: 0,
    tiempoPromedioDias: 0,
    proyectosFinalizados: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [statsError, setStatsError] = React.useState<string | null>(null);
  const [tiemposEvolucionData, setTiemposEvolucionData] = React.useState<DashboardTiempoMensual[]>(
    () => buildEmptyTiemposData()
  );
  const [tiemposError, setTiemposError] = React.useState<string | null>(null);
  const [actividadData, setActividadData] = React.useState<DashboardActividadMensual[]>(
    () => buildEmptyActividadData()
  );
  const [activityError, setActivityError] = React.useState<string | null>(null);
  const [pendientesResponsableData, setPendientesResponsableData] = React.useState<
    DashboardPendientesResponsableItem[]
  >(() => buildEmptyPendientesResponsableData());
  const [responsablesError, setResponsablesError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      const [kpisResult, tiemposResult, actividadResult, responsablesResult] = await Promise.allSettled([
        fetchDashboardKpis(),
        fetchDashboardTiemposEvolucionAnual(),
        fetchDashboardActividadEvolucionAnual(),
        fetchDashboardTareasPendientesPorResponsable(),
      ]);

      if (!isMounted) return;

      if (kpisResult.status === 'fulfilled') {
        setDashboardKpis(kpisResult.value);
        setStatsError(null);
      } else {
        console.error('Error cargando metricas del dashboard:', kpisResult.reason);
        const errorMessage =
          kpisResult.reason instanceof Error
            ? kpisResult.reason.message
            : 'Error desconocido al consultar la base de datos.';
        setStatsError(`No se pudieron cargar las metricas: ${errorMessage}`);
      }

      if (tiemposResult.status === 'fulfilled') {
        setTiemposEvolucionData(tiemposResult.value);
        setTiemposError(null);
      } else {
        console.error('Error cargando evolucion de tiempos:', tiemposResult.reason);
        const errorMessage =
          tiemposResult.reason instanceof Error
            ? tiemposResult.reason.message
            : 'Error desconocido al consultar la base de datos.';
        setTiemposEvolucionData(buildEmptyTiemposData());
        setTiemposError(`No se pudo cargar la evolucion de tiempos: ${errorMessage}`);
      }

      if (actividadResult.status === 'fulfilled') {
        setActividadData(actividadResult.value);
        setActivityError(null);
      } else {
        console.error('Error cargando evolucion de actividad:', actividadResult.reason);
        const errorMessage =
          actividadResult.reason instanceof Error
            ? actividadResult.reason.message
            : 'Error desconocido al consultar la base de datos.';
        setActividadData(buildEmptyActividadData());
        setActivityError(`No se pudo cargar la evolucion de actividad: ${errorMessage}`);
      }

      if (responsablesResult.status === 'fulfilled') {
        setPendientesResponsableData(responsablesResult.value);
        setResponsablesError(null);
      } else {
        console.error(
          'Error cargando tareas pendientes por responsable:',
          responsablesResult.reason
        );
        const errorMessage =
          responsablesResult.reason instanceof Error
            ? responsablesResult.reason.message
            : 'Error desconocido al consultar la base de datos.';
        setPendientesResponsableData(buildEmptyPendientesResponsableData());
        setResponsablesError(
          `No se pudieron cargar las tareas pendientes por responsable: ${errorMessage}`
        );
      }

      setIsLoadingStats(false);
    };

    loadStats();

    const interval = window.setInterval(loadStats, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);
  const currentYear = new Date().getFullYear();

  // Custom Tooltip para el gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Buscar el payload de cumplimiento
      const cumplimientoEntry = payload.find((entry: any) => entry.dataKey === 'cumplimiento');
      const data = payload[0]?.payload;
      
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#111318] mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              // Omitir el entry de cumplimiento de la lista normal
              if (entry.dataKey === 'cumplimiento') return null;
              
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[#111318]">{entry.value}</span>
                </div>
              );
            })}
            {/* Mostrar cumplimiento al final con color amarillo */}
            {cumplimientoEntry && data && (
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600">Cumplimiento</span>
                </div>
                <span className="text-sm font-bold text-yellow-600">{data.cumplimiento}%</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip para gráfico de tiempos de acreditación
  const TiemposTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const validEntries = payload.filter((entry: any) => typeof entry.value === 'number');

      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#111318] mb-3">{label}</p>
          {validEntries.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos en este mes</p>
          ) : (
            <div className="space-y-2">
              {validEntries.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-[#111318]">{entry.value} días</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Función para renderizar el gráfico de Evolución de Actividad
  const renderActivityChart = (heightClass: string = 'h-[220px]') => (
    <div className={`${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={actividadData}
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCompletadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAtrasadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 90%, 40%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(0, 90%, 40%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            vertical={false}
          />
          <XAxis 
            dataKey="mes" 
            stroke="#6b7280"
            fontSize={13}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={13}
            fontWeight={500}
            tickLine={false}
            axisLine={false}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={() => null} />
          <Area
            type="monotone"
            dataKey="solicitudes"
            name="Solicitudes"
            stroke="hsl(243, 75%, 59%)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSolicitudes)"
            dot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 0, r: 0 }}
            activeDot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 3, stroke: 'white', r: 6 }}
          />
          <Area
            type="monotone"
            dataKey="completadas"
            name="Completadas"
            stroke="hsl(160, 72%, 42%)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorCompletadas)"
            dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
            activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 3, stroke: 'white', r: 6 }}
          />
          <Area
            type="monotone"
            dataKey="pendientes"
            name="Pendientes"
            stroke="hsl(4, 90%, 58%)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorPendientes)"
            dot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 0, r: 0 }}
            activeDot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 3, stroke: 'white', r: 6 }}
          />
          <Area
            type="monotone"
            dataKey="atrasadas"
            name="Atrasadas"
            stroke="hsl(0, 90%, 40%)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorAtrasadas)"
            dot={{ fill: 'hsl(0, 90%, 40%)', strokeWidth: 0, r: 0 }}
            activeDot={{ fill: 'hsl(0, 90%, 40%)', strokeWidth: 3, stroke: 'white', r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="cumplimiento"
            name="Cumplimiento"
            stroke="#eab308"
            strokeWidth={2.5}
            dot={{ fill: '#eab308', strokeWidth: 2, stroke: 'white', r: 5 }}
            activeDot={{ fill: '#eab308', strokeWidth: 3, stroke: 'white', r: 7 }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // Datos para gráfico de tareas pendientes por responsable
  const tareasPendientesPorResponsable = pendientesResponsableData.map((item) => ({
    ...item,
    color: RESPONSABLE_COLORS[item.responsable],
  }));

  const totalTareasPendientes = tareasPendientesPorResponsable.reduce((acc, item) => acc + item.cantidad, 0);

  // Datos para grafico de evolucion de tiempos de acreditacion
  // Datos del grafico de evolucion de tiempos se cargan desde BD en estado React

  // KPIs conectados a datos reales de solicitudes y requerimientos
  const {
    totalSolicitudes,
    totalTasksCompleted,
    totalTasksAll,
    tasaCumplimiento,
    solicitudesPendientes,
    solicitudesAtrasadas,
    tiempoPromedioDias,
    proyectosFinalizados,
  } = dashboardKpis;

  // KPIs principales
  const stats = [
    {
      title: 'Total Solicitudes',
      value: isLoadingStats ? '...' : totalSolicitudes.toString(),
      change: `${proyectosFinalizados} finalizadas`,
      positive: true,
      icon: 'description',
      iconBg: 'bg-[hsl(160,72%,42%)]',
    },
    {
      title: 'Tasa de Cumplimiento',
      value: isLoadingStats ? '...' : `${tasaCumplimiento}%`,
      change: totalTasksAll > 0 ? `${totalTasksCompleted}/${totalTasksAll} tareas` : 'Sin tareas',
      positive: tasaCumplimiento >= 80,
      icon: 'check_circle',
      iconBg: 'bg-[hsl(160,72%,42%)]',
    },
    {
      title: 'Solicitudes Pendientes',
      value: isLoadingStats ? '...' : solicitudesPendientes.toString(),
      change: 'No finalizadas',
      positive: false,
      icon: 'pending',
      iconBg: 'bg-amber-500',
    },
    {
      title: 'Solicitudes Atrasadas',
      value: isLoadingStats ? '...' : solicitudesAtrasadas.toString(),
      change: 'Estado atrasado',
      positive: solicitudesAtrasadas === 0,
      icon: 'warning',
      iconBg: 'bg-red-600',
    },
    {
      title: 'Tiempo Promedio',
      value: isLoadingStats ? '...' : `${tiempoPromedioDias} días`,
      change: proyectosFinalizados > 0 ? `${proyectosFinalizados} finalizadas` : 'Sin finalizadas',
      positive: true,
      icon: 'schedule',
      iconBg: 'bg-blue-500',
    },
  ];



  // Función para renderizar gráfico de líneas

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-2xl">bar_chart</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
                Dashboards de Acreditación
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                Análisis y métricas de gestión de solicitudes
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.iconBg} w-12 h-12 flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white text-xl">{stat.icon}</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    stat.positive ? 'text-[hsl(160,72%,42%)]' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-[#111318]">{stat.value}</p>
            </div>
          ))}
        </div>
        {statsError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {statsError}
          </div>
        )}

        {/* Gráfico de Evolución de Tiempos de Acreditación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[#111318]">
                  Evolución de Tiempos de Acreditación
                </h3>
                <p className="text-sm text-gray-500">
                  Tiempo promedio, minimo y maximo de acreditacion por mes (en dias) - {currentYear}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(217,91%,60%)]" />
                  <span className="text-sm text-gray-600">Promedio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(160,72%,42%)]" />
                  <span className="text-sm text-gray-600">Mínimo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(4,90%,58%)]" />
                  <span className="text-sm text-gray-600">Máximo</span>
                </div>
              </div>
            </div>
          </div>
          {tiemposError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {tiemposError}
            </div>
          )}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={tiemposEvolucionData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMinimo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMaximo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="mes" 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  label={{ value: 'Días', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                />
                <Tooltip content={<TiemposTooltip />} />
                <Legend content={() => null} />
                <Area
                  type="monotone"
                  dataKey="maximo"
                  name="Máximo"
                  stroke="hsl(4, 90%, 58%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMaximo)"
                  dot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="promedio"
                  name="Promedio"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPromedio)"
                  dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="minimo"
                  name="Mínimo"
                  stroke="hsl(160, 72%, 42%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMinimo)"
                  dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Evolución de Actividad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#111318] mb-1">
                    Evolución de Actividad
                  </h3>
                  <p className="text-sm text-gray-500">
                    Tendencias mensuales de solicitudes, completadas, pendientes y atrasadas
                  </p>
                </div>
                <button
                  onClick={() => setIsActivityChartModalOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                  title="Ampliar gráfico"
                >
                  <span className="material-symbols-outlined text-xl">open_in_full</span>
                </button>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(243,75%,59%)]" />
                  <span className="text-sm text-gray-600">Solicitudes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(160,72%,42%)]" />
                  <span className="text-sm text-gray-600">Completadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(4,90%,58%)]" />
                  <span className="text-sm text-gray-600">Pendientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0,90%,40%)]" />
                  <span className="text-sm text-gray-600">Atrasadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600">Cumplimiento</span>
                </div>
              </div>
            </div>
            {activityError && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {activityError}
              </div>
            )}
            {renderActivityChart('h-[220px]')}
          </div>

          {/* Gráfico de Tareas Pendientes por Responsable */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#111318]">Tareas Pendientes por Responsable</h3>
              <p className="text-sm text-gray-500 mt-1">Distribución de tareas pendientes según responsable</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-100">
              <span className="material-symbols-outlined text-gray-500 text-xl">assignment</span>
            </div>
          </div>
          {responsablesError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {responsablesError}
            </div>
          )}
          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-[240px] h-[240px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    offset={-50}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const porcentaje = totalTareasPendientes > 0
                          ? ((data.cantidad / totalTareasPendientes) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
                            <p className="text-sm font-semibold text-[#111318] mb-3">{data.responsable}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="text-sm text-gray-600">Cantidad</span>
                                </div>
                                <span className="text-sm font-medium text-[#111318]">{data.cantidad}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="text-sm text-gray-600">Porcentaje</span>
                                </div>
                                <span className="text-sm font-medium text-[#111318]">{porcentaje}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={tareasPendientesPorResponsable}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="cantidad"
                    strokeWidth={0}
                    nameKey="responsable"
                  >
                    {tareasPendientesPorResponsable.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-[#111318]">{totalTareasPendientes}</span>
                <span className="text-sm text-gray-500">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-4">
              {tareasPendientesPorResponsable.map((item, index) => {
                const porcentaje = totalTareasPendientes > 0
                  ? ((item.cantidad / totalTareasPendientes) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-[#111318]">{item.responsable}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-[#111318]">{item.cantidad}</span>
                      <span className="text-sm text-gray-500 w-12 text-right">{porcentaje}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>


        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#111318] mb-1">
                Resumen de Actividad Reciente
              </h3>
              <p className="text-sm text-gray-500">Últimas solicitudes procesadas</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">table_chart</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Solicitudes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Completadas</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pendientes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Atrasadas</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tasa de Éxito</th>
                </tr>
              </thead>
              <tbody>
                {actividadData.map((item, index) => {
                  const successRate = item.solicitudes > 0
                    ? ((item.completadas / item.solicitudes) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">{item.mes}</td>
                      <td className="py-3 px-4 text-sm text-[#111318]">{item.solicitudes}</td>
                      <td className="py-3 px-4 text-sm text-emerald-600 font-medium">{item.completadas}</td>
                      <td className="py-3 px-4 text-sm text-amber-600 font-medium">{item.pendientes}</td>
                      <td className="py-3 px-4 text-sm text-red-600 font-medium">{item.atrasadas}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#111318]">{successRate}%</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 max-w-32">
                            <div
                              className="bg-emerald-500 h-3 rounded-full"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para gráfico ampliado de Evolución de Actividad */}
        {isActivityChartModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsActivityChartModalOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="bg-gradient-to-br from-primary to-emerald-700 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-white text-xl">show_chart</span>
                  <div>
                    <h2 className="text-lg font-bold text-white">Evolución de Actividad</h2>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Tendencias mensuales de solicitudes, completadas, pendientes y atrasadas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsActivityChartModalOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
                  title="Cerrar"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Leyenda */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(243,75%,59%)]" />
                  <span className="text-sm text-gray-600 font-medium">Solicitudes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(160,72%,42%)]" />
                  <span className="text-sm text-gray-600 font-medium">Completadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(4,90%,58%)]" />
                  <span className="text-sm text-gray-600 font-medium">Pendientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0,90%,40%)]" />
                  <span className="text-sm text-gray-600 font-medium">Atrasadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600 font-medium">Cumplimiento</span>
                </div>
              </div>

              {/* Contenido - Gráfico Ampliado */}
              <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={actividadData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="colorSolicitudesModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCompletadasModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPendientesModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorAtrasadasModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 90%, 40%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(0, 90%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb" 
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="mes" 
                        stroke="#6b7280"
                        fontSize={14}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={14}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={() => null} />
                      <Area
                        type="monotone"
                        dataKey="solicitudes"
                        name="Solicitudes"
                        stroke="hsl(243, 75%, 59%)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSolicitudesModal)"
                        dot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 0, r: 0 }}
                        activeDot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 4, stroke: 'white', r: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completadas"
                        name="Completadas"
                        stroke="hsl(160, 72%, 42%)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorCompletadasModal)"
                        dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
                        activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 4, stroke: 'white', r: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pendientes"
                        name="Pendientes"
                        stroke="hsl(4, 90%, 58%)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPendientesModal)"
                        dot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 0, r: 0 }}
                        activeDot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 4, stroke: 'white', r: 8 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="atrasadas"
                        name="Atrasadas"
                        stroke="hsl(0, 90%, 40%)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorAtrasadasModal)"
                        dot={{ fill: 'hsl(0, 90%, 40%)', strokeWidth: 0, r: 0 }}
                        activeDot={{ fill: 'hsl(0, 90%, 40%)', strokeWidth: 4, stroke: 'white', r: 8 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumplimiento"
                        name="Cumplimiento"
                        stroke="#eab308"
                        strokeWidth={3}
                        dot={{ fill: '#eab308', strokeWidth: 2, stroke: 'white', r: 6 }}
                        activeDot={{ fill: '#eab308', strokeWidth: 4, stroke: 'white', r: 9 }}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardView;
