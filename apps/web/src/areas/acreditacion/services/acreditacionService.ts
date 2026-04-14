import { supabase } from '@shared/api-client/supabase';
import {
  Persona,
  Requerimiento,
  PersonaRequerimientoSST,
  RequestItem,
  RequestStatus,
  SolicitudAcreditacion,
  ProjectGalleryItem,
  Cliente,
  ClienteContacto,
  EmpresaRequerimiento,
  ProyectoRequerimientoAcreditacion,
  ResponsableRequerimiento,
  ProyectoTrabajador,
  FieldRequestFormSnapshot,
  RequestFormData,
  Worker,
  WorkerType,
  ProveedorAcreditacion,
  TrabajadorExterno,
  SOLICITUD_ACREDITACION_STATUS,
  SolicitudAcreditacionStatus,
} from '../types';
import { generateProjectTasks, calculateCompletedTasks } from '../utils/projectTasks';
import { ACREDITACION_PROXY_ENDPOINTS } from './acreditacionProxyEndpoints';

const LEGACY_FINALIZADO_ALIASES = new Set(['finalizado', 'finalizada']);

const normalizeStatusText = (status: string | null | undefined): string =>
  (status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isNormalizedLegacyFinalizadoStatus = (normalizedStatus: string): boolean =>
  LEGACY_FINALIZADO_ALIASES.has(normalizedStatus);

export interface UpsertTrabajadorExternoInput {
  nombre_completo: string;
  rut: string;
  telefono?: string | null;
  empresa_razon_social: string;
  empresa_rut: string;
  correo?: string | null;
}

interface CreateClienteContactoInput {
  nombre_completo: string;
  correo: string;
  cliente: string;
  cliente_id: number;
}

export const normalizeRut = (value: string | null | undefined): string =>
  (value || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase();

const toCanonicalRut = (value: string | null | undefined): string => {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) return '';

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  return `${body}-${dv}`;
};

export const formatRut = (value: string | null | undefined): string => {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) return normalized;

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${bodyWithDots}-${dv}`;
};

const buildRutVariants = (value: string | null | undefined): string[] => {
  const normalized = normalizeRut(value);
  if (normalized.length < 2) return [];

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const dvUpper = dv.toUpperCase();
  const dvLower = dv.toLowerCase();
  const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return Array.from(
    new Set([
      `${body}-${dvUpper}`,
      `${body}-${dvLower}`,
      `${bodyWithDots}-${dvUpper}`,
      `${bodyWithDots}-${dvLower}`,
      `${body}${dvUpper}`,
      `${body}${dvLower}`,
      `${bodyWithDots}${dvUpper}`,
      `${bodyWithDots}${dvLower}`,
    ])
  );
};

export const canonicalizeSolicitudStatus = (
  status: string | null | undefined
): SolicitudAcreditacionStatus | string => {
  const normalizedStatus = normalizeStatusText(status);

  if (isNormalizedLegacyFinalizadoStatus(normalizedStatus)) {
    return SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA;
  }

  if (normalizedStatus.includes('acreditacion finalizada')) {
    return SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA;
  }

  if (normalizedStatus.includes('documentacion subida')) {
    return SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA;
  }

  if (normalizedStatus.includes('revision por cliente')) {
    return SOLICITUD_ACREDITACION_STATUS.EN_REVISION_CLIENTE;
  }

  if (normalizedStatus.includes('por asignar requerimientos')) {
    return SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_REQUERIMIENTOS;
  }

  if (normalizedStatus.includes('por asignar responsables')) {
    return SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_RESPONSABLES;
  }

  if (normalizedStatus.includes('en proceso')) {
    return SOLICITUD_ACREDITACION_STATUS.EN_PROCESO;
  }

  if (normalizedStatus.includes('cancelado') || normalizedStatus.includes('cancelada')) {
    return SOLICITUD_ACREDITACION_STATUS.CANCELADO;
  }

  if (normalizedStatus.includes('atrasado') || normalizedStatus.includes('atrasada')) {
    return SOLICITUD_ACREDITACION_STATUS.ATRASADO;
  }

  return status || SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_REQUERIMIENTOS;
};

export const isSolicitudStatusAcreditacionFinalizada = (
  status: string | null | undefined
): boolean =>
  canonicalizeSolicitudStatus(status) ===
  SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA;

export const isSolicitudStatusCancelled = (status: string | null | undefined): boolean =>
  canonicalizeSolicitudStatus(status) === SOLICITUD_ACREDITACION_STATUS.CANCELADO;

export const isSolicitudStatusOverdue = (status: string | null | undefined): boolean =>
  canonicalizeSolicitudStatus(status) === SOLICITUD_ACREDITACION_STATUS.ATRASADO;

export const isSolicitudStatusPostDocumentation = (
  status: string | null | undefined
): boolean => {
  const canonicalStatus = canonicalizeSolicitudStatus(status);
  return (
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA ||
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.EN_REVISION_CLIENTE ||
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA
  );
};

export const canRestrictedCollaboratorOpenSolicitudStatus = (
  status: string | null | undefined
): boolean => {
  const canonicalStatus = canonicalizeSolicitudStatus(status);
  return (
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.EN_PROCESO ||
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA ||
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.EN_REVISION_CLIENTE ||
    canonicalStatus === SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA
  );
};

export const getNextManualSolicitudStatus = (
  status: string | null | undefined
): SolicitudAcreditacionStatus | null => {
  const canonicalStatus = canonicalizeSolicitudStatus(status);

  if (canonicalStatus === SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA) {
    return SOLICITUD_ACREDITACION_STATUS.EN_REVISION_CLIENTE;
  }

  if (canonicalStatus === SOLICITUD_ACREDITACION_STATUS.EN_REVISION_CLIENTE) {
    return SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA;
  }

  return null;
};

export interface AdvanceSolicitudAcreditacionStatusResult {
  previousStatus: SolicitudAcreditacionStatus | string;
  nextStatus: SolicitudAcreditacionStatus;
  solicitudId: number;
}

export const advanceSolicitudAcreditacionStatus = async (
  solicitudId: number
): Promise<AdvanceSolicitudAcreditacionStatusResult> => {
  const { data: solicitud, error: fetchError } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('id, estado_solicitud_acreditacion')
    .eq('id', solicitudId)
    .single();

  if (fetchError) {
    console.error('Error fetching solicitud before status transition:', fetchError);
    throw fetchError;
  }

  const previousStatus = canonicalizeSolicitudStatus(
    solicitud?.estado_solicitud_acreditacion
  );
  const nextStatus = getNextManualSolicitudStatus(previousStatus);

  if (!nextStatus) {
    throw new Error(
      `No existe una transicion manual disponible desde el estado "${previousStatus}".`
    );
  }

  const updatePayload: Partial<SolicitudAcreditacion> = {
    estado_solicitud_acreditacion: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === SOLICITUD_ACREDITACION_STATUS.ACREDITACION_FINALIZADA) {
    updatePayload.fecha_finalizacion = new Date().toISOString();
  } else {
    updatePayload.fecha_finalizacion = null;
  }

  const { error: updateError } = await supabase
    .from('fct_acreditacion_solicitud')
    .update(updatePayload)
    .eq('id', solicitudId);

  if (updateError) {
    console.error('Error advancing solicitud status:', updateError);
    throw updateError;
  }

  return {
    previousStatus,
    nextStatus,
    solicitudId,
  };
};

// Función para enviar webhook a través de la función edge de Supabase (evita CORS)
export const sendWebhookViaEdgeFunction = async (payload: any): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pugasfsnckeyitjemvju.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/send-webhook`;
  
  console.log('🔗 Invocando función edge:', functionUrl);
  console.log('📦 Payload:', payload);
  
  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error al invocar función edge:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si es un 404, intentar hacer fetch directo como fallback
      if (error.message?.includes('404') || error.message?.includes('not found') || (error as any).status === 404) {
        console.warn('⚠️ Función edge no encontrada (404). Intentando método alternativo...');
        
        // Fallback: intentar hacer fetch directo con headers CORS
        try {
          const directResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2FzZnNuY2tleWl0amVtdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTM5MTMsImV4cCI6MjA4MTQ2OTkxM30.XDAdVZOenvzsJRxXbDkfuxIUxkGgxKWo6q6jFFPCNjg'}`,
            },
            body: JSON.stringify(payload),
          });

          if (!directResponse.ok) {
            throw new Error(`Error ${directResponse.status}: La función edge "send-webhook" no está desplegada o no es accesible. Por favor, verifica en el Dashboard de Supabase que la función esté desplegada correctamente.`);
          }

          const directData = await directResponse.json();
          console.log('✅ Respuesta usando método alternativo:', directData);
          return directData;
        } catch (fallbackError: any) {
          throw new Error(`La función edge "send-webhook" no está desplegada. Ve al Dashboard de Supabase > Edge Functions y verifica que la función "send-webhook" esté desplegada. Error: ${fallbackError.message}`);
        }
      }
      
      throw error;
    }

    console.log('✅ Respuesta de función edge:', data);
    return data;
  } catch (err: any) {
    console.error('❌ Error completo:', err);
    throw err;
  }
};

interface EnviarIdProyectoN8nOptions {
  emailUsuario?: string | null;
  solicitudPrueba?: boolean;
}

// Función para enviar el ID del proyecto a la edge function de n8n
export const enviarIdProyectoN8n = async (
  idProyecto: number,
  options?: EnviarIdProyectoN8nOptions
): Promise<any> => {
  console.log('🔗 Invocando función edge: Enviar_id_proyecto_n8n');
  console.log('📦 ID Proyecto:', idProyecto);
  
  // Obtener el correo del usuario autenticado
  let userEmail: string | null = options?.emailUsuario ?? null;
  const solicitudPrueba = options?.solicitudPrueba ?? false;
  
  if (!userEmail) {
    // Intentar primero con getSession (más confiable)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user?.email && !sessionError) {
        userEmail = session.user.email;
        console.log('👤 Correo obtenido desde session:', userEmail);
      } else {
        // Si no funciona con getSession, intentar con getUser
        console.log('⚠️ No se obtuvo correo desde session, intentando getUser...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user?.email && !userError) {
          userEmail = user.email;
          console.log('👤 Correo obtenido desde getUser:', userEmail);
        } else {
          console.warn('⚠️ No se pudo obtener el correo del usuario:', userError || sessionError);
        }
      }
    } catch (error) {
      console.error('❌ Error al obtener usuario:', error);
    }
  }
  
  if (!userEmail) {
    console.error('❌ No se pudo obtener el correo del usuario autenticado');
  }

  // Preparar el payload
  const payload = { 
    id_proyecto: idProyecto,
    email_usuario: userEmail,
    solicitud_prueba: solicitudPrueba,
  };
  
  console.log('📤 Payload completo a enviar a edge function:', payload);
  
  try {
    // Usar el método invoke de Supabase que maneja CORS automáticamente
    const { data, error } = await supabase.functions.invoke('Enviar_id_proyecto_n8n', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error al invocar función edge:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si el error indica que la función no existe, dar un mensaje más claro
      if (error.message?.includes('not found') || error.message?.includes('404') || (error as any).status === 404) {
        throw new Error('La función edge "Enviar_id_proyecto_n8n" no está desplegada. Por favor, despliega la función en Supabase usando: supabase functions deploy Enviar_id_proyecto_n8n');
      }
      
      throw error;
    }

    console.log('✅ Respuesta de función edge:', data);
    return data;
  } catch (err: any) {
    console.error('❌ Error completo al enviar ID del proyecto:', err);
    
    // Proporcionar un mensaje más amigable
    let errorMessage = 'Error al enviar ID del proyecto';
    if (err.message) {
      errorMessage += `: ${err.message}`;
    } else if (err.toString) {
      errorMessage += `: ${err.toString()}`;
    }
    
    throw new Error(errorMessage);
  }
};

// Función para calcular el estado basado en la fecha de vencimiento
export const calculateStatus = (fechaVencimiento: string | null | undefined): RequestStatus => {
  if (!fechaVencimiento) return RequestStatus.Current;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expirationDate = new Date(fechaVencimiento);
  expirationDate.setHours(0, 0, 0, 0);
  
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return RequestStatus.Expired;
  } else if (diffDays <= 30) {
    return RequestStatus.Expiring;
  } else {
    return RequestStatus.Current;
  }
};

// Función para obtener todas las personas
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
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Obtener IDs únicos de cargos y gerencias
  const cargoIds = [...new Set(data.map((p: any) => p.cargo_myma_id).filter(Boolean))];
  const gerenciaIds = [...new Set(data.map((p: any) => p.gerencia_id).filter(Boolean))];
  
  // Obtener nombres de cargos
  let cargosMap: Record<string, string> = {};
  if (cargoIds.length > 0) {
    try {
      const { data: cargosData } = await supabase
        .from('dim_core_cargo_myma')
        .select('id, nombre')
        .in('id', cargoIds);
      
      if (cargosData) {
        cargosMap = cargosData.reduce((acc: Record<string, string>, cargo: any) => {
          acc[cargo.id] = cargo.nombre;
          return acc;
        }, {});
      }
    } catch (err) {
      console.warn('Error obteniendo cargos:', err);
    }
  }
  
  // Obtener nombres de gerencias
  let gerenciasMap: Record<string, string> = {};
  if (gerenciaIds.length > 0) {
    try {
      const { data: gerenciasData } = await supabase
        .from('dim_core_gerencia')
        .select('id, nombre')
        .in('id', gerenciaIds);
      
      if (gerenciasData) {
        gerenciasMap = gerenciasData.reduce((acc: Record<string, string>, gerencia: any) => {
          acc[gerencia.id] = gerencia.nombre;
          return acc;
        }, {});
      }
    } catch (err) {
      console.warn('Error obteniendo gerencias:', err);
    }
  }
  
  // Mapear los datos para incluir cargo y área
  const personas = data.map((persona: any) => ({
    ...persona,
    cargo_nombre: persona.cargo_myma_id ? (cargosMap[persona.cargo_myma_id] || '') : '',
    area_nombre: persona.gerencia_id ? (gerenciasMap[persona.gerencia_id] || '') : '',
  }));
  
  return personas;
};

