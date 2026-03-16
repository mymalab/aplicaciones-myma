import { supabase } from '@shared/api-client/supabase';
import { Adenda, NewAdendaPayload, AdendaListItem } from '../types';

/**
 * Datos dummy para desarrollo
 */
const DUMMY_ADENDAS: AdendaListItem[] = [
  {
    id: 1,
    tipo: 'adenda',
    codigo_myma: 'MY-50-2025',
    nombre: 'Mina Las Cenizas',
    estado: 'En curso',
    fecha_creacion: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    tipo: 'adenda',
    codigo_myma: 'MY-15-2025',
    nombre: 'CMP',
    estado: 'En curso',
    fecha_creacion: '2025-01-10T14:30:00Z',
  },
  {
    id: 3,
    tipo: 'adenda',
    codigo_myma: 'MY-22-2025',
    nombre: 'Hidronor',
    estado: 'Stand By',
    fecha_creacion: '2025-01-05T09:15:00Z',
  },
  {
    id: 4,
    tipo: 'adenda_complementaria',
    codigo_myma: 'MY-16-2025',
    nombre: 'MyMA',
    estado: 'En curso',
    fecha_creacion: '2025-01-12T11:20:00Z',
  },
  {
    id: 5,
    tipo: 'adenda_complementaria',
    codigo_myma: 'MY-98-2025',
    nombre: 'Planta Las Cenizas',
    estado: 'Finalizado',
    fecha_creacion: '2024-12-20T16:45:00Z',
  },
];

/**
 * Obtener todas las adendas
 */
export const fetchAdendas = async (): Promise<AdendaListItem[]> => {
  try {
    const { data, error } = await supabase
      .from('adendas')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching adendas:', error);
      // Retornar datos dummy en caso de error o tabla vacía
      console.log('📦 Usando datos dummy para desarrollo');
      return DUMMY_ADENDAS;
    }

    // Si hay datos en la BD, usarlos; si no, usar dummy
    if (data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        tipo: item.tipo,
        codigo_myma: item.codigo_myma,
        nombre: item.nombre,
        estado: item.estado,
        fecha_creacion: item.fecha_creacion || item.created_at,
      }));
    } else {
      // Tabla vacía, retornar datos dummy
      console.log('📦 Tabla vacía, usando datos dummy para desarrollo');
      return DUMMY_ADENDAS;
    }
  } catch (error) {
    console.error('Error in fetchAdendas:', error);
    // En caso de error, retornar datos dummy
    console.log('📦 Error al cargar, usando datos dummy para desarrollo');
    return DUMMY_ADENDAS;
  }
};

/**
 * Obtener una adenda por ID
 */
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

    if (!data) return null;

    return {
      id: data.id,
      tipo: data.tipo,
      codigo_myma: data.codigo_myma,
      nombre: data.nombre,
      descripcion: data.descripcion,
      fecha_creacion: data.fecha_creacion || data.created_at,
      fecha_actualizacion: data.fecha_actualizacion || data.updated_at,
      estado: data.estado,
    };
  } catch (error) {
    console.error('Error in fetchAdendaById:', error);
    return null;
  }
};

/**
 * Crear una nueva adenda
 */
export const createAdenda = async (payload: NewAdendaPayload): Promise<Adenda> => {
  try {
    const { data, error } = await supabase
      .from('adendas')
      .insert([
        {
          tipo: payload.tipo,
          codigo_myma: payload.codigo_myma,
          nombre: payload.nombre,
          descripcion: payload.descripcion,
          estado: payload.estado,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating adenda:', error);
      throw error;
    }

    return {
      id: data.id,
      tipo: data.tipo,
      codigo_myma: data.codigo_myma,
      nombre: data.nombre,
      descripcion: data.descripcion,
      fecha_creacion: data.fecha_creacion || data.created_at,
      fecha_actualizacion: data.fecha_actualizacion || data.updated_at,
      estado: data.estado,
    };
  } catch (error) {
    console.error('Error in createAdenda:', error);
    throw error;
  }
};

/**
 * Actualizar una adenda existente
 */
export const updateAdenda = async (
  id: number,
  payload: NewAdendaPayload
): Promise<Adenda> => {
  try {
    const { data, error } = await supabase
      .from('adendas')
      .update({
        tipo: payload.tipo,
        codigo_myma: payload.codigo_myma,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        estado: payload.estado,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating adenda:', error);
      throw error;
    }

    return {
      id: data.id,
      tipo: data.tipo,
      codigo_myma: data.codigo_myma,
      nombre: data.nombre,
      descripcion: data.descripcion,
      fecha_creacion: data.fecha_creacion || data.created_at,
      fecha_actualizacion: data.fecha_actualizacion || data.updated_at,
      estado: data.estado,
    };
  } catch (error) {
    console.error('Error in updateAdenda:', error);
    throw error;
  }
};

/**
 * Eliminar una adenda
 */
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

