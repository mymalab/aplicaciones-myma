import React, { useState, useEffect } from 'react';
import { fetchCurriculumData } from '../services/curriculumService';
import { CurriculumData } from '../types';

// Colores para los tags
const TAG_COLORS = [
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
];

// Colores para tipos de formación
const TIPO_COLORS: Record<string, string> = {
  'Pregrado': 'bg-pink-100 text-pink-700',
  'Postitulo': 'bg-purple-100 text-purple-700',
  'Diplomado': 'bg-green-100 text-green-700',
  'Curso': 'bg-gray-100 text-gray-700',
  'Magister': 'bg-blue-100 text-blue-700',
  'Doctorado': 'bg-indigo-100 text-indigo-700',
};

const CurriculumPage: React.FC = () => {
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCurriculum();
  }, []);

  const loadCurriculum = async () => {
    try {
      setLoading(true);
      const data = await fetchCurriculumData();
      setCurriculum(data);
    } catch (error) {
      console.error('Error loading curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert('Función de exportar PDF próximamente disponible');
  };

  const getTagColor = (index: number) => {
    return TAG_COLORS[index % TAG_COLORS.length];
  };

  const getTipoColor = (tipo: string) => {
    return TIPO_COLORS[tipo] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando currículo...</p>
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <p className="text-gray-600">No se encontró información del currículo</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#111318]">{curriculum.nombre_completo}</h1>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar otro perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                expand_more
              </span>
            </div>
            
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Antecedentes Generales */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-[#059669] rounded"></div>
            <h2 className="text-xl font-bold text-[#111318]">ANTECEDENTES GENERALES</h2>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">FECHA NACIMIENTO</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.fecha_nacimiento}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">EDAD</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.edad} años</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">GÉNERO</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.genero}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">NACIONALIDAD</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.nacionalidad}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">EMAIL CORPORATIVO</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.email_corporativo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">CONTACTO</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.contacto}</p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-gray-600 mb-1">TÍTULO PROFESIONAL</p>
                <p className="text-base font-medium text-[#111318]">{curriculum.titulo_profesional}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen Profesional */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-[#059669] rounded"></div>
            <h2 className="text-xl font-bold text-[#111318]">RESUMEN PROFESIONAL</h2>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-base text-gray-700 leading-relaxed">{curriculum.resumen_profesional}</p>
          </div>
        </div>

        {/* Experiencia Profesional */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-[#059669] rounded"></div>
            <h2 className="text-xl font-bold text-[#111318]">EXPERIENCIA PROFESIONAL</h2>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ORGANIZACIÓN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">POSICIÓN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PERÍODO</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">FUNCIONES Y RESPONSABILIDADES</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {curriculum.experiencia_profesional.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {exp.empresa}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {exp.cargo}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {exp.ano_inicio} - {exp.ano_termino_display}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="mb-3">{exp.funciones}</div>
                        <div className="flex flex-wrap gap-2">
                          {exp.aptitudes?.map((aptitud, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-medium ${getTagColor(index)}`}
                            >
                              {aptitud}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Formación Académica */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 bg-[#059669] rounded"></div>
            <h2 className="text-xl font-bold text-[#111318]">FORMACIÓN ACADÉMICA</h2>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NOMBRE DEL ESTUDIO</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">INSTITUCIÓN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TIPO</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÑO</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ETIQUETAS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {curriculum.formacion_academica.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {form.nombre_estudio}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {form.universidad_institucion}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(form.tipo)}`}>
                          {form.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {form.ano}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {form.etiquetas?.map((etiqueta, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-medium ${getTagColor(index)}`}
                            >
                              {etiqueta}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumPage;

