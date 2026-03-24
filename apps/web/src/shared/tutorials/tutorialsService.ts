import { AreaId, AREAS } from '@contracts/areas';
import { supabase } from '@shared/api-client/supabase';

export type TutorialVideoProvider = 'youtube' | 'vimeo' | 'direct' | 'external';

export interface TutorialVideo {
  id: string;
  titulo: string;
  descripcion: string;
  modulo: string;
  moduleKey: string;
  necesitaPermisos: boolean;
  url: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  provider: TutorialVideoProvider;
  orden: number;
}

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeCompactText = (value: string): string =>
  normalizeText(value).replace(/[\s_-]+/g, '');

const getStringValue = (row: Record<string, any>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const normalizeVideoUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

const parseNeedsPermissionsValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = `${value ?? ''}`.trim().toLowerCase();
  if (!normalized) {
    // Valor por defecto seguro: requiere permisos.
    return true;
  }

  if (['false', 'f', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  if (['true', 't', '1', 'si', 'sí', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  return true;
};

const getNumberValue = (row: Record<string, any>, keys: string[], fallback = Number.MAX_SAFE_INTEGER): number => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
};

const isTutorialActive = (row: Record<string, any>): boolean => {
  const activeValue = row.activo ?? row.active ?? row.is_active;
  if (typeof activeValue === 'boolean') {
    return activeValue;
  }

  const estado = `${row.estado ?? ''}`.trim().toLowerCase();
  if (!estado) {
    return true;
  }

  return !['inactivo', 'inactive', 'deshabilitado', 'disabled', '0'].includes(estado);
};

const getYoutubeVideoId = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      const pathId = url.pathname.split('/').filter(Boolean)[0];
      return pathId || null;
    }

    if (hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/watch')) {
        return url.searchParams.get('v');
      }

      if (url.pathname.startsWith('/embed/')) {
        const pathId = url.pathname.split('/').filter(Boolean)[1];
        return pathId || null;
      }

      if (url.pathname.startsWith('/shorts/')) {
        const pathId = url.pathname.split('/').filter(Boolean)[1];
        return pathId || null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const getVimeoVideoId = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    if (!hostname.includes('vimeo.com')) {
      return null;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const lastSegment = segments[segments.length - 1];
    return /^\d+$/.test(lastSegment) ? lastSegment : null;
  } catch {
    return null;
  }
};

const detectProvider = (rawUrl: string): TutorialVideoProvider => {
  const lower = rawUrl.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'youtube';
  }

  if (lower.includes('vimeo.com')) {
    return 'vimeo';
  }

  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(lower)) {
    return 'direct';
  }

  return 'external';
};

const resolveEmbedUrl = (rawUrl: string, provider: TutorialVideoProvider): string | null => {
  if (!rawUrl) return null;

  if (provider === 'youtube') {
    const id = getYoutubeVideoId(rawUrl);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (provider === 'vimeo') {
    const id = getVimeoVideoId(rawUrl);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  if (provider === 'direct') {
    return rawUrl;
  }

  return null;
};

const getAreaModuleAliases = (areaId: AreaId): string[] => {
  const aliasesByArea: Record<AreaId, string[]> = {
    [AreaId.ACREDITACION]: ['acreditacion', 'acreditaciones'],
    [AreaId.PROVEEDORES]: ['proveedor', 'proveedores'],
    [AreaId.PERSONAS]: ['persona', 'personas'],
    [AreaId.ADENDAS]: ['adenda', 'adendas'],
    [AreaId.FINANZAS]: ['finanza', 'finanzas'],
    [AreaId.OPERACIONES]: ['operacion', 'operaciones'],
  };

  const area = AREAS[areaId];
  const dynamicAliases = [area.id, area.name, area.displayName];
  return [...aliasesByArea[areaId], ...dynamicAliases]
    .filter(Boolean)
    .map((alias) => normalizeCompactText(alias));
};

const matchesAreaModule = (tutorialModulo: string, areaId: AreaId): boolean => {
  const moduloNormalized = normalizeCompactText(tutorialModulo);
  if (!moduloNormalized) {
    return false;
  }

  const aliases = getAreaModuleAliases(areaId);
  return aliases.some((alias) => moduloNormalized === alias || moduloNormalized.includes(alias));
};

const mapRowToTutorial = (row: Record<string, any>): TutorialVideo | null => {
  if (!isTutorialActive(row)) {
    return null;
  }

  const modulo = getStringValue(row, ['modulo', 'module', 'area', 'modulo_nombre', 'nombre_modulo']);
  const titulo = getStringValue(row, ['titulo', 'title', 'nombre', 'nombre_video', 'titulo_video']);
  const descripcion = getStringValue(row, ['descripcion', 'description', 'detalle', 'resumen']);
  const url = getStringValue(row, [
    'url_video',
    'video_url',
    'url',
    'link',
    'enlace',
    'youtube_url',
    'video',
    'archivo_url',
  ]);

  if (!modulo || !titulo || !url) {
    return null;
  }

  const normalizedUrl = normalizeVideoUrl(url);
  const provider = detectProvider(normalizedUrl);
  const necesitaPermisos = parseNeedsPermissionsValue(
    row.necesita_permisos ?? row.requires_permissions ?? row.requiere_permiso
  );

  return {
    id: `${row.id ?? row.tutorial_id ?? row.id_tutorial ?? url}`,
    titulo,
    descripcion,
    modulo,
    moduleKey: normalizeCompactText(modulo),
    necesitaPermisos,
    url: normalizedUrl,
    embedUrl: resolveEmbedUrl(normalizedUrl, provider),
    thumbnailUrl: getStringValue(row, ['miniatura_url', 'thumbnail_url', 'imagen_url', 'poster_url']) || null,
    provider,
    orden: getNumberValue(row, ['orden', 'order', 'prioridad', 'position'], Number.MAX_SAFE_INTEGER),
  };
};

export const fetchTutorialVideos = async (): Promise<TutorialVideo[]> => {
  const { data, error } = await supabase.from('dim_tutorial_video').select('*');

  if (error) {
    console.error('Error fetching tutorial videos:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data
    .map((row) => mapRowToTutorial(row as Record<string, any>))
    .filter((video): video is TutorialVideo => Boolean(video))
    .sort((a, b) => {
      if (a.orden !== b.orden) {
        return a.orden - b.orden;
      }
      return a.titulo.localeCompare(b.titulo, 'es');
    });
};

export const fetchTutorialVideosByArea = async (areaId: AreaId): Promise<TutorialVideo[]> => {
  const videos = await fetchTutorialVideos();
  return videos.filter((video) => matchesAreaModule(video.modulo, areaId));
};
