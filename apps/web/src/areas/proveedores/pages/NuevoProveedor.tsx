import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import {
  createProveedor,
  updateProveedor,
  fetchProveedorById,
  ProveedorData,
  calcularClasificacion,
  fetchEspecialidades,
  fetchEspecialidadesByRut,
  saveProveedorEspecialidades,
} from '../services/proveedoresService';

interface DireccionDetalleFormData {
  pais: string;
  ciudad: string;
  region: string;
  direccion: string;
}

interface ContactoDetalleFormData {
  nombre: string;
  correo: string;
  telefono: string;
  cargo: string;
}

interface DireccionFormData {
  direccion_sucursal: DireccionDetalleFormData;
  direccion_casa_matriz: DireccionDetalleFormData;
}

interface InformacionContactoFormData {
  contacto_comercial: ContactoDetalleFormData;
  contacto_adicional_1: ContactoDetalleFormData;
  contacto_adicional_2: ContactoDetalleFormData;
}


type DireccionSectionKey = keyof DireccionFormData;
type InformacionContactoSectionKey = keyof InformacionContactoFormData;

type PopupEditorState =
  | { kind: 'direccion'; section: DireccionSectionKey }
  | { kind: 'contacto'; section: InformacionContactoSectionKey }
  | null;

const direccionSectionLabels: Record<DireccionSectionKey, string> = {
  direccion_casa_matriz: 'Direccion Casa Matriz',
  direccion_sucursal: 'Direccion Sucursal',
};

const informacionContactoSectionLabels: Record<InformacionContactoSectionKey, string> = {
  contacto_comercial: 'Contacto Comercial',
  contacto_adicional_1: 'Contacto Adicional 1',
  contacto_adicional_2: 'Contacto Adicional 2',
};

const direccionFieldConfig: Array<{
  key: keyof DireccionDetalleFormData;
  label: string;
  placeholder: string;
}> = [
  { key: 'pais', label: 'Pais', placeholder: 'Ej: Chile' },
  { key: 'ciudad', label: 'Ciudad', placeholder: 'Ej: Santiago' },
  { key: 'region', label: 'Region', placeholder: 'Ej: Metropolitana' },
  { key: 'direccion', label: 'Direccion', placeholder: 'Ej: Av. Apoquindo 1234' },
];

const contactoFieldConfig: Array<{
  key: keyof ContactoDetalleFormData;
  label: string;
  type: string;
  placeholder: string;
}> = [
  { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej: Camila Rojas' },
  { key: 'correo', label: 'Correo', type: 'email', placeholder: 'Ej: contacto@proveedor.cl' },
  { key: 'telefono', label: 'Telefono', type: 'text', placeholder: 'Ej: +56 9 9876 5432' },
  { key: 'cargo', label: 'Cargo', type: 'text', placeholder: 'Ej: Jefa Comercial' },
];

const emptyDireccionDetalle = (): DireccionDetalleFormData => ({
  pais: '',
  ciudad: '',
  region: '',
  direccion: '',
});

const emptyContactoDetalle = (): ContactoDetalleFormData => ({
  nombre: '',
  correo: '',
  telefono: '',
  cargo: '',
});

const toPlainObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'si', 'sí', 'yes', 'y', 'habilitado', 'activo'].includes(normalized);
  }

  return false;
};

const toDireccionDetalle = (value: unknown): DireccionDetalleFormData => {
  const obj = toPlainObject(value);

  return {
    pais: toText(obj.pais),
    ciudad: toText(obj.ciudad),
    region: toText(obj.region),
    direccion: toText(obj.direccion),
  };
};

const toContactoDetalle = (value: unknown): ContactoDetalleFormData => {
  const obj = toPlainObject(value);

  return {
    nombre: toText(obj.nombre),
    correo: toText(obj.correo),
    telefono: toText(obj.telefono),
    cargo: toText(obj.cargo),
  };
};

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const hasAnyValue = (value: Record<string, string | null>): boolean => {
  return Object.values(value).some((item) => item !== null);
};

const displayOrPlaceholder = (value: string): string => {
  const trimmed = value.trim();
  return trimmed === '' ? 'Sin definir' : trimmed;
};

