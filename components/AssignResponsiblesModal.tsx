import React, { useState, useEffect } from 'react';
import { fetchPersonas } from '../services/supabaseService';
import { Persona } from '../types';

interface AssignResponsiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (responsables: ResponsablesData) => void;
  projectName: string;
  projectCode?: string;
  currentResponsables?: ResponsablesData;
}

export interface ResponsablesData {
  empresa_id?: string;
  empresa_nombre?: string;
  jpro_id?: number;
  jpro_nombre?: string;
  epr_id?: number;
  epr_nombre?: string;
  rrhh_id?: number;
  rrhh_nombre?: string;
  legal_id?: number;
  legal_nombre?: string;
  empresaRequerimientos?: import('../types').EmpresaRequerimiento[];
}

const AssignResponsiblesModal: React.FC<AssignResponsiblesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectName,
  projectCode,
  currentResponsables,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchJpro, setSearchJpro] = useState('');
  const [searchEpr, setSearchEpr] = useState('');
  const [searchRrhh, setSearchRrhh] = useState('');
  const [searchLegal, setSearchLegal] = useState('');
  const [formData, setFormData] = useState<ResponsablesData>({
    empresa_id: currentResponsables?.empresa_id,
    empresa_nombre: currentResponsables?.empresa_nombre,
    jpro_id: currentResponsables?.jpro_id,
    epr_id: currentResponsables?.epr_id,
    rrhh_id: currentResponsables?.rrhh_id,
    legal_id: currentResponsables?.legal_id,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentResponsables) {
      setFormData({
        empresa_id: currentResponsables.empresa_id,
        empresa_nombre: currentResponsables.empresa_nombre,
        jpro_id: currentResponsables.jpro_id,
        epr_id: currentResponsables.epr_id,
        rrhh_id: currentResponsables.rrhh_id,
        legal_id: currentResponsables.legal_id,
      });
    }
  }, [currentResponsables]);

  const loadData = async () => {
    try {
      setLoading(true);
      const personasData = await fetchPersonas();
      setPersonas(personasData);
    } catch (error) {
      console.error('Error cargando personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPersonas = (search: string) => {
    const term = search.trim().toLowerCase();
    if (!term) return personas;
    return personas.filter(p =>
      p.nombre_completo.toLowerCase().includes(term) ||
      p.rut.toLowerCase().includes(term)
    );
  };

  const handleSelectChange = (role: keyof ResponsablesData, responsableId: string) => {
    const selectedPersona = personas.find(p => p.id === parseInt(responsableId));
    const idKey = role;
    const nombreKey = role.replace('_id', '_nombre') as keyof ResponsablesData;
    
    setFormData(prev => ({
      ...prev,
      [idKey]: responsableId ? parseInt(responsableId) : undefined,
      [nombreKey]: selectedPersona ? selectedPersona.nombre_completo : undefined,
    }));
  };

  const handleSubmit = async () => {
    // Limpiar errores y mensajes previos
    setError(null);
    setSuccess(null);

    try {
      setIsLoading(true);

      console.log('🔄 Iniciando guardado de responsables...');
      console.log('📋 Datos del formulario:', formData);
      console.log('📝 Proyecto:', projectCode);

      // Simular un pequeño delay para mejor UX (opcional)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Agregar nombres completos antes de guardar
      const dataToSave: ResponsablesData = { ...formData };
      
      if (formData.jpro_id) {
        const persona = personas.find(p => p.id === formData.jpro_id);
        dataToSave.jpro_nombre = persona?.nombre_completo;
        console.log('👤 JPRO encontrado:', persona?.nombre_completo || 'No encontrado');
      }
      if (formData.epr_id) {
        const persona = personas.find(p => p.id === formData.epr_id);
        dataToSave.epr_nombre = persona?.nombre_completo;
        console.log('👤 EPR encontrado:', persona?.nombre_completo || 'No encontrado');
      }
      if (formData.rrhh_id) {
        const persona = personas.find(p => p.id === formData.rrhh_id);
        dataToSave.rrhh_nombre = persona?.nombre_completo;
        console.log('👤 RRHH encontrado:', persona?.nombre_completo || 'No encontrado');
      }
      if (formData.legal_id) {
        const persona = personas.find(p => p.id === formData.legal_id);
        dataToSave.legal_nombre = persona?.nombre_completo;
        console.log('👤 Legal encontrado:', persona?.nombre_completo || 'No encontrado');
      }

      console.log('📤 Datos completos a guardar:', JSON.stringify(dataToSave, null, 2));

      // Validar que existe la función onSave
      if (!onSave) {
        console.error('❌ No hay función onSave definida');
        throw new Error('No hay función de guardado definida. Por favor, contacta al administrador.');
      }

      // Ejecutar onSave (puede ser async)
      console.log('💾 Ejecutando función onSave...');
      try {
        const result = await Promise.resolve(onSave(dataToSave));
        console.log('✅ Función onSave completada exitosamente');
        console.log('📊 Resultado:', result);
      } catch (saveError: any) {
        console.error('❌ Error en función onSave:', saveError);
        console.error('   Tipo:', typeof saveError);
        console.error('   Mensaje:', saveError?.message);
        console.error('   Stack:', saveError?.stack);
        // Re-lanzar el error para que sea capturado por el catch externo
        throw saveError;
      }

      // Mostrar mensaje de éxito
      setSuccess('Responsables asignados exitosamente.');
      console.log('✅ Guardado completado exitosamente');
      
      // Esperar un momento para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🚪 Cerrando modal...');
      onClose();
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ ERROR AL GUARDAR RESPONSABLES');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error completo:', error);
      console.error('Tipo:', typeof error);
      
      if (error instanceof Error) {
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
      }
      console.error('═══════════════════════════════════════════════════');
      
      const errorMessage = error?.message || 'Error al guardar responsables. Por favor intenta nuevamente.';
      setError(errorMessage);
      
      // El error se ocultará automáticamente después de 8 segundos
      setTimeout(() => setError(null), 8000);
    } finally {
      setIsLoading(false);
      console.log('🏁 Proceso de guardado finalizado');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Overlay de carga - bloquea toda interacción */}
      {isLoading && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Guardando responsables...</h3>
            <p className="text-sm text-[#616f89] text-center">
              Por favor espera mientras se guardan los responsables asignados.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="fixed top-4 right-4 z-[60] bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error al guardar</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {success && (
        <div className="fixed top-4 right-4 z-[60] bg-green-50 border-2 border-green-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">Guardado exitoso</h4>
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isLoading ? 'pointer-events-none opacity-75' : ''}`}>
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-3xl">assignment_ind</span>
            <div>
              <h2 className="text-xl font-bold text-white">Asignar Responsables</h2>
              <p className="text-white/80 text-sm">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* JPRO - Jefe de Proyecto */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">engineering</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Jefe de Proyecto (JPRO)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable principal del proyecto</p>
                  </div>
                </div>
                {/* Buscador JPRO */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={searchJpro}
                    onChange={(e) => setSearchJpro(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full mb-2 px-3 py-2 border border-[#dbdfe6] rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={formData.jpro_id || ''}
                  onChange={(e) => handleSelectChange('jpro_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {filterPersonas(searchJpro).map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
                    </option>
                  ))}
                </select>
              </div>

              {/* EPR - Especialista en Prevención de Riesgo */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600 text-2xl">health_and_safety</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Especialista en Prevención de Riesgo (EPR)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de seguridad y prevención</p>
                  </div>
                </div>
                {/* Buscador EPR */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={searchEpr}
                    onChange={(e) => setSearchEpr(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full mb-2 px-3 py-2 border border-[#dbdfe6] rounded-lg text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <select
                  value={formData.epr_id || ''}
                  onChange={(e) => handleSelectChange('epr_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {filterPersonas(searchEpr).map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
                    </option>
                  ))}
                </select>
              </div>

              {/* RRHH - Recursos Humanos */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 text-2xl">groups</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Recursos Humanos (RRHH)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de gestión de personal</p>
                  </div>
                </div>
                {/* Buscador RRHH */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={searchRrhh}
                    onChange={(e) => setSearchRrhh(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full mb-2 px-3 py-2 border border-[#dbdfe6] rounded-lg text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <select
                  value={formData.rrhh_id || ''}
                  onChange={(e) => handleSelectChange('rrhh_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {filterPersonas(searchRrhh).map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
                    </option>
                  ))}
                </select>
              </div>

              {/* Legal */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 text-2xl">gavel</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Legal
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de asuntos legales</p>
                  </div>
                </div>
                {/* Buscador Legal */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={searchLegal}
                    onChange={(e) => setSearchLegal(e.target.value)}
                    placeholder="Buscar por nombre o RUT..."
                    className="w-full mb-2 px-3 py-2 border border-[#dbdfe6] rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={formData.legal_id || ''}
                  onChange={(e) => handleSelectChange('legal_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {filterPersonas(searchLegal).map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-[#e5e7eb] flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-[#616f89] font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || isLoading}
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">save</span>
                Guardar Responsables
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignResponsiblesModal;

