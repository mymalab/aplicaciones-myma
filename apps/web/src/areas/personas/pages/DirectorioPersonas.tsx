import React, { useState, useEffect, useMemo } from 'react';
import { fetchPersonas } from '../services/personasService';
import { PersonaWithDetails } from '../types';

const DirectorioPersonas: React.FC = () => {
  const [personas, setPersonas] = useState<PersonaWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(11);
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>('basic');
  
  // Estados para el modal y formulario
  const [showModal, setShowModal] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    rut: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    correo: '',
    telefono: '',
    genero: '',
    estado: 'Activo',
    gerencia_id: '',
    cargo_myma_id: '',
    reporta_a_id: '',
  });

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
      alert('Error al cargar las personas. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar personas según el término de búsqueda
  const filteredPersonas = useMemo(() => {
    if (!searchTerm) return personas;
    
    const term = searchTerm.toLowerCase();
    return personas.filter((persona) =>
      persona.nombre_completo?.toLowerCase().includes(term) ||
      persona.rut?.toLowerCase().includes(term) ||
      persona.correo?.toLowerCase().includes(term) ||
      persona.cargo_nombre?.toLowerCase().includes(term) ||
      persona.gerencia_nombre?.toLowerCase().includes(term)
    );
  }, [personas, searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredPersonas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPersonas = filteredPersonas.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPersona = () => {
    setEditingPersonaId(null);
    setFormData({
      rut: '',
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      correo: '',
      telefono: '',
      genero: '',
      estado: 'Activo',
      gerencia_id: '',
      cargo_myma_id: '',
      reporta_a_id: '',
    });
    setShowModal(true);
  };

  const handleEditPersona = (persona: PersonaWithDetails) => {
    setEditingPersonaId(persona.id);
    
    // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para el input date
    let fechaNacimientoFormato = '';
    if (persona.fecha_nacimiento) {
      const partes = persona.fecha_nacimiento.split('/');
      if (partes.length === 3) {
        fechaNacimientoFormato = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }

    setFormData({
      rut: persona.rut || '',
      nombres: persona.nombres || '',
      apellidos: persona.apellidos || '',
      fecha_nacimiento: fechaNacimientoFormato,
      correo: persona.correo || '',
      telefono: persona.telefono || '',
      genero: persona.genero && persona.genero !== '-' ? persona.genero : '',
      estado: persona.estado || 'Activo',
      gerencia_id: persona.gerencia_id || '',
      cargo_myma_id: persona.cargo_myma_id || '',
      reporta_a_id: persona.reporta_a_id ? persona.reporta_a_id.toString() : '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPersonaId(null);
    setFormData({
      rut: '',
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      correo: '',
      telefono: '',
      genero: '',
      estado: 'Activo',
      gerencia_id: '',
      cargo_myma_id: '',
      reporta_a_id: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obligatorios
    if (!formData.rut || !formData.nombres || !formData.apellidos || !formData.fecha_nacimiento || !formData.correo || !formData.estado) {
      alert('Por favor, complete todos los campos obligatorios.');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo)) {
      alert('Por favor, ingrese un correo electrónico válido.');
      return;
    }

    // Calcular edad y nombre completo
    const fechaNac = new Date(formData.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mesDiff = hoy.getMonth() - fechaNac.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    const nombreCompleto = `${formData.nombres} ${formData.apellidos}`.trim();
    
    // Formatear fecha DD/MM/YYYY
    const day = String(fechaNac.getDate()).padStart(2, '0');
    const month = String(fechaNac.getMonth() + 1).padStart(2, '0');
    const year = fechaNac.getFullYear();
    const fechaNacimientoFormateada = `${day}/${month}/${year}`;

    if (editingPersonaId) {
      // Modo edición: actualizar persona existente
      const personaActualizada: PersonaWithDetails = {
        ...personas.find(p => p.id === editingPersonaId)!,
        rut: formData.rut,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        nombre_completo: nombreCompleto,
        fecha_nacimiento: fechaNacimientoFormateada,
        correo: formData.correo,
        telefono: formData.telefono || undefined,
        genero: formData.genero || '-',
        estado: formData.estado,
        gerencia_id: formData.gerencia_id || '',
        cargo_myma_id: formData.cargo_myma_id || '',
        updated_at: new Date().toISOString(),
        cargo_nombre: formData.cargo_myma_id ? personas.find(p => p.cargo_myma_id === formData.cargo_myma_id)?.cargo_nombre || '' : '',
        gerencia_nombre: formData.gerencia_id ? personas.find(p => p.gerencia_id === formData.gerencia_id)?.gerencia_nombre || '' : '',
        reporta_a_nombre: formData.reporta_a_id ? personas.find(p => p.id.toString() === formData.reporta_a_id)?.nombre_completo || '' : '',
        reporta_a_id: formData.reporta_a_id ? parseInt(formData.reporta_a_id) : undefined,
        edad: edad,
      };

      // Actualizar en la lista
      setPersonas(personas.map(p => p.id === editingPersonaId ? personaActualizada : p));
    } else {
      // Modo creación: crear nueva persona
      const maxId = personas.length > 0 ? Math.max(...personas.map(p => p.id)) : 0;
      const nuevaPersona: PersonaWithDetails = {
        id: maxId + 1,
        rut: formData.rut,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        nombre_completo: nombreCompleto,
        fecha_nacimiento: fechaNacimientoFormateada,
        correo: formData.correo,
        telefono: formData.telefono || undefined,
        genero: formData.genero || '-',
        estado: formData.estado,
        gerencia_id: formData.gerencia_id || '',
        comuna_id: '',
        cargo_myma_id: formData.cargo_myma_id || '',
        especialidad_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        cargo_nombre: formData.cargo_myma_id ? personas.find(p => p.cargo_myma_id === formData.cargo_myma_id)?.cargo_nombre || '' : '',
        gerencia_nombre: formData.gerencia_id ? personas.find(p => p.gerencia_id === formData.gerencia_id)?.gerencia_nombre || '' : '',
        reporta_a_nombre: formData.reporta_a_id ? personas.find(p => p.id.toString() === formData.reporta_a_id)?.nombre_completo || '' : '',
        reporta_a_id: formData.reporta_a_id ? parseInt(formData.reporta_a_id) : undefined,
        edad: edad,
        nacionalidad: 'Chilena',
        estudios_pregrado: '-',
        anos_experiencia: 0,
        antiguedad_myma: 0,
        fecha_titulacion: '-',
      };

      // Agregar a la lista (al inicio)
      setPersonas([nuevaPersona, ...personas]);
    }
    
    // Cerrar modal y limpiar formulario
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando personas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#111318] mb-6">Directorio de Personas</h1>
        
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscador de personas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={handleAddPersona}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Agregar Persona</span>
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('basic')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'basic'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Vista Básica
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'detailed'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Vista Detallada
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {viewMode === 'basic' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Editar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre Completo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reporta A</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gerencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nacimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Edad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Género</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nacimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Edad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Género</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nacionalidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Correo Electrónico</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estudios Pregrado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Años De Experiencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Antigüedad En MyMA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha De Titulación</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPersonas.length === 0 ? (
                <tr>
                  <td
                    colSpan={viewMode === 'basic' ? 9 : 10}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No se encontraron personas
                  </td>
                </tr>
              ) : (
                paginatedPersonas.map((persona) => (
                  <tr key={persona.id} className="hover:bg-gray-50 transition-colors">
                    {viewMode === 'basic' ? (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleEditPersona(persona)}
                            className="text-gray-400 hover:text-primary transition-colors"
                            title="Editar persona"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Activo</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {persona.nombre_completo}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.reporta_a_nombre || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.gerencia_nombre || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.cargo_nombre || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.fecha_nacimiento || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.edad || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.genero || '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.fecha_nacimiento || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.edad || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.genero || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.nacionalidad || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.telefono || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.correo || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.estudios_pregrado || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.anos_experiencia ? persona.anos_experiencia.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.antiguedad_myma ? persona.antiguedad_myma.toFixed(1) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {persona.fecha_titulacion || '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Mostrando {paginatedPersonas.length} de {filteredPersonas.length} colaboradores
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-[#059669] text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal para agregar persona */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#111318]">
                {editingPersonaId ? 'Editar Persona' : 'Agregar Nueva Persona'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Información Básica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* RUT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RUT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                    placeholder="Ej: 12345678-9"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombres */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombres}
                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    placeholder="Ej: Juan Carlos"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {/* Apellidos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    placeholder="Ej: Pérez González"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Fecha de Nacimiento y Género */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha de Nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {/* Género */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Género
                  </label>
                  <select
                    value={formData.genero}
                    onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Correo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="Ej: juan.perez@email.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej: +56 9 1234 5678"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Organizacional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gerencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gerencia
                  </label>
                  <select
                    value={formData.gerencia_id}
                    onChange={(e) => setFormData({ ...formData, gerencia_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleccione una gerencia</option>
                    {(() => {
                      const gerenciasMap = new Map<string, string>();
                      personas.forEach(p => {
                        if (p.gerencia_id && p.gerencia_nombre) {
                          gerenciasMap.set(p.gerencia_id, p.gerencia_nombre);
                        }
                      });
                      return Array.from(gerenciasMap.entries()).map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo
                  </label>
                  <select
                    value={formData.cargo_myma_id}
                    onChange={(e) => setFormData({ ...formData, cargo_myma_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleccione un cargo</option>
                    {(() => {
                      const cargosMap = new Map<string, string>();
                      personas.forEach(p => {
                        if (p.cargo_myma_id && p.cargo_nombre) {
                          cargosMap.set(p.cargo_myma_id, p.cargo_nombre);
                        }
                      });
                      return Array.from(cargosMap.entries()).map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              {/* Reporta A */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporta A
                </label>
                <select
                  value={formData.reporta_a_id}
                  onChange={(e) => setFormData({ ...formData, reporta_a_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Seleccione una persona</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id.toString()}>
                      {persona.nombre_completo}
                    </option>
                  ))}
                </select>
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
                  {editingPersonaId ? 'Guardar Cambios' : 'Agregar Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorioPersonas;

