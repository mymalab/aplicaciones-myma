import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TipoAdenda, TIPOS_ADENDA } from '../constants';
import { adendasList } from '../utils/routes';

interface AdendaDetailViewProps {
  onBack?: () => void;
}

/**
 * Datos dummy para la vista de detalle
 */
const getDummyAdendaDetail = (codigoMyma: string): AdendaDetailData => {
  const dummyData: Record<string, AdendaDetailData> = {
    'MY-50-2025': {
      codigo_myma: 'MY-50-2025',
      nombre: 'Mina Las Cenizas',
      tipo: 'adenda',
      expediente: '2164006597',
      nombre_proyecto: 'Modificación Proyecto Mina Los Colorados: Ajustes y Continuidad Operacional',
      tipo_ingreso: 'Estudio de Impacto Ambiental',
      titular: 'Compañía Minera del Pacífico S.A.',
      tipologia_seia: 'Proyectos de desarrollo minero sobre 5.000 ton/mes',
      consultora: 'Minería y Medio Ambiente Ltda. (MYMA)',
      estado: 'En Calificación',
      autor: 'Servicio Evaluación Ambiental, III Región Atacama',
      correo_evaluador: 'exequiel.vega@sea.gob.cl',
      fecha_ingreso: '17/01/2025',
      plazo: 'Ver enlace',
      plazo_url: 'https://seia.sea.gob.cl/',
      nombre_evaluador: 'Exequiel Vega Segura',
    },
    'MY-15-2025': {
      codigo_myma: 'MY-15-2025',
      nombre: 'CMP',
      tipo: 'adenda',
      expediente: '2164006598',
      nombre_proyecto: 'Proyecto de Ampliación Minera CMP',
      tipo_ingreso: 'Declaración de Impacto Ambiental',
      titular: 'Compañía Minera del Pacífico S.A.',
      tipologia_seia: 'Proyectos de desarrollo minero sobre 5.000 ton/mes',
      consultora: 'Minería y Medio Ambiente Ltda. (MYMA)',
      estado: 'En Evaluación',
      autor: 'Servicio Evaluación Ambiental, III Región Atacama',
      correo_evaluador: 'evaluador@sea.gob.cl',
      fecha_ingreso: '20/01/2025',
      plazo: '120 días hábiles',
      nombre_evaluador: 'Evaluador Principal',
    },
    'MY-22-2025': {
      codigo_myma: 'MY-22-2025',
      nombre: 'Hidronor',
      tipo: 'adenda',
      expediente: '2164006599',
      nombre_proyecto: 'Proyecto Hidronor - Gestión Ambiental',
      tipo_ingreso: 'Estudio de Impacto Ambiental',
      titular: 'Hidronor S.A.',
      tipologia_seia: 'Proyectos de desarrollo minero sobre 5.000 ton/mes',
      consultora: 'Minería y Medio Ambiente Ltda. (MYMA)',
      estado: 'Stand By',
      autor: 'Servicio Evaluación Ambiental, III Región Atacama',
      correo_evaluador: 'hidronor@sea.gob.cl',
      fecha_ingreso: '15/01/2025',
      plazo: '90 días hábiles',
      nombre_evaluador: 'Evaluador Hidronor',
    },
    'MY-16-2025': {
      codigo_myma: 'MY-16-2025',
      nombre: 'MyMA',
      tipo: 'adenda_complementaria',
      expediente: '2164006600',
      nombre_proyecto: 'Proyecto MyMA - Desarrollo Operacional',
      tipo_ingreso: 'Declaración de Impacto Ambiental',
      titular: 'MyMA S.A.',
      tipologia_seia: 'Proyectos de desarrollo minero sobre 5.000 ton/mes',
      consultora: 'Minería y Medio Ambiente Ltda. (MYMA)',
      estado: 'En Calificación',
      autor: 'Servicio Evaluación Ambiental, III Región Atacama',
      correo_evaluador: 'myma@sea.gob.cl',
      fecha_ingreso: '18/01/2025',
      plazo: '100 días hábiles',
      nombre_evaluador: 'Evaluador MyMA',
    },
    'MY-98-2025': {
      codigo_myma: 'MY-98-2025',
      nombre: 'Planta Las Cenizas',
      tipo: 'adenda_complementaria',
      expediente: '2164006601',
      nombre_proyecto: 'Planta Las Cenizas - Operaciones',
      tipo_ingreso: 'Estudio de Impacto Ambiental',
      titular: 'Planta Las Cenizas S.A.',
      tipologia_seia: 'Proyectos de desarrollo minero sobre 5.000 ton/mes',
      consultora: 'Minería y Medio Ambiente Ltda. (MYMA)',
      estado: 'Finalizado',
      autor: 'Servicio Evaluación Ambiental, III Región Atacama',
      correo_evaluador: 'planta@sea.gob.cl',
      fecha_ingreso: '10/12/2024',
      plazo: 'Completado',
      nombre_evaluador: 'Evaluador Planta',
    },
  };

  return dummyData[codigoMyma] || {
    codigo_myma: codigoMyma,
    nombre: 'Proyecto',
    tipo: 'adenda',
    expediente: '-',
    nombre_proyecto: '-',
    tipo_ingreso: '-',
    titular: '-',
    tipologia_seia: '-',
    consultora: '-',
    estado: '-',
    autor: '-',
    correo_evaluador: '-',
    fecha_ingreso: '-',
    plazo: '-',
    nombre_evaluador: '-',
  };
};

