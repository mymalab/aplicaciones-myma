import React, { useState, useEffect } from 'react';
import { NewRequestPayload, RequestItem, Persona, Requerimiento, RequestStatus } from '../types';
import { fetchPersonas, fetchRequerimientos, calculateStatus } from '../services/supabaseService';

interface RequestFormProps {
  onBack: () => void;
  onSave: (data: NewRequestPayload) => void;
  initialData?: RequestItem | null;
}

const RequestForm: React.FC<RequestFormProps> = ({ onBack, onSave, initialData }) => {
  const isEditing = !!initialData;
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [requerimientos, setRequerimientos] = useState<Requerimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<RequestStatus | null>(null);

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
  });

  useEffect(() => {
    loadData();
  }, []);

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
                    <div className="space-y-2">
                      <label htmlFor="persona_id" className="block text-sm font-medium text-[#111318]">
                        Colaborador <span className="text-red-500">*</span>
                      </label>
                      <select 
                        id="persona_id" 
                        name="persona_id" 
                        className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                        value={formData.persona_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccione un colaborador...</option>
                        {personas.map(persona => (
                          <option key={persona.id} value={persona.id}>
                            {persona.nombre_completo} - {persona.rut}
                          </option>
                        ))}
                      </select>
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

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
