import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchProveedorById, fetchEspecialidades, ProveedorResponse } from '../services/proveedoresService';
import { normalizeSearchText } from '../utils/search';

interface ServicioData {
  nombre: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  tarifaRef: number;
  moneda: string;
  estado: 'Vigente' | 'En revisión' | 'Inactivo';
}

const NuevoServicio: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingProveedor, setLoadingProveedor] = useState(true);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState<ProveedorResponse | null>(null);
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [filteredEspecialidades, setFilteredEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [searchQueryCategoria, setSearchQueryCategoria] = useState('');
  const [showDropdownCategoria, setShowDropdownCategoria] = useState(false);
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<{ id: number; nombre: string } | null>(null);
  const [formData, setFormData] = useState<ServicioData>({
    nombre: '',
    codigo: '',
    descripcion: '',
    categoria: '',
    tarifaRef: 0,
    moneda: 'CLP',
    estado: 'Vigente',
  });

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar datos del proveedor y especialidades
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setLoadingProveedor(true);
        setLoadingEspecialidades(true);
        setError(null);
        
        // Cargar proveedor primero (es crítico)
        const proveedorData = await fetchProveedorById(Number(id));
        
        if (!proveedorData) {
          setError('Proveedor no encontrado');
          setLoadingProveedor(false);
          return;
        }

        setProveedor(proveedorData);
        setLoadingProveedor(false);

        // Intentar cargar especialidades (no crítico, si falla usamos valores por defecto)
        try {
          const especialidadesData = await fetchEspecialidades();
          setEspecialidades(especialidadesData);
          
          // Establecer la primera especialidad como valor por defecto si hay especialidades
          if (especialidadesData.length > 0) {
            setFormData((prev) => ({
              ...prev,
              categoria: prev.categoria || especialidadesData[0].nombre,
            }));
          } else {
            // Si no hay especialidades, usar valores por defecto del enum
            const defaultEspecialidades = [
              { id: 1, nombre: 'Laboratorio' },
              { id: 2, nombre: 'Aire' },
              { id: 3, nombre: 'Agua' },
              { id: 4, nombre: 'Suelos' },
              { id: 5, nombre: 'Ruido' },
              { id: 6, nombre: 'Otros' },
            ];
            setEspecialidades(defaultEspecialidades);
            setFormData((prev) => ({
              ...prev,
              categoria: prev.categoria || 'Laboratorio',
            }));
          }
        } catch (espError: any) {
          console.warn('Error al cargar especialidades, usando valores por defecto:', espError);
          // Si falla, usar valores por defecto
          const defaultEspecialidades = [
            { id: 1, nombre: 'Laboratorio' },
            { id: 2, nombre: 'Aire' },
            { id: 3, nombre: 'Agua' },
            { id: 4, nombre: 'Suelos' },
            { id: 5, nombre: 'Ruido' },
            { id: 6, nombre: 'Otros' },
          ];
          setEspecialidades(defaultEspecialidades);
          setFormData((prev) => ({
            ...prev,
            categoria: prev.categoria || 'Laboratorio',
          }));
        } finally {
          setLoadingEspecialidades(false);
        }
      } catch (err: any) {
        console.error('Error al cargar proveedor:', err);
        setError('Error al cargar los datos del proveedor. Por favor, intente nuevamente.');
        setLoadingProveedor(false);
        setLoadingEspecialidades(false);
      }
    };

    loadData();
  }, [id]);

  // Filtrar especialidades cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchQueryCategoria.trim() === '') {
      setFilteredEspecialidades(especialidades);
    } else {
      const normalizedCategoriaSearch = normalizeSearchText(searchQueryCategoria);
      const filtered = especialidades.filter((esp) =>
        normalizeSearchText(esp.nombre).includes(normalizedCategoriaSearch)
      );
      setFilteredEspecialidades(filtered);
    }
  }, [searchQueryCategoria, especialidades]);

  // Inicializar especialidades filtradas cuando se cargan
  useEffect(() => {
    setFilteredEspecialidades(especialidades);
  }, [especialidades]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#categoria_search') && !target.closest('.dropdown-categoria-results')) {
        setShowDropdownCategoria(false);
      }
    };

    if (showDropdownCategoria) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownCategoria]);

  // Actualizar searchQuery cuando se selecciona una especialidad
  useEffect(() => {
    if (selectedEspecialidad) {
      setSearchQueryCategoria(selectedEspecialidad.nombre);
      setFormData((prev) => ({
        ...prev,
        categoria: selectedEspecialidad.nombre,
      }));
    }
  }, [selectedEspecialidad]);

  // Inicializar searchQuery cuando se carga el formData con una categoría
  useEffect(() => {
    if (formData.categoria && !selectedEspecialidad) {
      const esp = especialidades.find((e) => e.nombre === formData.categoria);
      if (esp) {
        setSelectedEspecialidad(esp);
        setSearchQueryCategoria(esp.nombre);
      }
    }
  }, [formData.categoria, especialidades, selectedEspecialidad]);

  const handleSearchCategoriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQueryCategoria(e.target.value);
    setSelectedEspecialidad(null);
    setShowDropdownCategoria(true);
    // Si se borra el texto, resetear la categoría
    if (e.target.value === '') {
      setFormData((prev) => ({
        ...prev,
        categoria: '',
      }));
    }
  };

  const handleSelectEspecialidad = (esp: { id: number; nombre: string }) => {
    setSelectedEspecialidad(esp);
    setSearchQueryCategoria(esp.nombre);
    setFormData((prev) => ({
      ...prev,
      categoria: esp.nombre,
    }));
    setShowDropdownCategoria(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'tarifaRef') {
      const numValue = value === '' ? 0 : Number(value);
      setFormData((prev) => ({
        ...prev,
        [name]: numValue >= 0 ? numValue : 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar campos requeridos
      if (!formData.nombre.trim()) {
        setError('El nombre del servicio es requerido');
        setLoading(false);
        return;
      }

      if (!formData.codigo.trim()) {
        setError('El código del servicio es requerido');
        setLoading(false);
        return;
      }

      // TODO: Aquí se guardaría el servicio en Supabase
      // Por ahora solo simulamos el guardado
      console.log('Guardando servicio:', formData);
      
      // Simular delay de guardado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirigir a la vista de detalle del proveedor
      navigate(getAreaPath(`actuales/${id}`));
    } catch (err: any) {
      console.error('Error al guardar servicio:', err);
      setError(err.message || 'Error al guardar el servicio. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(getAreaPath(`actuales/${id}`));
  };

  const formatCurrency = (amount: number, currency: string = 'CLP') => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loadingProveedor) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (error && !proveedor) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => navigate(getAreaPath('actuales'))}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Volver a Proveedores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Botón Volver */}
        <button
          onClick={() => navigate(getAreaPath(`actuales/${id}`))}
          className="mb-4 flex items-center gap-2 text-primary hover:text-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Volver a {proveedor?.nombre_proveedor}</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Nuevo Servicio
              </h1>
              <p className="text-sm text-gray-500">
                {proveedor && `Agregar un nuevo servicio para ${proveedor.nombre_proveedor}`}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Primera fila: Nombre y Código */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Servicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: Análisis Físico-Químico de Aguas"
                />
              </div>
              <div>
                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="codigo"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: LAB-001"
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                placeholder="Descripción detallada del servicio..."
              />
            </div>

            {/* Segunda fila: Categoría y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                {loadingEspecialidades ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500">Cargando categorías...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      id="categoria_search"
                      type="text"
                      className="w-full pl-10 pr-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5 border border-gray-300"
                      placeholder="Buscar categoría..."
                      value={searchQueryCategoria}
                      onChange={handleSearchCategoriaChange}
                      onFocus={() => setShowDropdownCategoria(true)}
                      autoComplete="off"
                      required
                    />
                    {searchQueryCategoria && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQueryCategoria('');
                          setSelectedEspecialidad(null);
                          setFormData((prev) => ({
                            ...prev,
                            categoria: '',
                          }));
                          setShowDropdownCategoria(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                    
                    {/* Dropdown de resultados */}
                    {showDropdownCategoria && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto dropdown-categoria-results">
                        {filteredEspecialidades.length > 0 ? (
                          filteredEspecialidades.map((esp) => (
                            <button
                              key={esp.id}
                              type="button"
                              onClick={() => handleSelectEspecialidad(esp)}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                                formData.categoria === esp.nombre ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-900">{esp.nombre}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No se encontraron categorías
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Campo oculto para validación requerida */}
                    <input 
                      type="hidden" 
                      name="categoria" 
                      value={formData.categoria || ''} 
                      required 
                    />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="Vigente">Vigente</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Tarifa de Referencia y Moneda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tarifaRef" className="block text-sm font-medium text-gray-700 mb-2">
                  Tarifa de Referencia
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="tarifaRef"
                    name="tarifaRef"
                    min="0"
                    step="1000"
                    value={formData.tarifaRef || ''}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
                {formData.tarifaRef > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatCurrency(formData.tarifaRef, formData.moneda)}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="moneda" className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  id="moneda"
                  name="moneda"
                  value={formData.moneda}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="CLP">CLP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="UF">UF</option>
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-4 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    <span>Guardar Servicio</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default NuevoServicio;