// Función para obtener todos los clientes
export const fetchClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_cliente')
    .select('*')
    .order('nombre', { ascending: true });
  
  if (error) {
    console.error('Error fetching clientes:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los responsables de requerimiento
// FunciÃ³n para obtener los contactos asociados a un cliente
export const fetchContactosClienteByClienteId = async (
  clienteId: number
): Promise<ClienteContacto[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_info_contacto_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('nombre_completo', { ascending: true });

  if (error) {
    console.error('Error fetching contactos del cliente:', error);
    throw error;
  }

  return data || [];
};

export const createContactoCliente = async (
  payload: CreateClienteContactoInput
): Promise<ClienteContacto> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_info_contacto_cliente')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    console.error('Error creating contacto del cliente:', error);
    throw error || new Error('No se pudo crear el contacto del cliente');
  }

  return data;
};

// FunciÃ³n para obtener todos los responsables de requerimiento
export const fetchResponsablesRequerimiento = async (): Promise<ResponsableRequerimiento[]> => {
  const { data, error } = await supabase
    .from('responsable_requerimiento')
    .select('*')
    .order('nombre_responsable', { ascending: true });
  
  if (error) {
    console.error('Error fetching responsables de requerimiento:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los requerimientos
export const fetchRequerimientos = async (): Promise<Requerimiento[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching requerimientos:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todas las categorías únicas de requerimientos
export const fetchCategoriasRequerimientos = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .select('categoria_requerimiento')
    .not('categoria_requerimiento', 'is', null);
  
  if (error) {
    console.error('Error fetching categorias:', error);
    throw error;
  }
  
  // Obtener valores únicos y ordenarlos
  const categoriasUnicas = Array.from(
    new Set(data?.map(item => item.categoria_requerimiento).filter(Boolean))
  ).sort() as string[];
  
  return categoriasUnicas;
};

// Función para crear un nuevo requerimiento
export const createRequerimiento = async (
  requerimiento: string,
  categoria_requerimiento: string,
  dias_anticipacion_notificacion?: number
): Promise<Requerimiento> => {
  const insertData: any = {
    requerimiento,
    categoria_requerimiento,
  };

  if (dias_anticipacion_notificacion !== undefined && dias_anticipacion_notificacion !== null) {
    insertData.dias_anticipacion_notificacion = dias_anticipacion_notificacion;
  }

  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating requerimiento:', error);
    throw error;
  }

  return data;
};

// Función para obtener requerimientos del catálogo
export const fetchCatalogoRequerimientos = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching dim_acreditacion_requerimiento:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los proveedores
export const fetchProveedores = async (): Promise<ProveedorAcreditacion[]> => {
  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .select('id, nombre_proveedor, rut')
    .order('nombre_proveedor', { ascending: true });

  if (!error) {
    return data || [];
  }

  // Fallback: en algunos entornos el campo rut puede no estar disponible por permisos/esquema.
  console.warn('Error fetching proveedores con RUT; reintentando sin columna rut:', error);
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('dim_core_proveedor')
    .select('id, nombre_proveedor')
    .order('nombre_proveedor', { ascending: true });

  if (fallbackError) {
    console.error('Error fetching proveedores (fallback sin rut):', fallbackError);
    throw fallbackError;
  }

  return (fallbackData || []).map((proveedor: { id: number; nombre_proveedor: string }) => ({
    ...proveedor,
    rut: null,
  }));
};

// Función para obtener brg_acreditacion_persona_requerimiento_sst con cálculo de estado
export const fetchPersonaRequerimientos = async (): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brg_acreditacion_persona_requerimiento_sst:', error);
    throw error;
  }
  
  if (!data) return [];
  
  // Transformar los datos al formato RequestItem
  return data.map((item: PersonaRequerimientoSST) => ({
    id: item.id.toString(),
    name: item.nombre_completo || '',
    rut: item.rut || '',
    requirement: item.requerimiento || '',
    category: item.categoria_requerimiento || '',
    // Usar estado si existe, sino calcular automáticamente
    status: item.estado ? (item.estado as RequestStatus) : calculateStatus(item.fecha_vencimiento),
    adjudicationDate: item.fecha_vigencia || '-',
    expirationDate: item.fecha_vencimiento || '-',
    persona_id: item.persona_id,
    requerimiento_id: item.requerimiento_id,
    link: item.link || undefined,
    drive_folder_id: item.drive_folder_id || undefined,
    drive_folder_url: item.drive_folder_url || undefined,
  }));
};

// Función para obtener requerimientos de una persona específica por nombre
export const fetchPersonaRequerimientosByNombre = async (nombreCompleto: string): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('*')
    .ilike('nombre_completo', `%${nombreCompleto}%`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brg_acreditacion_persona_requerimiento_sst by nombre:', error);
    throw error;
  }
  
  if (!data) return [];
  
  // Transformar los datos al formato RequestItem
  return data.map((item: PersonaRequerimientoSST) => ({
    id: item.id.toString(),
    name: item.nombre_completo || '',
    rut: item.rut || '',
    requirement: item.requerimiento || '',
    category: item.categoria_requerimiento || '',
    // Usar estado si existe, sino calcular automáticamente
    status: item.estado ? (item.estado as RequestStatus) : calculateStatus(item.fecha_vencimiento),
    adjudicationDate: item.fecha_vigencia || '-',
    expirationDate: item.fecha_vencimiento || '-',
    persona_id: item.persona_id,
    requerimiento_id: item.requerimiento_id,
    link: item.link || undefined,
    drive_folder_id: item.drive_folder_id || undefined,
    drive_folder_url: item.drive_folder_url || undefined,
  }));
};

// Función para crear un nuevo registro en brg_acreditacion_persona_requerimiento_sst
export const createPersonaRequerimiento = async (
  personaId: number,
  requerimientoId: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  const { data: existingRecords, error: existingError } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('id')
    .eq('persona_id', personaId)
    .eq('requerimiento_id', requerimientoId)
    .limit(1);

  if (existingError) throw existingError;

  if (existingRecords && existingRecords.length > 0) {
    const duplicateError = new Error(
      'Este requerimiento ya esta creado para este colaborador. Debes editar el registro existente, no crear uno nuevo.'
    );
    (duplicateError as Error & { code?: string }).code = 'DUPLICATE_PERSONA_REQUERIMIENTO';
    throw duplicateError;
  }
  // Obtener información de persona y requerimiento (incluyendo dias_anticipacion_notificacion)
  const [personaResult, requerimientoResult] = await Promise.all([
    supabase.from('dim_core_persona').select('*').eq('id', personaId).single(),
    supabase.from('dim_acreditacion_requerimiento_sst').select('*').eq('id', requerimientoId).single()
  ]);
  
  if (personaResult.error) throw personaResult.error;
  if (requerimientoResult.error) throw requerimientoResult.error;
  
  const persona = personaResult.data as Persona;
  const requerimiento = requerimientoResult.data as Requerimiento;
  
  // Usar dias_anticipacion_notificacion de la tabla requerimientos
  // Si no existe, usar 60 como valor por defecto
  let diasAnticipacion: number;
  if (requerimiento.dias_anticipacion_notificacion !== undefined && requerimiento.dias_anticipacion_notificacion !== null) {
    diasAnticipacion = requerimiento.dias_anticipacion_notificacion;
    console.log('✅ Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
  } else {
    // Fallback: usar 60 como valor por defecto
    diasAnticipacion = 60;
    console.log('⚠️ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
  }
  
  // Insertar nuevo registro
  const insertData: any = {
    persona_id: personaId,
    requerimiento_id: requerimientoId,
    rut: persona.rut,
    nombre_completo: persona.nombre_completo,
    requerimiento: requerimiento.requerimiento,
    categoria_requerimiento: requerimiento.categoria_requerimiento,
    fecha_vigencia: fechaVigencia,
    fecha_vencimiento: fechaVencimiento,
    dias_anticipacion: diasAnticipacion,
  };

  if (linkDrive) {
    insertData.link = linkDrive;
  }

  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating persona_requerimiento:', error);
    throw error;
  }
  
  return data;
};

// Función para actualizar un registro existente
export const updatePersonaRequerimiento = async (
  id: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  estado?: RequestStatus,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  console.log('🔧 updatePersonaRequerimiento recibido:');
  console.log('  - ID:', id);
  console.log('  - Estado recibido:', estado);
  console.log('  - Tipo de estado:', typeof estado);
  console.log('  - Estado === undefined?', estado === undefined);
  
  // Obtener el requerimiento_id del registro existente para obtener dias_anticipacion_notificacion
  const { data: registroExistente, error: fetchError } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('requerimiento_id')
    .eq('id', id)
    .single();
  
  let diasAnticipacion: number;
  
  if (!fetchError && registroExistente?.requerimiento_id) {
    // Obtener el requerimiento para obtener dias_anticipacion_notificacion
    const { data: requerimiento, error: reqError } = await supabase
      .from('dim_acreditacion_requerimiento_sst')
      .select('dias_anticipacion_notificacion')
      .eq('id', registroExistente.requerimiento_id)
      .single();
    
    if (!reqError && requerimiento?.dias_anticipacion_notificacion !== undefined && requerimiento.dias_anticipacion_notificacion !== null) {
      diasAnticipacion = requerimiento.dias_anticipacion_notificacion;
      console.log('✅ Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
    } else {
      // Fallback: usar 60 como valor por defecto
      diasAnticipacion = 60;
      console.log('⚠️ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
    }
  } else {
    // Fallback: usar 60 como valor por defecto si no se puede obtener el requerimiento
    diasAnticipacion = 60;
    console.log('⚠️ No se pudo obtener requerimiento_id, usando valor por defecto: 60');
  }
  
  const updateData: any = {
    fecha_vigencia: fechaVigencia,
    fecha_vencimiento: fechaVencimiento,
    dias_anticipacion: diasAnticipacion,
    estado: estado || null, // Siempre incluir el campo estado
  };

  if (linkDrive !== undefined) {
    updateData.link = linkDrive || null;
  }
  
  console.log('💾 Datos a enviar a Supabase:', updateData);
  
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error updating persona_requerimiento:', error);
    throw error;
  }
  
  console.log('✅ Registro actualizado exitosamente:', data);
  
  return data;
};

// Función para verificar si el usuario actual es admin
export const checkUserIsAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
};

// Función para eliminar un registro (solo admin puede eliminar)
export const deletePersonaRequerimiento = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting persona_requerimiento:', error);
    throw error;
  }
};

// ===== FUNCIONES PARA SOLICITUD_ACREDITACION =====

// Función para obtener todas las solicitudes de acreditación
export const fetchSolicitudesAcreditacion = async (): Promise<SolicitudAcreditacion[]> => {
  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching solicitudes_acreditacion:', error);
    throw error;
  }
  
  return data || [];
};

// Tipos y funciones para KPI del dashboard
export interface DashboardKpis {
  totalSolicitudes: number;
  totalTasksCompleted: number;
  totalTasksAll: number;
  tasaCumplimiento: number;
  solicitudesPendientes: number;
  solicitudesAtrasadas: number;
  tiempoPromedioDias: number;
  proyectosFinalizados: number;
}

export interface DashboardTiempoMensual {
  mes: string;
  promedio: number | null;
  minimo: number | null;
  maximo: number | null;
  cantidad: number;
}

export interface DashboardActividadMensual {
  mes: string;
  solicitudes: number;
  completadas: number;
  pendientes: number;
  atrasadas: number;
  cumplimiento: number;
}

export type DashboardResponsableTarea = 'JPRO' | 'EPR' | 'RRHH' | 'Legal' | 'Otros';

export interface DashboardPendientesResponsableItem {
  responsable: DashboardResponsableTarea;
  cantidad: number;
}

const DASHBOARD_MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DASHBOARD_RESPONSABLE_ORDER: DashboardResponsableTarea[] = [
  'JPRO',
  'EPR',
  'RRHH',
  'Legal',
  'Otros',
];
const DASHBOARD_PENDING_TASK_STATUSES = new Set(['pendiente', 'en proceso']);

const normalizeDashboardStatus = (status: string | null | undefined): string =>
  normalizeStatusText(status);

const isDashboardFinishedStatus = (status: string | null | undefined): boolean =>
  isSolicitudStatusAcreditacionFinalizada(status);

const isDashboardCancelledStatus = (status: string | null | undefined): boolean =>
  isSolicitudStatusCancelled(status);

const isDashboardOverdueStatus = (status: string | null | undefined): boolean =>
  isSolicitudStatusOverdue(status);

const isDashboardPendingTaskStatus = (status: string | null | undefined): boolean =>
  DASHBOARD_PENDING_TASK_STATUSES.has(normalizeDashboardStatus(status));

const normalizeDashboardResponsable = (
  responsable: string | null | undefined
): DashboardResponsableTarea => {
  const normalized = (responsable || '').trim().toUpperCase();

  if (normalized === 'JPRO') return 'JPRO';
  if (normalized === 'EPR') return 'EPR';
  if (normalized === 'RRHH') return 'RRHH';
  if (normalized === 'LEGAL') return 'Legal';

  return 'Otros';
};

