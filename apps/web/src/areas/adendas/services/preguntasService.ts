import { supabase } from '@shared/api-client/supabase';
import type {
  CatalogoEspecialidad,
  CatalogoPersona,
  ComplejidadPregunta,
  EstadoPregunta,
  PreguntaAdjunto,
  PreguntaAdjuntosResumen,
  PreguntaGestion,
  UpdatePreguntaPayload,
} from '../types';

interface PreguntasCatalogos {
  personas: CatalogoPersona[];
  especialidades: CatalogoEspecialidad[];
}

interface PreguntaRow {
  id: number;
  adenda_id: number | null;
  numero: number | null;
  capitulo: string | null;
  texto: string | null;
  temas_principales: unknown;
  temas_secundarios: unknown;
  estado: string | null;
  complejidad: string | null;
  estrategia?: string | null;
  respuesta_ia?: string | null;
  created_at: string | null;
  pregunta_media?: unknown;
  encargado_persona_id?: number | null;
  especialidad_id?: number | null;
}

interface PreguntaReporteRow {
  id: number;
  adenda_id: number | null;
  numero: number | null;
  texto: string | null;
  estado: string | null;
  complejidad: string | null;
  especialidad?: string | null;
  estrategia?: string | null;
  respuesta_ia?: string | null;
  especialidad_id?: number | null;
}

export interface PreguntaReporteData {
  id: number;
  adenda_id: number | null;
  codigo_myma: string | null;
  numero_formateado: string;
  texto: string;
  detalle_alerta: string | null;
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
  especialidad_nombre: string;
}

const ESTADOS_VALIDOS: EstadoPregunta[] = ['En revisión', 'Pendientes', 'Completadas'];
const COMPLEJIDADES_VALIDAS: ComplejidadPregunta[] = ['Baja', 'Media', 'Alta'];

const ADJUNTOS_SELECT =
  'id,question_id,filename,tipo,parte,mime_type,drive_preview_url,drive_web_view_url';
const PREGUNTAS_SELECT_CORE =
  'id,adenda_id,numero,capitulo,texto,temas_principales,temas_secundarios,estado,complejidad,created_at';
const PREGUNTAS_SELECT_WITH_TEXT_FIELDS =
  `${PREGUNTAS_SELECT_CORE},estrategia,respuesta_ia`;
const PREGUNTAS_SELECT_WITH_ASSIGNMENTS =
  `${PREGUNTAS_SELECT_WITH_TEXT_FIELDS},encargado_persona_id,especialidad_id,pregunta_media(${ADJUNTOS_SELECT})`;
const PREGUNTAS_SELECT_LEGACY = `${PREGUNTAS_SELECT_CORE},pregunta_media(${ADJUNTOS_SELECT})`;
const PREGUNTAS_REPORTE_SELECT_CORE =
  'id,adenda_id,numero,texto,estado,complejidad,especialidad_id';
const PREGUNTAS_REPORTE_SELECT_WITH_ESPECIALIDAD =
  `${PREGUNTAS_REPORTE_SELECT_CORE},especialidad`;
const PREGUNTAS_REPORTE_SELECT_WITH_TEXT_FIELDS =
  `${PREGUNTAS_REPORTE_SELECT_WITH_ESPECIALIDAD},estrategia,respuesta_ia`;

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const isMissingGestionColumnsError = (error: { message?: string | null; details?: string | null }): boolean => {
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    message.includes('encargado_persona_id') ||
    message.includes('especialidad_id') ||
    message.includes('estrategia') ||
    message.includes('respuesta_ia') ||
    message.includes('column preguntas.encargado_persona_id does not exist') ||
    message.includes('column preguntas.especialidad_id does not exist') ||
    message.includes('column preguntas.estrategia does not exist') ||
    message.includes('column preguntas.respuesta_ia does not exist')
  );
};

