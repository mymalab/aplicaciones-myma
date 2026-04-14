import React, { useEffect, useMemo, useState } from 'react';
import { Worker, WorkerType, Persona, TrabajadorExterno } from '../types';
import {
  fetchPersonas,
  fetchTrabajadorExternoByRut,
  fetchTrabajadoresExternosByEmpresaRut,
  formatRut,
  normalizeRut,
} from '../services/acreditacionService';

interface WorkerListProps {
  workers: Worker[];
  onAddWorker: (worker: Worker) => void;
  onRemoveWorker: (id: string) => void;
  readOnly?: boolean;
  requireCompanySelection?: boolean;
  companies?: string[];
  selectedCompany?: string;
  selectedCompanyRut?: string;
  targetWorkerCount?: number;
  onTargetWorkerCountChange?: (count: number) => void;
}

export const WorkerList: React.FC<WorkerListProps> = ({
  workers,
  onAddWorker,
  onRemoveWorker,
  readOnly = false,
  requireCompanySelection = false,
  selectedCompany: selectedCompanyProp = '',
  selectedCompanyRut = '',
  targetWorkerCount = 0,
  onTargetWorkerCountChange,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  const [externalWorkers, setExternalWorkers] = useState<TrabajadorExterno[]>([]);
  const [filteredExternalWorkers, setFilteredExternalWorkers] = useState<TrabajadorExterno[]>([]);
  const [loadingExternalWorkers, setLoadingExternalWorkers] = useState(false);
  const [showExternalDropdown, setShowExternalDropdown] = useState(false);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [selectedExternalWorker, setSelectedExternalWorker] = useState<TrabajadorExterno | null>(null);
  const [manualRut, setManualRut] = useState('');
  const [manualTelefono, setManualTelefono] = useState('');

  const selectedCompany = selectedCompanyProp;

  useEffect(() => {
    if (!requireCompanySelection) {
      return;
    }

    setExternalSearchQuery('');
    setSelectedExternalWorker(null);
    setManualRut('');
    setManualTelefono('');
    setShowExternalDropdown(false);
  }, [requireCompanySelection, selectedCompany, selectedCompanyRut]);

  useEffect(() => {
    if (readOnly) {
      setLoading(false);
      return;
    }

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

    loadPersonas();
  }, [readOnly]);

  useEffect(() => {
    if (!requireCompanySelection || readOnly) {
      return;
    }

    if (!selectedCompanyRut && !selectedCompany) {
      setExternalWorkers([]);
      setFilteredExternalWorkers([]);
      setSelectedExternalWorker(null);
      return;
    }

    const loadExternalWorkers = async () => {
      try {
        setLoadingExternalWorkers(true);
        const data = await fetchTrabajadoresExternosByEmpresaRut(
          selectedCompanyRut,
          selectedCompany
        );
        setExternalWorkers(data);
        setFilteredExternalWorkers(data);
      } catch (error) {
        console.error('Error loading external workers:', error);
        setExternalWorkers([]);
        setFilteredExternalWorkers([]);
      } finally {
        setLoadingExternalWorkers(false);
      }
    };

    loadExternalWorkers();
  }, [requireCompanySelection, readOnly, selectedCompanyRut, selectedCompany]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPersonas(personas);
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    const filtered = personas.filter((persona) =>
      persona.nombre_completo.toLowerCase().includes(queryLower) ||
      persona.rut.toLowerCase().includes(queryLower)
    );
    setFilteredPersonas(filtered);
  }, [searchQuery, personas]);

  useEffect(() => {
    if (externalSearchQuery.trim() === '') {
      setFilteredExternalWorkers(externalWorkers);
      return;
    }

    const queryLower = externalSearchQuery.toLowerCase();
    const normalizedQueryRut = normalizeRut(externalSearchQuery);

    const filtered = externalWorkers.filter((worker) => {
      const byName = (worker.nombre_completo || '').toLowerCase().includes(queryLower);
      const byRut = (worker.rut || '').toLowerCase().includes(queryLower);
      const byNormalizedRut =
        normalizedQueryRut.length > 0 && normalizeRut(worker.rut).includes(normalizedQueryRut);

      return byName || byRut || byNormalizedRut;
    });

    setFilteredExternalWorkers(filtered);
  }, [externalSearchQuery, externalWorkers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('#worker_search') &&
        !target.closest('.dropdown-results') &&
        !target.closest('#contractor_worker_search') &&
        !target.closest('.dropdown-results-external')
      ) {
        setShowDropdown(false);
        setShowExternalDropdown(false);
      }
    };

    if (showDropdown || showExternalDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showExternalDropdown]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedPersona(null);
    setShowDropdown(true);
  };

  const shouldUseDirectManualContractorMode =
    requireCompanySelection &&
    !loadingExternalWorkers &&
    Boolean(selectedCompany || selectedCompanyRut) &&
    externalWorkers.length === 0;

  const handleExternalSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setExternalSearchQuery(value);

    if (selectedExternalWorker) {
      setSelectedExternalWorker(null);
      setManualRut('');
      setManualTelefono('');
    }

    setShowExternalDropdown(!shouldUseDirectManualContractorMode);
  };

  const resetContractorInputs = () => {
    setExternalSearchQuery('');
    setSelectedExternalWorker(null);
    setManualRut('');
    setManualTelefono('');
    setShowExternalDropdown(false);
  };

  const hasDuplicateRutInList = (rutValue: string): boolean => {
    const targetRut = normalizeRut(rutValue);
    if (!targetRut) return false;

    return workers.some((worker) => normalizeRut(worker.rut) === targetRut);
  };

  const addInternalWorkerFromPersona = (persona: Persona): boolean => {
    if (targetWorkerCount > 0 && workers.length >= targetWorkerCount) {
      setSelectedPersona(persona);
      setSearchQuery(`${persona.nombre_completo} - ${persona.rut}`);
      setShowDropdown(false);
      alert(`Ya se alcanzo la cantidad objetivo de ${targetWorkerCount} trabajadores`);
      return false;
    }

    const newWorker: Worker = {
      id: Date.now().toString(),
      name: persona.nombre_completo,
      type: WorkerType.INTERNAL,
      phone: persona.telefono || '+56 9 XXXX XXXX',
      company: undefined,
      rut: persona.rut,
      personaId: persona.id,
    };

    onAddWorker(newWorker);
    setSearchQuery('');
    setSelectedPersona(null);
    setShowDropdown(false);
    return true;
  };

  const handleSelectPersona = (persona: Persona) => {
    addInternalWorkerFromPersona(persona);
  };

  const addExternalWorkerFromSelection = (worker: TrabajadorExterno): boolean => {
    if (!selectedCompany) {
      setSelectedExternalWorker(worker);
      setExternalSearchQuery(`${worker.nombre_completo} - ${formatRut(worker.rut)}`);
      setShowExternalDropdown(false);
      alert('Por favor seleccione una empresa contratista');
      return false;
    }

    if (targetWorkerCount > 0 && workers.length >= targetWorkerCount) {
      setSelectedExternalWorker(worker);
      setExternalSearchQuery(`${worker.nombre_completo} - ${formatRut(worker.rut)}`);
      setShowExternalDropdown(false);
      alert(`Ya se alcanzo la cantidad objetivo de ${targetWorkerCount} trabajadores`);
      return false;
    }

    const selectedRut = formatRut(worker.rut);

    if (hasDuplicateRutInList(selectedRut)) {
      setSelectedExternalWorker(worker);
      setExternalSearchQuery(`${worker.nombre_completo} - ${selectedRut}`);
      setShowExternalDropdown(false);
      alert('Ya existe un trabajador con ese RUT en la lista.');
      return false;
    }

    const newWorker: Worker = {
      id: Date.now().toString(),
      name: worker.nombre_completo,
      type: WorkerType.EXTERNAL,
      company: selectedCompany,
      phone: (worker.telefono || '').trim() || 'Sin contacto',
      rut: selectedRut,
      syncExternalOnSave: false,
    };

    onAddWorker(newWorker);
    resetContractorInputs();
    return true;
  };

  const handleSelectExternalWorker = (worker: TrabajadorExterno) => {
    addExternalWorkerFromSelection(worker);
  };

  const handleAdd = async () => {
    if (requireCompanySelection && !selectedCompany) {
      alert('Por favor seleccione una empresa contratista');
      return;
    }

    if (targetWorkerCount > 0 && workers.length >= targetWorkerCount) {
      alert(`Ya se alcanzo la cantidad objetivo de ${targetWorkerCount} trabajadores`);
      return;
    }

    if (requireCompanySelection) {
      if (selectedExternalWorker) {
        addExternalWorkerFromSelection(selectedExternalWorker);
        return;
      }

      const manualName = externalSearchQuery.trim();
      if (!manualName) {
        alert('Por favor escriba o seleccione el nombre del trabajador');
        return;
      }

      if (filteredExternalWorkers.length > 0) {
        alert('Seleccione un trabajador de la lista de resultados.');
        return;
      }

      const formattedManualRut = formatRut(manualRut);
      if (normalizeRut(formattedManualRut).length < 2) {
        alert('Por favor ingrese el RUT del trabajador');
        return;
      }

      if (hasDuplicateRutInList(formattedManualRut)) {
        alert('Ya existe un trabajador con ese RUT en la lista.');
        return;
      }

      let shouldAddManualWorker = true;
      try {
        const existingByRut = await fetchTrabajadorExternoByRut(formattedManualRut);
        if (existingByRut) {
          shouldAddManualWorker = window.confirm(
            `Ya existe un trabajador con RUT ${formatRut(existingByRut.rut)} en la base externa.\n\n` +
              'Desea sobrescribir la informacion con los datos ingresados?'
          );
        }
      } catch (error) {
        console.error('Error validating external worker by RUT:', error);
        alert('No fue posible validar el RUT en la base externa. Intente nuevamente.');
        return;
      }

      if (!shouldAddManualWorker) {
        return;
      }

      const newWorker: Worker = {
        id: Date.now().toString(),
        name: manualName,
        type: WorkerType.EXTERNAL,
        company: selectedCompany,
        phone: manualTelefono.trim() || 'Sin contacto',
        rut: formattedManualRut,
        syncExternalOnSave: true,
      };

      onAddWorker(newWorker);
      resetContractorInputs();
      return;
    }

    if (!selectedPersona) {
      alert('Por favor seleccione un colaborador de la lista');
      return;
    }

    addInternalWorkerFromPersona(selectedPersona);
  };

  const shouldShowManualContractorFields = useMemo(() => {
    if (!requireCompanySelection) return false;

    if (shouldUseDirectManualContractorMode) {
      return true;
    }

    const hasQuery = externalSearchQuery.trim().length > 0;
    return hasQuery && !selectedExternalWorker && filteredExternalWorkers.length === 0;
  }, [
    requireCompanySelection,
    shouldUseDirectManualContractorMode,
    externalSearchQuery,
    selectedExternalWorker,
    filteredExternalWorkers.length,
  ]);

  const contractorSearchSpan = shouldShowManualContractorFields ? 'md:col-span-4' : 'md:col-span-9';
  const contractorButtonSpan = shouldShowManualContractorFields ? 'md:col-span-2' : 'md:col-span-3';

  const isTargetMet = targetWorkerCount > 0 && workers.length === targetWorkerCount;
  const isOverTarget = targetWorkerCount > 0 && workers.length > targetWorkerCount;
  const isUnderTarget = targetWorkerCount > 0 && workers.length < targetWorkerCount;

  if (readOnly) {
    return (
      <div className="flex flex-col gap-4 md:col-span-2 border-2 border-dashed border-primary/20 rounded-xl p-5 bg-gray-50/40">
        <div className="flex flex-col gap-1 mb-2">
          <h4 className="text-[#111318] text-sm font-bold">Trabajadores registrados</h4>
          <p className="text-xs text-[#616f89]">
            Vista de solo lectura de los trabajadores ingresados al momento del envio.
          </p>
        </div>

        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[#111318] text-[10px] font-bold uppercase tracking-wider text-gray-500">Lista de Asistentes</span>
            {targetWorkerCount > 0 && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isTargetMet
                    ? 'bg-green-100 text-green-700'
                    : isOverTarget
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {workers.length} / {targetWorkerCount}
              </span>
            )}
          </div>
          <div className="bg-white border border-[#dbdfe6] rounded-lg overflow-hidden shadow-sm">
            {workers.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-gray-300 text-4xl">group</span>
                <p className="text-xs text-gray-500">No hay trabajadores registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#dbdfe6]">
                {workers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                          worker.type === WorkerType.INTERNAL
                            ? 'bg-blue-100 text-primary'
                            : 'bg-orange-100 text-orange-600'
                        }`}
                      >
                        {worker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#111318]">{worker.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide border ${
                              worker.type === WorkerType.INTERNAL
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {worker.type === WorkerType.INTERNAL ? 'Interno' : 'Externo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#616f89] mt-0.5">
                          {worker.phone && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">phone</span> {worker.phone}
                            </span>
                          )}
                          {worker.company && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <span className="material-symbols-outlined text-xs">business</span> {worker.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:col-span-2 border-2 border-dashed border-primary/40 rounded-xl p-5 bg-blue-50/20">
      <div className="flex flex-col gap-1 mb-2">
        <h4 className="text-[#111318] text-sm font-bold">Agregar Trabajadores</h4>
        <p className="text-xs text-[#616f89]">
          {requireCompanySelection
            ? shouldUseDirectManualContractorMode
              ? 'Esta empresa no tiene trabajadores externos cargados. Ingrese nombre, RUT y telefono manualmente.'
              : 'Busque trabajadores externos de la empresa seleccionada. Si no existen coincidencias, podra ingresar RUT y telefono manualmente.'
            : 'Agregue colaboradores a la lista. Puede buscar trabajadores internos existentes.'}
        </p>
      </div>

      {onTargetWorkerCountChange && (
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1 block">
                Cantidad Total de Trabajadores
              </label>
              <p className="text-xs text-gray-500">Establezca cuantos trabajadores necesita en total</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={targetWorkerCount}
                onChange={(e) => onTargetWorkerCountChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-24 px-4 py-2 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${
                  isTargetMet
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : isOverTarget
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : isUnderTarget
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isTargetMet ? 'check_circle' : isOverTarget ? 'error' : isUnderTarget ? 'warning' : 'info'}
                </span>
                <span>{workers.length} / {targetWorkerCount || '8'}</span>
              </div>
            </div>
          </div>

          {targetWorkerCount > 0 && (
            <div
              className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs font-medium ${
                isTargetMet
                  ? 'border-green-200 text-green-700'
                  : isOverTarget
                    ? 'border-red-200 text-red-700'
                    : 'border-amber-200 text-amber-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isTargetMet ? 'check_circle' : isOverTarget ? 'error' : 'warning'}
              </span>
              <span>
                {isTargetMet
                  ? 'Cantidad exacta alcanzada.'
                  : isOverTarget
                    ? `Excede por ${workers.length - targetWorkerCount} trabajador${workers.length - targetWorkerCount !== 1 ? 'es' : ''}`
                    : `Faltan ${targetWorkerCount - workers.length} trabajador${targetWorkerCount - workers.length !== 1 ? 'es' : ''}`}
              </span>
            </div>
          )}
        </div>
      )}

      {requireCompanySelection ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className={`${contractorSearchSpan} flex flex-col gap-2 relative`}>
              <span className="text-[#111318] text-xs font-semibold">Nombre *</span>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">
                  {shouldUseDirectManualContractorMode ? 'person' : 'search'}
                </span>
                <input
                  id="contractor_worker_search"
                  type="text"
                  value={externalSearchQuery}
                  onChange={handleExternalSearchChange}
                  onFocus={() => {
                    if (!shouldUseDirectManualContractorMode) {
                      setShowExternalDropdown(true);
                    }
                  }}
                  placeholder={
                    shouldUseDirectManualContractorMode
                      ? 'Nombre del trabajador externo'
                      : 'Buscar trabajador externo por nombre o RUT...'
                  }
                  autoComplete="off"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
                {externalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      resetContractorInputs();
                      setShowExternalDropdown(!shouldUseDirectManualContractorMode);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                )}
              </div>

              {!shouldUseDirectManualContractorMode && showExternalDropdown && (
                <div className="dropdown-results-external absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                  {loadingExternalWorkers ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">Cargando trabajadores...</div>
                  ) : filteredExternalWorkers.length > 0 ? (
                    filteredExternalWorkers.map((worker) => (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => handleSelectExternalWorker(worker)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                          selectedExternalWorker?.id === worker.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">{worker.nombre_completo}</div>
                        <div className="text-xs text-gray-500">{formatRut(worker.rut)}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      No se encontraron trabajadores para esta empresa.
                    </div>
                  )}
                </div>
              )}
            </div>

            {shouldShowManualContractorFields && (
              <>
                <div className="md:col-span-3 flex flex-col gap-2">
                  <span className="text-[#111318] text-xs font-semibold">RUT *</span>
                  <input
                    type="text"
                    value={manualRut}
                    onChange={(e) => setManualRut(formatRut(e.target.value))}
                    placeholder="12.345.678-9"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-3 flex flex-col gap-2">
                  <span className="text-[#111318] text-xs font-semibold">Telefono</span>
                  <input
                    type="text"
                    value={manualTelefono}
                    onChange={(e) => setManualTelefono(e.target.value)}
                    placeholder="+56 9 XXXX XXXX"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </>
            )}

            <div className={`${contractorButtonSpan} flex items-end`}>
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

          {shouldUseDirectManualContractorMode && (
            <p className="text-xs text-amber-700">
              No hay trabajadores asociados a esta empresa contratista. Completa los datos manualmente del trabajador para agregarlo.
            </p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-9 flex flex-col gap-2 relative">
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

              {showDropdown && (
                <div className="dropdown-results absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">Cargando colaboradores...</div>
                  ) : filteredPersonas.length > 0 ? (
                    filteredPersonas.map((persona) => (
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
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No se encontraron colaboradores</div>
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
      )}

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[#111318] text-[10px] font-bold uppercase tracking-wider text-gray-500">Lista de Asistentes</span>
          {targetWorkerCount > 0 && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isTargetMet
                  ? 'bg-green-100 text-green-700'
                  : isOverTarget
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
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
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        worker.type === WorkerType.INTERNAL
                          ? 'bg-blue-100 text-primary'
                          : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {worker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#111318]">{worker.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide border ${
                            worker.type === WorkerType.INTERNAL
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {worker.type === WorkerType.INTERNAL ? 'Interno' : 'Externo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#616f89] mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">phone</span> {worker.phone}
                        </span>
                        {worker.rut && <span className="text-gray-500">{formatRut(worker.rut)}</span>}
                        {worker.company && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <span className="material-symbols-outlined text-xs">business</span> {worker.company}
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

