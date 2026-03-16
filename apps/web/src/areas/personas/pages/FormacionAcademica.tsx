import React, { useState, useEffect, useMemo } from 'react';
import { fetchFormacionesAcademicas } from '../services/formacionAcademicaService';
import { fetchPersonas } from '../services/personasService';
import { FormacionAcademica, PersonaWithDetails } from '../types';

// Colores para los tags de tipo
const TIPO_COLORS: Record<string, string> = {
  'Pregrado': 'bg-pink-100 text-pink-700',
  'Postitulo': 'bg-purple-100 text-purple-700',
  'Diplomado': 'bg-green-100 text-green-700',
  'Curso': 'bg-gray-100 text-gray-700',
  'Magister': 'bg-blue-100 text-blue-700',
  'Doctorado': 'bg-indigo-100 text-indigo-700',
};

// Colores para los tags de etiquetas
const ETIQUETA_COLORS = [
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-red-100 text-red-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
];

const FormacionAcademicaPage: React.FC = () => {
  const [formaciones, setFormaciones] = useState<FormacionAcademica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  
  // Estados para el modal y formulario
  const [showModal, setShowModal] = useState(false);
  const [personas, setPersonas] = useState<PersonaWithDetails[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [formData, setFormData] = useState({
    persona_id: '',
    nombre_estudio: '',
    universidad_institucion: '',
    tipo: 'Pregrado' as FormacionAcademica['tipo'],
    ano: '',
    etiquetas_texto: '',
  });

  useEffect(() => {
    loadFormaciones();
  }, []);

  // Cargar personas cuando se abre el modal
  useEffect(() => {
    if (showModal && personas.length === 0) {
      loadPersonas();
    }
  }, [showModal]);

  const loadFormaciones = async () => {
    try {
      setLoading(true);
      const data = await fetchFormacionesAcademicas();
      setFormaciones(data);
    } catch (error) {
      console.error('Error loading formaciones académicas:', error);
      setFormaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonas = async () => {
    try {
      setLoadingPersonas(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
      alert('Error al cargar las personas. Por favor, intente nuevamente.');
    } finally {
      setLoadingPersonas(false);
    }
  };

  // Filtrar formaciones según el término de búsqueda
  const filteredFormaciones = useMemo(() => {
    if (!searchTerm.trim()) return formaciones;
    
    const term = searchTerm.toLowerCase().trim();
    return formaciones.filter((form) =>
      form.nombre_completo?.toLowerCase().includes(term) ||
      form.nombre_estudio?.toLowerCase().includes(term) ||
      form.universidad_institucion?.toLowerCase().includes(term)
    );
  }, [formaciones, searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredFormaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFormaciones = filteredFormaciones.slice(startIndex, endIndex);
  const startRecord = filteredFormaciones.length > 0 ? startIndex + 1 : 0;
  const endRecord = Math.min(endIndex, filteredFormaciones.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddFormacion = () => {
    setFormData({
      persona_id: '',
      nombre_estudio: '',
      universidad_institucion: '',
      tipo: 'Pregrado',
      ano: '',
      etiquetas_texto: '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      persona_id: '',
      nombre_estudio: '',
      universidad_institucion: '',
      tipo: 'Pregrado',
      ano: '',
      etiquetas_texto: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obligatorios
    if (!formData.persona_id || !formData.nombre_estudio || !formData.universidad_institucion || !formData.ano) {
      alert('Por favor, complete todos los campos obligatorios.');
      return;
    }

    // Validar año
    const ano = parseInt(formData.ano);
    if (isNaN(ano) || ano < 1900 || ano > new Date().getFullYear() + 1) {
      alert('Por favor, ingrese un año válido.');
      return;
    }

    // Obtener la persona seleccionada
    const personaSeleccionada = personas.find(p => p.id.toString() === formData.persona_id);
    if (!personaSeleccionada) {
      alert('Error: No se encontró la persona seleccionada.');
      return;
    }

    // Procesar etiquetas
    const etiquetas = formData.etiquetas_texto
      ? formData.etiquetas_texto.split(',').map(e => e.trim()).filter(e => e.length > 0)
      : [];

    // Crear nueva formación académica
    const maxId = formaciones.length > 0 ? Math.max(...formaciones.map(f => f.id)) : 0;
    const nuevaFormacion: FormacionAcademica = {
      id: maxId + 1,
      persona_id: parseInt(formData.persona_id),
      nombre_completo: personaSeleccionada.nombre_completo,
      nombre_estudio: formData.nombre_estudio,
      universidad_institucion: formData.universidad_institucion,
      tipo: formData.tipo,
      ano: ano,
      etiquetas: etiquetas.length > 0 ? etiquetas : undefined,
      etiquetas_texto: formData.etiquetas_texto || undefined,
    };

    // Agregar a la lista (al inicio)
    setFormaciones([nuevaFormacion, ...formaciones]);
    
    // Cerrar modal y limpiar formulario
    handleCloseModal();
  };

  // Función para obtener color de tag de etiqueta basado en el índice
  const getEtiquetaColor = (index: number) => {
    return ETIQUETA_COLORS[index % ETIQUETA_COLORS.length];
  };

  // Función para obtener color de tag de tipo
  const getTipoColor = (tipo: string) => {
    return TIPO_COLORS[tipo] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando formaciones académicas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">Formación Académica</h1>
          <p className="text-sm text-gray-600">Gestión de Antecedentes Curriculares</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 sm:flex-initial">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por profesional o estudio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={handleAddFormacion}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Agregar Formación Académica</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PROFESIONAL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NOMBRE DEL ESTUDIO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">UNIVERSIDAD / INSTITUCIÓN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TIPO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÑO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ETIQUETAS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFormaciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {formaciones.length === 0 
                      ? 'No hay formaciones académicas registradas'
                      : 'No se encontraron formaciones que coincidan con la búsqueda'
                    }
                  </td>
                </tr>
              ) : (
                paginatedFormaciones.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                        <span className="text-sm font-medium text-gray-900">
                          {form.nombre_completo || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">description</span>
                        <span className="text-sm text-gray-700">
                          {form.nombre_estudio || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">business</span>
                        <span className="text-sm text-gray-700">
                          {form.universidad_institucion || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(form.tipo)}`}>
                        {form.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {form.ano || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {form.etiquetas && form.etiquetas.length > 0 ? (
                          form.etiquetas.map((etiqueta, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-medium ${getEtiquetaColor(index)}`}
                            >
                              {etiqueta}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Mostrando {startRecord} a {endRecord} de {filteredFormaciones.length} registros
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                let pageNum;
                if (totalPages <= 10) {
                  pageNum = i + 1;
                } else if (currentPage <= 5) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 4) {
                  pageNum = totalPages - 9 + i;
                } else {
                  pageNum = currentPage - 4 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#059669] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 10 && currentPage < totalPages - 4 && (
                <span className="px-2 py-2 text-sm text-gray-500">...</span>
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Modal para agregar formación académica */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#111318]">Agregar Formación Académica</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Persona */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persona <span className="text-red-500">*</span>
                </label>
                {loadingPersonas ? (
                  <div className="text-sm text-gray-500">Cargando personas...</div>
                ) : (
                  <select
                    value={formData.persona_id}
                    onChange={(e) => setFormData({ ...formData, persona_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Seleccione una persona</option>
                    {personas.map((persona) => (
                      <option key={persona.id} value={persona.id.toString()}>
                        {persona.nombre_completo}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nombre del estudio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Estudio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre_estudio}
                  onChange={(e) => setFormData({ ...formData, nombre_estudio: e.target.value })}
                  placeholder="Ej: Ingeniería Civil en Biotecnología"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Universidad/Institución */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Universidad / Institución <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.universidad_institucion}
                  onChange={(e) => setFormData({ ...formData, universidad_institucion: e.target.value })}
                  placeholder="Ej: Universidad de Chile"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Tipo y Año en la misma fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as FormacionAcademica['tipo'] })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="Pregrado">Pregrado</option>
                    <option value="Postitulo">Postítulo</option>
                    <option value="Diplomado">Diplomado</option>
                    <option value="Curso">Curso</option>
                    <option value="Magister">Magíster</option>
                    <option value="Doctorado">Doctorado</option>
                  </select>
                </div>

                {/* Año */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    placeholder="Ej: 2020"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiquetas (separadas por comas)
                </label>
                <input
                  type="text"
                  value={formData.etiquetas_texto}
                  onChange={(e) => setFormData({ ...formData, etiquetas_texto: e.target.value })}
                  placeholder="Ej: Gestión ambiental, Permisos ambientales, Regulación ambiental"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separe las etiquetas con comas. Se mostrarán como tags de colores en la tabla.
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors font-medium"
                >
                  Agregar Formación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormacionAcademicaPage;