const isMissingEspecialidadTextColumnError = (error: {
  message?: string | null;
  details?: string | null;
}): boolean => {
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    message.includes('column preguntas.especialidad does not exist') ||
    message.includes('column "especialidad" does not exist')
  );
};

const normalizeTemaItem = (item: unknown): string | null => {
  if (typeof item === 'string') {
    const trimmed = item.trim();
    return trimmed || null;
  }

  if (isRecord(item)) {
    if (typeof item.nombre === 'string' && item.nombre.trim()) {
      return item.nombre.trim();
    }

    if (typeof item.name === 'string' && item.name.trim()) {
      return item.name.trim();
    }

    if (typeof item.tema === 'string' && item.tema.trim()) {
      return item.tema.trim();
    }
  }

  return null;
};

const normalizeTemaList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const items = value
      .map(normalizeTemaItem)
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(items));
  }

  const single = normalizeTemaItem(value);
  return single ? [single] : [];
};

const normalizeAdjuntos = (value: unknown): PreguntaAdjunto[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const id = toNullableNumber(item.id);
      const questionId = toNullableNumber(item.question_id);

      if (id === null || questionId === null) {
        return null;
      }

      return {
        id,
        question_id: questionId,
        filename: typeof item.filename === 'string' ? item.filename : null,
        tipo: typeof item.tipo === 'string' ? item.tipo : null,
        parte: toNullableNumber(item.parte),
        mime_type: typeof item.mime_type === 'string' ? item.mime_type : null,
        drive_preview_url:
          typeof item.drive_preview_url === 'string' ? item.drive_preview_url : null,
        drive_web_view_url:
          typeof item.drive_web_view_url === 'string' ? item.drive_web_view_url : null,
      };
    })
    .filter((item): item is PreguntaAdjunto => Boolean(item));
};

const buildAdjuntosResumen = (adjuntos: PreguntaAdjunto[]): PreguntaAdjuntosResumen => {
  const resumen: PreguntaAdjuntosResumen = { figura: 0, tabla: 0, total: adjuntos.length };

  for (const adjunto of adjuntos) {
    const tipo = (adjunto.tipo || '').toLowerCase();
    if (tipo === 'figura') {
      resumen.figura += 1;
      continue;
    }

    if (tipo === 'tabla') {
      resumen.tabla += 1;
    }
  }

  return resumen;
};

const formatNumero = (numero: number | null): string => {
  if (numero === null || !Number.isFinite(numero)) {
    return '-';
  }

  return String(numero).padStart(3, '0');
};

const buildDetalleAlerta = (row: PreguntaReporteRow): string | null => {
  const estrategia = typeof row.estrategia === 'string' ? row.estrategia.trim() : '';
  if (estrategia) {
    return estrategia;
  }

  const respuestaIa = typeof row.respuesta_ia === 'string' ? row.respuesta_ia.trim() : '';
  if (respuestaIa) {
    return respuestaIa;
  }

  return null;
};

const isEstadoPregunta = (value: unknown): value is EstadoPregunta => {
  return typeof value === 'string' && ESTADOS_VALIDOS.includes(value as EstadoPregunta);
};

const isComplejidadPregunta = (value: unknown): value is ComplejidadPregunta => {
  return (
    typeof value === 'string' && COMPLEJIDADES_VALIDAS.includes(value as ComplejidadPregunta)
  );
};

export const normalizeEstadoPregunta = (value: unknown): EstadoPregunta => {
  if (isEstadoPregunta(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return 'Pendientes';
    }

    if (normalized.includes('completad')) {
      return 'Completadas';
    }

    if (
      normalized.includes('en revisión') ||
      normalized.includes('en revision') ||
      normalized.includes('desarrollo')
    ) {
      return 'En revisión';
    }

    if (normalized.includes('pendient') || normalized.includes('no iniciad')) {
      return 'Pendientes';
    }
  }

  return 'Pendientes';
};

export const normalizeComplejidadPregunta = (value: unknown): ComplejidadPregunta => {
  return isComplejidadPregunta(value) ? value : 'Media';
};

