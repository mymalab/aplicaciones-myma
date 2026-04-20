import { supabase } from '@shared/api-client/supabase';
import { Adenda, NewAdendaPayload, AdendaListItem } from '../types';
import { TipoAdenda } from '../constants';

type AdendaMutationPayload = {
  tipo: NewAdendaPayload['tipo'];
  codigo_myma?: string;
  nombre?: string;
  descripcion?: string;
  fecha_entrega?: string;
  estado?: string;
  url_proyecto?: string;
};

type AdendaMutationOptions = {
  requireRecord?: boolean;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

let supportsUrlProyectoColumn: boolean | null = null;

const normalizeErrorText = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase() : '';

const isMissingColumnError = (error: unknown, columnName: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const supabaseError = error as SupabaseErrorLike;
  const code = String(supabaseError.code ?? '');
  const fullText = [
    normalizeErrorText(supabaseError.message),
    normalizeErrorText(supabaseError.details),
    normalizeErrorText(supabaseError.hint),
  ].join(' ');
  const normalizedColumnName = columnName.toLowerCase();

  if (code === 'PGRST204' || code === '42703') {
    return fullText.includes(normalizedColumnName);
  }

  return fullText.includes('column') && fullText.includes(normalizedColumnName);
};

const buildMutationPayload = (
  payload: NewAdendaPayload,
  includeUrlProyecto: boolean
): AdendaMutationPayload => {
  const mutationPayload: AdendaMutationPayload = {
    tipo: payload.tipo,
    codigo_myma: payload.codigo_myma,
    nombre: payload.nombre,
    descripcion: payload.descripcion,
    fecha_entrega: payload.fecha_entrega,
    estado: payload.estado,
  };

  if (includeUrlProyecto && payload.url_proyecto) {
    mutationPayload.url_proyecto = payload.url_proyecto;
  }

  return mutationPayload;
};

const mapAdenda = (data: any): Adenda => ({
  id: data.id,
  tipo: data.tipo,
  codigo_myma: data.codigo_myma,
  nombre: data.nombre,
  url_proyecto: data.url_proyecto,
  descripcion: data.descripcion,
  fecha_entrega: data.fecha_entrega,
  fecha_creacion: data.fecha_creacion || data.created_at,
  fecha_actualizacion: data.fecha_actualizacion || data.updated_at,
  estado: data.estado,
});

const mapAdendaListItem = (item: any): AdendaListItem => ({
  id: item.id,
  tipo: item.tipo,
  codigo_myma: item.codigo_myma,
  nombre: item.nombre,
  url_proyecto: item.url_proyecto,
  estado: item.estado,
  fecha_entrega: item.fecha_entrega,
  fecha_creacion: item.fecha_creacion || item.created_at,
});

const buildOptimisticAdenda = (id: number, payload: NewAdendaPayload): Adenda => ({
  id,
  tipo: payload.tipo,
  codigo_myma: payload.codigo_myma,
  nombre: payload.nombre,
  url_proyecto: payload.url_proyecto,
  descripcion: payload.descripcion,
  fecha_entrega: payload.fecha_entrega,
  estado: payload.estado,
});

const fetchAdendasWithOrder = async (orderColumn: 'fecha_creacion' | 'created_at') =>
  supabase
    .from('adendas')
    .select('*')
    .order(orderColumn, { ascending: false });

const insertAdendaRow = async (
  payload: NewAdendaPayload,
  includeUrlProyecto: boolean,
  requireRecord: boolean
) => {
  const query = supabase
    .from('adendas')
    .insert([buildMutationPayload(payload, includeUrlProyecto)]);

  return requireRecord ? query.select().single() : query;
};

const updateAdendaRow = async (
  id: number,
  payload: NewAdendaPayload,
  includeUrlProyecto: boolean,
  requireRecord: boolean
) => {
  const query = supabase
    .from('adendas')
    .update(buildMutationPayload(payload, includeUrlProyecto))
    .eq('id', id);

  return requireRecord ? query.select().single() : query;
};

const DUMMY_ADENDAS: AdendaListItem[] = [
  {
    id: 1,
    tipo: TipoAdenda.ADENDA,
    codigo_myma: 'MY-50-2025',
    nombre: 'Mina Las Cenizas',
    estado: 'En curso',
    fecha_creacion: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    tipo: TipoAdenda.ADENDA,
    codigo_myma: 'MY-15-2025',
    nombre: 'CMP',
    estado: 'En curso',
    fecha_creacion: '2025-01-10T14:30:00Z',
  },
  {
    id: 3,
    tipo: TipoAdenda.ADENDA,
    codigo_myma: 'MY-22-2025',
    nombre: 'Hidronor',
    estado: 'Stand By',
    fecha_creacion: '2025-01-05T09:15:00Z',
  },
  {
    id: 4,
    tipo: TipoAdenda.ADENDA_COMPLEMENTARIA,
    codigo_myma: 'MY-16-2025',
    nombre: 'MyMA',
    estado: 'En curso',
    fecha_creacion: '2025-01-12T11:20:00Z',
  },
  {
    id: 5,
    tipo: TipoAdenda.ADENDA_COMPLEMENTARIA,
    codigo_myma: 'MY-98-2025',
    nombre: 'Planta Las Cenizas',
    estado: 'Finalizado',
    fecha_creacion: '2024-12-20T16:45:00Z',
  },
];

export const fetchAdendas = async (): Promise<AdendaListItem[]> => {
  try {
    let { data, error } = await fetchAdendasWithOrder('fecha_creacion');

    if (error && isMissingColumnError(error, 'fecha_creacion')) {
      console.warn(
        "La columna 'fecha_creacion' no existe en Supabase. Reintentando listado de adendas con 'created_at'."
      );
      ({ data, error } = await fetchAdendasWithOrder('created_at'));
    }

    if (error) {
      console.error('Error fetching adendas:', error);
      console.log('Usando datos dummy para desarrollo');
      return DUMMY_ADENDAS;
    }

    if (data && data.length > 0) {
      return data.map(mapAdendaListItem);
    }

    console.log('Tabla vacia, usando datos dummy para desarrollo');
    return DUMMY_ADENDAS;
  } catch (error) {
    console.error('Error in fetchAdendas:', error);
    console.log('Error al cargar, usando datos dummy para desarrollo');
    return DUMMY_ADENDAS;
  }
};

export const fetchAdendaByCodigoMyma = async (codigoMyma: string): Promise<Adenda | null> => {
  const codigo = codigoMyma.trim();
  if (!codigo) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('adendas')
      .select('*')
      .eq('codigo_myma', codigo)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return mapAdenda(data);
    }

    const { data: ilikeData, error: ilikeError } = await supabase
      .from('adendas')
      .select('*')
      .ilike('codigo_myma', codigo)
      .limit(1)
      .maybeSingle();

    if (ilikeError) {
      console.error('Error fetching adenda by codigo_myma:', ilikeError);
      return null;
    }

    if (ilikeData) {
      return mapAdenda(ilikeData);
    }

    return null;
  } catch (error) {
    console.error('Error in fetchAdendaByCodigoMyma:', error);
    return null;
  }
};