const NuevoProveedor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);
  const [formData, setFormData] = useState<ProveedorData>({
    nombre_proveedor: '',
    rut: '',
    razon_social: '',
    correo_contacto: '',
    tipo_proveedor: 'Empresa',
    pagina_web: '',
    competencia_directa: false,
    habilitado: false,
    acuerdo_confidencialidad_NDA: false,
    ETFA: false,
    evaluacion: null,
    clasificacion: null,
  });

  const [direccionForm, setDireccionForm] = useState<DireccionFormData>({
    direccion_sucursal: emptyDireccionDetalle(),
    direccion_casa_matriz: emptyDireccionDetalle(),
  });

  const [informacionContactoForm, setInformacionContactoForm] = useState<InformacionContactoFormData>({
    contacto_comercial: emptyContactoDetalle(),
    contacto_adicional_1: emptyContactoDetalle(),
    contacto_adicional_2: emptyContactoDetalle(),
  });

  const [popupEditor, setPopupEditor] = useState<PopupEditorState>(null);

  // Calcular clasificación automáticamente cuando cambia la evaluación
  // Si hay una clasificación guardada y no hay evaluación, usar la clasificación guardada
  // Si hay evaluación, calcular desde la evaluación (tiene prioridad)
  const clasificacionCalculada = useMemo(() => {
    if (formData.evaluacion !== null && formData.evaluacion !== undefined) {
      return calcularClasificacion(formData.evaluacion);
    }
    // Si no hay evaluación pero hay clasificación guardada, usar esa
    return formData.clasificacion || null;
  }, [formData.evaluacion, formData.clasificacion]);

  const competenciaDirectaActiva = formData.competencia_directa === true;
  const ndaActivo = formData.acuerdo_confidencialidad_NDA === true;
  const etfaActiva = formData.ETFA === true;

  const especialidadesSeleccionadasDetalle = useMemo(() => {
    const selectedIds = new Set(especialidadesSeleccionadas);
    return especialidades.filter((esp) => selectedIds.has(esp.id));
  }, [especialidades, especialidadesSeleccionadas]);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar especialidades
  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        setLoadingEspecialidades(true);
        const data = await fetchEspecialidades();
        setEspecialidades(data);
      } catch (err) {
        console.error('Error al cargar especialidades:', err);
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    loadEspecialidades();
  }, []);

  // Cargar datos del proveedor si está en modo edición
  useEffect(() => {
    const loadProveedor = async () => {
      if (!isEditMode || !id) return;

      try {
        setLoadingData(true);
        const proveedor = await fetchProveedorById(Number(id));
        
        if (!proveedor) {
          setError('Proveedor no encontrado');
          setTimeout(() => navigate(getAreaPath('actuales')), 2000);
          return;
        }

        // Cargar los datos en el formulario
        // Si hay evaluación, usarla; si no, usar null
        const evaluacionValue = proveedor.evaluacion !== null && proveedor.evaluacion !== undefined 
          ? Number(proveedor.evaluacion) 
          : null;
        
        // Si hay clasificación guardada, usarla; si no, calcularla desde la evaluación
        const clasificacionValue = proveedor.clasificacion 
          ? proveedor.clasificacion 
          : (evaluacionValue !== null ? calcularClasificacion(evaluacionValue) : null);

        setFormData({
          nombre_proveedor: proveedor.nombre_proveedor || '',
          rut: proveedor.rut || '',
          razon_social: proveedor.razon_social || '',
          correo_contacto: proveedor.correo_contacto || '',
          tipo_proveedor: proveedor.tipo_proveedor || 'Empresa',
          pagina_web: proveedor.pagina_web || '',
          competencia_directa: toBoolean(proveedor.competencia_directa),
          habilitado: toBoolean(proveedor.competencia_directa) ? false : toBoolean(proveedor.habilitado),
          acuerdo_confidencialidad_NDA: toBoolean(proveedor.acuerdo_confidencialidad_NDA),
          ETFA: toBoolean(proveedor.ETFA),
          evaluacion: evaluacionValue,
          clasificacion: clasificacionValue,
        });

        const direccion = toPlainObject(proveedor.direccion);
        const informacionContacto = toPlainObject(proveedor.informacion_contacto);

        const direccionSucursal = toDireccionDetalle(direccion.direccion_sucursal);
        const direccionCasaMatrizData = toDireccionDetalle(direccion.direccion_casa_matriz);
        const legacyDireccionData = toDireccionDetalle(direccion);

        const hasDireccionCasaMatriz = Object.values(direccionCasaMatrizData).some(
          (value) => value !== ''
        );

        setDireccionForm({
          direccion_sucursal: direccionSucursal,
          direccion_casa_matriz: hasDireccionCasaMatriz
            ? direccionCasaMatrizData
            : legacyDireccionData,
        });

        setInformacionContactoForm({
          contacto_comercial: toContactoDetalle(informacionContacto.contacto_comercial),
          contacto_adicional_1: toContactoDetalle(informacionContacto.contacto_adicional_1),
          contacto_adicional_2: toContactoDetalle(informacionContacto.contacto_adicional_2),
        });

        // Cargar especialidades del proveedor desde brg_core_proveedor_especialidad
        try {
          const especialidadesProveedor = await fetchEspecialidadesByRut(
            proveedor.rut || ''
          );

          // Convertir los nombres de especialidad a IDs según el catálogo cargado
          setEspecialidadesSeleccionadas((prev) => {
            // Usar el catálogo actual de especialidades para mapear nombres -> ids
            const ids = especialidades
              .filter((esp) => especialidadesProveedor.includes(esp.nombre))
              .map((esp) => esp.id);
            return ids;
          });
        } catch (err) {
          console.warn('No se pudieron cargar las especialidades del proveedor:', err);
        }
      } catch (err: any) {
        console.error('Error al cargar proveedor:', err);
        setError('Error al cargar los datos del proveedor');
      } finally {
        setLoadingData(false);
      }
    };

    loadProveedor();
  }, [id, isEditMode, navigate, especialidades]);


  useEffect(() => {
    if (!popupEditor) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopupEditor(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [popupEditor]);

  useEffect(() => {
    if (!competenciaDirectaActiva || formData.habilitado === false) {
      return;
    }

    setFormData((prev) => {
      if (prev.competencia_directa !== true || prev.habilitado === false) {
        return prev;
      }

      return {
        ...prev,
        habilitado: false,
      };
    });
  }, [competenciaDirectaActiva, formData.habilitado]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const { name, checked } = e.target;

      setFormData((prev) => {
        if (name === 'competencia_directa') {
          return {
            ...prev,
            competencia_directa: checked,
            habilitado: checked ? false : prev.habilitado ?? false,
          };
        }

        if (name === 'habilitado') {
          return {
            ...prev,
            habilitado: checked,
          };
        }

        return {
          ...prev,
          [name]: checked,
        };
      });
      setError(null);
      return;
    }

    const { name, value } = e.target;
    
    // Si es el campo de evaluación, convertir a número
    if (name === 'evaluacion') {
      const numValue = value === '' ? null : Number(value);
      // Validar que esté entre 0 y 100
      if (numValue !== null && (numValue < 0 || numValue > 100)) {
        setError('La evaluación debe estar entre 0 y 100');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
        clasificacion: calcularClasificacion(numValue),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value || null,
      }));
    }
    setError(null);
  };

  const handleDireccionFieldChange = (
    section: keyof DireccionFormData,
    field: keyof DireccionDetalleFormData,
    value: string
  ) => {
    setDireccionForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setError(null);
  };

  const handleInformacionContactoFieldChange = (
    section: keyof InformacionContactoFormData,
    field: keyof ContactoDetalleFormData,
    value: string
  ) => {
    setInformacionContactoForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setError(null);
  };

  const handleEspecialidadChange = (especialidadId: number) => {
    setEspecialidadesSeleccionadas((prev) => {
      if (prev.includes(especialidadId)) {
        return prev.filter((id) => id !== especialidadId);
      } else {
        return [...prev, especialidadId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar que el nombre_proveedor no esté vacío
      if (!formData.nombre_proveedor.trim()) {
        setError('El nombre del proveedor es requerido');
        setLoading(false);
        return;
      }

      // Preparar los datos para enviar (convertir strings vacios a null)
      const direccionSucursal = {
        pais: toNullableText(direccionForm.direccion_sucursal.pais),
        ciudad: toNullableText(direccionForm.direccion_sucursal.ciudad),
        region: toNullableText(direccionForm.direccion_sucursal.region),
        direccion: toNullableText(direccionForm.direccion_sucursal.direccion),
      };

      const direccionCasaMatriz = {
        pais: toNullableText(direccionForm.direccion_casa_matriz.pais),
        ciudad: toNullableText(direccionForm.direccion_casa_matriz.ciudad),
        region: toNullableText(direccionForm.direccion_casa_matriz.region),
        direccion: toNullableText(direccionForm.direccion_casa_matriz.direccion),
      };

      const contactoComercial = {
        nombre: toNullableText(informacionContactoForm.contacto_comercial.nombre),
        correo: toNullableText(informacionContactoForm.contacto_comercial.correo),
        telefono: toNullableText(informacionContactoForm.contacto_comercial.telefono),
        cargo: toNullableText(informacionContactoForm.contacto_comercial.cargo),
      };

      const contactoAdicional1 = {
        nombre: toNullableText(informacionContactoForm.contacto_adicional_1.nombre),
        correo: toNullableText(informacionContactoForm.contacto_adicional_1.correo),
        telefono: toNullableText(informacionContactoForm.contacto_adicional_1.telefono),
        cargo: toNullableText(informacionContactoForm.contacto_adicional_1.cargo),
      };

      const contactoAdicional2 = {
        nombre: toNullableText(informacionContactoForm.contacto_adicional_2.nombre),
        correo: toNullableText(informacionContactoForm.contacto_adicional_2.correo),
        telefono: toNullableText(informacionContactoForm.contacto_adicional_2.telefono),
        cargo: toNullableText(informacionContactoForm.contacto_adicional_2.cargo),
      };

      const direccionPayload = {
        direccion_sucursal: direccionSucursal,
        direccion_casa_matriz: direccionCasaMatriz,
      };

      const informacionContactoPayload = {
        contacto_comercial: contactoComercial,
        contacto_adicional_1: contactoAdicional1,
        contacto_adicional_2: contactoAdicional2,
      };

      const competenciaDirecta = formData.competencia_directa === true;
      const habilitado = competenciaDirecta ? false : formData.habilitado === true;
      const acuerdoConfidencialidadNDA = formData.acuerdo_confidencialidad_NDA === true;
      const etfa = formData.ETFA === true;

      const dataToSend: ProveedorData = {
        nombre_proveedor: formData.nombre_proveedor.trim(),
        rut: formData.rut?.trim() || null,
        razon_social: formData.razon_social?.trim() || null,
        correo_contacto: formData.correo_contacto?.trim() || null,
        tipo_proveedor: formData.tipo_proveedor || null,
        pagina_web: formData.pagina_web?.trim() || null,
        competencia_directa: competenciaDirecta,
        habilitado,
        acuerdo_confidencialidad_NDA: acuerdoConfidencialidadNDA,
        ETFA: etfa,
        direccion:
          hasAnyValue(direccionSucursal) || hasAnyValue(direccionCasaMatriz)
            ? direccionPayload
            : null,
        informacion_contacto:
          hasAnyValue(contactoComercial) ||
          hasAnyValue(contactoAdicional1) ||
          hasAnyValue(contactoAdicional2)
            ? informacionContactoPayload
            : null,
        evaluacion: formData.evaluacion ?? null,
        clasificacion: clasificacionCalculada,
      };

      if (isEditMode && id) {
        await updateProveedor(Number(id), dataToSend);
      } else {
        await createProveedor(dataToSend);
      }

      // Obtener los nombres de las especialidades seleccionadas a partir de sus IDs
      const especialidadesSeleccionadasNombres = especialidades
        .filter((esp) => especialidadesSeleccionadas.includes(esp.id))
        .map((esp) => esp.nombre);

      // Guardar las especialidades seleccionadas en brg_core_proveedor_especialidad
      await saveProveedorEspecialidades(
        dataToSend.nombre_proveedor,
        dataToSend.rut || null,
        especialidadesSeleccionadasNombres
      );

      // Redirigir a la lista de proveedores actuales
      navigate(getAreaPath('actuales'));
    } catch (err: any) {
      console.error('Error al crear proveedor:', err);
      setError(
        err.message || 'Error al guardar el proveedor. Por favor, intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(getAreaPath('actuales'));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                {isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h1>
              <p className="text-sm text-gray-500">
                {isEditMode
                  ? 'Modifique los datos del proveedor y guarde los cambios.'
                  : 'Complete el formulario para agregar un nuevo proveedor a la base de datos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 lg:p-8">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando datos del proveedor...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  <span>{error}</span>
                </div>
              )}

            {/* Primera fila: Nombre y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre_proveedor" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nombre_proveedor"
                  name="nombre_proveedor"
                  value={formData.nombre_proveedor}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: AGQ Chile SA"
                />
              </div>
              <div>
                <label htmlFor="tipo_proveedor" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Proveedor
                </label>
                <select
                  id="tipo_proveedor"
                  name="tipo_proveedor"
                  value={formData.tipo_proveedor || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="Empresa">Empresa</option>
                  <option value="Persona natural">Persona natural</option>
                </select>
              </div>
            </div>

            {/* Segunda fila: RUT y Razón Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
                  RUT
                </label>
                <input
                  type="text"
                  id="rut"
                  name="rut"
                  value={formData.rut || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: 96.964.370-7"
                />
              </div>
              <div>
                <label htmlFor="razon_social" className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social
                </label>
                <input
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: AGQ Chile SA"
                />
              </div>
            </div>

            {/* Tercera fila: Correo */}
            <div>
              <label htmlFor="correo_contacto" className="block text-sm font-medium text-gray-700 mb-2">
                Correo de Contacto
              </label>
              <input
                type="email"
                id="correo_contacto"
                name="correo_contacto"
                value={formData.correo_contacto || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Ej: contacto@proveedor.cl"
              />
            </div>

            {/* Cuarta fila: Pagina Web */}
            <div>
              <label htmlFor="pagina_web" className="block text-sm font-medium text-gray-700 mb-2">
                Pagina Web
              </label>
              <input
                type="url"
                id="pagina_web"
                name="pagina_web"
                value={formData.pagina_web || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Ej: https://proveedor.cl"
              />
            </div>

            {/* Quinta fila: Estado comercial */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111318]">Estado comercial</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Si el proveedor es competencia directa, queda deshabilitado automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  htmlFor="competencia_directa"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all cursor-pointer ${
                    competenciaDirectaActiva
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="competencia_directa"
                    name="competencia_directa"
                    checked={competenciaDirectaActiva}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111318]">Competencia directa</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          competenciaDirectaActiva
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {competenciaDirectaActiva ? 'Si' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Marcalo si este proveedor compite directamente con Myma.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="habilitado"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all ${
                    competenciaDirectaActiva
                      ? 'border-gray-200 bg-gray-50 opacity-80 cursor-not-allowed'
                      : formData.habilitado
                        ? 'border-green-300 bg-green-50 cursor-pointer'
                        : 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="habilitado"
                    name="habilitado"
                    checked={formData.habilitado === true}
                    onChange={handleChange}
                    disabled={competenciaDirectaActiva}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111318]">Habilitado</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          formData.habilitado
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {formData.habilitado ? 'Si' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Indica si el proveedor esta habilitado para operar o contratar.
                    </p>
                    {competenciaDirectaActiva && (
                      <p className="text-xs font-medium text-amber-700">
                        Se desactiva automaticamente mientras el proveedor sea competencia directa.
                      </p>
                    )}
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  htmlFor="acuerdo_confidencialidad_NDA"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all cursor-pointer ${
                    ndaActivo
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="acuerdo_confidencialidad_NDA"
                    name="acuerdo_confidencialidad_NDA"
                    checked={ndaActivo}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111318]">NDA</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          ndaActivo
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ndaActivo ? 'Si' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Indica si el proveedor cuenta con acuerdo de confidencialidad firmado.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="ETFA"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-4 transition-all cursor-pointer ${
                    etfaActiva
                      ? 'border-cyan-300 bg-cyan-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="ETFA"
                    name="ETFA"
                    checked={etfaActiva}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111318]">ETFA</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          etfaActiva
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {etfaActiva ? 'Si' : 'No'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Indica si el proveedor cuenta con registro ETFA.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Sexta fila: Direccion (JSONB amigable) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111318]">Direccion</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(direccionSectionLabels) as DireccionSectionKey[]).map((section) => (
                  <div key={section} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {direccionSectionLabels[section]}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPopupEditor({ kind: 'direccion', section })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                    </div>

                    <dl className="space-y-2">
                      {direccionFieldConfig.map((field) => (
                        <div key={field.key} className="flex items-start justify-between gap-3 text-sm">
                          <dt className="text-gray-500">{field.label}</dt>
                          <dd className="text-right text-gray-800 max-w-[70%] break-words">
                            {displayOrPlaceholder(direccionForm[section][field.key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>

            {/* Septima fila: Informacion de contacto (JSONB amigable) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111318]">Informacion de contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(informacionContactoSectionLabels) as InformacionContactoSectionKey[]).map((section) => (
                  <div key={section} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {informacionContactoSectionLabels[section]}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPopupEditor({ kind: 'contacto', section })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>
                    </div>

                    <dl className="space-y-2">
                      {contactoFieldConfig.map((field) => (
                        <div key={field.key} className="flex items-start justify-between gap-3 text-sm">
                          <dt className="text-gray-500">{field.label}</dt>
                          <dd className="text-right text-gray-800 max-w-[70%] break-words">
                            {displayOrPlaceholder(informacionContactoForm[section][field.key])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>

            {/* Octava fila: Especialidades */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Especialidades
                </label>
                {especialidadesSeleccionadasDetalle.length > 0 && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {especialidadesSeleccionadasDetalle.length} seleccionada
                    {especialidadesSeleccionadasDetalle.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="mb-3 min-h-8">
                {especialidadesSeleccionadasDetalle.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {especialidadesSeleccionadasDetalle.map((esp) => (
                      <span
                        key={esp.id}
                        className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        {esp.nombre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sin especialidades seleccionadas.</p>
                )}
              </div>

              {loadingEspecialidades ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-500">Cargando especialidades...</span>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {especialidades.map((esp) => (
                      <label
                        key={esp.id}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={especialidadesSeleccionadas.includes(esp.id)}
                          onChange={() => handleEspecialidadChange(esp.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                        />
                        <span className="text-sm text-gray-700">{esp.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {especialidadesSeleccionadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {especialidadesSeleccionadas.length} especialidad{especialidadesSeleccionadas.length !== 1 ? 'es' : ''} seleccionada{especialidadesSeleccionadas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quinta fila eliminada: Evaluación y Clasificación (no se muestra en esta pantalla) */}

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
                    <span>Guardar Proveedor</span>
                  </>
                )}
              </button>
            </div>
          </form>
          )}
        </div>



        {popupEditor && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setPopupEditor(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#111318]">
                    {popupEditor.kind === 'direccion'
                      ? direccionSectionLabels[popupEditor.section]
                      : informacionContactoSectionLabels[popupEditor.section]}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {popupEditor.kind === 'direccion'
                      ? `Edita los campos de direccion.${popupEditor.section}`
                      : `Edita los campos de informacion_contacto.${popupEditor.section}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopupEditor(null)}
                  className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar editor"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="p-6">
                {popupEditor.kind === 'direccion' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {direccionFieldConfig.map((field) => (
                      <div key={field.key}>
                        <label
                          htmlFor={`popup-${popupEditor.section}-${String(field.key)}`}
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          {field.label}
                        </label>
                        <input
                          type="text"
                          id={`popup-${popupEditor.section}-${String(field.key)}`}
                          value={direccionForm[popupEditor.section][field.key]}
                          onChange={(e) =>
                            handleDireccionFieldChange(popupEditor.section, field.key, e.target.value)
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contactoFieldConfig.map((field) => (
                      <div key={field.key}>
                        <label
                          htmlFor={`popup-${popupEditor.section}-${String(field.key)}`}
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          id={`popup-${popupEditor.section}-${String(field.key)}`}
                          value={informacionContactoForm[popupEditor.section][field.key]}
                          onChange={(e) =>
                            handleInformacionContactoFieldChange(
                              popupEditor.section,
                              field.key,
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setPopupEditor(null)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default NuevoProveedor;