// KPI del dashboard usando solo tablas reales (sin tareas generadas por fallback)
export const fetchDashboardKpis = async (): Promise<DashboardKpis> => {
  const [solicitudesResult, requerimientosResult] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('id, estado_solicitud_acreditacion, created_at, fecha_finalizacion'),
    supabase
      .from('brg_acreditacion_solicitud_requerimiento')
      .select('id, estado'),
  ]);

  if (solicitudesResult.error) {
    console.error('Error fetching dashboard solicitudes:', solicitudesResult.error);
    throw solicitudesResult.error;
  }

  if (requerimientosResult.error) {
    console.error('Error fetching dashboard requerimientos:', requerimientosResult.error);
    throw requerimientosResult.error;
  }

  const solicitudes = solicitudesResult.data || [];
  const requerimientos = requerimientosResult.data || [];

  const totalSolicitudes = solicitudes.length;
  const totalTasksAll = requerimientos.length;
  const totalTasksCompleted = requerimientos.filter((req: any) => {
    return normalizeDashboardStatus(req.estado) === 'completado';
  }).length;

  const tasaCumplimiento = totalTasksAll > 0
    ? Math.round((totalTasksCompleted / totalTasksAll) * 100)
    : 0;

  const solicitudesPendientes = solicitudes.filter((solicitud: any) => {
    const status = solicitud.estado_solicitud_acreditacion || '';
    return !isDashboardFinishedStatus(status) && !isDashboardCancelledStatus(status);
  }).length;

  const solicitudesAtrasadas = solicitudes.filter((solicitud: any) => {
    const status = solicitud.estado_solicitud_acreditacion || '';
    return isDashboardOverdueStatus(status);
  }).length;

  const solicitudesFinalizadas = solicitudes.filter((solicitud: any) => {
    const status = solicitud.estado_solicitud_acreditacion || '';
    return isDashboardFinishedStatus(status);
  });

  const finishedDurations = solicitudesFinalizadas
    .map((solicitud: any) => {
      if (!solicitud.created_at || !solicitud.fecha_finalizacion) return null;

      const createdAt = new Date(solicitud.created_at);
      const finishedAt = new Date(solicitud.fecha_finalizacion);
      if (Number.isNaN(createdAt.getTime()) || Number.isNaN(finishedAt.getTime())) return null;

      const diffInDays = Math.floor(
        (finishedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return Math.max(diffInDays, 0);
    })
    .filter((duration: number | null): duration is number => duration !== null);

  const tiempoPromedioDias = finishedDurations.length > 0
    ? Math.round(
        finishedDurations.reduce((sum, duration) => sum + duration, 0) /
          finishedDurations.length
      )
    : 0;

  return {
    totalSolicitudes,
    totalTasksCompleted,
    totalTasksAll,
    tasaCumplimiento,
    solicitudesPendientes,
    solicitudesAtrasadas,
    tiempoPromedioDias,
    proyectosFinalizados: solicitudesFinalizadas.length,
  };
};

// Serie mensual de tiempos de acreditacion (anio actual por defecto)
export const fetchDashboardTiemposEvolucionAnual = async (
  year: number = new Date().getFullYear()
): Promise<DashboardTiempoMensual[]> => {
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('created_at, fecha_finalizacion, estado_solicitud_acreditacion')
    .not('fecha_finalizacion', 'is', null)
    .gte('fecha_finalizacion', startOfYear)
    .lt('fecha_finalizacion', startOfNextYear);

  if (error) {
    console.error('Error fetching dashboard tiempos evolucion:', error);
    throw error;
  }

  const monthlyDurations: number[][] = Array.from({ length: 12 }, () => []);

  (data || []).forEach((solicitud: any) => {
    if (!isDashboardFinishedStatus(solicitud.estado_solicitud_acreditacion)) return;
    if (!solicitud.created_at || !solicitud.fecha_finalizacion) return;

    const createdAt = new Date(solicitud.created_at);
    const finishedAt = new Date(solicitud.fecha_finalizacion);

    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(finishedAt.getTime())) return;

    const monthIndex = finishedAt.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) return;

    const diffInDays = Math.floor((finishedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    monthlyDurations[monthIndex].push(Math.max(0, diffInDays));
  });

  return DASHBOARD_MONTH_LABELS.map((mes, index) => {
    const durations = monthlyDurations[index];

    if (durations.length === 0) {
      return {
        mes,
        promedio: null,
        minimo: null,
        maximo: null,
        cantidad: 0,
      };
    }

    const total = durations.reduce((sum, value) => sum + value, 0);
    const promedio = Math.round(total / durations.length);
    const minimo = Math.min(...durations);
    const maximo = Math.max(...durations);

    return {
      mes,
      promedio,
      minimo,
      maximo,
      cantidad: durations.length,
    };
  });
};

// Serie mensual de actividad (anio actual por defecto)
export const fetchDashboardActividadEvolucionAnual = async (
  year: number = new Date().getFullYear()
): Promise<DashboardActividadMensual[]> => {
  const startOfYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const startOfNextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const [createdResult, completedResult, openByDeadlineResult] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('created_at')
      .not('created_at', 'is', null)
      .gte('created_at', startOfYear)
      .lt('created_at', startOfNextYear),
    supabase
      .from('fct_acreditacion_solicitud')
      .select('fecha_finalizacion, estado_solicitud_acreditacion')
      .not('fecha_finalizacion', 'is', null)
      .gte('fecha_finalizacion', startOfYear)
      .lt('fecha_finalizacion', startOfNextYear),
    supabase
      .from('fct_acreditacion_solicitud')
      .select('fecha_inicio_terreno, fecha_finalizacion')
      .is('fecha_finalizacion', null)
      .not('fecha_inicio_terreno', 'is', null)
      .gte('fecha_inicio_terreno', startOfYear)
      .lt('fecha_inicio_terreno', startOfNextYear),
  ]);

  if (createdResult.error) {
    console.error('Error fetching dashboard actividad (created_at):', createdResult.error);
    throw createdResult.error;
  }

  if (completedResult.error) {
    console.error(
      'Error fetching dashboard actividad (fecha_finalizacion):',
      completedResult.error
    );
    throw completedResult.error;
  }

  if (openByDeadlineResult.error) {
    console.error(
      'Error fetching dashboard actividad (pendientes/atrasadas):',
      openByDeadlineResult.error
    );
    throw openByDeadlineResult.error;
  }

  const solicitudesByMonth = Array.from({ length: 12 }, () => 0);
  const completadasByMonth = Array.from({ length: 12 }, () => 0);
  const pendientesByMonth = Array.from({ length: 12 }, () => 0);
  const atrasadasByMonth = Array.from({ length: 12 }, () => 0);

  const now = new Date();
  const todayUtcStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  (createdResult.data || []).forEach((row: any) => {
    if (!row.created_at) return;
    const createdAt = new Date(row.created_at);
    if (Number.isNaN(createdAt.getTime())) return;

    const monthIndex = createdAt.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) return;
    solicitudesByMonth[monthIndex] += 1;
  });

  (completedResult.data || []).forEach((row: any) => {
    if (!isDashboardFinishedStatus(row.estado_solicitud_acreditacion)) return;
    if (!row.fecha_finalizacion) return;
    const finishedAt = new Date(row.fecha_finalizacion);
    if (Number.isNaN(finishedAt.getTime())) return;

    const monthIndex = finishedAt.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) return;
    completadasByMonth[monthIndex] += 1;
  });

  (openByDeadlineResult.data || []).forEach((row: any) => {
    if (!row.fecha_inicio_terreno || row.fecha_finalizacion) return;
    const deadline = new Date(row.fecha_inicio_terreno);
    if (Number.isNaN(deadline.getTime())) return;

    const monthIndex = deadline.getUTCMonth();
    if (monthIndex < 0 || monthIndex > 11) return;

    const deadlineUtcStart = Date.UTC(
      deadline.getUTCFullYear(),
      deadline.getUTCMonth(),
      deadline.getUTCDate()
    );

    if (deadlineUtcStart < todayUtcStart) {
      atrasadasByMonth[monthIndex] += 1;
      return;
    }

    pendientesByMonth[monthIndex] += 1;
  });

  return DASHBOARD_MONTH_LABELS.map((mes, index) => {
    const solicitudes = solicitudesByMonth[index];
    const completadas = completadasByMonth[index];
    const pendientes = pendientesByMonth[index];
    const atrasadas = atrasadasByMonth[index];
    const cumplimiento =
      solicitudes > 0 ? Math.round((completadas / solicitudes) * 100) : 0;

    return {
      mes,
      solicitudes,
      completadas,
      pendientes,
      atrasadas,
      cumplimiento,
    };
  });
};

// Distribucion actual de tareas pendientes por responsable (sin limite anual)
export const fetchDashboardTareasPendientesPorResponsable = async (): Promise<
  DashboardPendientesResponsableItem[]
> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('responsable, estado');

  if (error) {
    console.error('Error fetching dashboard pendientes por responsable:', error);
    throw error;
  }

  const counts = new Map<DashboardResponsableTarea, number>(
    DASHBOARD_RESPONSABLE_ORDER.map((responsable) => [responsable, 0])
  );

  (data || []).forEach((row: any) => {
    if (!isDashboardPendingTaskStatus(row.estado)) return;

    const responsable = normalizeDashboardResponsable(row.responsable);
    counts.set(responsable, (counts.get(responsable) || 0) + 1);
  });

  return DASHBOARD_RESPONSABLE_ORDER.map((responsable) => ({
    responsable,
    cantidad: counts.get(responsable) || 0,
  }));
};

// Funcion para transformar solicitudes a formato de galeria de proyectos
export const fetchProjectGalleryItems = async (): Promise<ProjectGalleryItem[]> => {
  const solicitudes = await fetchSolicitudesAcreditacion();
  
  return Promise.all(solicitudes.map(async (solicitud: SolicitudAcreditacion) => {
    // Parsear trabajadores de los campos JSON
    const trabajadoresMyma = solicitud.trabajadores_myma || [];
    const trabajadoresContratista = solicitud.trabajadores_contratista || [];
    const allWorkers = [...trabajadoresMyma, ...trabajadoresContratista];
    
    // Calcular total de vehículos
    const totalVehicles = (solicitud.vehiculos_cantidad || 0) + (solicitud.vehiculos_contratista_cantidad || 0);
    
    // Obtener tareas reales del proyecto desde la base de datos
    let projectTasks: any[] = [];
    let completedTasks = 0;
    let totalTasks = 0;
    
    try {
      const idProyecto = solicitud.id;
      if (idProyecto) {
        const requerimientos = await fetchProyectoRequerimientos(idProyecto);
        
        // Transformar requerimientos a formato de tareas
        projectTasks = requerimientos.map(req => ({
          id: req.id,
          responsable: req.responsable,
          nombre_responsable: req.nombre_responsable,
          nombre_trabajador: req.nombre_trabajador,
          categoria_empresa: req.categoria_empresa,
          id_proyecto_trabajador: req.id_proyecto_trabajador,
          patente_vehiculo: req.patente_vehiculo,
          requerimiento: req.requerimiento,
          categoria: req.categoria_requerimiento,
          realizado: req.estado === 'Completado',
          fechaFinalizada: req.estado === 'Completado' ? req.updated_at?.split('T')[0] : undefined,
          drive_doc_url: req.drive_doc_url
        }));
        
        completedTasks = projectTasks.filter(t => t.realizado).length;
        totalTasks = projectTasks.length;
      }
      
      // Si no hay tareas en la BD, usar las generadas por defecto
      if (totalTasks === 0) {
        const projectStatus = canonicalizeSolicitudStatus(
          solicitud.estado_solicitud_acreditacion ||
            solicitud.estado ||
            SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_REQUERIMIENTOS
        );
        projectTasks = generateProjectTasks(
          solicitud.id,
          !!solicitud.jpro_id,
          !!solicitud.epr_id,
          !!solicitud.rrhh_id,
          !!solicitud.legal_id,
          projectStatus
        );
        const taskStats = calculateCompletedTasks(projectTasks);
        completedTasks = taskStats.completed;
        totalTasks = taskStats.total;
      }
    } catch (error) {
      console.error('Error cargando requerimientos del proyecto:', error);
      // Si hay error, usar tareas generadas por defecto
      const projectStatus = canonicalizeSolicitudStatus(
        solicitud.estado_solicitud_acreditacion ||
          solicitud.estado ||
          SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_REQUERIMIENTOS
      );
      projectTasks = generateProjectTasks(
        solicitud.id,
        !!solicitud.jpro_id,
        !!solicitud.epr_id,
        !!solicitud.rrhh_id,
        !!solicitud.legal_id,
        projectStatus
      );
      const taskStats = calculateCompletedTasks(projectTasks);
      completedTasks = taskStats.completed;
      totalTasks = taskStats.total;
    }
    
    return {
      id: solicitud.id,
      projectCode: solicitud.codigo_proyecto || 'Sin código',
      projectName: solicitud.requisito || 'Proyecto sin nombre',
      clientName: solicitud.nombre_cliente || 'Sin cliente',
      razonSocialContratista: solicitud.razon_social_contratista || undefined,
      requesterName: solicitud.nombre_solicitante || undefined,
      projectManager: solicitud.jefe_proyectos_myma || 'Sin asignar',
      fieldStartDate: solicitud.fecha_inicio_terreno || solicitud.fecha_solicitud,
      fechaInicioTerreno: solicitud.fecha_inicio_terreno || undefined,
      totalWorkers: allWorkers.length,
      totalVehicles: totalVehicles,
      status: canonicalizeSolicitudStatus(
        solicitud.estado_solicitud_acreditacion ||
          solicitud.estado ||
          SOLICITUD_ACREDITACION_STATUS.POR_ASIGNAR_REQUERIMIENTOS
      ),
      estadoCarpetaArranque: solicitud.estado_carpeta_arranque || undefined,
      carpetaArranqueUrl: solicitud.carpeta_arranque_url || undefined,
      workers: allWorkers,
      createdAt: solicitud.created_at,
      fechaFinalizacion: solicitud.fecha_finalizacion || null,
      // Progreso de tareas
      completedTasks: completedTasks,
      totalTasks: totalTasks,
      tasks: projectTasks, // Tareas completas del proyecto
      // Responsables del proyecto
      empresa_id: solicitud.empresa_id,
      empresa_nombre: solicitud.empresa_nombre,
      jpro_id: solicitud.jpro_id,
      jpro_nombre: solicitud.jpro_nombre,
      epr_id: solicitud.epr_id,
      epr_nombre: solicitud.epr_nombre,
      rrhh_id: solicitud.rrhh_id,
      rrhh_nombre: solicitud.rrhh_nombre,
      legal_id: solicitud.legal_id,
      legal_nombre: solicitud.legal_nombre,
    };
  }));
};

