import { supabase } from '@shared/api-client/supabase';

export interface PromptCatalogItem {
  id: string;
  nombre_prompt: string;
  prompt: string;
  descripcion: string | null;
  version: number;
  activo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PromptCatalogInput {
  nombre_prompt: string;
  prompt: string;
  descripcion?: string | null;
  version: number;
  activo?: boolean;
}

const PROMPT_SELECT_FIELDS =
  'id,nombre_prompt,prompt,descripcion,version,activo,created_at,updated_at';

const sanitizeVersion = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(parsed));
    }
  }

  return 1;
};

const mapPromptCatalogItem = (row: any): PromptCatalogItem => ({
  id: typeof row?.id === 'string' ? row.id : '',
  nombre_prompt: typeof row?.nombre_prompt === 'string' ? row.nombre_prompt : '',
  prompt: typeof row?.prompt === 'string' ? row.prompt : '',
  descripcion: typeof row?.descripcion === 'string' ? row.descripcion : null,
  version: sanitizeVersion(row?.version),
  activo: typeof row?.activo === 'boolean' ? row.activo : true,
  created_at: typeof row?.created_at === 'string' ? row.created_at : null,
  updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
});

const sanitizePromptInput = (input: PromptCatalogInput): PromptCatalogInput => {
  const nombrePrompt = input.nombre_prompt.trim();
  const prompt = input.prompt.trim();
  const descripcion = typeof input.descripcion === 'string' ? input.descripcion.trim() : '';
  const version = sanitizeVersion(input.version);

  if (!nombrePrompt) {
    throw new Error('Debes ingresar un nombre de prompt.');
  }

  if (!prompt) {
    throw new Error('Debes ingresar el contenido del prompt.');
  }

  return {
    nombre_prompt: nombrePrompt,
    prompt,
    descripcion: descripcion || null,
    version,
    activo: input.activo ?? true,
  };
};

export const fetchPromptCatalog = async (): Promise<PromptCatalogItem[]> => {
  const { data, error } = await supabase
    .from('dim_prompt')
    .select(PROMPT_SELECT_FIELDS)
    .order('updated_at', { ascending: false })
    .order('nombre_prompt', { ascending: true });

  if (error) {
    console.error('Error fetching dim_prompt:', error);
    throw error;
  }

  return (data || [])
    .map(mapPromptCatalogItem)
    .filter((item) => Boolean(item.id) && Boolean(item.nombre_prompt));
};

export const fetchLatestActivePromptByName = async (
  nombrePrompt: string
): Promise<PromptCatalogItem | null> => {
  const normalized = nombrePrompt.trim();
  if (!normalized) {
    throw new Error('Debes indicar un nombre de prompt.');
  }

  const { data, error } = await supabase
    .from('dim_prompt')
    .select(PROMPT_SELECT_FIELDS)
    .eq('activo', true)
    .ilike('nombre_prompt', normalized)
    .order('version', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest active dim_prompt:', error);
    throw error;
  }

  return data ? mapPromptCatalogItem(data) : null;
};

export const createPromptCatalogItem = async (
  input: PromptCatalogInput
): Promise<PromptCatalogItem> => {
  const payload = sanitizePromptInput(input);

  const { data, error } = await supabase
    .from('dim_prompt')
    .insert([
      {
        nombre_prompt: payload.nombre_prompt,
        prompt: payload.prompt,
        descripcion: payload.descripcion,
        version: payload.version,
        activo: payload.activo,
      },
    ])
    .select(PROMPT_SELECT_FIELDS)
    .single();

  if (error) {
    console.error('Error creating dim_prompt:', error);
    throw error;
  }

  return mapPromptCatalogItem(data);
};

export const updatePromptCatalogItem = async (
  id: string,
  input: PromptCatalogInput
): Promise<PromptCatalogItem> => {
  const promptId = id.trim();
  if (!promptId) {
    throw new Error('ID invalido para actualizar prompt.');
  }

  const payload = sanitizePromptInput(input);

  const { data, error } = await supabase
    .from('dim_prompt')
    .update({
      nombre_prompt: payload.nombre_prompt,
      prompt: payload.prompt,
      descripcion: payload.descripcion,
      version: payload.version,
      activo: payload.activo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', promptId)
    .select(PROMPT_SELECT_FIELDS)
    .single();

  if (error) {
    console.error('Error updating dim_prompt:', error);
    throw error;
  }

  return mapPromptCatalogItem(data);
};

export const deletePromptCatalogItem = async (id: string): Promise<void> => {
  const promptId = id.trim();
  if (!promptId) {
    throw new Error('ID invalido para eliminar prompt.');
  }

  const { error } = await supabase.from('dim_prompt').delete().eq('id', promptId);

  if (error) {
    console.error('Error deleting dim_prompt:', error);
    throw error;
  }
};