export const getAdjuntosDescripcion = (resumen: PreguntaAdjuntosResumen): string => {
  if (resumen.total === 0) {
    return 'Sin adjuntos';
  }

  const parts: string[] = [];
  if (resumen.tabla > 0) {
    parts.push(`Tabla x${resumen.tabla}`);
  }
  if (resumen.figura > 0) {
    parts.push(`Figura x${resumen.figura}`);
  }

  return parts.length > 0 ? parts.join(' · ') : `${resumen.total} adjuntos`;
};

const mapPreguntaRow = (
  row: PreguntaRow,
  personasMap: Map<number, string>,
  especialidadesMap: Map<number, string>
): PreguntaGestion => {
  const temasPrincipales = normalizeTemaList(row.temas_principales);
  const temasSecundarios = normalizeTemaList(row.temas_secundarios);
  const adjuntos = normalizeAdjuntos(row.pregunta_media);

  const encargadoPersonaId = toNullableNumber(row.encargado_persona_id);
  const especialidadId = toNullableNumber(row.especialidad_id);

  return {
    id: row.id,
    adenda_id: row.adenda_id,
    numero: row.numero,
    numero_formateado: formatNumero(row.numero),
    capitulo: row.capitulo || '-',
    texto: row.texto || '-',
    temas_principales_texto:
      temasPrincipales.length > 0 ? temasPrincipales.join(', ') : 'Sin temas principales',
    temas_secundarios_texto:
      temasSecundarios.length > 0 ? temasSecundarios.join(', ') : 'Sin temas secundarios',
    estado: isEstadoPregunta(row.estado) ? row.estado : null,
    complejidad: isComplejidadPregunta(row.complejidad) ? row.complejidad : null,
    encargado_persona_id: encargadoPersonaId,
    encargado_nombre: encargadoPersonaId ? personasMap.get(encargadoPersonaId) || null : null,
    especialidad_id: especialidadId,
    especialidad_nombre: especialidadId ? especialidadesMap.get(especialidadId) || null : null,
    estrategia: typeof row.estrategia === 'string' ? row.estrategia : null,
    respuesta_ia: typeof row.respuesta_ia === 'string' ? row.respuesta_ia : null,
    adjuntos,
    adjuntos_resumen: buildAdjuntosResumen(adjuntos),
    created_at: row.created_at,
  };
};

const getCatalogMaps = (catalogos: PreguntasCatalogos) => {
  const personasMap = new Map<number, string>();
  const especialidadesMap = new Map<number, string>();

  for (const persona of catalogos.personas) {
    personasMap.set(persona.id, persona.nombre_completo);
  }

  for (const especialidad of catalogos.especialidades) {
    especialidadesMap.set(especialidad.id, especialidad.nombre_especialidad);
  }

  return { personasMap, especialidadesMap };
};

const selectPreguntasByAdendaId = async (adendaId: number): Promise<PreguntaRow[]> => {
  const { data, error } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_SELECT_WITH_ASSIGNMENTS)
    .eq('adenda_id', adendaId)
    .order('numero', { ascending: true })
    .order('id', { ascending: true });

  if (!error) {
    return (data || []) as unknown as PreguntaRow[];
  }

  if (!isMissingGestionColumnsError(error)) {
    throw error;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_SELECT_LEGACY)
    .eq('adenda_id', adendaId)
    .order('numero', { ascending: true })
    .order('id', { ascending: true });

  if (legacyError) {
    throw legacyError;
  }

  return (legacyData || []) as unknown as PreguntaRow[];
};

const selectPreguntaById = async (preguntaId: number): Promise<PreguntaRow | null> => {
  const { data, error } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_SELECT_WITH_ASSIGNMENTS)
    .eq('id', preguntaId)
    .maybeSingle();

  if (!error) {
    return (data || null) as unknown as PreguntaRow | null;
  }

  if (!isMissingGestionColumnsError(error)) {
    throw error;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_SELECT_LEGACY)
    .eq('id', preguntaId)
    .maybeSingle();

  if (legacyError) {
    throw legacyError;
  }

  return (legacyData || null) as unknown as PreguntaRow | null;
};