// Función para crear una nueva solicitud de acreditación
export const createSolicitudAcreditacion = async (data: Partial<SolicitudAcreditacion>): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating solicitud_acreditacion:', error);
    throw error;
  }
  
  return result;
};

// Función para actualizar una solicitud de acreditación
export const updateSolicitudAcreditacion = async (
  id: number,
  data: Partial<SolicitudAcreditacion>
): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating solicitud_acreditacion:', error);
    throw error;
  }
  
  return result;
};

// Función para eliminar una solicitud de acreditación
export const deleteSolicitudAcreditacion = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('fct_acreditacion_solicitud')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting solicitud_acreditacion:', error);
    throw error;
  }
};

// Función para actualizar responsables de una solicitud
export const updateResponsablesSolicitud = async (
  id: number,
  responsables: {
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
    acreditacion_id?: number;
    acreditacion_nombre?: string;
  }
): Promise<SolicitudAcreditacion> => {
  console.log('🔄 Actualizando responsables para solicitud ID:', id);
  console.log('📝 Responsables recibidos:', responsables);

  const updateData = { 
    empresa_id: responsables.empresa_id || null,
    empresa_nombre: responsables.empresa_nombre || null,
    jpro_id: responsables.jpro_id || null,
    jpro_nombre: responsables.jpro_nombre || null,
    epr_id: responsables.epr_id || null,
    epr_nombre: responsables.epr_nombre || null,
    rrhh_id: responsables.rrhh_id || null,
    rrhh_nombre: responsables.rrhh_nombre || null,
    legal_id: responsables.legal_id || null,
    legal_nombre: responsables.legal_nombre || null,
    enc_acreditacion_id: responsables.acreditacion_id || null,
    nombre_enc_acreditacion: responsables.acreditacion_nombre || null,
    estado_solicitud_acreditacion: SOLICITUD_ACREDITACION_STATUS.EN_PROCESO,
    updated_at: new Date().toISOString() 
  };

  console.log('📦 Datos a guardar:', updateData);
  console.log('🔍 Ejecutando actualización en Supabase...');
  console.log('   ID del registro a actualizar:', id);

  try {
    // Primero, ejecutar la actualización sin select para verificar que se ejecute
    const { error: updateError, count } = await supabase
      .from('fct_acreditacion_solicitud')
      .update(updateData)
      .eq('id', id);
    
    console.log('📡 Respuesta de actualización recibida');
    console.log('   Error:', updateError);
    console.log('   Count (filas afectadas):', count);
    
    if (updateError) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ ERROR AL ACTUALIZAR RESPONSABLES EN SUPABASE');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error completo:', updateError);
      console.error('📊 Detalles del error:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      console.error('═══════════════════════════════════════════════════');
      throw updateError;
    }
    
    if (count === 0) {
      console.error('⚠️ No se actualizó ninguna fila. Verificando si el registro existe...');
      // Verificar si el registro existe
      const { data: existingData, error: checkError } = await supabase
        .from('fct_acreditacion_solicitud')
        .select('id, codigo_proyecto')
        .eq('id', id)
        .single();
      
      if (checkError) {
        console.error('❌ Error al verificar existencia del registro:', checkError);
        throw new Error(`No se pudo verificar si el registro existe: ${checkError.message}`);
      }
      
      if (!existingData) {
        throw new Error(`El registro con ID ${id} no existe en la base de datos.`);
      }
      
      console.warn('⚠️ El registro existe pero no se actualizó. Posibles causas:');
      console.warn('   - Los datos son idénticos a los ya guardados');
      console.warn('   - Problemas con RLS (Row Level Security)');
      console.warn('   - Problemas con permisos de escritura');
    } else {
      console.log(`✅ Se actualizaron ${count} fila(s)`);
    }
    
    // Ahora obtener los datos actualizados para verificar
    const { data, error: selectError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('*')
      .eq('id', id)
      .single();
    
    if (selectError) {
      console.error('❌ Error al obtener datos actualizados:', selectError);
      throw new Error(`La actualización se ejecutó pero no se pudieron obtener los datos actualizados: ${selectError.message}`);
    }
    
    if (!data) {
      console.error('⚠️ No se obtuvieron datos después de la actualización');
      throw new Error('La actualización se ejecutó pero no se pudieron obtener los datos actualizados.');
    }
    
    console.log('✅ Responsables actualizados exitosamente');
    console.log('📊 Datos actualizados en BD:', JSON.stringify({
      id: data.id,
      codigo_proyecto: data.codigo_proyecto,
      empresa_id: data.empresa_id,
      empresa_nombre: data.empresa_nombre,
      jpro_id: data.jpro_id,
      jpro_nombre: data.jpro_nombre,
      epr_id: data.epr_id,
      epr_nombre: data.epr_nombre,
      rrhh_id: data.rrhh_id,
      rrhh_nombre: data.rrhh_nombre,
      legal_id: data.legal_id,
      legal_nombre: data.legal_nombre,
      estado_solicitud_acreditacion: data.estado_solicitud_acreditacion,
      updated_at: data.updated_at
    }, null, 2));
    
    return data;
  } catch (err: any) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ EXCEPCIÓN AL ACTUALIZAR RESPONSABLES');
    console.error('═══════════════════════════════════════════════════');
    console.error('Error:', err);
    console.error('Tipo:', typeof err);
    if (err instanceof Error) {
      console.error('Mensaje:', err.message);
      console.error('Stack:', err.stack);
    }
    console.error('═══════════════════════════════════════════════════');
    throw err;
  }
};

// Función para obtener requerimientos estándar de una empresa
export const fetchEmpresaRequerimientos = async (empresa: string): Promise<EmpresaRequerimiento[]> => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 fetchEmpresaRequerimientos');
  console.log('═══════════════════════════════════════════════════');
  console.log('Empresa buscada:', empresa);
  console.log('Longitud:', empresa.length);
  console.log('Con marcadores:', `|${empresa}|`);
  console.log('Primer carácter (código):', empresa.charCodeAt(0));
  
  const { data, error } = await supabase
    .from('brg_acreditacion_cliente_requerimiento')
    .select('*')
    .eq('empresa', empresa)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR EN LA CONSULTA');
    console.error('═══════════════════════════════════════════════════');
    console.error('Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('Código:', error.code);
    console.error('═══════════════════════════════════════════════════');
    throw error;
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ CONSULTA EXITOSA');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total registros: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\n📋 Primeros registros:');
    data.slice(0, 3).forEach((req, i) => {
      console.log(`\n  ${i + 1}. ID: ${req.id}`);
      console.log(`     Empresa: "${req.empresa}"`);
      console.log(`     Requerimiento: ${req.requerimiento}`);
      console.log(`     Responsable: ${req.responsable}`);
    });
    if (data.length > 3) {
      console.log(`\n  ... y ${data.length - 3} más`);
    }
  } else {
    console.log('\n⚠️ NO SE ENCONTRARON REGISTROS');
    console.log('\n💡 Sugerencias:');
    console.log('   1. Verifica que existan datos en Supabase con este SQL:');
    console.log(`      SELECT * FROM brg_acreditacion_cliente_requerimiento WHERE empresa = '${empresa}';`);
    console.log('   2. Verifica todas las empresas disponibles:');
    console.log('      SELECT DISTINCT empresa FROM brg_acreditacion_cliente_requerimiento;');
    console.log('   3. Busca con coincidencia parcial:');
    console.log(`      SELECT * FROM brg_acreditacion_cliente_requerimiento WHERE empresa ILIKE '%${empresa}%';`);
  }
  console.log('═══════════════════════════════════════════════════\n');
  
  return data || [];
};

// Función para obtener las observaciones de un requerimiento específico de una empresa
export const fetchEmpresaRequerimientoObservaciones = async (
  empresa: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_cliente_requerimiento')
    .select('observaciones')
    .eq('empresa', empresa)
    .eq('requerimiento', requerimiento)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crítico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones:', error);
    return null;
  }
  
  // Retornar observaciones solo si no están vacías
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
};

// Función para obtener las observaciones de un requerimiento específico de un proyecto
export const fetchProyectoRequerimientoObservaciones = async (
  codigoProyecto: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('observaciones')
    .eq('codigo_proyecto', codigoProyecto)
    .eq('requerimiento', requerimiento)
    .limit(1)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crítico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones del proyecto:', error);
    return null;
  }
  
  // Retornar observaciones solo si no están vacías
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
};

// Helpers para normalizar y clasificar categoria_empresa.
const normalizeCategoriaEmpresa = (value?: string | null): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const isCategoriaEmpresaContratista = (value?: string | null): boolean =>
  normalizeCategoriaEmpresa(value) === 'contratista';