interface AdendaDetailData {
  codigo_myma: string;
  nombre: string;
  tipo: TipoAdenda;
  expediente: string;
  nombre_proyecto: string;
  tipo_ingreso: string;
  titular: string;
  tipologia_seia: string;
  consultora: string;
  estado: string;
  autor: string;
  correo_evaluador: string;
  fecha_ingreso: string;
  plazo: string;
  plazo_url?: string;
  nombre_evaluador: string;
}

const AdendaDetailView: React.FC<AdendaDetailViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { codigoMyma } = useParams<{ codigoMyma: string }>();
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<AdendaDetailData | null>(null);
  const [plazoMessage, setPlazoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (codigoMyma) {
      // Usar datos dummy basados en el código MyMA
      const data = getDummyAdendaDetail(codigoMyma);
      setDetailData(data);
      setLoading(false);
    }
  }, [codigoMyma]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(adendasList());
    }
  };

  const handlePlazoClick = () => {
    if (!detailData?.plazo_url) {
      setPlazoMessage('Sin enlace disponible');
      return;
    }

    setPlazoMessage(null);
    window.open(detailData.plazo_url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se encontró la adenda</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const tipo = TIPOS_ADENDA[detailData.tipo];

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#111318] mb-2">Antecedentes Generales</h1>
            <p className="text-gray-600">Información detallada del proyecto</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
          {/* Sección 1: Antecedentes Generales */}
          <div>
            <h2 className="text-xl font-semibold text-[#111318] mb-4">1. Antecedentes Generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Expediente</label>
                  <p className="text-sm text-[#111318]">{detailData.expediente}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Proyecto</label>
                  <p className="text-sm text-[#111318]">{detailData.nombre_proyecto}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tipo de Ingreso</label>
                  <p className="text-sm text-[#111318]">{detailData.tipo_ingreso}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Titular</label>
                  <p className="text-sm text-[#111318]">{detailData.titular}</p>
                </div>
              </div>

              {/* Columna Derecha */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tipología SEIA</label>
                  <p className="text-sm text-[#111318]">{detailData.tipologia_seia}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Consultora</label>
                  <p className="text-sm text-[#111318]">{detailData.consultora}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tipo de Adenda</label>
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: tipo.color }}
                    >
                      {tipo.icon}
                    </span>
                    <p className="text-sm text-[#111318]">{tipo.displayName}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Código MyMA</label>
                  <p className="text-sm font-medium text-[#111318]">{detailData.codigo_myma}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Evaluación */}
          <div>
            <h2 className="text-xl font-semibold text-[#111318] mb-4">2. Evaluación</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Izquierda */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {detailData.estado}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Autor</label>
                  <p className="text-sm text-[#111318]">{detailData.autor}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Correo Evaluador</label>
                  <p className="text-sm text-[#111318]">{detailData.correo_evaluador}</p>
                </div>
              </div>

              {/* Columna Derecha */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
                  <p className="text-sm text-[#111318]">{detailData.fecha_ingreso}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Plazo</label>
                  {detailData.plazo === 'Ver enlace' ? (
                    <button
                      type="button"
                      onClick={handlePlazoClick}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {detailData.plazo}
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </button>
                  ) : (
                    <p className="text-sm text-[#111318]">{detailData.plazo}</p>
                  )}
                  {plazoMessage && (
                    <p className="text-xs text-amber-700 mt-2">{plazoMessage}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Evaluador</label>
                  <p className="text-sm text-[#111318]">{detailData.nombre_evaluador}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdendaDetailView;

