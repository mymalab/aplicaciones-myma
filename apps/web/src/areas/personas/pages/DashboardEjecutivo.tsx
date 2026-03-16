import React, { useState, useEffect, useMemo } from 'react';
import { fetchPersonas } from '../services/personasService';
import { fetchFormacionesAcademicas } from '../services/formacionAcademicaService';
import { PersonaWithDetails, FormacionAcademica } from '../types';

interface DashboardMetrics {
  totalPersonas: number;
  totalPersonasAnterior: number;
  crecimientoPorcentual: number;
  distribucionGenero: {
    mujeres: number;
    hombres: number;
    porcentajeMujeres: number;
  };
  distribucionContrato: {
    myma: number;
    mlp: number;
    dsal: number;
  };
  especialidades: Array<{
    nombre: string;
    cantidad: number;
    porcentaje: number;
  }>;
  cumpleanosMes: Array<{
    id: number;
    nombre: string;
    fecha: string;
    gerencia: string;
    iniciales: string;
  }>;
  formacionAcademica: {
    universitario: number;
    postgrado: number;
  };
  cvsActualizados: number;
  rotacionAnual: number;
  nuevasCertificaciones: number;
}

const DashboardEjecutivo: React.FC = () => {
  const [personas, setPersonas] = useState<PersonaWithDetails[]>([]);
  const [formaciones, setFormaciones] = useState<FormacionAcademica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personasData, formacionesData] = await Promise.all([
        fetchPersonas(),
        fetchFormacionesAcademicas()
      ]);
      setPersonas(personasData);
      setFormaciones(formacionesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas del dashboard
  const metrics = useMemo((): DashboardMetrics => {
    // Usar datos dummy si no hay personas cargadas
    const totalPersonas = personas.length > 0 ? personas.length : 96;
    const totalPersonasAnterior = Math.round(totalPersonas * 0.958); // Simular mes anterior (4.2% menos)
    const crecimientoPorcentual = totalPersonasAnterior > 0 
      ? ((totalPersonas - totalPersonasAnterior) / totalPersonasAnterior) * 100 
      : 4.2;

    // Distribución de género - siempre usar datos dummy
    // Datos dummy: 63% mujeres
    const porcentajeMujeres = 63;
    const mujeres = Math.round(totalPersonas * (porcentajeMujeres / 100));
    const hombres = totalPersonas - mujeres;

    // Distribución por contrato - datos dummy
    const distribucionContrato = {
      myma: 86,
      mlp: 7,
      dsal: 3
    };

    // Datos dummy de especialidades (siempre usar datos dummy por ahora)
    const especialidades: Array<{ nombre: string; cantidad: number; porcentaje: number }> = [
      {
        nombre: 'SEIA (Sistema de Evaluación de Impacto Ambiental)',
        cantidad: 45,
        porcentaje: 47.4
      },
      {
        nombre: 'Soporte',
        cantidad: 17,
        porcentaje: 17.9
      },
      {
        nombre: 'Permisos',
        cantidad: 16,
        porcentaje: 16.8
      },
      {
        nombre: 'Especialistas',
        cantidad: 10,
        porcentaje: 10.5
      },
      {
        nombre: 'P. Riesgos',
        cantidad: 4,
        porcentaje: 4.2
      },
      {
        nombre: 'I+D',
        cantidad: 3,
        porcentaje: 3.2
      }
    ];

    // Cumpleaños del mes
    const mesActual = new Date().getMonth() + 1;
    const cumpleanosMes = personas
      .filter(p => {
        if (!p.fecha_nacimiento || p.fecha_nacimiento === '-') return false;
        try {
          const fecha = new Date(p.fecha_nacimiento.split('/').reverse().join('-'));
          return fecha.getMonth() + 1 === mesActual;
        } catch {
          return false;
        }
      })
      .slice(0, 5)
      .map(p => {
        const nombres = p.nombre_completo?.split(' ') || [];
        const iniciales = (nombres[0]?.[0] || '') + (nombres[1]?.[0] || '');
        let fecha = '';
        try {
          if (p.fecha_nacimiento && p.fecha_nacimiento !== '-') {
            const fechaObj = new Date(p.fecha_nacimiento.split('/').reverse().join('-'));
            fecha = `${String(fechaObj.getDate()).padStart(2, '0')}/${String(fechaObj.getMonth() + 1).padStart(2, '0')}`;
          }
        } catch {
          fecha = '-';
        }
        return {
          id: p.id,
          nombre: p.nombre_completo || '',
          fecha,
          gerencia: p.gerencia_nombre || 'OPERACIONES',
          iniciales: iniciales || 'NN'
        };
      });

    // Formación académica
    const universitario = formaciones.filter(f => 
      f.tipo === 'Pregrado'
    ).length;
    const postgrado = formaciones.filter(f => 
      ['Postitulo', 'Magister', 'Doctorado'].includes(f.tipo)
    ).length;
    const totalFormaciones = formaciones.length;
    const porcentajeUniversitario = totalFormaciones > 0 ? (universitario / totalFormaciones) * 100 : 0;
    const porcentajePostgrado = totalFormaciones > 0 ? (postgrado / totalFormaciones) * 100 : 0;

    return {
      totalPersonas,
      totalPersonasAnterior,
      crecimientoPorcentual: parseFloat(crecimientoPorcentual.toFixed(1)),
      distribucionGenero: {
        mujeres,
        hombres,
        porcentajeMujeres: parseFloat(porcentajeMujeres.toFixed(0))
      },
      distribucionContrato,
      especialidades,
      cumpleanosMes,
      formacionAcademica: {
        universitario: parseFloat(porcentajeUniversitario.toFixed(0)),
        postgrado: parseFloat(porcentajePostgrado.toFixed(0))
      },
      cvsActualizados: Math.round(totalPersonas * 0.88),
      rotacionAnual: 3.1,
      nuevasCertificaciones: 12
    };
  }, [personas, formaciones]);

  // Las métricas siempre se calculan, incluso durante la carga, usando datos dummy si es necesario

  // Obtener mes y año actual en formato "FEBRERO DE 2026"
  const fechaActual = new Date();
  const mesActual = fechaActual.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
  const añoActual = fechaActual.getFullYear();
  const mesAñoFormato = `${mesActual} DE ${añoActual}`;

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#111318] mb-6">Dashboard Ejecutivo</h1>
        
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar personal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors">
            <span className="material-symbols-outlined">add</span>
            Nueva Persona
          </button>
        </div>
      </div>

      {/* Primera fila - 4 componentes ocupando todo el ancho */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Personas */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">Colaboradores</h3>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-lg">groups</span>
            </div>
          </div>
          <div className="text-4xl font-bold text-[#111318] mb-2">{metrics.totalPersonas}</div>
          <div className="flex items-center gap-1.5 text-green-600">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span className="text-xs font-medium">{metrics.crecimientoPorcentual}% vs mes anterior</span>
          </div>
        </div>

        {/* Distribución de Género */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-0.5">Distribución de Género</h3>
            <p className="text-xs text-gray-500">Representación femenina actual</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-3xl font-bold text-[#111318] mb-0.5">{metrics.distribucionGenero.porcentajeMujeres}%</div>
              <div className="text-xs text-gray-600">MUJERES</div>
            </div>
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 42 * (metrics.distribucionGenero.porcentajeMujeres / 100)} ${2 * Math.PI * 42}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">♀</span>
              </div>
            </div>
          </div>
        </div>

        {/* Distribución por Contrato */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Distribución por Contrato</h3>
          <div className="flex flex-col items-center gap-2">
            {/* Gráfico de Pie */}
            {(() => {
              const totalContratos = metrics.distribucionContrato.myma + metrics.distribucionContrato.mlp + metrics.distribucionContrato.dsal;
              const radio = 42; // Mismo radio que el gráfico de género
              const circunferencia = 2 * Math.PI * radio;
              const porcentajeMYMA = metrics.distribucionContrato.myma / totalContratos;
              const porcentajeMLP = metrics.distribucionContrato.mlp / totalContratos;
              const porcentajeDSAL = metrics.distribucionContrato.dsal / totalContratos;
              
              const dashMYMA = circunferencia * porcentajeMYMA;
              const dashMLP = circunferencia * porcentajeMLP;
              const dashDSAL = circunferencia * porcentajeDSAL;
              
              const offsetMLP = -dashMYMA;
              const offsetDSAL = -(dashMYMA + dashMLP);
              
              return (
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    {/* Círculo de fondo */}
                    <circle
                      cx="48"
                      cy="48"
                      r={radio}
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Segmento MYMA (azul) */}
                    <circle
                      cx="48"
                      cy="48"
                      r={radio}
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${dashMYMA} ${circunferencia}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Segmento MLP (verde) */}
                    <circle
                      cx="48"
                      cy="48"
                      r={radio}
                      stroke="#10b981"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${dashMLP} ${circunferencia}`}
                      strokeDashoffset={offsetMLP}
                      strokeLinecap="round"
                    />
                    {/* Segmento DSAL (gris) */}
                    <circle
                      cx="48"
                      cy="48"
                      r={radio}
                      stroke="#9ca3af"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${dashDSAL} ${circunferencia}`}
                      strokeDashoffset={offsetDSAL}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              );
            })()}
            
            {/* Leyenda */}
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">MYMA</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{metrics.distribucionContrato.myma}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600">MLP</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{metrics.distribucionContrato.mlp}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                  <span className="text-xs text-gray-600">DSAL</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{metrics.distribucionContrato.dsal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CVs Actualizados */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">CVs Actualizados</h3>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-gray-600 text-lg">description</span>
            </div>
          </div>
          <div className="text-4xl font-bold text-[#111318] mb-2">
            {Math.round((metrics.cvsActualizados / metrics.totalPersonas) * 100)}%
          </div>
          <div className="text-xs text-gray-600">
            {metrics.cvsActualizados} de {metrics.totalPersonas} colaboradores
          </div>
        </div>
      </div>

      {/* Dashboard Grid - Resto de componentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Especialidades y Roles Detallados */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Especialidades y Roles Detallados</h3>
              <p className="text-xs text-gray-500">
                Distribución de capacidades técnicas sobre el total de {metrics.totalPersonas} colaboradores
              </p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">{mesAñoFormato}</span>
          </div>
          <div className="space-y-4">
            {metrics.especialidades && metrics.especialidades.length > 0 ? (
              metrics.especialidades.slice(0, 6).map((esp, idx) => {
              // Determinar el color de la barra según el índice
              const barColor = idx === 0 
                ? 'bg-teal-600' // Teal oscuro para SEIA (primera barra)
                : idx < 3 
                  ? 'bg-gray-600' // Gris oscuro para Soporte y Permisos
                  : 'bg-gray-400'; // Gris claro para Especialistas, P. Riesgos e I+D
              
              // Formato del nombre: agregar el número entre paréntesis para las últimas dos
              const nombreDisplay = idx >= 4 
                ? `${esp.nombre} (${esp.cantidad})`
                : esp.nombre;
              
              // Formato del valor según el índice
              let valorDisplay = '';
              if (idx === 0) {
                // SEIA: "45 Personas (47.4%)"
                valorDisplay = `${esp.cantidad} Personas (${esp.porcentaje.toFixed(1)}%)`;
              } else if (idx < 4) {
                // Soporte, Permisos, Especialistas: "17 / 17.9%"
                valorDisplay = `${esp.cantidad} / ${esp.porcentaje.toFixed(1)}%`;
              } else {
                // P. Riesgos e I+D: solo el número (ya está en el nombre)
                valorDisplay = '';
              }
              
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{nombreDisplay}</span>
                    {valorDisplay && (
                      <span className="text-sm font-semibold text-gray-700">
                        {valorDisplay}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(esp.porcentaje, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No hay datos de especialidades disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Cumpleaños del mes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Cumpleaños del mes</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              {new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            {metrics.cumpleanosMes.length > 0 ? (
              metrics.cumpleanosMes.map((persona) => (
                <div key={persona.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {persona.iniciales}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">{persona.nombre}</div>
                    <div className="text-xs text-gray-500">{persona.gerencia}</div>
                  </div>
                  <div className="text-sm text-gray-600">{persona.fecha}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay cumpleaños este mes</p>
            )}
          </div>
        </div>

        {/* Formación Académica */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">FORMACIÓN ACADÉMICA</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">UNIVERSITARIO</span>
                <span className="text-sm font-semibold text-gray-700">{metrics.formacionAcademica.universitario}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${metrics.formacionAcademica.universitario}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">POSTGRADO</span>
                <span className="text-sm font-semibold text-gray-700">{metrics.formacionAcademica.postgrado}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full"
                  style={{ width: `${metrics.formacionAcademica.postgrado}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Rotación Anual */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-gray-400">swap_horiz</span>
          <div>
            <div className="text-3xl font-bold text-[#111318]">{metrics.rotacionAnual}%</div>
            <div className="text-sm text-gray-600">ROTACIÓN ANUAL</div>
          </div>
        </div>

        {/* Nuevas Certificaciones */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-gray-400">verified</span>
          <div>
            <div className="text-3xl font-bold text-[#111318]">{metrics.nuevasCertificaciones}</div>
            <div className="text-sm text-gray-600">NUEVAS CERTIFIC.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEjecutivo;