// Función para crear requerimientos de acreditación de un proyecto
export const createProyectoRequerimientos = async (
  codigoProyecto: string,
  cliente: string,
  empresaRequerimientos: EmpresaRequerimiento[],
  responsables: {
    jpro_nombre?: string;
    epr_nombre?: string;
    rrhh_nombre?: string;
    legal_nombre?: string;
  },
  idProyecto?: number
): Promise<any[]> => {
  const isDebugLogging = import.meta.env.DEV;
  const isVerboseDebugLogging =
    isDebugLogging && import.meta.env.VITE_ACREDITACION_VERBOSE_LOGS === 'true';
  const console = isVerboseDebugLogging
    ? globalThis.console
    : {
        log: () => {},
        warn: () => {},
        error: () => {}
      };

  const debugSummaryLog = (...args: any[]) => {
    if (isDebugLogging) {
      globalThis.console.log(...args);
    }
  };

  debugSummaryLog('[createProyectoRequerimientos] Inicio', {
    codigoProyecto,
    cliente,
    requerimientosRecibidos: empresaRequerimientos?.length || 0,
    responsablesAsignados: {
      jpro: Boolean(responsables.jpro_nombre),
      epr: Boolean(responsables.epr_nombre),
      rrhh: Boolean(responsables.rrhh_nombre),
      legal: Boolean(responsables.legal_nombre)
    },
    verboseDebug: isVerboseDebugLogging
  });
  
  if (!empresaRequerimientos || empresaRequerimientos.length === 0) {
    debugSummaryLog('[createProyectoRequerimientos] Sin requerimientos seleccionados');
    return [];
  }
  
  // Primero, verificar si ya existen requerimientos para este proyecto
  console.log('\n🔍 Verificando requerimientos existentes...');
  const { data: existingReqs, error: checkError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('id, requerimiento, categoria_requerimiento, categoria_empresa, responsable')
    .eq('codigo_proyecto', codigoProyecto);
  
  if (checkError) {
    globalThis.console.error('❌ Error al verificar requerimientos existentes:', checkError);
  }
  
  debugSummaryLog('[createProyectoRequerimientos] Requerimientos existentes', {
    total: existingReqs?.length || 0
  });
  
  if (existingReqs && existingReqs.length > 0) {
    debugSummaryLog('[createProyectoRequerimientos] Proyecto con requerimientos previos, se evaluará actualización/creación incremental');
    
    // Si hay responsables asignados, actualizar los requerimientos existentes
    const tieneResponsables = responsables.jpro_nombre || responsables.epr_nombre || responsables.rrhh_nombre || responsables.legal_nombre;
    
    if (tieneResponsables) {
      console.log('🔄 Actualizando requerimientos existentes con responsables asignados...');
      
      // Actualizar cada requerimiento existente con el nombre del responsable correspondiente
      for (const req of existingReqs) {
        const esCategoriaContratista = isCategoriaEmpresaContratista((req as any).categoria_empresa);
        const cargoResponsable = esCategoriaContratista ? 'JPRO' : req.responsable;
        let nombreResponsable = '';
        switch (cargoResponsable) {
          case 'JPRO':
            nombreResponsable = responsables.jpro_nombre || '';
            break;
          case 'EPR':
            nombreResponsable = responsables.epr_nombre || '';
            break;
          case 'RRHH':
            nombreResponsable = responsables.rrhh_nombre || '';
            break;
          case 'Legal':
            nombreResponsable = responsables.legal_nombre || '';
            break;
        }

        const updatePayload: any = {};
        if (esCategoriaContratista && req.responsable !== 'JPRO') {
          updatePayload.responsable = 'JPRO';
        }
        if (nombreResponsable) {
          updatePayload.nombre_responsable = nombreResponsable;
        }
        
        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('brg_acreditacion_solicitud_requerimiento')
            .update(updatePayload)
            .eq('id', req.id);
          
          if (updateError) {
            globalThis.console.error(`❌ Error actualizando requerimiento ${req.id}:`, updateError);
          } else {
            console.log(`✅ Requerimiento ${req.id} actualizado con responsable: ${nombreResponsable}`);
          }
        }
      }
      
      console.log('✅ Requerimientos actualizados exitosamente');
      console.log('═══════════════════════════════════════════════════\n');
      // Retornar los requerimientos existentes actualizados
      const { data: updatedReqs } = await supabase
        .from('brg_acreditacion_solicitud_requerimiento')
        .select('*')
        .eq('codigo_proyecto', codigoProyecto);
      return updatedReqs || [];
    } else {
      // Si no hay responsables pero hay requerimientos existentes, continuar para crear nuevos
      // (puede ser que se estén agregando nuevos requerimientos)
      console.log('⚠️ Ya existen requerimientos pero no hay responsables asignados');
      console.log('📝 Continuando para verificar si hay nuevos requerimientos que crear...');
      // NO retornar aquí, continuar con la lógica de creación
    }
  } else {
    console.log('✅ No hay requerimientos existentes, procediendo a crear...');
  }

  // Obtener el id_proyecto (id de fct_acreditacion_solicitud) y datos de la solicitud
  let proyectoId = idProyecto;
  let requiereAcreditarEmpresa = false;
  let requiereAcreditarContratista = false;
  let razonSocialContratista: string | null = null;
  
  if (!proyectoId) {
    // Si no se pasó como parámetro, buscarlo en la base de datos
    console.log('\n🔍 Buscando fct_acreditacion_solicitud...');
    const { data: solicitud, error: solicitudError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('id, requiere_acreditar_empresa, requiere_acreditar_contratista, razon_social_contratista')
      .eq('codigo_proyecto', codigoProyecto)
      .single();

    if (solicitudError) {
      globalThis.console.error('❌ Error obteniendo solicitud:', solicitudError);
      console.log('═══════════════════════════════════════════════════\n');
      throw new Error(`No se encontró el proyecto ${codigoProyecto}`);
    }

    proyectoId = solicitud?.id;
    requiereAcreditarEmpresa = solicitud?.requiere_acreditar_empresa === true;
    requiereAcreditarContratista = solicitud?.requiere_acreditar_contratista === true;
    razonSocialContratista = solicitud?.razon_social_contratista || null;
  } else {
    // Si tenemos el ID, obtener los datos de la solicitud
    console.log('\n🔍 Obteniendo datos de la solicitud...');
    const { data: solicitud, error: solicitudError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('requiere_acreditar_empresa, requiere_acreditar_contratista, razon_social_contratista')
      .eq('id', proyectoId)
      .single();

    if (!solicitudError && solicitud) {
      requiereAcreditarEmpresa = solicitud.requiere_acreditar_empresa === true;
      requiereAcreditarContratista = solicitud.requiere_acreditar_contratista === true;
      razonSocialContratista = solicitud.razon_social_contratista || null;
    }
  }
  
  debugSummaryLog('[createProyectoRequerimientos] Datos de solicitud', {
    idProyecto: proyectoId,
    requiereAcreditarEmpresa,
    requiereAcreditarContratista,
    razonSocialContratista: razonSocialContratista || null
  });

  // Obtener los trabajadores de fct_acreditacion_solicitud_trabajador_manual
  console.log('\n🔍 Buscando trabajadores en fct_acreditacion_solicitud_trabajador_manual...');
  let trabajadoresProyecto: ProyectoTrabajador[] = [];
  
  if (proyectoId) {
    const { data: trabajadores, error: trabajadoresError } = await supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (trabajadoresError) {
      globalThis.console.error('❌ Error obteniendo trabajadores:', trabajadoresError);
    } else {
      trabajadoresProyecto = trabajadores || [];
      console.log(`✅ Trabajadores encontrados: ${trabajadoresProyecto.length}`);
      if (trabajadoresProyecto.length > 0) {
        trabajadoresProyecto.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.nombre_trabajador} (${t.categoria_empresa}) - ID: ${t.id}`);
        });
      }
    }
  } else {
    console.warn('⚠️ No se pudo obtener el ID del proyecto');
  }

  // Obtener los conductores de fct_acreditacion_solicitud_conductor_manual
  console.log('\n🔍 Buscando conductores en fct_acreditacion_solicitud_conductor_manual...');
  let conductoresProyecto: any[] = [];
  
  if (proyectoId) {
    const { data: conductores, error: conductoresError } = await supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (conductoresError) {
      globalThis.console.error('❌ Error obteniendo conductores:', conductoresError);
    } else {
      conductoresProyecto = conductores || [];
      console.log(`✅ Conductores encontrados: ${conductoresProyecto.length}`);
      if (conductoresProyecto.length > 0) {
        conductoresProyecto.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.nombre_conductor} (${c.categoria_empresa}) - Patente: ${c.patente}`);
        });
      }
    }
  } else {
    console.warn('⚠️ No se pudo obtener el ID del proyecto');
  }
  
  // Obtener los vehiculos de fct_acreditacion_solicitud_vehiculos
  console.log('\n🔍 Buscando vehiculos en fct_acreditacion_solicitud_vehiculos...');
  let vehiculosProyecto: any[] = [];
  
  if (proyectoId) {
    const { data: vehiculos, error: vehiculosError } = await supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (vehiculosError) {
      globalThis.console.error('❌ Error obteniendo vehiculos:', vehiculosError);
    } else {
      vehiculosProyecto = vehiculos || [];
      console.log(`✅ Vehiculos encontrados: ${vehiculosProyecto.length}`);
      if (vehiculosProyecto.length > 0) {
        vehiculosProyecto.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.patente} (${v.categoria_empresa}) - ID: ${v.id}`);
        });
      }
    }
  } else {
    console.warn('⚠️ No se pudo obtener el ID del proyecto');
  }

  debugSummaryLog('[createProyectoRequerimientos] Entidades para construir registros', {
    trabajadores: trabajadoresProyecto.length,
    conductores: conductoresProyecto.length,
    vehiculos: vehiculosProyecto.length
  });

  // Mapear cada requerimiento de empresa a uno o más requerimientos de proyecto
  console.log('\n🔧 Construyendo requerimientos...');
  const proyectoRequerimientos: any[] = [];

  empresaRequerimientos.forEach((req, index) => {
    console.log(`\n  Procesando requerimiento ${index + 1}/${empresaRequerimientos.length}:`);
    console.log(`    Requerimiento: ${req.requerimiento}`);
    console.log(`    Categoría: ${req.categoria_requerimiento}`);
    console.log(`    Responsable: ${req.responsable}`);
    
    // Asignar el nombre del responsable según el rol
    let nombreResponsable = '';
    switch (req.responsable) {
      case 'JPRO':
        nombreResponsable = responsables.jpro_nombre || 'Sin asignar';
        break;
      case 'EPR':
        nombreResponsable = responsables.epr_nombre || 'Sin asignar';
        break;
      case 'RRHH':
        nombreResponsable = responsables.rrhh_nombre || 'Sin asignar';
        break;
      case 'Legal':
        nombreResponsable = responsables.legal_nombre || 'Sin asignar';
        break;
      default:
        nombreResponsable = 'Sin asignar';
    }
    
    console.log(`    Nombre responsable asignado: ${nombreResponsable}`);
    const categoriaNormalizada = (req.categoria_requerimiento || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Verificar si es categoría "Empresa" para duplicar si ambos flags son TRUE
    const esCategoriaEmpresa = categoriaNormalizada === 'empresa' || 
                               categoriaNormalizada === 'empresa myma' ||
                               categoriaNormalizada === 'empresa subcontrato';
    
    // Si la categoría es "Trabajadores", crear un registro por cada trabajador de fct_acreditacion_solicitud_trabajador_manual
    const esTrabajadores = categoriaNormalizada === 'trabajadores';
    // Si la categoría es "Conductores", crear un registro por cada conductor de fct_acreditacion_solicitud_conductor_manual
    const esConductores = categoriaNormalizada === 'conductores';
    const esVehiculos = categoriaNormalizada === 'vehiculos';
    console.log(`    Es categoria Vehiculos?: ${esVehiculos}`);
    console.log(`    ¿Es categoría Trabajadores?: ${esTrabajadores}`);
    console.log(`    ¿Es categoría Conductores?: ${esConductores}`);
    console.log(`    ¿Es categoría Empresa?: ${esCategoriaEmpresa}`);
    console.log(`    Trabajadores disponibles: ${trabajadoresProyecto.length}`);
    console.log(`    Conductores disponibles: ${conductoresProyecto.length}`);
    console.log(`    Vehiculos disponibles: ${vehiculosProyecto.length}`);
    
    // Función auxiliar para crear un registro base
    const crearRegistroBase = (
      empresaAcreditacionValue: string | null = null,
      categoriaEmpresaValue: string | null = null
    ): any => {
      const responsableFinal = isCategoriaEmpresaContratista(categoriaEmpresaValue)
        ? 'JPRO'
        : req.responsable;

      return {
        codigo_proyecto: codigoProyecto,
        id_proyecto: proyectoId,
        requerimiento: req.requerimiento,
        responsable: responsableFinal,
        estado: 'Pendiente',
        cliente: cliente,
        categoria_requerimiento: req.categoria_requerimiento,
        observaciones: req.observaciones || null,
        nombre_responsable: nombreResponsable,
        nombre_trabajador: null,
        categoria_empresa: categoriaEmpresaValue,
        id_proyecto_trabajador: null,
        ...(empresaAcreditacionValue ? { empresa_acreditacion: empresaAcreditacionValue } : {})
      };
    };
    
    if (esTrabajadores && trabajadoresProyecto.length > 0) {
      console.log(`    👷 Creando ${trabajadoresProyecto.length} registros (uno por trabajador)`);
      
      trabajadoresProyecto.forEach((trabajador, tIndex) => {
        // Determinar empresa_acreditacion según la categoría del trabajador
        let empresaAcreditacion: string | null = null;
        if (trabajador.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Trabajador ${tIndex + 1} (${trabajador.nombre_trabajador}): categoria_empresa = MyMA → empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Trabajador ${tIndex + 1} (${trabajador.nombre_trabajador}): categoria_empresa = ${trabajador.categoria_empresa} → empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
          codigo_proyecto: codigoProyecto,
          id_proyecto: proyectoId,
          requerimiento: req.requerimiento,
          responsable: isCategoriaEmpresaContratista(trabajador.categoria_empresa) ? 'JPRO' : req.responsable,
          estado: 'Pendiente',
          cliente: cliente,
          categoria_requerimiento: req.categoria_requerimiento,
          observaciones: req.observaciones || null,
          nombre_responsable: nombreResponsable,
          nombre_trabajador: trabajador.nombre_trabajador,
          categoria_empresa: trabajador.categoria_empresa,
          id_proyecto_trabajador: trabajador.id,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esConductores && conductoresProyecto.length > 0) {
      console.log(`    🚗 Creando ${conductoresProyecto.length} registros (uno por conductor)`);
      
      conductoresProyecto.forEach((conductor, cIndex) => {
        // Determinar empresa_acreditacion según la categoría del conductor
        let empresaAcreditacion: string | null = null;
        if (conductor.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Conductor ${cIndex + 1} (${conductor.nombre_conductor}): categoria_empresa = MyMA → empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Conductor ${cIndex + 1} (${conductor.nombre_conductor}): categoria_empresa = ${conductor.categoria_empresa} → empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
          codigo_proyecto: codigoProyecto,
          id_proyecto: proyectoId,
          requerimiento: req.requerimiento,
          responsable: isCategoriaEmpresaContratista(conductor.categoria_empresa) ? 'JPRO' : req.responsable,
          estado: 'Pendiente',
          cliente: cliente,
          categoria_requerimiento: req.categoria_requerimiento,
          observaciones: req.observaciones || null,
          nombre_responsable: nombreResponsable,
          nombre_trabajador: conductor.nombre_conductor || conductor.patente || null,
          categoria_empresa: conductor.categoria_empresa || null,
          id_proyecto_trabajador: conductor.id ?? null,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esVehiculos && vehiculosProyecto.length > 0) {
      console.log(`    🚙 Creando ${vehiculosProyecto.length} registros (uno por vehiculo)`);
      
      vehiculosProyecto.forEach((vehiculo, vIndex) => {
        // Determinar empresa_acreditacion segun la categoria del vehiculo
        let empresaAcreditacion: string | null = null;
        if (vehiculo.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Vehiculo ${vIndex + 1} (${vehiculo.patente}): categoria_empresa = MyMA → empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Vehiculo ${vIndex + 1} (${vehiculo.patente}): categoria_empresa = ${vehiculo.categoria_empresa} → empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
          codigo_proyecto: codigoProyecto,
          id_proyecto: proyectoId,
          requerimiento: req.requerimiento,
          responsable: isCategoriaEmpresaContratista(vehiculo.categoria_empresa) ? 'JPRO' : req.responsable,
          estado: 'Pendiente',
          cliente: cliente,
          categoria_requerimiento: req.categoria_requerimiento,
          observaciones: req.observaciones || null,
          nombre_responsable: nombreResponsable,
          nombre_trabajador: null,
          categoria_empresa: vehiculo.categoria_empresa || null,
          id_proyecto_trabajador: vehiculo.id ?? null,
          patente_vehiculo: vehiculo.patente || null,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esCategoriaEmpresa) {
      // Para categoría "Empresa", duplicar según los flags
      console.log(`    🏢 Categoría Empresa detectada - Verificando duplicación...`);
      
      // Si requiere_acreditar_empresa es TRUE, crear registro con MyMA
      if (requiereAcreditarEmpresa) {
        const registroMyMA = crearRegistroBase('MyMA', 'MyMA');
        proyectoRequerimientos.push(registroMyMA);
        console.log(`    ✅ Registro creado con empresa_acreditacion = "MyMA"`);
      }
      
      // Si requiere_acreditar_contratista es TRUE y hay razón social, crear registro con contratista
      if (requiereAcreditarContratista && razonSocialContratista) {
        const registroContratista = crearRegistroBase(razonSocialContratista, 'Contratista');
        proyectoRequerimientos.push(registroContratista);
        console.log(`    ✅ Registro creado con empresa_acreditacion = "${razonSocialContratista}"`);
      }
      
      // Si ninguno de los dos es TRUE, crear un registro sin empresa_acreditacion
      if (!requiereAcreditarEmpresa && !requiereAcreditarContratista) {
        const registro = crearRegistroBase();
        proyectoRequerimientos.push(registro);
        console.log(`    📄 Registro creado sin empresa_acreditacion (ningún flag activo)`);
      }
    } else {
      // Para otras categorías, crear solo un registro
      console.log(`    📄 Creando 1 registro (categoría normal)`);
      const registro = crearRegistroBase();
      proyectoRequerimientos.push(registro);
    }
  });

  const resumenPorCategoria = proyectoRequerimientos.reduce<Record<string, number>>((acc, registro) => {
    const key = registro.categoria_requerimiento || 'Sin categoria';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const resumenPorEmpresaAcreditacion = proyectoRequerimientos.reduce<Record<string, number>>((acc, registro) => {
    const key = registro.empresa_acreditacion || 'Sin empresa_acreditacion';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  debugSummaryLog('[createProyectoRequerimientos] Resumen de construccion', {
    requerimientosRecibidos: empresaRequerimientos.length,
    registrosConstruidos: proyectoRequerimientos.length,
    porCategoria: resumenPorCategoria,
    porEmpresaAcreditacion: resumenPorEmpresaAcreditacion
  });

  if (proyectoRequerimientos.length === 0) {
    throw new Error('No se pudieron construir requerimientos para guardar. Verifica los datos de entrada.');
  }

  // La verificacion detallada de conflictos es solo para debug.
  if (isDebugLogging) {
    const valoresUnicos = proyectoRequerimientos.map(r => ({
      codigo_proyecto: r.codigo_proyecto,
      requerimiento: r.requerimiento,
      id_proyecto_trabajador: r.id_proyecto_trabajador ?? -1,
      empresa_acreditacion: r.empresa_acreditacion ?? ''
    }));

    debugSummaryLog('[createProyectoRequerimientos] Verificacion de duplicados (debug)', {
      combinacionesUnicas: valoresUnicos.length
    });

    for (const valorUnico of valoresUnicos) {
      let duplicateCheckQuery = supabase
        .from('brg_acreditacion_solicitud_requerimiento')
        .select('id, codigo_proyecto, requerimiento, id_proyecto_trabajador, empresa_acreditacion')
        .eq('codigo_proyecto', valorUnico.codigo_proyecto)
        .eq('requerimiento', valorUnico.requerimiento);

      if (valorUnico.id_proyecto_trabajador === -1) {
        duplicateCheckQuery = duplicateCheckQuery.is('id_proyecto_trabajador', null);
      } else {
        duplicateCheckQuery = duplicateCheckQuery.eq('id_proyecto_trabajador', valorUnico.id_proyecto_trabajador);
      }

      if (valorUnico.empresa_acreditacion) {
        duplicateCheckQuery = duplicateCheckQuery.eq('empresa_acreditacion', valorUnico.empresa_acreditacion);
      } else {
        duplicateCheckQuery = duplicateCheckQuery.is('empresa_acreditacion', null);
      }

      const { data: existentes, error: checkError } = await duplicateCheckQuery;

      if (checkError) {
        console.warn('[createProyectoRequerimientos] Error en verificacion de duplicados (debug):', checkError);
      } else if (existentes && existentes.length > 0) {
        console.warn('[createProyectoRequerimientos] Conflicto detectado (debug):', {
          codigo_proyecto: valorUnico.codigo_proyecto,
          requerimiento: valorUnico.requerimiento,
          id_proyecto_trabajador: valorUnico.id_proyecto_trabajador,
          empresa_acreditacion: valorUnico.empresa_acreditacion,
          coincidencias: existentes.length
        });
      }
    }
  }

  debugSummaryLog('[createProyectoRequerimientos] Insertando registros', {
    tabla: 'brg_acreditacion_solicitud_requerimiento',
    cantidad: proyectoRequerimientos.length
  });
  
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .insert(proyectoRequerimientos)
    .select();
  
  if (error) {
    globalThis.console.error('[createProyectoRequerimientos] Error en insert:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR EN INSERT');
    console.error('═══════════════════════════════════════════════════');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    // Si es error de duplicado, mostrar información detallada
    if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
      console.error('\n⚠️ ERROR DE UNIQUE CONSTRAINT DETECTADO');
      console.error('═══════════════════════════════════════════════════');
      console.error('El constraint está bloqueando la inserción porque:');
      console.error('  1. Ya existe un registro con la misma combinación de:');
      console.error('     - codigo_proyecto');
      console.error('     - requerimiento');
      console.error('     - id_proyecto_trabajador (o -1 si es NULL)');
      console.error('     - empresa_acreditacion (o "" si es NULL)');
      console.error('\n  2. Posibles causas:');
      console.error('     a) El constraint NO incluye empresa_acreditacion (ejecuta el script SQL)');
      console.error('     b) Estás intentando insertar un registro que ya existe');
      console.error('     c) Hay un constraint antiguo que no se eliminó');
      console.error('\n  3. Registros que se intentaron insertar:');
      proyectoRequerimientos.forEach((r, i) => {
        console.error(`     ${i + 1}. (${r.codigo_proyecto}, "${r.requerimiento}", ${r.id_proyecto_trabajador ?? -1}, "${r.empresa_acreditacion ?? ''}")`);
      });
      console.error('═══════════════════════════════════════════════════\n');
      throw new Error('Error de constraint UNIQUE. Revisa la consola para ver los detalles. Ejecuta el script sql/actualizar_constraint_con_empresa_acreditacion.sql en Supabase SQL Editor si aún no lo has hecho.');
    }
    
    throw error;
  }

  debugSummaryLog('[createProyectoRequerimientos] Insert exitoso', {
    registrosInsertados: data?.length || 0,
    registrosConstruidos: proyectoRequerimientos.length
  });

  return data || [];
};

export const fetchTrabajadoresExternosByEmpresaRut = async (
  empresaRut: string,
  empresaRazonSocial?: string
): Promise<TrabajadorExterno[]> => {
  const rutVariants = buildRutVariants(empresaRut);
  const companyName = (empresaRazonSocial || '').trim();
  const rows: TrabajadorExterno[] = [];

  if (rutVariants.length > 0) {
    const { data, error } = await supabase
      .from('dim_trabajador_externo')
      .select('id, rut, correo, telefono, empresa_razon_social, empresa_rut, created_at, updated_at, nombre_completo')
      .in('empresa_rut', rutVariants)
      .order('nombre_completo', { ascending: true });

    if (error) {
      console.error('Error fetching dim_trabajador_externo by empresa_rut:', error);
      throw error;
    }

    rows.push(...((data || []) as TrabajadorExterno[]));
  }

  if (rows.length === 0 && companyName) {
    const { data, error } = await supabase
      .from('dim_trabajador_externo')
      .select('id, rut, correo, telefono, empresa_razon_social, empresa_rut, created_at, updated_at, nombre_completo')
      .eq('empresa_razon_social', companyName)
      .order('nombre_completo', { ascending: true });

    if (error) {
      console.error('Error fetching dim_trabajador_externo by empresa_razon_social (eq):', error);
      throw error;
    }

    rows.push(...((data || []) as TrabajadorExterno[]));
  }

  if (rows.length === 0 && companyName) {
    const { data, error } = await supabase
      .from('dim_trabajador_externo')
      .select('id, rut, correo, telefono, empresa_razon_social, empresa_rut, created_at, updated_at, nombre_completo')
      .ilike('empresa_razon_social', `%${companyName}%`)
      .order('nombre_completo', { ascending: true });

    if (error) {
      console.error('Error fetching dim_trabajador_externo by empresa_razon_social (ilike):', error);
      throw error;
    }

    rows.push(...((data || []) as TrabajadorExterno[]));
  }

  const dedupedByRut = new Map<string, TrabajadorExterno>();
  rows.forEach((row) => {
    const key = normalizeRut(row.rut) || `id-${row.id}`;
    if (!dedupedByRut.has(key)) {
      dedupedByRut.set(key, row);
    }
  });

  return Array.from(dedupedByRut.values()).map((row) => ({
    ...row,
    rut: formatRut(row.rut),
  }));
};

export const fetchTrabajadorExternoByRut = async (
  rut: string
): Promise<TrabajadorExterno | null> => {
  const rutVariants = buildRutVariants(rut);

  if (rutVariants.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from('dim_trabajador_externo')
    .select('id, rut, correo, telefono, empresa_razon_social, empresa_rut, created_at, updated_at, nombre_completo')
    .in('rut', rutVariants)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching dim_trabajador_externo by rut:', error);
    throw error;
  }

  const found = data?.[0] as TrabajadorExterno | undefined;
  if (!found) {
    return null;
  }

  return {
    ...found,
    rut: formatRut(found.rut),
  };
};

export const upsertTrabajadoresExternos = async (
  trabajadores: UpsertTrabajadorExternoInput[]
): Promise<void> => {
  if (!trabajadores || trabajadores.length === 0) {
    return;
  }

  const dedupedByRut = new Map<string, UpsertTrabajadorExternoInput>();

  trabajadores.forEach((trabajador) => {
    const canonicalRut = toCanonicalRut(trabajador.rut);
    const empresaRazonSocial = (trabajador.empresa_razon_social || '').trim();
    const empresaRut = (trabajador.empresa_rut || '').trim();
    const nombreCompleto = (trabajador.nombre_completo || '').trim();

    if (!canonicalRut || !empresaRazonSocial || !empresaRut || !nombreCompleto) {
      return;
    }

    dedupedByRut.set(canonicalRut, {
      nombre_completo: nombreCompleto,
      rut: canonicalRut,
      telefono: (trabajador.telefono || '').trim() || null,
      empresa_razon_social: empresaRazonSocial,
      empresa_rut: empresaRut,
      correo: (trabajador.correo || '').trim() || null,
    });
  });

  const payload = Array.from(dedupedByRut.values());
  if (payload.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('dim_trabajador_externo')
    .upsert(payload, { onConflict: 'rut' });

  if (error) {
    console.error('Error upserting dim_trabajador_externo:', error);
    throw error;
  }
};

// Función para obtener requerimientos de un proyecto
export const fetchProyectoRequerimientos = async (idProyecto: number): Promise<ProyectoRequerimientoAcreditacion[]> => {
  console.log('🔍 Buscando requerimientos del proyecto por id_proyecto:', idProyecto);
  
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching proyecto requerimientos:', error);
    throw error;
  }
  
  console.log(`✅ Encontrados ${data?.length || 0} requerimientos para id_proyecto ${idProyecto}`);
  return data || [];
};

// Función para obtener fct_acreditacion_solicitud por código de proyecto (para obtener drive_folder_id y drive_folder_url)
export const fetchSolicitudAcreditacionByCodigo = async (codigoProyecto: string): Promise<Partial<SolicitudAcreditacion> | null> => {
  console.log('🔍 Buscando fct_acreditacion_solicitud para proyecto:', codigoProyecto);
  
  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('drive_folder_id, drive_folder_url, codigo_proyecto')
    .eq('codigo_proyecto', codigoProyecto)
    .single();
  
  if (error) {
    console.error('❌ Error fetching fct_acreditacion_solicitud:', error);
    console.error('❌ Código de proyecto buscado:', codigoProyecto);
    return null;
  }
  
  console.log('✅ Solicitud encontrada:', {
    codigo_proyecto: data?.codigo_proyecto,
    drive_folder_id: data?.drive_folder_id,
    drive_folder_url: data?.drive_folder_url,
  });
  
  return data;
};

// Función para actualizar el estado de un requerimiento
export const updateRequerimientoEstado = async (
  id: number,
  estado: string
): Promise<{ allCompleted: boolean; codigoProyecto?: string; proyectoEstadoCambio?: string }> => {
  const updateData: any = {
    estado: estado,
    updated_at: new Date().toISOString()
  };
  
  // Si el estado es "Completado", guardar la fecha de finalización
  // Si no es "Completado", establecer fecha_finalizacion como NULL
  if (estado === 'Completado') {
    updateData.fecha_finalizacion = new Date().toISOString();
  } else {
    updateData.fecha_finalizacion = null;
  }

  // Primero, obtener el requerimiento para saber el código del proyecto
  const { data: requerimiento, error: fetchError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('codigo_proyecto, id_proyecto')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('❌ Error obteniendo requerimiento:', fetchError);
    throw fetchError;
  }

  // Actualizar el requerimiento
  const { error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('❌ Error actualizando estado del requerimiento:', error);
    throw error;
  }
  
  console.log(`✅ Requerimiento ${id} actualizado a ${estado}`);

  // Verificar y actualizar el estado del proyecto según los requerimientos
  let allCompleted = false;
  let nuevoEstadoProyecto: string | undefined = undefined;
  
  if (requerimiento?.codigo_proyecto && requerimiento.id_proyecto) {
    try {
      // Obtener el estado actual del proyecto
      const { data: proyectoActual, error: proyectoError } = await supabase
        .from('fct_acreditacion_solicitud')
        .select('estado_solicitud_acreditacion')
        .eq('id', requerimiento.id_proyecto)
        .single();

      if (proyectoError) {
        console.error('❌ Error obteniendo estado del proyecto:', proyectoError);
      }

      // Obtener todos los requerimientos del proyecto
      const { data: todosRequerimientos, error: reqError } = await supabase
        .from('brg_acreditacion_solicitud_requerimiento')
        .select('estado')
        .eq('codigo_proyecto', requerimiento.codigo_proyecto);

      if (reqError) {
        console.error('❌ Error obteniendo requerimientos del proyecto:', reqError);
        return { allCompleted: false, codigoProyecto: requerimiento?.codigo_proyecto };
      }

      // Verificar si todos están completados
      allCompleted = todosRequerimientos && todosRequerimientos.length > 0 &&
        todosRequerimientos.every(req => req.estado === 'Completado');

      const estadoProyectoActual = canonicalizeSolicitudStatus(
        proyectoActual?.estado_solicitud_acreditacion
      );

      if (
        allCompleted &&
        !isSolicitudStatusPostDocumentation(estadoProyectoActual) &&
        !isSolicitudStatusCancelled(estadoProyectoActual)
      ) {
        nuevoEstadoProyecto = SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA;
        const { error: updateProyectoError } = await supabase
          .from('fct_acreditacion_solicitud')
          .update({
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(
            `Proyecto ${requerimiento.codigo_proyecto} actualizado a "${SOLICITUD_ACREDITACION_STATUS.DOCUMENTACION_SUBIDA}" - Todos los requerimientos estan completados`
          );
        }
      } else if (!allCompleted && isSolicitudStatusPostDocumentation(estadoProyectoActual)) {
        nuevoEstadoProyecto = SOLICITUD_ACREDITACION_STATUS.EN_PROCESO;
        const { error: updateProyectoError } = await supabase
          .from('fct_acreditacion_solicitud')
          .update({
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(
            `Proyecto ${requerimiento.codigo_proyecto} actualizado a "${SOLICITUD_ACREDITACION_STATUS.EN_PROCESO}" - Existen requerimientos pendientes`
          );
        }
      }
    } catch (checkError) {
      console.error('❌ Error verificando estado del proyecto:', checkError);
      // No fallar la actualización del requerimiento si falla la verificación del proyecto
    }
  }

  return { 
    allCompleted, 
    codigoProyecto: requerimiento?.codigo_proyecto,
    proyectoEstadoCambio: nuevoEstadoProyecto
  };
};

// Función para actualizar los nombres de responsables en los requerimientos del proyecto
export const updateProyectoRequerimientosResponsables = async (
  codigoProyecto: string,
  responsables: {
    jpro_nombre?: string;
    epr_nombre?: string;
    rrhh_nombre?: string;
    legal_nombre?: string;
    acreditacion_id?: number;
    acreditacion_nombre?: string;
  }
): Promise<void> => {
  console.log('=== Updating requirement responsibles ===');
  console.log('Project code:', codigoProyecto);
  console.log('Responsibles payload:', responsables);
  console.log('Acreditacion ID:', responsables.acreditacion_id);
  console.log('Acreditacion name:', responsables.acreditacion_nombre);

  // Determine if this solicitud has an external contractor.
  const { data: solicitud, error: solicitudError } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('razon_social_contratista')
    .eq('codigo_proyecto', codigoProyecto)
    .maybeSingle();

  if (solicitudError) {
    console.error('Error fetching razon_social_contratista for project:', solicitudError);
    throw solicitudError;
  }

  const razonSocialContratista = (solicitud?.razon_social_contratista || '').trim();
  const tieneContratistaExterno = Boolean(razonSocialContratista);
  const jproSeleccionado = (responsables.jpro_nombre || '').trim();

  console.log('Razon social contratista:', razonSocialContratista || 'N/A');
  console.log('Has external contractor:', tieneContratistaExterno);
  console.log('Selected JPRO:', jproSeleccionado || 'N/A');

  // Get all project requirements.
  const { data: requerimientos, error: fetchError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('id, requerimiento, responsable, categoria_empresa')
    .eq('codigo_proyecto', codigoProyecto);

  if (fetchError) {
    console.error('Error fetching project requirements:', fetchError);
    throw fetchError;
  }

  if (!requerimientos || requerimientos.length === 0) {
    console.log('No requirements found for update');
    return;
  }

  console.log('Requirements found:', requerimientos.length);

  let actualizados = 0;
  let errores = 0;

  for (const req of requerimientos) {
    let nombreResponsable = '';

    const esCategoriaContratista = isCategoriaEmpresaContratista(req.categoria_empresa);
    const debeForzarNombreJpro =
      tieneContratistaExterno &&
      Boolean(jproSeleccionado) &&
      esCategoriaContratista;

    if (debeForzarNombreJpro) {
      nombreResponsable = jproSeleccionado;
      console.log('[Req ' + req.id + '] Contractor override applied: nombre_responsable -> selected JPRO');
    } else {
      switch (req.responsable) {
        case 'JPRO':
          nombreResponsable = responsables.jpro_nombre || '';
          break;
        case 'EPR':
          nombreResponsable = responsables.epr_nombre || '';
          break;
        case 'RRHH':
          nombreResponsable = responsables.rrhh_nombre || '';
          break;
        case 'Legal':
          nombreResponsable = responsables.legal_nombre || '';
          break;
        default:
          console.log('[Req ' + req.id + '] Unknown role:', req.responsable);
          // Keep processing to still update acreditacion fields.
          break;
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (esCategoriaContratista && req.responsable !== 'JPRO') {
      updateData.responsable = 'JPRO';
      console.log('[Req ' + req.id + '] Contractor override applied: responsable -> JPRO');
    }

    if (nombreResponsable) {
      updateData.nombre_responsable = nombreResponsable;
    }

    // Keep current behavior: always propagate acreditacion fields when provided.
    if (responsables.acreditacion_id) {
      updateData.enc_acreditacion_id = responsables.acreditacion_id;
      console.log('[Req ' + req.id + '] Setting enc_acreditacion_id:', responsables.acreditacion_id);
    } else {
      console.log('[Req ' + req.id + '] No acreditacion_id provided');
    }

    if (responsables.acreditacion_nombre) {
      updateData.nombre_enc_acreditacion = responsables.acreditacion_nombre;
      console.log('[Req ' + req.id + '] Setting nombre_enc_acreditacion:', responsables.acreditacion_nombre);
    } else {
      console.log('[Req ' + req.id + '] No acreditacion_nombre provided');
    }

    const tieneDatosParaActualizar =
      Boolean(updateData.responsable) ||
      Boolean(nombreResponsable) ||
      Boolean(responsables.acreditacion_id) ||
      Boolean(responsables.acreditacion_nombre);

    if (!tieneDatosParaActualizar) {
      console.log('[Req ' + req.id + '] No fields to update');
      continue;
    }

    console.log('[Req ' + req.id + '] Update payload:', JSON.stringify(updateData, null, 2));

    const { error: updateError, data: updatedData } = await supabase
      .from('brg_acreditacion_solicitud_requerimiento')
      .update(updateData)
      .eq('id', req.id)
      .select();

    if (updateError) {
      console.error('[Req ' + req.id + '] Update error:', updateError);
      console.error('[Req ' + req.id + '] Payload attempted:', JSON.stringify(updateData, null, 2));
      console.error('[Req ' + req.id + '] Error detail:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      errores++;
    } else {
      console.log('[Req ' + req.id + '] Updated successfully (' + req.requerimiento + ')');
      if (updatedData && updatedData.length > 0) {
        console.log('[Req ' + req.id + '] DB row:', JSON.stringify(updatedData[0], null, 2));
      }
      if (nombreResponsable) {
        console.log('[Req ' + req.id + '] Role ' + req.responsable + ' -> nombre_responsable ' + nombreResponsable);
      }
      if (responsables.acreditacion_id) {
        console.log('[Req ' + req.id + '] enc_acreditacion_id saved:', responsables.acreditacion_id);
      }
      if (responsables.acreditacion_nombre) {
        console.log('[Req ' + req.id + '] nombre_enc_acreditacion saved:', responsables.acreditacion_nombre);
      }
      actualizados++;
    }
  }

  console.log('=== Requirement responsibles update finished ===');
  console.log('Updated:', actualizados, 'Errors:', errores);
};

// Función para guardar trabajadores del proyecto
export const createProyectoTrabajadores = async (
  idProyecto: number,
  codigoProyecto: string,
  trabajadoresMyma: { name: string; rut?: string; phone?: string; personaId?: number }[],
  trabajadoresContratista: { name: string; rut?: string; phone?: string }[]
): Promise<void> => {
  console.log('👷 Guardando trabajadores del proyecto:', codigoProyecto);
  console.log(`  - MyMA: ${trabajadoresMyma.length} trabajadores`);
  console.log(`  - Contratista: ${trabajadoresContratista.length} trabajadores`);

  const trabajadores: Omit<ProyectoTrabajador, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Agregar trabajadores MyMA
  trabajadoresMyma.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'MyMA',
      rut: trabajador.rut || null,
      telefono: trabajador.phone || null,
      // Nuevo: relacionar con dim_core_persona si viene desde buscador interno
      persona_id: trabajador.personaId ?? null
    });
  });

  // Agregar trabajadores Contratista
  trabajadoresContratista.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'Contratista',
      rut: trabajador.rut || null,
      telefono: trabajador.phone || null,
      // Para contratistas no tenemos persona en dim_core_persona
      persona_id: null
    });
  });

  if (trabajadores.length === 0) {
    console.log('⚠️ No hay trabajadores para guardar');
    return;
  }

  console.log(`📦 Insertando ${trabajadores.length} trabajadores en total`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_trabajador_manual')
    .insert(trabajadores)
    .select();

  if (error) {
    console.error('❌ Error guardando trabajadores del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${data?.length || 0} trabajadores guardados exitosamente`);
};

