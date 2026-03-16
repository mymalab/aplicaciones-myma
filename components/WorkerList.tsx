import React, { useState, useEffect } from 'react';
import { Worker, WorkerType, MOCK_WORKERS_DB, MOCK_COMPANIES, Persona } from '../types';
import { fetchPersonas } from '../services/supabaseService';

interface WorkerListProps {
  workers: Worker[];
  onAddWorker: (worker: Worker) => void;
  onRemoveWorker: (id: string) => void;
  requireCompanySelection?: boolean; // Para mostrar selector de empresa contratista
  companies?: string[]; // Lista de empresas contratistas
  selectedCompany?: string; // Empresa contratista seleccionada desde el formulario padre
  targetWorkerCount?: number; // Cantidad objetivo de trabajadores
  onTargetWorkerCountChange?: (count: number) => void; // Callback para cambiar la cantidad objetivo
}

export const WorkerList: React.FC<WorkerListProps> = ({ 
  workers, 
  onAddWorker, 
  onRemoveWorker,
  requireCompanySelection = false,
  companies = [],
  selectedCompany: selectedCompanyProp = '',
  targetWorkerCount = 0,
  onTargetWorkerCountChange
}) => {
  const [selectedType, setSelectedType] = useState<WorkerType>(WorkerType.INTERNAL);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Internal State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  
  // External State (Manual Entry)
  const [extCompany, setExtCompany] = useState('');
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');

  // Usar la empresa seleccionada desde el prop (viene del formulario padre)
  const selectedCompany = selectedCompanyProp;

  // Cargar personas de Supabase
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
      setFilteredPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar personas cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPersonas(personas);
    } else {
      const filtered = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPersonas(filtered);
    }
  }, [searchQuery, personas]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#worker_search') && !target.closest('.dropdown-results')) {
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

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setSearchQuery(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedPersona(null);
    setShowDropdown(true);
  };

  const handleAdd = () => {
    // Validar empresa si es requerida
    if (requireCompanySelection && !selectedCompany) {
      alert("Por favor seleccione una empresa contratista");
      return;
    }

    // Validar cantidad objetivo si está definida
    if (targetWorkerCount > 0 && workers.length >= targetWorkerCount) {
      alert(`Ya se alcanzó la cantidad objetivo de ${targetWorkerCount} trabajadores`);
      return;
    }

    if (selectedType === WorkerType.INTERNAL) {
      if (!selectedPersona) {
        alert("Por favor seleccione un colaborador de la lista");
        return;
      }
      
      const newWorker: Worker = {
        id: Date.now().toString(),
        name: selectedPersona.nombre_completo,
        type: requireCompanySelection ? WorkerType.EXTERNAL : WorkerType.INTERNAL,
        phone: selectedPersona.telefono || '+56 9 XXXX XXXX',
        company: requireCompanySelection ? selectedCompany : undefined,
        rut: selectedPersona.rut,
        // Guardar el id real de la persona seleccionada para usarlo en fct_acreditacion_solicitud_trabajador_manual.persona_id
        personaId: selectedPersona.id
      };
      onAddWorker(newWorker);
      setSearchQuery('');
      setSelectedPersona(null);
    } else {
      if (!extName.trim()) return; // Minimal validation
      
      const newWorker: Worker = {
        id: Date.now().toString(),
        name: extName,
        type: WorkerType.EXTERNAL,
        company: requireCompanySelection ? selectedCompany : (extCompany || 'Empresa Externa'),
        phone: extPhone || 'Sin contacto'
      };
      onAddWorker(newWorker);
      // Reset
      setExtCompany('');
      setExtName('');
      setExtPhone('');
    }
  };

  const isExternal = selectedType === WorkerType.EXTERNAL;

  // Calcular estado del contador
  const isTargetMet = targetWorkerCount > 0 && workers.length === targetWorkerCount;
  const isOverTarget = targetWorkerCount > 0 && workers.length > targetWorkerCount;
  const isUnderTarget = targetWorkerCount > 0 && workers.length < targetWorkerCount;

  return (
    <div className="flex flex-col gap-4 md:col-span-2 border-2 border-dashed border-primary/40 rounded-xl p-5 bg-blue-50/20">
      <div className="flex flex-col gap-1 mb-2">
        <h4 className="text-[#111318] text-sm font-bold">Agregar Trabajadores</h4>
        <p className="text-xs text-[#616f89]">
          Agregue colaboradores a la lista. Puede buscar trabajadores internos existentes o registrar externos manualmente.
        </p>
      </div>

      {/* Campo de Cantidad Objetivo */}
      {onTargetWorkerCountChange && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 block">
                Cantidad Total de Trabajadores
              </label>
              <p className="text-xs text-gray-500">Establezca cuántos trabajadores necesita en total</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={targetWorkerCount}
                onChange={(e) => onTargetWorkerCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 px-4 py-2 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${
                isTargetMet 
                  ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                  : isOverTarget
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : isUnderTarget
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {isTargetMet ? 'check_circle' : isOverTarget ? 'error' : isUnderTarget ? 'warning' : 'info'}
                </span>
                <span>{workers.length} / {targetWorkerCount || '∞'}</span>
              </div>
            </div>
          </div>
          
          {/* Mensaje de estado */}
          {targetWorkerCount > 0 && (
            <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs font-medium ${
              isTargetMet 
                ? 'border-green-200 text-green-700' 
                : isOverTarget
                ? 'border-red-200 text-red-700'
                : 'border-amber-200 text-amber-700'
            }`}>
              <span className="material-symbols-outlined text-sm">
                {isTargetMet ? 'check_circle' : isOverTarget ? 'error' : 'warning'}
              </span>
              <span>
                {isTargetMet 
                  ? '¡Cantidad exacta alcanzada!' 
                  : isOverTarget
                  ? `Excede por ${workers.length - targetWorkerCount} trabajador${workers.length - targetWorkerCount !== 1 ? 'es' : ''}`
                  : `Faltan ${targetWorkerCount - workers.length} trabajador${targetWorkerCount - workers.length !== 1 ? 'es' : ''}`
                }
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className={requireCompanySelection ? "md:col-span-9 flex flex-col gap-2 relative" : "md:col-span-9 flex flex-col gap-2 relative"}>
          <span className="text-[#111318] text-xs font-semibold">Buscar / Nombre</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
            <input 
              id="worker_search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar por nombre o RUT..."
              autoComplete="off"
              className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPersona(null);
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
            <div className="dropdown-results absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
              {filteredPersonas.length > 0 ? (
                filteredPersonas.map(persona => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleSelectPersona(persona)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                      selectedPersona?.id === persona.id ? 'bg-blue-50' : ''
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
        </div>
        
        <div className="md:col-span-3 flex items-end">
          <button 
            type="button"
            onClick={handleAdd}
            className="w-full h-[42px] bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg text-sm px-4 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Agregar a lista</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[#111318] text-[10px] font-bold uppercase tracking-wider text-gray-500">Lista de Asistentes</span>
          {targetWorkerCount > 0 && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isTargetMet 
                ? 'bg-green-100 text-green-700' 
                : isOverTarget
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {workers.length} / {targetWorkerCount}
            </span>
          )}
        </div>
        <div className="bg-white border border-[#dbdfe6] rounded-lg overflow-hidden shadow-sm">
          {workers.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <span className="material-symbols-outlined text-gray-300 text-4xl">group</span>
              <p className="text-xs text-gray-500">No hay trabajadores seleccionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#dbdfe6]">
              {workers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                      worker.type === WorkerType.INTERNAL 
                        ? 'bg-blue-100 text-primary' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {worker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#111318]">{worker.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide border ${
                           worker.type === WorkerType.INTERNAL 
                             ? 'bg-blue-50 text-blue-700 border-blue-200'
                             : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                           {worker.type === WorkerType.INTERNAL ? 'Interno' : 'Externo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#616f89] mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">phone</span> {worker.phone}
                        </span>
                        {worker.company && (
                          <span className="flex items-center gap-1 text-gray-500">
                             • <span className="material-symbols-outlined text-xs">business</span> {worker.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onRemoveWorker(worker.id)}
                    className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-all"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

