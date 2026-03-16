import React, { useState, useEffect } from 'react';
import { NewRequestPayload, RequestItem, Persona, Requerimiento, RequestStatus } from '../types';
import { fetchPersonas, fetchRequerimientos, calculateStatus } from '../services/supabaseService';

interface RequestFormProps {
  onBack: () => void;
  onSave: (data: NewRequestPayload) => void;
  onDelete?: () => void;
  initialData?: RequestItem | null;
}

const RequestForm: React.FC<RequestFormProps> = ({ onBack, onSave, onDelete, initialData }) => {
  const isEditing = !!initialData;
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<RequestStatus | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Estados para el buscador de colaboradores
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPersonas, setFilteredPersonas] = useState<Persona[]>([]);

  // Funciones helper para estilos de estado
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RequestStatus.InRenewal:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case RequestStatus.Expiring:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case RequestStatus.Expired:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current: return 'bg-emerald-600';
      case RequestStatus.InRenewal: return 'bg-blue-600';
      case RequestStatus.Expiring: return 'bg-amber-600';
      case RequestStatus.Expired: return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusMessage = (status: RequestStatus, fechaVencimiento: string) => {
    if (!fechaVencimiento) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expirationDate = new Date(fechaVencimiento);
    expirationDate.setHours(0, 0, 0, 0);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Vencido hace ${Math.abs(diffDays)} días`;
    } else if (diffDays === 0) {
      return 'Vence hoy';
    } else if (diffDays <= 30) {
      return `Vence en ${diffDays} días`;
    } else {
      return `Vence en ${diffDays} días`;
    }
  };
  
  const [formData, setFormData] = useState({
    persona_id: initialData?.persona_id || 0,
    requerimiento_id: initialData?.requerimiento_id || 0,
    fecha_vigencia: initialData?.adjudicationDate || '',
    fecha_vencimiento: initialData?.expirationDate || '',
    estado: undefined as RequestStatus | undefined,
    link: initialData?.link || '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar personas cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPersonas(personas);
    } else {
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPersonas(filtered);
    }
  }, [searchTerm, personas]);

  // Actualizar el texto de búsqueda cuando se carga una persona en modo edición
  useEffect(() => {
    if (formData.persona_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.persona_id);
      if (persona) {
        setSearchTerm(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
  }, [formData.persona_id, personas]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#persona_search') && !target.closest('.absolute.z-50')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personasData, requerimientosData] = await Promise.all([
        fetchPersonas(),
        fetchRequerimientos()
      ]);
      setPersonas(personasData);
      setRequerimientos(requerimientosData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar la búsqueda de colaboradores
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    // Si se borra el texto, resetear la selección
    if (e.target.value === '') {
      setFormData({...formData, persona_id: 0});
    }
  };

  // Seleccionar una persona del dropdown
  const handleSelectPersona = (persona: Persona) => {
    setFormData({...formData, persona_id: persona.id});
    setSearchTerm(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Manejar el valor del campo
    let fieldValue: any;
    if (name.includes('_id')) {
      fieldValue = parseInt(value);
    } else if (name === 'estado') {
      // Si el estado está vacío, establecer como undefined para que se calcule automáticamente
      fieldValue = value || undefined;
    } else {
      fieldValue = value;
    }
    
    const newFormData = {
      ...formData,
      [name]: fieldValue
    };
    setFormData(newFormData);
    
    // Si se cambia el estado, usar ese
    if (name === 'estado') {
      if (value) {
        setCurrentStatus(value as RequestStatus);
      } else if (formData.fecha_vencimiento) {
        // Si se limpia el estado, volver al calculado
        const status = calculateStatus(formData.fecha_vencimiento);
        setCurrentStatus(status);
      }
    }
    // Calcular estado cuando cambia la fecha de vencimiento (solo si no hay estado manual)
    else if (name === 'fecha_vencimiento' && value && !formData.estado) {
      const status = calculateStatus(value);
      setCurrentStatus(status);
    } else if (name === 'fecha_vencimiento' && !value) {
      setCurrentStatus(null);
    }
  };
  
  // Calcular estado inicial si hay fecha de vencimiento
  useEffect(() => {
    if (isEditing && initialData) {
      // En modo edición, usar el estado del registro
      setCurrentStatus(initialData.status);
    } else if (formData.fecha_vencimiento) {
      const status = calculateStatus(formData.fecha_vencimiento);
      setCurrentStatus(status);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEditing && (!formData.persona_id || !formData.requerimiento_id)) {
      alert("Por favor seleccione una persona y un requerimiento");
      return;
    }
    
    if (!formData.fecha_vigencia || !formData.fecha_vencimiento) {
      alert("Por favor complete las fechas");
      return;
    }
    
    console.log('📤 Datos a guardar:', formData);
    console.log('📊 Estado seleccionado:', formData.estado);
    
    onSave(formData as NewRequestPayload);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
        {/* Breadcrumbs - Hidden on mobile */}
        <div className="mb-4 hidden sm:flex flex-wrap items-center gap-2">
          <a href="#" onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Inicio</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <a href="#" onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Solicitudes</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">{isEditing ? 'Editar' : 'Crear Nuevo'}</span>
        </div>

        {/* Back Button Mobile */}
        <button 
          onClick={onBack}
          className="sm:hidden flex items-center gap-2 text-[#616f89] hover:text-primary mb-4 font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Volver
        </button>

        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 border-b border-[#e5e7eb] pb-4 lg:pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
              {isEditing ? 'Editar Solicitud' : 'Crear Nuevo Registro'}
            </h1>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              {isEditing 
                ? 'Modifique las fechas de la solicitud.' 
                : 'Seleccione una persona y un requerimiento para crear una nueva solicitud.'}
            </p>
          </div>
          <div className="hidden lg:block">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#616f89] border border-gray-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Volver al Listado
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {/* Section 1 - Selección de Persona y Requerimiento */}
            {!isEditing && (
              <>
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                    Seleccionar Colaborador y Requerimiento
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 relative">
                      <label htmlFor="persona_search" className="block text-sm font-medium text-[#111318]">
                        Colaborador <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                        <input
                          id="persona_search"
                          type="text"
                          className="w-full pl-10 pr-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                          placeholder="Buscar por nombre o RUT..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          onFocus={() => setShowDropdown(true)}
                          autoComplete="off"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setFormData({...formData, persona_id: 0});
                              setShowDropdown(true);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        )}
                      </div>
                      
                      {/* Dropdown de resultados */}
                      {showDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredPersonas.length > 0 ? (
                            filteredPersonas.map(persona => (
                              <button
                                key={persona.id}
                                type="button"
                                onClick={() => handleSelectPersona(persona)}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                                  formData.persona_id === persona.id ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                                <div className="text-xs text-gray-500">{persona.rut}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No se encontraron colaboradores
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Campo oculto para validación requerida */}
                      <input 
                        type="hidden" 
                        name="persona_id" 
                        value={formData.persona_id || ''} 
                        required 
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="requerimiento_id" className="block text-sm font-medium text-[#111318]">
                        Requerimiento <span className="text-red-500">*</span>
                      </label>
                      <select 
                        id="requerimiento_id" 
                        name="requerimiento_id" 
                        className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                        value={formData.requerimiento_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccione un requerimiento...</option>
                        {requerimientos.map(req => (
                          <option key={req.id} value={req.id}>
                            {req.requerimiento} - {req.categoria_requerimiento}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />
              </>
            )}

            {/* Mostrar información de la persona al editar */}
            {isEditing && initialData && (
              <>
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">info</span>
                    Información del Registro
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Colaborador</p>
                      <p className="text-sm font-medium text-gray-900">{initialData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">RUT</p>
                      <p className="text-sm font-medium text-gray-900">{initialData.rut}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Requerimiento</p>
                      <p className="text-sm font-medium text-gray-900">{initialData.requirement}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Categoría</p>
                      <p className="text-sm font-medium text-gray-900">{initialData.category}</p>
                    </div>
                  </div>
                  
                  {/* Botón Eliminar (debajo de la información del registro) */}
                  {onDelete && (
                    <div className="mt-4 flex justify-start">
                      <button 
                        type="button" 
                        onClick={() => setShowDeleteModal(true)}
                        className="px-5 py-2.5 rounded-lg border-2 border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-400 font-medium transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                        Eliminar Registro
                      </button>
                    </div>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* Cambio de Estado */}
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit_note</span>
                    Modificar Estado
                  </h2>
                  <div className="space-y-2">
                    <label htmlFor="estado" className="block text-sm font-medium text-[#111318]">
                      Estado del Registro
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">autorenew</span>
                      <select 
                        id="estado" 
                        name="estado" 
                        className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                        value={formData.estado || ''}
                        onChange={handleChange}
                      >
                        <option value="">Calcular automáticamente</option>
                        <option value={RequestStatus.InRenewal}>En Renovación</option>
                        <option value={RequestStatus.Current}>Vigente</option>
                        <option value={RequestStatus.Expiring}>A vencer</option>
                        <option value={RequestStatus.Expired}>Vencida</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Puedes cambiar manualmente el estado del registro a "En Renovación" cuando esté en proceso de actualización.
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100" />
              </>
            )}

            {/* Section 2 - Fechas */}
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Fechas de Vigencia
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label htmlFor="fecha_vigencia" className="block text-sm font-medium text-[#111318]">
                    Fecha de Vigencia <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">calendar_today</span>
                    <input 
                      type="date" 
                      id="fecha_vigencia" 
                      name="fecha_vigencia" 
                      className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                      value={formData.fecha_vigencia}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-[#111318]">
                    Fecha de Vencimiento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">event_busy</span>
                    <input 
                      type="date" 
                      id="fecha_vencimiento" 
                      name="fecha_vencimiento" 
                      className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                      value={formData.fecha_vencimiento}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Vista previa del estado */}
              {currentStatus && (
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">info</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                        {formData.estado ? 'Estado Manual' : 'Estado Calculado'}
                        {formData.estado && (
                          <span className="ml-2 text-blue-600 normal-case font-normal">(Modificado manualmente)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border inline-flex items-center gap-2 ${getStatusBadge(currentStatus)}`}>
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(currentStatus)}`}></span> 
                          {currentStatus}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getStatusMessage(currentStatus, formData.fecha_vencimiento)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3 - Link de Google Drive */}
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">link</span>
                Link de Google Drive (Opcional)
              </h2>
              <div className="space-y-2">
                <label htmlFor="link" className="block text-sm font-medium text-[#111318]">
                  URL del Documento
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">description</span>
                  <input 
                    type="url" 
                    id="link" 
                    name="link" 
                    className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                    placeholder="https://drive.google.com/..."
                    value={formData.link}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingrese el link completo del documento en Google Drive. El documento se mostrará como un ícono en la tabla de solicitudes.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
              {/* Botones de acción */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  type="button" 
                  onClick={onBack}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <span className="material-symbols-outlined text-red-600 text-4xl">warning</span>
            </div>
            
            <h2 className="text-2xl font-bold text-[#111318] text-center mb-2">
              ¿Eliminar Registro?
            </h2>
            
            <p className="text-[#616f89] text-center mb-6">
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de:
            </p>
            
            {initialData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Colaborador</p>
                    <p className="text-sm font-medium text-gray-900">{initialData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Requerimiento</p>
                    <p className="text-sm font-medium text-gray-900">{initialData.requirement}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:flex-1 px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDelete) {
                    onDelete();
                    setShowDeleteModal(false);
                  }
                }}
                className="w-full sm:flex-1 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestForm;