// Función para obtener trabajadores del proyecto desde fct_acreditacion_solicitud_trabajador_manual
export const fetchProyectoTrabajadoresByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('🔍 Leyendo trabajadores del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_trabajador_manual')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('❌ Error leyendo trabajadores del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

// Función para guardar horarios del proyecto
export const createProyectoHorarios = async (
  idProyecto: number,
  codigoProyecto: string,
  horarios: Array<{ dias: string; horario: string }>,
  categoriaEmpresa: string = 'MyMA'
): Promise<void> => {
  console.log('⏰ Guardando horarios del proyecto:', codigoProyecto);
  console.log(`  - Total: ${horarios.length} horarios`);
  console.log(`  - Categoría: ${categoriaEmpresa}`);

  if (!horarios || horarios.length === 0) {
    console.log('⚠️ No hay horarios para guardar');
    return;
  }

  // Guardar todos los horarios sin restricciones
  const horariosData = horarios.map(horario => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    dias: horario.dias || '',
    horario: horario.horario || '',
    categoria_empresa: categoriaEmpresa
  }));

  console.log(`📦 Insertando ${horariosData.length} horarios`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_horario_manual')
    .insert(horariosData)
    .select();

  if (error) {
    console.error('❌ Error guardando horarios del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${horariosData.length} horarios guardados exitosamente`);
};

// Función para guardar conductores del proyecto
export const createProyectoConductores = async (
  idProyecto: number,
  codigoProyecto: string,
  vehiculos: Array<{ placa: string; conductor: string }>,
  categoriaEmpresa: 'MyMA' | 'Contratista'
): Promise<void> => {
  console.log('🚗 Guardando conductores del proyecto:', codigoProyecto);
  console.log(`  - Total: ${vehiculos.length} vehículos`);
  console.log(`  - Categoría: ${categoriaEmpresa}`);

  if (!vehiculos || vehiculos.length === 0) {
    console.log('⚠️ No hay vehículos para guardar');
    return;
  }

  // Guardar todos los vehículos sin restricciones
  const conductoresData = vehiculos.map(vehiculo => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    patente: vehiculo.placa || '',
    nombre_conductor: vehiculo.conductor || '',
    categoria_empresa: categoriaEmpresa
  }));

  console.log(`📦 Insertando ${conductoresData.length} conductores`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_conductor_manual')
    .insert(conductoresData)
    .select();

  if (error) {
    console.error('❌ Error guardando conductores del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${conductoresData.length} conductores guardados exitosamente`);
};

// Función para guardar patentes del proyecto
export const createProyectoVehiculos = async (
  idProyecto: number,
  codigoProyecto: string,
  vehiculos: Array<{ placa: string; conductor?: string }>,
  categoriaEmpresa: 'MyMA' | 'Contratista'
): Promise<void> => {
  console.log('🚗 Guardando patentes del proyecto:', codigoProyecto);
  console.log(`  - Total recibido: ${vehiculos.length} vehículos`);
  console.log(`  - Categoría: ${categoriaEmpresa}`);

  if (!vehiculos || vehiculos.length === 0) {
    console.log('⚠️ No hay vehículos para guardar');
    return;
  }

  // Normalizar y filtrar patentes vacías
  const vehiculosConPatente = vehiculos
    .map((vehiculo) => ({
      patente: (vehiculo.placa || '').trim().toUpperCase(),
    }))
    .filter((vehiculo) => vehiculo.patente !== '');

  console.log(`  - Con patente válida: ${vehiculosConPatente.length}`);

  if (vehiculosConPatente.length === 0) {
    console.log('⚠️ No hay patentes válidas para guardar');
    return;
  }

  // Deduplicar por patente dentro de la categoría
  const patentesVistas = new Set<string>();
  const vehiculosDeduplicados = vehiculosConPatente.filter((vehiculo) => {
    if (patentesVistas.has(vehiculo.patente)) return false;
    patentesVistas.add(vehiculo.patente);
    return true;
  });

  console.log(`  - Patentes únicas a insertar: ${vehiculosDeduplicados.length}`);

  const vehiculosData = vehiculosDeduplicados.map((vehiculo) => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    patente: vehiculo.patente,
    categoria_empresa: categoriaEmpresa,
  }));

  console.log(`📦 Insertando ${vehiculosData.length} patentes`);

  const { error } = await supabase
    .from('fct_acreditacion_solicitud_vehiculos')
    .insert(vehiculosData);

  if (error) {
    console.error('❌ Error guardando patentes del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${vehiculosData.length} patentes guardadas exitosamente`);
};

// Función para obtener conductores del proyecto desde fct_acreditacion_solicitud_conductor_manual
export const fetchProyectoConductoresByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('🔍 Leyendo conductores del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_conductor_manual')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('❌ Error leyendo conductores del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

// Función para obtener patentes del proyecto desde fct_acreditacion_solicitud_vehiculos
export const fetchProyectoVehiculosByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('🔍 Leyendo patentes del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_vehiculos')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('❌ Error leyendo patentes del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

const createEmptyFieldRequestFormData = (): RequestFormData => ({
  requestDate: '',
  requesterName: '',
  kickoffDate: '',
  projectCode: 'MY-',
  esContratoMarco: '',
  requirement: '',
  clientName: '',
  clientContactName: '',
  clientContactEmail: '',
  projectManager: '',
  accreditationFollowUp: '',
  fieldStartDate: '',
  fechaEntregaCarpetaArranque: '',
  riskPreventionNotice: '',
  companyAccreditationRequired: '',
  requiereAcreditarTrabajadoresMyma: '',
  contractAdmin: '',
  nombreContrato: '',
  numeroContrato: '',
  administradorContrato: '',
  jornadaTrabajo: '',
  horarioTrabajo: '',
  cantidadVehiculos: '',
  placaPatente: '',
  requiereAcreditarContratista: '',
  requiereAcreditarTrabajadoresContratista: '',
  modalidadContrato: '',
  razonSocialContratista: '',
  nombreResponsableContratista: '',
  telefonoResponsableContratista: '',
  emailResponsableContratista: '',
  cantidadVehiculosContratista: '',
  placasVehiculosContratista: '',
  registroSstTerreo: '',
  cantidad_trabajadores_myma: 0,
  cantidad_trabajadores_contratista: 0,
});

const sortByCreatedAtOrId = <T extends { created_at?: string; id?: number }>(rows: T[]): T[] => {
  return [...rows].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.id || 0) - (b.id || 0);
  });
};

const toYesNoValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  return normalizeDbBoolean(value) ? 'yes' : 'no';
};

export const fetchFieldRequestFormSnapshotByProjectId = async (
  idProyecto: number
): Promise<FieldRequestFormSnapshot> => {
  if (!idProyecto || typeof idProyecto !== 'number') {
    throw new Error('ID de proyecto inválido para reconstruir formulario');
  }

  const missingFields = [
    'accreditationFollowUp',
    'horarioTrabajo',
  ];

  const [
    solicitudResult,
    trabajadoresResult,
    horariosResult,
    conductoresResult,
    vehiculosResult,
  ] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('*')
      .eq('id', idProyecto)
      .single(),
    supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_horario_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('*')
      .eq('id_proyecto', idProyecto),
  ]);

  if (solicitudResult.error || !solicitudResult.data) {
    console.error('Error reconstruyendo formulario: solicitud no encontrada', solicitudResult.error);
    throw solicitudResult.error || new Error(`No se encontró la solicitud ${idProyecto}`);
  }

  if (trabajadoresResult.error) {
    console.error('Error obteniendo trabajadores para snapshot:', trabajadoresResult.error);
    missingFields.push('workers (error de lectura en tabla de trabajadores)');
  }
  if (horariosResult.error) {
    console.error('Error obteniendo horarios para snapshot:', horariosResult.error);
    missingFields.push('horarios (error de lectura en tabla de horarios)');
  }
  if (conductoresResult.error) {
    console.error('Error obteniendo conductores para snapshot:', conductoresResult.error);
    missingFields.push('vehiculos/conductores (error de lectura en tabla de conductores)');
  }
  if (vehiculosResult.error) {
    console.error('Error obteniendo vehiculos para snapshot:', vehiculosResult.error);
    missingFields.push('vehiculos (error de lectura en tabla de vehiculos)');
  }

  const solicitud = solicitudResult.data as any;
  const trabajadoresRows = sortByCreatedAtOrId((trabajadoresResult.data || []) as any[]);
  const horariosRows = sortByCreatedAtOrId((horariosResult.data || []) as any[]);
  const conductoresRows = sortByCreatedAtOrId((conductoresResult.data || []) as any[]);
  const vehiculosRows = sortByCreatedAtOrId((vehiculosResult.data || []) as any[]);

  const razonSocialContratista = (solicitud.razon_social_contratista || '').trim();

  const trabajadoresMymaRows = trabajadoresRows.filter((row) => row.categoria_empresa === 'MyMA');
  const trabajadoresContratistaRows = trabajadoresRows.filter((row) => row.categoria_empresa !== 'MyMA');

  const workers: Worker[] = trabajadoresMymaRows.map((row) => ({
    id: String(row.id ?? `${idProyecto}-myma-${row.nombre_trabajador ?? 'trabajador'}`),
    name: row.nombre_trabajador || 'Sin nombre',
    type: WorkerType.INTERNAL,
    phone: row.telefono || undefined,
    rut: row.rut || undefined,
    personaId: row.persona_id ?? undefined,
  }));

  const workersContratista: Worker[] = trabajadoresContratistaRows.map((row) => ({
    id: String(row.id ?? `${idProyecto}-contratista-${row.nombre_trabajador ?? 'trabajador'}`),
    name: row.nombre_trabajador || 'Sin nombre',
    type: WorkerType.EXTERNAL,
    phone: row.telefono || undefined,
    rut: row.rut || undefined,
    company: razonSocialContratista || 'Contratista',
  }));

  const buildVehiculosPorCategoria = (categoriaEmpresa: 'MyMA' | 'Contratista') => {
    const conductoresCategoria = conductoresRows
      .filter((row) => row.categoria_empresa === categoriaEmpresa)
      .map((row) => ({
        placa: (row.patente || '').toString().trim(),
        conductor: (row.nombre_conductor || '').toString().trim(),
      }));

    if (conductoresCategoria.length > 0) {
      return conductoresCategoria;
    }

    return vehiculosRows
      .filter((row) => row.categoria_empresa === categoriaEmpresa)
      .map((row) => ({
        placa: (row.patente || '').toString().trim(),
        conductor: '',
      }));
  };

  const vehiculosMyma = buildVehiculosPorCategoria('MyMA');
  const vehiculosContratista = buildVehiculosPorCategoria('Contratista');

  const horarios = horariosRows.map((row) => ({
    dias: (row.dias || '').toString(),
    horario: (row.horario || '').toString(),
  }));

  const targetWorkerCountMyma = Number(solicitud.cantidad_trabajadores_myma ?? workers.length ?? 0) || 0;
  const targetWorkerCountContratista = Number(solicitud.cantidad_trabajadores_contratista ?? workersContratista.length ?? 0) || 0;

  const requiereAcreditarTrabajadoresMyma = targetWorkerCountMyma > 0 || workers.length > 0 ? 'yes' : 'no';
  const requiereAcreditarTrabajadoresContratista =
    targetWorkerCountContratista > 0 || workersContratista.length > 0 ? 'yes' : 'no';

  const formData: RequestFormData = {
    ...createEmptyFieldRequestFormData(),
    requestDate: solicitud.fecha_solicitud || '',
    requesterName: solicitud.nombre_solicitante || '',
    kickoffDate: solicitud.fecha_reunion_arranque || '',
    projectCode: solicitud.codigo_proyecto || '',
    esContratoMarco: solicitud.numero_contrato ? 'yes' : 'no',
    requirement: solicitud.requisito || '',
    clientName: solicitud.nombre_cliente || '',
    clientContactName: solicitud.nombre_contacto_cliente || solicitud.contacto_cliente_nombre || '',
    clientContactEmail: solicitud.email_contacto_cliente || solicitud.contacto_cliente_email || '',
    projectManager: solicitud.jefe_proyectos_myma || '',
    accreditationFollowUp: '',
    fieldStartDate: solicitud.fecha_inicio_terreno || '',
    fechaEntregaCarpetaArranque: solicitud.fecha_entrega_carpeta_arranque || '',
    riskPreventionNotice: toYesNoValue(solicitud.aviso_prevencion_riesgo),
    companyAccreditationRequired: toYesNoValue(solicitud.requiere_acreditar_empresa),
    requiereAcreditarTrabajadoresMyma,
    contractAdmin: solicitud.admin_contrato_myma || '',
    nombreContrato: solicitud.nombre_contrato || '',
    numeroContrato: solicitud.numero_contrato || '',
    administradorContrato: solicitud.administrador_contrato || '',
    jornadaTrabajo: solicitud.condiciones_laborales || '',
    horarioTrabajo: '',
    cantidadVehiculos: String(vehiculosMyma.length),
    placaPatente: '',
    requiereAcreditarContratista: toYesNoValue(solicitud.requiere_acreditar_contratista),
    requiereAcreditarTrabajadoresContratista,
    modalidadContrato: solicitud.modalidad_contrato_contratista || '',
    razonSocialContratista,
    nombreResponsableContratista:
      solicitud.nombre_responsable_contratista || solicitud.responsable_contratista_nombre || '',
    telefonoResponsableContratista:
      solicitud.telefono_responsable_contratista || solicitud.responsable_contratista_telefono || '',
    emailResponsableContratista:
      solicitud.email_responsable_contratista || solicitud.responsable_contratista_email || '',
    cantidadVehiculosContratista: String(vehiculosContratista.length),
    placasVehiculosContratista: '',
    registroSstTerreo: toYesNoValue(solicitud.registro_sst_terreno),
    cantidad_trabajadores_myma: targetWorkerCountMyma,
    cantidad_trabajadores_contratista: targetWorkerCountContratista,
  };

  return {
    formData,
    workers,
    workersContratista,
    targetWorkerCountMyma,
    targetWorkerCountContratista,
    horarios,
    vehiculosMyma,
    vehiculosContratista,
    missingFields,
  };
};