const selectPreguntasReporteRows = async (): Promise<PreguntaReporteRow[]> => {
  const { data, error } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_REPORTE_SELECT_WITH_TEXT_FIELDS)
    .order('numero', { ascending: true })
    .order('id', { ascending: true });

  if (!error) {
    return (data || []) as unknown as PreguntaReporteRow[];
  }

  if (
    !isMissingGestionColumnsError(error) &&
    !isMissingEspecialidadTextColumnError(error)
  ) {
    throw error;
  }

  const {
    data: dataWithEspecialidad,
    error: errorWithEspecialidad,
  } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_REPORTE_SELECT_WITH_ESPECIALIDAD)
    .order('numero', { ascending: true })
    .order('id', { ascending: true });

  if (!errorWithEspecialidad) {
    return (dataWithEspecialidad || []) as unknown as PreguntaReporteRow[];
  }

  if (!isMissingEspecialidadTextColumnError(errorWithEspecialidad)) {
    throw errorWithEspecialidad;
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('preguntas')
    .select(PREGUNTAS_REPORTE_SELECT_CORE)
    .order('numero', { ascending: true })
    .order('id', { ascending: true });

  if (legacyError) {
    throw legacyError;
  }

  return (legacyData || []) as unknown as PreguntaReporteRow[];
};

export const resolveAdendaId = async (codigoMyma: string): Promise<number> => {
  const codigo = codigoMyma.trim();
  if (!codigo) {
    throw new Error('No se recibió un identificador de adenda válido.');
  }

  if (/^\d+$/.test(codigo)) {
    return Number(codigo);
  }

  const { data, error } = await supabase
    .from('adendas')
    .select('id')
    .eq('codigo_myma', codigo)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  const { data: ilikeData, error: ilikeError } = await supabase
    .from('adendas')
    .select('id')
    .ilike('codigo_myma', codigo)
    .limit(1)
    .maybeSingle();

  if (ilikeError) {
    throw ilikeError;
  }

  if (ilikeData?.id) {
    return ilikeData.id;
  }

  throw new Error(`No se encontró una adenda para "${codigoMyma}".`);
};

export const fetchCatalogoPersonasActivas = async (): Promise<CatalogoPersona[]> => {
  const { data, error } = await supabase
    .from('dim_core_persona')
    .select('id,nombre_completo')
    .eq('estado', 'Activo')
    .order('nombre_completo', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre_completo: row.nombre_completo,
  }));
};

export const fetchCatalogoEspecialidades = async (): Promise<CatalogoEspecialidad[]> => {
  const { data, error } = await supabase
    .from('dim_core_especialidad')
    .select('id,nombre_especialidad')
    .order('nombre_especialidad', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    nombre_especialidad: row.nombre_especialidad,
  }));
};

export const fetchPreguntasCatalogos = async (): Promise<PreguntasCatalogos> => {
  const [personas, especialidades] = await Promise.all([
    fetchCatalogoPersonasActivas(),
    fetchCatalogoEspecialidades(),
  ]);

  return { personas, especialidades };
};

export const fetchPreguntasByCodigoMyma = async (
  codigoMyma: string,
  catalogos?: PreguntasCatalogos
): Promise<{ adendaId: number; preguntas: PreguntaGestion[]; catalogos: PreguntasCatalogos }> => {
  const adendaId = await resolveAdendaId(codigoMyma);
  const catalogosUsados = catalogos || (await fetchPreguntasCatalogos());
  const rows = await selectPreguntasByAdendaId(adendaId);

  const { personasMap, especialidadesMap } = getCatalogMaps(catalogosUsados);
  const preguntas = rows.map((row) => mapPreguntaRow(row, personasMap, especialidadesMap));

  return { adendaId, preguntas, catalogos: catalogosUsados };
};

export const fetchPreguntaById = async (
  preguntaId: number,
  catalogos?: PreguntasCatalogos
): Promise<{ pregunta: PreguntaGestion | null; catalogos: PreguntasCatalogos }> => {
  const catalogosUsados = catalogos || (await fetchPreguntasCatalogos());
  const row = await selectPreguntaById(preguntaId);

  if (!row) {
    return { pregunta: null, catalogos: catalogosUsados };
  }

  const { personasMap, especialidadesMap } = getCatalogMaps(catalogosUsados);

  return {
    pregunta: mapPreguntaRow(row, personasMap, especialidadesMap),
    catalogos: catalogosUsados,
  };
};

export const fetchPreguntasReporte = async (): Promise<PreguntaReporteData[]> => {
  const [rows, especialidades] = await Promise.all([
    selectPreguntasReporteRows(),
    fetchCatalogoEspecialidades(),
  ]);

  const adendaIds = Array.from(
    new Set(
      rows
        .map((row) => row.adenda_id)
        .filter((adendaId): adendaId is number => Number.isFinite(adendaId))
    )
  );

  const adendasCodigoMap = new Map<number, string>();
  if (adendaIds.length > 0) {
    const { data: adendasRows, error: adendasError } = await supabase
      .from('adendas')
      .select('id,codigo_myma')
      .in('id', adendaIds);

    if (adendasError) {
      throw adendasError;
    }

    for (const row of adendasRows || []) {
      if (typeof row.id !== 'number') {
        continue;
      }

      if (typeof row.codigo_myma === 'string' && row.codigo_myma.trim()) {
        adendasCodigoMap.set(row.id, row.codigo_myma.trim());
      }
    }
  }

  const especialidadesMap = new Map<number, string>();
  for (const especialidad of especialidades) {
    especialidadesMap.set(especialidad.id, especialidad.nombre_especialidad);
  }

  return rows.map((row) => {
    const especialidadId = toNullableNumber(row.especialidad_id);
    const especialidadTexto =
      typeof row.especialidad === 'string' ? row.especialidad.trim() : '';

    return {
      id: row.id,
      adenda_id: row.adenda_id,
      codigo_myma:
        row.adenda_id !== null ? adendasCodigoMap.get(row.adenda_id) || null : null,
      numero_formateado: formatNumero(row.numero),
      texto: (row.texto || '').trim() || 'Sin texto de pregunta',
      detalle_alerta: buildDetalleAlerta(row),
      estado: normalizeEstadoPregunta(row.estado),
      complejidad: normalizeComplejidadPregunta(row.complejidad),
      especialidad_nombre:
        especialidadTexto ||
        (especialidadId
          ? especialidadesMap.get(especialidadId) || 'Sin especialidad'
          : 'Sin especialidad'),
    };
  });
};

export const updatePreguntaById = async (
  preguntaId: number,
  payload: UpdatePreguntaPayload
): Promise<void> => {
  const updatePayload: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'estado')) {
    updatePayload.estado = payload.estado ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'complejidad')) {
    updatePayload.complejidad = payload.complejidad ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'encargado_persona_id')) {
    updatePayload.encargado_persona_id = payload.encargado_persona_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'especialidad_id')) {
    updatePayload.especialidad_id = payload.especialidad_id ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'estrategia')) {
    updatePayload.estrategia = payload.estrategia ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'respuesta_ia')) {
    updatePayload.respuesta_ia = payload.respuesta_ia ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  const { error } = await supabase
    .from('preguntas')
    .update(updatePayload)
    .eq('id', preguntaId);

  if (error) {
    if (isMissingGestionColumnsError(error)) {
      throw new Error(
        'Faltan columnas de gestión en la tabla preguntas. Ejecuta la migración sql/20260308_agregar_campos_gestion_preguntas.sql.'
      );
    }
    throw error;
  }
};