export const fetchAdendaById = async (id: number): Promise<Adenda | null> => {
  try {
    const { data, error } = await supabase
      .from('adendas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching adenda:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapAdenda(data);
  } catch (error) {
    console.error('Error in fetchAdendaById:', error);
    return null;
  }
};

export const createAdenda = async (
  payload: NewAdendaPayload,
  options: AdendaMutationOptions = {}
): Promise<Adenda> => {
  try {
    const shouldTryWithUrlProyecto = supportsUrlProyectoColumn !== false;
    const requireRecord = options.requireRecord ?? false;

    let { data, error } = await insertAdendaRow(payload, shouldTryWithUrlProyecto, requireRecord);

    if (error && shouldTryWithUrlProyecto && isMissingColumnError(error, 'url_proyecto')) {
      supportsUrlProyectoColumn = false;
      console.warn(
        "La columna 'url_proyecto' no existe en Supabase. Reintentando guardado de adenda sin esa columna."
      );
      ({ data, error } = await insertAdendaRow(payload, false, requireRecord));
    } else if (!error && shouldTryWithUrlProyecto) {
      supportsUrlProyectoColumn = true;
    }

    if (error) {
      console.error('Error creating adenda:', error);
      throw error;
    }

    if (!data) {
      if (requireRecord) {
        throw new Error(
          'La adenda se guardo, pero no fue posible recuperar el registro creado para continuar.'
        );
      }

      return buildOptimisticAdenda(0, payload);
    }

    return mapAdenda(data);
  } catch (error) {
    console.error('Error in createAdenda:', error);
    throw error;
  }
};

export const updateAdenda = async (
  id: number,
  payload: NewAdendaPayload,
  options: AdendaMutationOptions = {}
): Promise<Adenda> => {
  try {
    const shouldTryWithUrlProyecto = supportsUrlProyectoColumn !== false;
    const requireRecord = options.requireRecord ?? false;

    let { data, error } = await updateAdendaRow(
      id,
      payload,
      shouldTryWithUrlProyecto,
      requireRecord
    );

    if (error && shouldTryWithUrlProyecto && isMissingColumnError(error, 'url_proyecto')) {
      supportsUrlProyectoColumn = false;
      console.warn(
        "La columna 'url_proyecto' no existe en Supabase. Reintentando actualizacion de adenda sin esa columna."
      );
      ({ data, error } = await updateAdendaRow(id, payload, false, requireRecord));
    } else if (!error && shouldTryWithUrlProyecto) {
      supportsUrlProyectoColumn = true;
    }

    if (error) {
      console.error('Error updating adenda:', error);
      throw error;
    }

    if (!data) {
      if (requireRecord) {
        throw new Error(
          'La adenda se actualizo, pero no fue posible recuperar el registro actualizado para continuar.'
        );
      }

      return buildOptimisticAdenda(id, payload);
    }

    return mapAdenda(data);
  } catch (error) {
    console.error('Error in updateAdenda:', error);
    throw error;
  }
};

export const deleteAdenda = async (id: number): Promise<void> => {
  try {
    const { error } = await supabase.from('adendas').delete().eq('id', id);

    if (error) {
      console.error('Error deleting adenda:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteAdenda:', error);
    throw error;
  }
};