export interface SolicitudRequerimientoCategoryAvailability {
  empresa: boolean;
  trabajadores: boolean;
  conductores: boolean;
  vehiculos: boolean;
  counts: {
    trabajadores: number;
    conductores: number;
    vehiculos: number;
  };
  flags: {
    requiereAcreditarEmpresa: boolean;
    requiereAcreditarContratista: boolean;
  };
}

const normalizeDbBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 't', '1', 'yes', 'y', 'si', 'sí'].includes(normalized);
  }
  return false;
};

export const fetchSolicitudRequerimientoCategoryAvailability = async (
  idProyecto: number
): Promise<SolicitudRequerimientoCategoryAvailability> => {
  const [
    solicitudResult,
    trabajadoresCountResult,
    conductoresCountResult,
    vehiculosCountResult
  ] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('requiere_acreditar_empresa, requiere_acreditar_contratista')
      .eq('id', idProyecto)
      .single(),
    supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
  ]);

  if (solicitudResult.error) {
    console.error('Error obteniendo flags de solicitud para categorías:', solicitudResult.error);
    throw solicitudResult.error;
  }

  if (trabajadoresCountResult.error) {
    console.error('Error contando trabajadores del proyecto:', trabajadoresCountResult.error);
    throw trabajadoresCountResult.error;
  }

  if (conductoresCountResult.error) {
    console.error('Error contando conductores del proyecto:', conductoresCountResult.error);
    throw conductoresCountResult.error;
  }

  if (vehiculosCountResult.error) {
    console.error('Error contando vehículos del proyecto:', vehiculosCountResult.error);
    throw vehiculosCountResult.error;
  }

  const requiereAcreditarEmpresa = normalizeDbBoolean(
    solicitudResult.data?.requiere_acreditar_empresa
  );
  const requiereAcreditarContratista = normalizeDbBoolean(
    solicitudResult.data?.requiere_acreditar_contratista
  );

  const trabajadoresCount = trabajadoresCountResult.count || 0;
  const conductoresCount = conductoresCountResult.count || 0;
  const vehiculosCount = vehiculosCountResult.count || 0;

  return {
    empresa: requiereAcreditarEmpresa || requiereAcreditarContratista,
    trabajadores: trabajadoresCount > 0,
    conductores: conductoresCount > 0,
    vehiculos: vehiculosCount > 0,
    counts: {
      trabajadores: trabajadoresCount,
      conductores: conductoresCount,
      vehiculos: vehiculosCount,
    },
    flags: {
      requiereAcreditarEmpresa,
      requiereAcreditarContratista,
    },
  };
};

