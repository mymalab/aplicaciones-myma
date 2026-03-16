import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectGalleryItem } from '../types';
import { fetchClientes, fetchEmpresaRequerimientos, createProyectoRequerimientos, fetchCatalogoRequerimientos } from '../services/supabaseService';
import { Cliente, EmpresaRequerimiento } from '../types';
import { updateSolicitudAcreditacion } from '../services/supabaseService';

interface SelectCompanyAndRequirementsViewProps {
  project: ProjectGalleryItem;
  onBack: () => void;
  onUpdate?: () => void;
}

interface CatalogoRequerimiento {
  id?: number;
  requerimiento: string;
  categoria_requerimiento?: string;
  responsable?: string;
  [key: string]: any;
}

const SelectCompanyAndRequirementsView: React.FC<SelectCompanyAndRequirementsViewProps> = ({
  project,
  onBack,
  onUpdate,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [selectedEmpresaNombre, setSelectedEmpresaNombre] = useState<string>('');
  const [empresaRequerimientos, setEmpresaRequerimientos] = useState<EmpresaRequerimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddRequerimiento, setShowAddRequerimiento] = useState(false);
  const [catalogoRequerimientos, setCatalogoRequerimientos] = useState<CatalogoRequerimiento[]>([]);
  const [newRequerimiento, setNewRequerimiento] = useState<{
    requerimientoId: string;
    requerimiento: string;
    categoria_requerimiento: string;
    responsable: 'Legal' | 'JPRO' | 'EPR' | 'RRHH';
    observaciones: string;
  }>({
    requerimientoId: '',
    requerimiento: '',
    categoria_requerimiento: '',
    responsable: 'JPRO',
    observaciones: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isOtroSelected, setIsOtroSelected] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const hasLoadedEmpresaRef = useRef(false);

  // Cerrar el dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientesData, catalogoData] = await Promise.all([
        fetchClientes(),
        fetchCatalogoRequerimientos()
      ]);
      setClientes(clientesData);
      setCatalogoRequerimientos(catalogoData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = useCallback(async (empresaId: string, empresaNombre?: string) => {
    const selectedCliente = clientes.find(c => c.id.toString() === empresaId);
    const nombre = empresaNombre || selectedCliente?.nombre || '';
    
    setSelectedEmpresaId(empresaId);
    setSelectedEmpresaNombre(nombre);

    if (nombre) {
      setLoadingRequerimientos(true);
      setEmpresaRequerimientos([]);
      
      try {
        const reqs = await fetchEmpresaRequerimientos(nombre);
        setEmpresaRequerimientos(reqs);
      } catch (error) {
        console.error('Error cargando requerimientos:', error);
        setEmpresaRequerimientos([]);
      } finally {
        setLoadingRequerimientos(false);
      }
    } else {
      setEmpresaRequerimientos([]);
    }
  }, [clientes]);

  useEffect(() => {
    // Solo cargar una vez cuando el componente se monta y hay datos disponibles
    const empresaId = (project as any).empresa_id;
    const empresaNombre = (project as any).empresa_nombre;
    
    if (!hasLoadedEmpresaRef.current && clientes.length > 0 && empresaId) {
      hasLoadedEmpresaRef.current = true;
      setSelectedEmpresaId(empresaId);
      if (empresaNombre) {
        setSelectedEmpresaNombre(empresaNombre);
        handleEmpresaChange(empresaId, empresaNombre);
      }
    }
  }, [project.id, clientes.length, handleEmpresaChange]);

  const handleRequerimientoChange = (requerimientoId: string) => {
    // Si se selecciona "Otro"
    if (requerimientoId === 'otro') {
      setIsOtroSelected(true);
      setNewRequerimiento({
        requerimientoId: 'otro',
        requerimiento: '',
        categoria_requerimiento: '',
        responsable: 'JPRO',
        observaciones: newRequerimiento.observaciones,
      });
      setSearchTerm('');
      setShowSearchResults(false);
      return;
    }

    setIsOtroSelected(false);
    
    // Buscar el requerimiento seleccionado en el catálogo por ID
    const requerimientoSeleccionado = catalogoRequerimientos.find(
      req => (req.id?.toString() || req.id) === requerimientoId
    );

    if (requerimientoSeleccionado) {
      // Autocompletar categoría y responsable desde el catálogo usando el ID
      setNewRequerimiento({
        requerimientoId: requerimientoId,
        requerimiento: requerimientoSeleccionado.requerimiento,
        categoria_requerimiento: requerimientoSeleccionado.categoria_requerimiento || '',
        responsable: (requerimientoSeleccionado.responsable as 'Legal' | 'JPRO' | 'EPR' | 'RRHH') || 'JPRO',
        observaciones: newRequerimiento.observaciones, // Mantener observaciones
      });
      setSearchTerm(requerimientoSeleccionado.requerimiento);
      setShowSearchResults(false);
    } else {
      // Si no se encuentra, limpiar los campos
      setNewRequerimiento({
        requerimientoId: '',
        requerimiento: '',
        categoria_requerimiento: '',
        responsable: 'JPRO',
        observaciones: newRequerimiento.observaciones,
      });
      setSearchTerm('');
      setShowSearchResults(false);
    }
  };

  // Filtrar requerimientos basado en la búsqueda
  // Si no hay término de búsqueda, mostrar todos los requerimientos
  const filteredRequerimientos = searchTerm.trim() 
    ? catalogoRequerimientos.filter(req => {
        const searchLower = searchTerm.toLowerCase();
        const requerimientoMatch = req.requerimiento?.toLowerCase().includes(searchLower);
        const categoriaMatch = req.categoria_requerimiento?.toLowerCase().includes(searchLower);
        return requerimientoMatch || categoriaMatch;
      })
    : catalogoRequerimientos;

  // Categorías disponibles (solo las especificadas)
  const categoriasDisponibles = [
    'Carpeta de Arranque',
    'Trabajadores',
    'Empresa MyMA',
    'Empresa Subcontrato'
  ];

  const handleEditRequerimiento = (index: number) => {
    const req = empresaRequerimientos[index];
    setEditingIndex(index);
    setNewRequerimiento({
      requerimientoId: 'editing',
      requerimiento: req.requerimiento,
      categoria_requerimiento: req.categoria_requerimiento,
      responsable: req.responsable,
      observaciones: req.observaciones || '',
    });
    setIsOtroSelected(true);
    setSearchTerm(req.requerimiento);
    setShowAddRequerimiento(true);
  };

  const handleAddRequerimiento = () => {
    // Validar que haya una empresa seleccionada
    if (!selectedEmpresaNombre || !selectedEmpresaId) {
      alert('Por favor selecciona una empresa contratista primero');
      return;
    }

    // Si el usuario escribió algo en el campo de búsqueda pero no seleccionó ningún requerimiento,
    // usar el texto de búsqueda como requerimiento personalizado
    let requerimientoTexto = newRequerimiento.requerimiento.trim();
    if (!requerimientoTexto && searchTerm.trim()) {
      requerimientoTexto = searchTerm.trim();
      // Si no hay requerimientoId, tratarlo como "Otro"
      if (!newRequerimiento.requerimientoId || newRequerimiento.requerimientoId === '') {
        setIsOtroSelected(true);
      }
    }

    // Validar requerimiento
    if (!requerimientoTexto) {
      alert('Por favor completa el requerimiento');
      return;
    }

    // Validar categoría
    if (!newRequerimiento.categoria_requerimiento.trim()) {
      alert('Por favor selecciona o completa la categoría');
      return;
    }

    // Si está editando, actualizar el requerimiento existente
    if (editingIndex !== null) {
      const updatedReqs = [...empresaRequerimientos];
      updatedReqs[editingIndex] = {
        ...updatedReqs[editingIndex],
        requerimiento: requerimientoTexto,
        categoria_requerimiento: newRequerimiento.categoria_requerimiento,
        responsable: newRequerimiento.responsable,
        observaciones: newRequerimiento.observaciones.trim() || undefined,
      };
      setEmpresaRequerimientos(updatedReqs);
      setEditingIndex(null);
    } else {
      // Si no está editando, agregar nuevo requerimiento
      const nuevoReq: EmpresaRequerimiento = {
        empresa: selectedEmpresaNombre,
        requerimiento: requerimientoTexto,
        categoria_requerimiento: newRequerimiento.categoria_requerimiento,
        responsable: newRequerimiento.responsable,
        observaciones: newRequerimiento.observaciones.trim() || undefined,
      };
      setEmpresaRequerimientos([...empresaRequerimientos, nuevoReq]);
    }

    // Limpiar formulario
    setNewRequerimiento({
      requerimientoId: '',
      requerimiento: '',
      categoria_requerimiento: '',
      responsable: 'JPRO',
      observaciones: '',
    });
    setSearchTerm('');
    setShowSearchResults(false);
    setIsOtroSelected(false);
    setShowAddRequerimiento(false);
  };

  const handleRemoveRequerimiento = (index: number) => {
    const nuevosReqs = empresaRequerimientos.filter((_, i) => i !== index);
    setEmpresaRequerimientos(nuevosReqs);
  };

  const handleSave = async () => {
    if (!selectedEmpresaId || !selectedEmpresaNombre) {
      setError('Por favor selecciona una empresa contratista');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (empresaRequerimientos.length === 0) {
      const confirmar = window.confirm(
        'No hay requerimientos seleccionados. ¿Deseas continuar sin requerimientos?'
      );
      if (!confirmar) return;
    }

    // Limpiar errores y mensajes previos
    setError(null);
    setSuccess(null);
    
    try {
      setIsLoading(true);
      setSaving(true);

      // Simular un pequeño delay para mejor UX (opcional, puedes removerlo)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Actualizar la solicitud con la empresa seleccionada y cambiar estado a "Por asignar responsables"
      await updateSolicitudAcreditacion(project.id, {
        empresa_id: selectedEmpresaId,
        empresa_nombre: selectedEmpresaNombre,
        estado_solicitud_acreditacion: 'Por asignar responsables',
      });

      // Guardar los requerimientos seleccionados en brg_acreditacion_solicitud_requerimiento
      // Sin responsables asignados todavía (se asignarán después)
      if (empresaRequerimientos.length > 0) {
        await createProyectoRequerimientos(
          project.projectCode,
          selectedEmpresaNombre,
          empresaRequerimientos,
          {
            jpro_nombre: undefined,
            epr_nombre: undefined,
            rrhh_nombre: undefined,
            legal_nombre: undefined,
          },
          project.id // Pasar el id de fct_acreditacion_solicitud como id_proyecto
        );
      }

      // Éxito - mostrar mensaje y redirigir
      setSuccess('Empresa y requerimientos guardados exitosamente. El proyecto ahora está en estado "Por asignar responsables".');
      
      // Esperar un momento para que el usuario vea el mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onUpdate) {
        onUpdate();
      }
      onBack();
    } catch (error: any) {
      console.error('Error guardando:', error);
      const errorMessage = error?.message || 'Error al guardar. Por favor intenta nuevamente.';
      setError(errorMessage);
      
      // El error se ocultará automáticamente después de 8 segundos
      setTimeout(() => setError(null), 8000);
    } finally {
      setIsLoading(false);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container flex h-full grow flex-col relative">
      {/* Overlay de carga - bloquea toda interacción */}
      {isLoading && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Guardando datos...</h3>
            <p className="text-sm text-[#616f89] text-center">
              Por favor espera mientras se guardan la empresa y los requerimientos.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
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
        <div className="fixed top-4 right-4 z-50 bg-green-50 border-2 border-green-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
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

      <div className={`mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12 ${isLoading ? 'pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#111318]">Seleccionar Empresa y Requerimientos</h1>
              <p className="text-sm text-[#616f89]">{project.projectCode}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Selector de Empresa */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-white text-2xl">business</span>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111318]">
                  Empresa Contratista
                </label>
                <p className="text-xs text-[#616f89]">Selecciona la empresa responsable del proyecto</p>
              </div>
            </div>
            <select
              value={selectedEmpresaId}
              onChange={(e) => {
                const empresaId = e.target.value;
                const selectedCliente = clientes.find(c => c.id.toString() === empresaId);
                handleEmpresaChange(empresaId, selectedCliente?.nombre);
              }}
              className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-[#111318] font-medium"
            >
              <option value="">Seleccionar empresa...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de Requerimientos */}
          {selectedEmpresaNombre && (
            <div className="bg-blue-50/30 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">checklist</span>
                  <h4 className="text-sm font-bold text-[#111318]">
                    Requerimientos de {selectedEmpresaNombre}
                  </h4>
                </div>
                <button
                  onClick={() => setShowAddRequerimiento(!showAddRequerimiento)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Agregar Requerimiento
                </button>
              </div>

              {/* Formulario para agregar/editar requerimiento */}
              {showAddRequerimiento && (
                <div className="mb-4 p-4 bg-white rounded-lg border-2 border-blue-300">
                  <h5 className="text-sm font-bold text-[#111318] mb-3">
                    {editingIndex !== null ? 'Editar Requerimiento' : 'Nuevo Requerimiento'}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative" ref={searchInputRef}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Requerimiento *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowSearchResults(true);
                            setIsOtroSelected(false);
                            if (!e.target.value) {
                              setNewRequerimiento({
                                ...newRequerimiento,
                                requerimientoId: '',
                                requerimiento: '',
                                categoria_requerimiento: '',
                              });
                            }
                          }}
                          onFocus={() => setShowSearchResults(true)}
                          placeholder="Buscar requerimiento..."
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          search
                        </span>
                        
                        {/* Dropdown de resultados - Mostrar siempre cuando está abierto */}
                        {showSearchResults && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredRequerimientos.length > 0 ? (
                              <>
                                {filteredRequerimientos.map((req, index) => (
                                  <div
                                    key={req.id || index}
                                    onClick={() => handleRequerimientoChange(req.id?.toString() || req.id?.toString() || index.toString())}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 transition-colors"
                                  >
                                    <div className="font-medium text-sm text-[#111318]">
                                      {req.requerimiento}
                                    </div>
                                    {req.categoria_requerimiento && (
                                      <div className="text-xs text-[#616f89] mt-0.5">
                                        {req.categoria_requerimiento}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {/* Opción "Otro" al final */}
                                <div
                                  onClick={() => handleRequerimientoChange('otro')}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-t-2 border-gray-200 bg-gray-50 transition-colors"
                                >
                                  <div className="font-medium text-sm text-[#111318] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">add_circle</span>
                                    Otro
                                  </div>
                                  <div className="text-xs text-[#616f89] mt-0.5">
                                    Escribir requerimiento personalizado
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="p-3 text-sm text-gray-500 text-center border-b border-gray-200">
                                  {searchTerm 
                                    ? `No se encontraron requerimientos que coincidan con "${searchTerm}"`
                                    : 'No hay requerimientos disponibles'
                                  }
                                </div>
                                {/* Opción "Otro" cuando no hay resultados */}
                                <div
                                  onClick={() => handleRequerimientoChange('otro')}
                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer bg-gray-50 transition-colors"
                                >
                                  <div className="font-medium text-sm text-[#111318] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">add_circle</span>
                                    Otro
                                  </div>
                                  <div className="text-xs text-[#616f89] mt-0.5">
                                    Escribir requerimiento personalizado
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Mostrar requerimiento seleccionado (solo si no es "Otro") */}
                      {newRequerimiento.requerimientoId && newRequerimiento.requerimiento && !isOtroSelected && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-xs font-medium text-blue-900">
                            Seleccionado: {newRequerimiento.requerimiento}
                          </div>
                        </div>
                      )}
                      
                      {/* Campo de texto para "Otro" o cuando está editando */}
                      {(isOtroSelected || editingIndex !== null) && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={newRequerimiento.requerimiento}
                            onChange={(e) => setNewRequerimiento({ ...newRequerimiento, requerimiento: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Escribe el requerimiento personalizado *"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Categoría *
                      </label>
                      <select
                        value={newRequerimiento.categoria_requerimiento}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, categoria_requerimiento: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!isOtroSelected && !editingIndex && !!newRequerimiento.requerimientoId && !!newRequerimiento.categoria_requerimiento && newRequerimiento.categoria_requerimiento.trim() !== ''}
                      >
                        <option value="">
                          {isOtroSelected ? "Seleccionar categoría *" : "Se completará automáticamente"}
                        </option>
                        {categoriasDisponibles.map((categoria, index) => (
                          <option key={index} value={categoria}>
                            {categoria}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Responsable
                      </label>
                      <select
                        value={newRequerimiento.responsable}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, responsable: e.target.value as 'Legal' | 'JPRO' | 'EPR' | 'RRHH' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!isOtroSelected && !editingIndex && !newRequerimiento.requerimientoId}
                      >
                        <option value="JPRO">JPRO</option>
                        <option value="EPR">EPR</option>
                        <option value="RRHH">RRHH</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <input
                        type="text"
                        value={newRequerimiento.observaciones}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, observaciones: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddRequerimiento}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      {editingIndex !== null ? 'Actualizar' : 'Agregar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRequerimiento(false);
                        setNewRequerimiento({
                          requerimientoId: '',
                          requerimiento: '',
                          categoria_requerimiento: '',
                          responsable: 'JPRO',
                          observaciones: '',
                        });
                        setSearchTerm('');
                        setShowSearchResults(false);
                        setIsOtroSelected(false);
                        setEditingIndex(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {loadingRequerimientos ? (
                <div className="flex items-center justify-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : empresaRequerimientos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200 bg-blue-100/50">
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Requerimiento</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Categoría</th>
                        <th className="text-center py-3 px-4 font-semibold text-[#111318]">Cargo</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Observaciones</th>
                        <th className="text-center py-3 px-4 font-semibold text-[#111318]">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresaRequerimientos.map((req, index) => {
                        const responsableColors = {
                          'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                          'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                          'RRHH': 'bg-green-100 text-green-700 border-green-300',
                          'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                        };
                        const colorClass = responsableColors[req.responsable as keyof typeof responsableColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                        return (
                          <tr key={index} className="border-b border-blue-100 hover:bg-blue-50/50 transition-colors">
                            <td className="py-3 px-4 text-[#111318] font-medium">{req.requerimiento}</td>
                            <td className="py-3 px-4 text-[#616f89]">{req.categoria_requerimiento}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
                                {req.responsable}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#616f89] text-xs">
                              {req.observaciones || '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditRequerimiento(index)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar requerimiento"
                                >
                                  <span className="material-symbols-outlined text-lg">edit</span>
                                </button>
                                <button
                                  onClick={() => handleRemoveRequerimiento(index)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar requerimiento"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-3 text-xs text-[#616f89] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <span>Se crearán {empresaRequerimientos.length} tareas para este proyecto</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#616f89]">
                  <span className="material-symbols-outlined text-4xl mb-2 block text-gray-400">inbox</span>
                  <p className="text-sm">No hay requerimientos definidos</p>
                  <p className="text-xs mt-1">Agrega requerimientos usando el botón "Agregar Requerimiento"</p>
                </div>
              )}
            </div>
          )}

          {/* Footer con botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-[#616f89] font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || saving || !selectedEmpresaId}
              className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading || saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">save</span>
                  Guardar y Continuar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectCompanyAndRequirementsView;
