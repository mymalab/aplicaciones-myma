import { supabase } from '@shared/api-client/supabase';
import { normalizeSearchText } from '../utils/search';

type ProveedorJsonb = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface ProveedorData {
  nombre_proveedor: string;
  rut?: string | null;
  razon_social?: string | null;
  correo_contacto?: string | null;
  tipo_proveedor?: string | null;
  pagina_web?: string | null;
  direccion?: ProveedorJsonb;
  informacion_contacto?: ProveedorJsonb;
  evaluacion?: number | null;
  clasificacion?: string | null;
}

export interface ProveedorResponse {
  id: number;
  nombre_proveedor: string;
  rut?: string | null;
  razon_social?: string | null;
  correo_contacto?: string | null;
  tipo_proveedor?: string | null;
  pagina_web?: string | null;
  direccion?: ProveedorJsonb;
  informacion_contacto?: ProveedorJsonb;
  evaluacion?: number | null;
  clasificacion?: string | null;
  categoria_proveedor?: string | null;
  promedio_nota_total_ponderada?: number | null;
  cantidad_a?: number | null;
  cantidad_b?: number | null;
  cantidad_c?: number | null;
  total_evaluaciones?: number | null;
  cruce?: string | null;
  created_at: string;
  updated_at: string;
}

const toPlainObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
};

export const getProveedorCorreoContacto = (
  proveedor: Pick<ProveedorResponse, 'informacion_contacto' | 'correo_contacto'>
): string => {
  const informacionContacto = toPlainObject(proveedor.informacion_contacto);
  const contactoComercial = toPlainObject(informacionContacto.contacto_comercial);
  const correoContacto = toText(contactoComercial.correo);

  return correoContacto || toText(proveedor.correo_contacto);
};

export const getProveedorNombreContacto = (
  proveedor: Pick<ProveedorResponse, 'informacion_contacto'>
): string => {
  const informacionContacto = toPlainObject(proveedor.informacion_contacto);
  const contactoComercial = toPlainObject(informacionContacto.contacto_comercial);

  return toText(contactoComercial.nombre);
};

/**
 * Calcular la clasificación basada en el porcentaje de evaluación
 * Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
 * > 0.764 -> A
 * 0.5 <= cumplimiento <= 0.764 -> B
 * < 0.5 -> C
 */
export const calcularClasificacion = (evaluacion: number | null | undefined): string | null => {
  if (evaluacion === null || evaluacion === undefined) {
    return null;
  }

  // Convertir porcentaje a decimal (0-1)
  const cumplimiento = evaluacion / 100;
  if (cumplimiento > 0.764) return 'A';
  if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'B';
  return 'C';
};

/**
 * Obtener todos los proveedores
 */
export const fetchProveedores = async (): Promise<ProveedorResponse[]> => {
  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .select('*')
    .order('nombre_proveedor', { ascending: true });

  if (error) {
    console.error('Error fetching proveedores:', error);
    throw error;
  }

  return data || [];
};

/**
 * Crear un nuevo proveedor
 */
export const createProveedor = async (proveedorData: ProveedorData): Promise<ProveedorResponse> => {
  // No enviar al backend columnas que no existan en la tabla (ej: evaluacion, clasificacion)
  const { evaluacion, clasificacion, ...dataWithoutEvalYClasificacion } = proveedorData;

  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .insert([dataWithoutEvalYClasificacion])
    .select()
    .single();

  if (error) {
    console.error('Error creating proveedor:', error);
    throw error;
  }

  return data;
};

/**
 * Actualizar un proveedor existente
 */
export const updateProveedor = async (
  id: number,
  proveedorData: Partial<ProveedorData>
): Promise<ProveedorResponse> => {
  // No enviar al backend columnas que no existan en la tabla (ej: evaluacion, clasificacion)
  const { evaluacion, clasificacion, ...updateData } = proveedorData;

  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating proveedor:', error);
    throw error;
  }

  return data;
};

/**
 * Obtener un proveedor por ID
 */
export const fetchProveedorById = async (id: number): Promise<ProveedorResponse | null> => {
  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No se encontró el registro
      return null;
    }
    console.error('Error fetching proveedor:', error);
    throw error;
  }

  return data;
};

export interface ProveedorServicioCatalogo {
  id: number;
  servicio: string;
  especialidad: unknown;
  nombre_proveedor: string;
  rut: string;
  created_at: string;
  updated_at: string;
}

export interface ProveedorServicioCatalogoNormalizado {
  servicio: string;
  especialidades: string[];
  especialidadLabel: string;
}

export interface ServicioCatalogoDisponible {
  id: number;
  servicio: string;
  especialidad: string;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Obtener catalogo base de servicios disponibles para asociar a proveedores
 */
export const fetchServiciosCatalogoDisponibles = async (): Promise<ServicioCatalogoDisponible[]> => {
  const { data, error } = await supabase
    .from('dim_core_proveedores_servicios')
    .select('id, servicio, especialidad, created_at, updated_at')
    .order('servicio', { ascending: true })
    .order('especialidad', { ascending: true });

  if (error) {
    console.error('Error fetching catalogo base de servicios:', error);
    throw error;
  }

  return (data || []) as ServicioCatalogoDisponible[];
};
/**
 * Crear un servicio en el catalogo base de proveedores
 */
export const createServicioCatalogoDisponible = async (params: {
  servicio: string;
  especialidad: string | string[];
}): Promise<ServicioCatalogoDisponible> => {
  const servicio = params.servicio.trim();
  const especialidad = Array.isArray(params.especialidad)
    ? Array.from(new Set(params.especialidad.map((item) => item.trim()).filter(Boolean)))
    : params.especialidad.trim();

  if (!servicio || (Array.isArray(especialidad) ? especialidad.length === 0 : !especialidad)) {
    throw new Error('Debes ingresar servicio y especialidad.');
  }

  const { data, error } = await supabase
    .from('dim_core_proveedores_servicios')
    .insert([
      {
        servicio,
        especialidad,
      },
    ])
    .select('id, servicio, especialidad, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error creando servicio en catalogo base:', error);
    throw error;
  }

  return data as ServicioCatalogoDisponible;
};

/**
 * Actualizar un servicio del catalogo base de proveedores
 */
export const updateServicioCatalogoDisponible = async (
  id: number,
  params: {
    servicio: string;
    especialidad: string | string[];
  }
): Promise<ServicioCatalogoDisponible> => {
  const servicio = params.servicio.trim();
  const especialidad = Array.isArray(params.especialidad)
    ? Array.from(new Set(params.especialidad.map((item) => item.trim()).filter(Boolean)))
    : params.especialidad.trim();

  if (!id || !servicio || (Array.isArray(especialidad) ? especialidad.length === 0 : !especialidad)) {
    throw new Error('Datos incompletos para actualizar el servicio del catalogo.');
  }

  const { data, error } = await supabase
    .from('dim_core_proveedores_servicios')
    .update({
      servicio,
      especialidad,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, servicio, especialidad, created_at, updated_at')
    .single();

  if (error) {
    console.error('Error actualizando servicio en catalogo base:', error);
    throw error;
  }

  return data as ServicioCatalogoDisponible;
};

/**
 * Eliminar un servicio del catalogo base de proveedores
 */
export const deleteServicioCatalogoDisponible = async (id: number): Promise<void> => {
  if (!id) {
    throw new Error('ID invalido para eliminar servicio del catalogo.');
  }

  const { error } = await supabase
    .from('dim_core_proveedores_servicios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error eliminando servicio del catalogo base:', error);
    throw error;
  }
};

const normalizeEspecialidadInput = (value: unknown): string | string[] => {
  const values: string[] = [];

  const pushValue = (input: unknown): void => {
    if (input === null || input === undefined) return;

    if (Array.isArray(input)) {
      input.forEach(pushValue);
      return;
    }

    if (typeof input === 'object') {
      const record = input as Record<string, unknown>;
      const priorityKeys = ['especialidad', 'especialidades', 'values', 'value', 'items', 'lista'];
      const key = priorityKeys.find((candidate) => candidate in record);

      if (key) {
        pushValue(record[key]);
      } else {
        Object.values(record).forEach(pushValue);
      }
      return;
    }

    if (typeof input !== 'string') return;

    const trimmed = input.trim();
    if (!trimmed) return;

    const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{');
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        pushValue(parsed);
        return;
      } catch {
        // Si no es JSON valido, se usa el texto original.
      }
    }

    values.push(trimmed);
  };

  pushValue(value);

  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length <= 1) {
    return uniqueValues[0] ?? '';
  }

  return uniqueValues;
};
const isMissingCruceColumnError = (error: unknown): boolean => {
  const code = String((error as any)?.code ?? '');
  const message = normalizeSearchText(String((error as any)?.message ?? ''));
  const details = normalizeSearchText(String((error as any)?.details ?? ''));
  const hint = normalizeSearchText(String((error as any)?.hint ?? ''));
  const fullText = [message, details, hint].join(' ');

  if (code === '42703' || code === 'PGRST204') {
    return true;
  }

  return fullText.includes('column') && fullText.includes('cruce');
};

/**
 * Marcar cruce del proveedor como "Informacion actualizada"
 */
export const markProveedorCruceInformacionActualizadaByRut = async (rut: string): Promise<void> => {
  const rutTrimmed = rut.trim();

  if (!rutTrimmed) {
    throw new Error('RUT invalido para actualizar estado de cruce del proveedor.');
  }

  const updatePayloadLower = {
    cruce: 'Información actualizada',
    updated_at: new Date().toISOString(),
  };

  const { error: lowerError } = await supabase
    .from('dim_core_proveedor')
    .update(updatePayloadLower)
    .eq('rut', rutTrimmed);

  if (!lowerError) {
    return;
  }

  if (!isMissingCruceColumnError(lowerError)) {
    console.error('Error actualizando estado de cruce del proveedor (cruce):', lowerError);
    throw lowerError;
  }

  const updatePayloadUpper: Record<string, unknown> = {
    Cruce: 'Información actualizada',
    updated_at: new Date().toISOString(),
  };

  const { error: upperError } = await supabase
    .from('dim_core_proveedor')
    .update(updatePayloadUpper)
    .eq('rut', rutTrimmed);

  if (upperError) {
    console.error('Error actualizando estado de cruce del proveedor (Cruce):', upperError);
    throw upperError;
  }
};

/**
 * Asociar un servicio del catalogo base a un proveedor
 */
export const createProveedorServicioCatalogo = async (params: {
  servicio: string;
  especialidad: unknown;
  nombre_proveedor: string;
  rut: string;
}): Promise<void> => {
  const servicio = params.servicio.trim();
  const especialidad = normalizeEspecialidadInput(params.especialidad);
  const nombreProveedor = params.nombre_proveedor.trim();
  const rut = params.rut.trim();

  if (!servicio || (Array.isArray(especialidad) ? especialidad.length === 0 : !especialidad) || !nombreProveedor || !rut) {
    throw new Error('Datos incompletos para asociar servicio al proveedor.');
  }

  const { error } = await supabase
    .from('brg_proveedores_servicios')
    .upsert(
      [
        {
          servicio,
          especialidad,
          nombre_proveedor: nombreProveedor,
          rut,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'servicio,especialidad,rut', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Error creando asociacion proveedor-servicio:', error);
    throw error;
  }
};

/**
 * Actualizar una asociacion proveedor-servicio del catalogo
 */
export const updateProveedorServicioCatalogo = async (
  id: number,
  params: {
    servicio: string;
    especialidad: unknown;
    nombre_proveedor: string;
    rut: string;
  }
): Promise<void> => {
  const servicio = params.servicio.trim();
  const especialidad = normalizeEspecialidadInput(params.especialidad);
  const nombreProveedor = params.nombre_proveedor.trim();
  const rut = params.rut.trim();

  if (!id || !servicio || (Array.isArray(especialidad) ? especialidad.length === 0 : !especialidad) || !nombreProveedor || !rut) {
    throw new Error('Datos incompletos para actualizar servicio del proveedor.');
  }

  const { error } = await supabase
    .from('brg_proveedores_servicios')
    .update({
      servicio,
      especialidad,
      nombre_proveedor: nombreProveedor,
      rut,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error actualizando asociacion proveedor-servicio:', error);
    throw error;
  }
};

/**
 * Eliminar una asociacion proveedor-servicio del catalogo
 */
export const deleteProveedorServicioCatalogo = async (id: number): Promise<void> => {
  if (!id) {
    throw new Error('ID invalido para eliminar servicio del proveedor.');
  }

  const { error } = await supabase.from('brg_proveedores_servicios').delete().eq('id', id);

  if (error) {
    console.error('Error eliminando asociacion proveedor-servicio:', error);
    throw error;
  }
};

/**
 * Obtener catalogo de servicios asociados a un proveedor por RUT
 */
export const fetchServiciosCatalogoByRut = async (rut: string): Promise<ProveedorServicioCatalogo[]> => {
  const rutTrimmed = rut.trim();

  if (!rutTrimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from('brg_proveedores_servicios')
    .select('id, servicio, especialidad, nombre_proveedor, rut, created_at, updated_at')
    .eq('rut', rutTrimmed)
    .order('especialidad', { ascending: true })
    .order('servicio', { ascending: true });

  if (error) {
    console.error('Error fetching catalogo de servicios por RUT:', error);
    throw error;
  }

  return data || [];
};

export const normalizeServiciosCatalogoByRut = (
  catalogo: ProveedorServicioCatalogo[]
): ProveedorServicioCatalogoNormalizado[] => {
  const byServicio = new Map<string, { servicio: string; especialidades: string[] }>();

  catalogo.forEach((item) => {
    const servicioVisible = item.servicio.trim();
    if (!servicioVisible) {
      return;
    }

    const servicioKey = normalizeSearchText(servicioVisible);
    if (!servicioKey) {
      return;
    }

    const especialidades = dedupeEspecialidades(extractEspecialidadesFromJsonb(item.especialidad));
    const existing = byServicio.get(servicioKey);

    if (!existing) {
      byServicio.set(servicioKey, {
        servicio: servicioVisible,
        especialidades,
      });
      return;
    }

    existing.especialidades = dedupeEspecialidades([...existing.especialidades, ...especialidades]);
  });

  return Array.from(byServicio.values())
    .map((item) => ({
      servicio: item.servicio,
      especialidades: item.especialidades,
      especialidadLabel: item.especialidades.join(', '),
    }))
    .sort((a, b) => a.servicio.localeCompare(b.servicio, 'es', { sensitivity: 'base' }));
};

export const fetchServiciosCatalogoNormalizadosByRut = async (
  rut: string
): Promise<ProveedorServicioCatalogoNormalizado[]> => {
  const catalogo = await fetchServiciosCatalogoByRut(rut);
  return normalizeServiciosCatalogoByRut(catalogo);
};

/**
 * Eliminar un proveedor
 */
export const deleteProveedor = async (id: number): Promise<void> => {
  const { error } = await supabase.from('dim_core_proveedor').delete().eq('id', id);

  if (error) {
    console.error('Error deleting proveedor:', error);
    throw error;
  }
};

/**
 * Interfaz para Persona
 */
export interface Persona {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  obs_salud?: string;
  estado: string;
  gerencia_id: string;
  comuna_id: string;
  cargo_myma_id: string;
  especialidad_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Obtener todas las especialidades
 */
export const fetchEspecialidades = async (): Promise<{ id: number; nombre: string }[]> => {
  const { data, error } = await supabase
    .from('dim_core_especialidad')
    .select('id, nombre_especialidad')
    .order('nombre_especialidad', { ascending: true });

  if (error) {
    console.error('Error fetching especialidades:', error);
    throw error;
  }

  // Mapear nombre_especialidad a nombre para mantener la interfaz consistente
  return (data || []).map((item) => ({
    id: item.id,
    nombre: item.nombre_especialidad,
  }));
};

/**
 * Crear una nueva especialidad
 */
export const createEspecialidad = async (nombreEspecialidad: string): Promise<{ id: number; nombre: string }> => {
  const { data, error } = await supabase
    .from('dim_core_especialidad')
    .insert([{ nombre_especialidad: nombreEspecialidad }])
    .select('id, nombre_especialidad')
    .single();

  if (error) {
    console.error('Error creating especialidad:', error);
    throw error;
  }

  return {
    id: data.id,
    nombre: data.nombre_especialidad,
  };
};

/**
 * Actualizar una especialidad existente
 */
export const updateEspecialidad = async (
  id: number,
  nombreEspecialidad: string
): Promise<{ id: number; nombre: string }> => {
  const nombre = nombreEspecialidad.trim();

  if (!id || !nombre) {
    throw new Error('Debes ingresar un nombre de especialidad valido.');
  }

  const { data, error } = await supabase
    .from('dim_core_especialidad')
    .update({ nombre_especialidad: nombre })
    .eq('id', id)
    .select('id, nombre_especialidad')
    .single();

  if (error) {
    console.error('Error updating especialidad:', error);
    throw error;
  }

  return {
    id: data.id,
    nombre: data.nombre_especialidad,
  };
};

/**
 * Eliminar una especialidad
 */
export const deleteEspecialidad = async (id: number): Promise<void> => {
  if (!id) {
    throw new Error('ID invalido para eliminar especialidad.');
  }

  const { error } = await supabase
    .from('dim_core_especialidad')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting especialidad:', error);
    throw error;
  }
};

/**
 * Obtener todas las personas activas
 */
export const fetchPersonas = async (): Promise<Persona[]> => {
  const { data, error } = await supabase
    .from('dim_core_persona')
    .select('*')
    .eq('estado', 'Activo')
    .order('nombre_completo', { ascending: true });
  
  if (error) {
    console.error('Error fetching personas:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Obtener las especialidades de un proveedor desde brg_core_proveedor_especialidad por RUT
 */
export const fetchEspecialidadesByRut = async (rutProveedor: string): Promise<string[]> => {
  const rutTrimmed = rutProveedor.trim();

  if (!rutTrimmed) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('brg_core_proveedor_especialidad')
      .select('especialidad')
      .eq('rut', rutTrimmed);

    if (error) {
      // Si la tabla no existe, retornar array vacio
      if (error.code === '42P01') {
        console.warn('Tabla brg_core_proveedor_especialidad no existe aun');
        return [];
      }
      console.error('Error fetching especialidades del proveedor por RUT:', error);
      throw error;
    }

    // Extraer los valores unicos de especialidad
    const especialidades = (data || []).map((item) => item.especialidad).filter(Boolean);
    return dedupeEspecialidades(especialidades);
  } catch (err: any) {
    // Si hay cualquier error, retornar array vacio
    console.warn('No se pudieron cargar las especialidades del proveedor por RUT:', err);
    return [];
  }
};

/**
 * @deprecated Usar fetchEspecialidadesByRut. Se mantiene por compatibilidad.
 */
export const fetchEspecialidadesByNombreProveedor = async (rutProveedor: string): Promise<string[]> => {
  return fetchEspecialidadesByRut(rutProveedor);
};

/**
 * Obtener las especialidades de un proveedor
 */

export const extractEspecialidadesFromJsonb = (value: unknown): string[] => {
  const values: string[] = [];
  const visited = new WeakSet<object>();
  const priorityKeys = ['especialidad', 'especialidades', 'values', 'value', 'items', 'lista'];

  const collect = (input: unknown): void => {
    if (input === null || input === undefined) {
      return;
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const looksLikeJson =
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'));

      if (looksLikeJson) {
        try {
          const parsed = JSON.parse(trimmed);
          collect(parsed);
          return;
        } catch {
          // Si no es JSON valido, se considera texto plano.
        }
      }

      values.push(trimmed);
      return;
    }

    if (Array.isArray(input)) {
      input.forEach(collect);
      return;
    }

    if (typeof input === 'object') {
      const record = input as Record<string, unknown>;
      if (visited.has(record)) {
        return;
      }

      visited.add(record);

      const priorityValues = priorityKeys
        .filter((key) => key in record)
        .map((key) => record[key]);

      if (priorityValues.length > 0) {
        priorityValues.forEach(collect);
        return;
      }

      Object.values(record).forEach(collect);
      return;
    }
  };

  collect(value);
  return values;
};

const dedupeEspecialidades = (especialidades: string[]): string[] => {
  const byNormalized = new Map<string, string>();

  especialidades.forEach((especialidad) => {
    const visibleValue = especialidad.trim();
    if (!visibleValue) {
      return;
    }

    const normalized = normalizeSearchText(visibleValue);
    if (!normalized) {
      return;
    }

    if (!byNormalized.has(normalized)) {
      byNormalized.set(normalized, visibleValue);
    }
  });

  return Array.from(byNormalized.values());
};

const parseValidDate = (value: unknown): Date | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const rawValue = value.trim();
  if (!rawValue) {
    return null;
  }

  const candidates = [
    rawValue,
    rawValue.replace(' ', 'T'),
    rawValue.replace(/(\.\d{3})\d+/, '$1'),
    rawValue.replace(/(\.\d{3})\d+/, '$1').replace(' ', 'T'),
  ];

  for (const candidate of candidates) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const pickLatestDate = (current: Date | null, candidate: Date | null): Date | null => {
  if (!candidate) {
    return current;
  }

  if (!current || candidate.getTime() > current.getTime()) {
    return candidate;
  }

  return current;
};

export const fetchUltimaActualizacionServiciosByRuts = async (
  ruts: string[]
): Promise<Record<string, string | null>> => {
  const normalizedRuts = Array.from(
    new Set(ruts.map((rut) => rut?.trim()).filter((rut): rut is string => Boolean(rut)))
  );

  if (normalizedRuts.length === 0) {
    return {};
  }

  const ultimaActualizacionPorRut = normalizedRuts.reduce<Record<string, string | null>>((acc, rut) => {
    acc[rut] = null;
    return acc;
  }, {});

  const { data, error } = await supabase
    .from('brg_proveedores_servicios')
    .select('rut, created_at, updated_at')
    .in('rut', normalizedRuts);

  if (error) {
    console.error('Error fetching ultima actualizacion de servicios por rut:', error);
    throw error;
  }

  (data || []).forEach((item) => {
    const rut = typeof item.rut === 'string' ? item.rut.trim() : '';
    if (!rut) {
      return;
    }

    const currentLatest = parseValidDate(ultimaActualizacionPorRut[rut]);
    const createdAt = parseValidDate(item.created_at);
    const updatedAt = parseValidDate(item.updated_at);

    const latest = pickLatestDate(pickLatestDate(currentLatest, createdAt), updatedAt);
    ultimaActualizacionPorRut[rut] = latest ? latest.toISOString() : null;
  });

  return ultimaActualizacionPorRut;
};

export const fetchEspecialidadesPriorizadasByRuts = async (
  ruts: string[]
): Promise<Record<string, string[]>> => {
  const normalizedRuts = Array.from(
    new Set(ruts.map((rut) => rut?.trim()).filter((rut): rut is string => Boolean(rut)))
  );

  if (normalizedRuts.length === 0) {
    return {};
  }

  const especialidadesPorRut: Record<string, string[]> = normalizedRuts.reduce<Record<string, string[]>>(
    (acc, rut) => {
      acc[rut] = [];
      return acc;
    },
    {}
  );

  const { data: catalogoData, error: catalogoError } = await supabase
    .from('brg_proveedores_servicios')
    .select('rut, especialidad')
    .in('rut', normalizedRuts);

  if (catalogoError) {
    console.error('Error fetching especialidades priorizadas desde brg_proveedores_servicios:', catalogoError);
    throw catalogoError;
  }

  const catalogoPorRut = new Map<string, string[]>();

  (catalogoData || []).forEach((item) => {
    const rut = typeof item.rut === 'string' ? item.rut.trim() : '';
    if (!rut) {
      return;
    }

    if (!catalogoPorRut.has(rut)) {
      catalogoPorRut.set(rut, []);
    }

    catalogoPorRut.get(rut)?.push(...extractEspecialidadesFromJsonb(item.especialidad));
  });

  const rutsConCatalogo = new Set<string>();
  catalogoPorRut.forEach((especialidades, rut) => {
    rutsConCatalogo.add(rut);
    especialidadesPorRut[rut] = dedupeEspecialidades(especialidades);
  });

  const rutsFallback = normalizedRuts.filter((rut) => !rutsConCatalogo.has(rut));

  if (rutsFallback.length > 0) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('brg_core_proveedor_especialidad')
      .select('rut, especialidad')
      .in('rut', rutsFallback);

    if (fallbackError) {
      console.error('Error fetching especialidades fallback desde brg_core_proveedor_especialidad:', fallbackError);
      throw fallbackError;
    }

    const fallbackPorRut = new Map<string, string[]>();

    (fallbackData || []).forEach((item) => {
      const rut = typeof item.rut === 'string' ? item.rut.trim() : '';
      const especialidad = typeof item.especialidad === 'string' ? item.especialidad.trim() : '';

      if (!rut || !especialidad) {
        return;
      }

      if (!fallbackPorRut.has(rut)) {
        fallbackPorRut.set(rut, []);
      }

      fallbackPorRut.get(rut)?.push(especialidad);
    });

    fallbackPorRut.forEach((especialidades, rut) => {
      especialidadesPorRut[rut] = dedupeEspecialidades(especialidades);
    });
  }

  return especialidadesPorRut;
};

export const fetchEspecialidadesByProveedorId = async (proveedorId: number): Promise<number[]> => {
  try {
    const { data, error } = await supabase
      .from('proveedor_especialidad')
      .select('especialidad_id')
      .eq('proveedor_id', proveedorId);

    if (error) {
      // Si la tabla no existe, retornar array vacío
      if (error.code === '42P01') {
        console.warn('Tabla proveedor_especialidad no existe aún');
        return [];
      }
      console.error('Error fetching especialidades del proveedor:', error);
      throw error;
    }

    return (data || []).map((item) => item.especialidad_id);
  } catch (err: any) {
    // Si hay cualquier error (tabla no existe, etc.), retornar array vacío
    console.warn('No se pudieron cargar las especialidades del proveedor:', err);
    return [];
  }
};

/**
 * Guardar las especialidades de un proveedor
 * Se guarda en la tabla brg_core_proveedor_especialidad
 * Estrategia: eliminar registros actuales del proveedor y volver a insertar los seleccionados
 */
export const saveProveedorEspecialidades = async (
  nombreProveedor: string,
  rut: string | null,
  especialidades: string[]
): Promise<void> => {
  try {
    // Eliminar todas las relaciones existentes del proveedor por RUT
    const rutTrimmed = rut?.trim() || '';
    if (!rutTrimmed) {
      console.warn('No se puede guardar especialidades sin RUT. Operacion omitida.');
      return;
    }

    const { error: deleteError } = await supabase
      .from('brg_core_proveedor_especialidad')
      .delete()
      .eq('rut', rutTrimmed);

    if (deleteError && deleteError.code !== '42P01') {
      // Si el error no es "tabla no existe", lanzar el error
      console.error('Error eliminando especialidades del proveedor en brg_core_proveedor_especialidad:', deleteError);
      throw deleteError;
    }

    // Si no hay especialidades para guardar, terminar aquí
    if (especialidades.length === 0) {
      return;
    }

    // Crear los nuevos registros
    const registros = especialidades.map((especialidad) => ({
      nombre_proveedor: nombreProveedor,
      rut: rutTrimmed,
      especialidad,
    }));

    const { error: insertError } = await supabase
      .from('brg_core_proveedor_especialidad')
      .insert(registros);

    if (insertError) {
      // Si la tabla no existe, solo loguear un warning
      if (insertError.code === '42P01') {
        console.warn('Tabla brg_core_proveedor_especialidad no existe aún. Las especialidades no se guardaron.');
        return;
      }
      console.error('Error guardando especialidades del proveedor en brg_core_proveedor_especialidad:', insertError);
      throw insertError;
    }
  } catch (err: any) {
    // Si hay cualquier error, solo loguear un warning pero no fallar
    console.warn('No se pudieron guardar las especialidades del proveedor:', err);
  }
};

/**
 * Interfaz para los datos de evaluación de servicios
 */
export interface EvaluacionServiciosData {
  nombre_proveedor: string;
  rut?: string | null;
  servicio?: string | null;
  especialidad?: unknown | null;
  actividad?: string | null;
  orden_compra?: string | null;
  codigo_proyecto?: string | null;
  nombre_proyecto?: string | null;
  jefe_proyecto?: string | null;
  gerente_proyecto?: string | null;
  fecha_evaluacion?: string | null;
  evaluador?: string | null;
  evaluacion_calidad?: string | null;
  evaluacion_disponibilidad?: string | null;
  evaluacion_fecha_entrega?: string | null;
  evaluacion_precio?: string | null;
  nota_total_ponderada?: number | null;
  categoria_proveedor?: string | null;
  observacion?: string | null;
  aplica_salida_terreno?: boolean;
  evaluacion_seguridad_terreno?: string | null;
  precio_servicio?: number | null;
  correo_contacto?: string | null;
  nombre_contacto?: string | null;
  link_servicio_ejecutado?: string | null;
  estado?: string | null;
  created_by?: string | null;
}

/**
 * Eliminar una evaluación de servicios de fct_proveedores_evaluacion_evt
 */
export const deleteEvaluacionServicios = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error eliminando evaluación de servicios:', error);
    throw error;
  }
};

/**
 * Guardar una evaluación de servicios en fct_proveedores_evaluacion_evt
 */
export const saveEvaluacionServicios = async (
  evaluacionData: EvaluacionServiciosData
): Promise<any> => {
  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .insert([evaluacionData])
    .select()
    .single();

  if (error) {
    console.error('Error guardando evaluación de servicios:', error);
    throw error;
  }

  return data;
};

/**
 * Actualizar una evaluación de servicios existente en fct_proveedores_evaluacion_evt
 */
export const updateEvaluacionServicios = async (
  id: number,
  evaluacionData: Partial<EvaluacionServiciosData>
): Promise<any> => {
  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .update({
      ...evaluacionData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando evaluación de servicios:', error);
    throw error;
  }

  return data;
};

/**
 * Enviar evaluación de proveedor a n8n a través de edge function
 * Edge function: Envio-de-registro-de-Evaluacion-de-Servicio
 */
export const sendEvaluacionProveedorToN8n = async (payload: any): Promise<any> => {
  try {
    console.log('[DEBUG] Invocando edge function: Envio-de-registro-de-Evaluacion-de-Servicio');
    console.log('[DEBUG] Payload completo:', JSON.stringify(payload, null, 2));
    
    const { data, error } = await supabase.functions.invoke('Envio-de-registro-de-Evaluacion-de-Servicio', {
      body: payload,
    });

    if (error) {
      console.error('[ERROR] Error al invocar función edge:', error);
      console.error('[DEBUG] Detalles del error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      
      // Si es un 404, la función no está desplegada
      if (error.message?.includes('404') || error.message?.includes('not found') || (error as any).status === 404) {
        throw new Error('La función edge "Envio-de-registro-de-Evaluacion-de-Servicio" no está desplegada. Por favor, despliega la función en Supabase usando: supabase functions deploy Envio-de-registro-de-Evaluacion-de-Servicio');
      }
      
      throw error;
    }

    console.log('[DEBUG] Respuesta recibida de la edge function:', data);

    if (!data) {
      throw new Error('No se recibió respuesta de la edge function');
    }

    // La edge function puede devolver success: true/false o simplemente datos
    if (data.success === false) {
      throw new Error(data?.error || 'Error desconocido al enviar evaluación a n8n');
    }

    return data;
  } catch (error: any) {
    console.error('[ERROR] Error completo al enviar evaluación a n8n:', error);
    throw error;
  }
};

/**
 * Interfaz para las evaluaciones de proveedores desde fct_proveedores_evaluacion_evt
 */
export interface EvaluacionProveedor {
  id: number;
  nombre?: string | null; // nombre_proveedor en la tabla
  nombre_proveedor?: string | null; // Campo principal
  rut?: string | null;
  servicio?: string | null;
  especialidad?: string | null;
  actividad?: string | null;
  orden_compra?: string | null;
  codigo_proyecto?: string | null;
  nombre_proyecto?: string | null;
  jefe_proyecto?: string | null;
  gerente_proyecto?: string | null;
  fecha_evaluacion?: string | null;
  evaluador?: string | null;
  evaluacion_calidad?: string | null;
  evaluacion_disponibilidad?: string | null;
  evaluacion_fecha_entrega?: string | null;
  evaluacion_precio?: string | null;
  nota_total_ponderada?: number | null;
  categoria_proveedor?: string | null;
  observacion?: string | null;
  aplica_salida_terreno?: boolean | null;
  evaluacion_seguridad_terreno?: string | null;
  precio_servicio?: number | null;
  correo_contacto?: string | null;
  nombre_contacto?: string | null;
  link_servicio_ejecutado?: string | null;
  created_at: string;
  updated_at: string;
  // Relación con la tabla profiles a través de created_by
  profiles?: {
    full_name?: string | null;
  } | null;
}

/**
 * @deprecated Usar fetchEvaluacionesByRutProveedor. Se mantiene por compatibilidad.
 */
export const fetchEvaluacionesByNombreProveedor = async (
  rutProveedor: string
): Promise<EvaluacionProveedor[]> => {
  const rutTrimmed = rutProveedor.trim();
  if (!rutTrimmed) {
    return [];
  }

  console.log('[DEBUG] Buscando evaluaciones por RUT (compat):', rutTrimmed);

  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .select('*, profiles:created_by ( full_name )')
    .eq('rut', rutTrimmed)
    .order('fecha_evaluacion', { ascending: false });

  if (error) {
    console.error('Error fetching evaluaciones del proveedor por RUT (compat):', error);
    throw error;
  }

  return normalizeEvaluacionesEspecialidad(data || []);
};

/**
 * Obtener todas las evaluaciones de un proveedor por RUT
 */
export const fetchEvaluacionesByRutProveedor = async (
  rutProveedor: string
): Promise<EvaluacionProveedor[]> => {
  console.log('[DEBUG] Buscando evaluaciones por RUT:', rutProveedor);
  
  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .select('*, profiles:created_by ( full_name )')
    .eq('rut', rutProveedor)
    .order('fecha_evaluacion', { ascending: false });

  if (error) {
    console.error('Error fetching evaluaciones del proveedor por RUT:', error);
    throw error;
  }

  console.log(`[DEBUG] Encontradas ${data?.length || 0} evaluaciones para RUT ${rutProveedor}`);
  if (data && data.length > 0) {
    console.log('[DEBUG] Evaluaciones encontradas:', data);
  }

  return normalizeEvaluacionesEspecialidad(data || []);
};

/**
 * Obtener todas las evaluaciones de todos los proveedores
 */
export const fetchAllEvaluaciones = async (): Promise<EvaluacionProveedor[]> => {
  console.log('[DEBUG] Buscando todas las evaluaciones');
  
  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion_evt')
    .select('*, profiles:created_by ( full_name )')
    .order('fecha_evaluacion', { ascending: false });

  if (error) {
    console.error('Error fetching todas las evaluaciones:', error);
    throw error;
  }

  console.log(`[DEBUG] Encontradas ${data?.length || 0} evaluaciones en total`);

  return normalizeEvaluacionesEspecialidad(data || []);
};

const normalizeEvaluacionesEspecialidad = (
  rows: EvaluacionProveedor[]
): EvaluacionProveedor[] => {
  return rows.map((item) => {
    const especialidades = extractEspecialidadesFromJsonb((item as any).especialidad);
    const especialidadLabel = especialidades.join(', ').trim();

    return {
      ...item,
      especialidad: especialidadLabel || null,
    };
  });
};