// Función para enviar el resumen de solicitud a logs de backend (edge function)
export const logResumenSolicitudAcreditacion = async (resumen: any): Promise<void> => {
  try {
    console.log('📦 Enviando resumen de acreditación a función edge...', resumen);
    await sendWebhookViaEdgeFunction({
      tipo: 'resumen_solicitud_acreditacion',
      payload: resumen,
    });
    console.log('✅ Resumen de acreditación enviado a función edge correctamente');
  } catch (error) {
    console.error('❌ Error enviando resumen de acreditación a función edge:', error);
  }
};

// Función para crear carpetas del proyecto llamando a la API local
export const crearCarpetasProyecto = async (resumen: any): Promise<any> => {
  const url = ACREDITACION_PROXY_ENDPOINTS.carpetasCrear;
  
  console.log('[carpetas] Llamando a API para crear carpetas del proyecto...');
  console.log('   URL:', url);
  console.log('   Payload:', JSON.stringify(resumen, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resumen),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[carpetas] Carpetas creadas exitosamente:', data);
    return data;
  } catch (error: any) {
    console.error('[carpetas] Error llamando a API de carpetas:', error);
    const wrappedError = new Error(error?.message || 'Error llamando a API de carpetas');
    Object.assign(wrappedError, {
      isExternalSyncError: true,
      syncOperation: 'crear_carpetas_proyecto',
      endpoint: url,
      cause: error,
    });
    throw wrappedError;
  }
};

export interface SubirDocumentoAcreditacionPayload {
  documento_base64: string;
  nombre_documento: string;
  fecha_inicio: string;
  folder_id: string | null;
  nombre_persona: string;
  rut_persona: string;
  id_registro_sst: number;
}

// Función para subir documento a la API de acreditación (proxy local)
export const subirDocumentoAcreditacion = async (
  payload: SubirDocumentoAcreditacionPayload
): Promise<any> => {
  const url = ACREDITACION_PROXY_ENDPOINTS.documentosSubir;

  console.log('[documentos] Subiendo documento a API de acreditación...');
  console.log('   URL:', url);
  console.log('   Payload:', {
    ...payload,
    documento_base64: '[BASE64_DATA]',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${responseText}`);
    }

    if (contentType?.includes('application/json')) {
      const data = JSON.parse(responseText);
      console.log('[documentos] Documento subido correctamente:', data);
      return data;
    }

    console.log('[documentos] Documento subido correctamente (texto):', responseText);
    return responseText;
  } catch (error: any) {
    console.error('[documentos] Error subiendo documento:', error);
    const wrappedError = new Error(error?.message || 'Error subiendo documento');
    Object.assign(wrappedError, {
      isExternalSyncError: true,
      syncOperation: 'subir_documento',
      endpoint: url,
      cause: error,
    });
    throw wrappedError;
  }
};
