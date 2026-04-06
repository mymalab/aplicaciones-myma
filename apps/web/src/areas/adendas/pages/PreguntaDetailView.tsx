import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildEstrategiaPromptContext,
  fetchPreguntaById,
  fetchPreguntasCatalogos,
  generateEstrategiaFromNotebookChat,
  getAdjuntosDescripcion,
  normalizeComplejidadPregunta,
  normalizeEstadoPregunta,
  updatePreguntaById,
} from '../services/preguntasService';
import type {
  CatalogoEspecialidad,
  CatalogoPersona,
  ComplejidadPregunta,
  EstadoPregunta,
  PreguntaAdjunto,
  PreguntaGestion,
  UpdatePreguntaPayload,
} from '../types';
import { adendasGestion, adendasList } from '../utils/routes';
import {
  fetchPromptCatalog,
  type PromptCatalogItem as CatalogPromptItem,
} from '../services/promptCatalogService';

interface DraftPregunta {
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
  encargado_persona_id: number | null;
  especialidad_id: number | null;
  fecha_compromiso: string;
  estrategia: string;
  respuesta_ia: string;
  respuesta_experto_ia: string;
}

const toDateInputValue = (value: string | null): string => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const datePart = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDraftFromPregunta = (pregunta: PreguntaGestion): DraftPregunta => ({
  estado: normalizeEstadoPregunta(pregunta.estado),
  complejidad: normalizeComplejidadPregunta(pregunta.complejidad),
  encargado_persona_id: pregunta.encargado_persona_id,
  especialidad_id: pregunta.especialidad_id,
  fecha_compromiso: toDateInputValue(pregunta.fecha_compromiso),
  estrategia: pregunta.estrategia || '',
  respuesta_ia: pregunta.respuesta_ia || '',
  respuesta_experto_ia: pregunta.respuesta_experto_ia || '',
});

const countWords = (value: string | null | undefined): number => {
  if (!value) return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  return trimmed.split(/\s+/).length;
};

const formatWordCount = (count: number): string => {
  return `${count} ${count === 1 ? 'palabra' : 'palabras'}`;
};

const DEFAULT_ESTRATEGIA_PROMPT_NAME = 'Generador de estructura de respuesta';
const DEFAULT_RESPUESTA_PROMPT_NAME = 'Generador de estructura de respuesta';
const DEFAULT_RESPUESTA_EXPERTO_PROMPT_NAME = 'Generador de estructura de respuesta';

const normalizePromptName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const sortPromptOptions = (items: CatalogPromptItem[]): CatalogPromptItem[] => {
  return [...items].sort((a, b) => {
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }

    const byName = a.nombre_prompt.localeCompare(b.nombre_prompt, 'es', {
      sensitivity: 'base',
    });
    if (byName !== 0) {
      return byName;
    }

    if (a.version !== b.version) {
      return b.version - a.version;
    }

    return (b.updated_at || '').localeCompare(a.updated_at || '');
  });
};

const findDefaultPromptOption = (
  items: CatalogPromptItem[]
): CatalogPromptItem | null => {
  const targetName = normalizePromptName(DEFAULT_ESTRATEGIA_PROMPT_NAME);
  const matches = items.filter(
    (item) =>
      item.activo &&
      normalizePromptName(item.nombre_prompt) === targetName
  );

  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((a, b) => {
    if (a.version !== b.version) {
      return b.version - a.version;
    }
    return (b.updated_at || '').localeCompare(a.updated_at || '');
  })[0];
};

const getPromptOptionLabel = (item: CatalogPromptItem): string => {
  return `${item.nombre_prompt} v${item.version}${item.activo ? '' : ' (Inactivo)'}`;
};

const PreguntaDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma, preguntaId } = useParams<{ codigoMyma?: string; preguntaId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiRespuestaMessage, setAiRespuestaMessage] = useState<string | null>(null);
  const [aiRespuestaExpertoMessage, setAiRespuestaExpertoMessage] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState<PreguntaGestion | null>(null);
  const [personas, setPersonas] = useState<CatalogoPersona[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogoEspecialidad[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [draft, setDraft] = useState<DraftPregunta | null>(null);
  const [selectedAdjunto, setSelectedAdjunto] = useState<PreguntaAdjunto | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [loadingPromptPreview, setLoadingPromptPreview] = useState(false);
  const [promptPreview, setPromptPreview] = useState('');
  const [promptPreviewPromptSection, setPromptPreviewPromptSection] = useState('');
  const [promptPreviewQuestionSection, setPromptPreviewQuestionSection] = useState('');
  const [promptPreviewError, setPromptPreviewError] = useState<string | null>(null);
  const [promptPreviewName, setPromptPreviewName] = useState(DEFAULT_ESTRATEGIA_PROMPT_NAME);
  const [promptPreviewVersion, setPromptPreviewVersion] = useState<number | null>(null);
  const [promptPreviewUsingCatalog, setPromptPreviewUsingCatalog] = useState(false);
  const [showRespuestaPromptPreview, setShowRespuestaPromptPreview] = useState(false);
  const [loadingRespuestaPromptPreview, setLoadingRespuestaPromptPreview] = useState(false);
  const [respuestaPromptPreview, setRespuestaPromptPreview] = useState('');
  const [respuestaPromptPreviewPromptSection, setRespuestaPromptPreviewPromptSection] = useState(
    ''
  );
  const [respuestaPromptPreviewQuestionSection, setRespuestaPromptPreviewQuestionSection] =
    useState('');
  const [respuestaPromptPreviewStrategySection, setRespuestaPromptPreviewStrategySection] =
    useState('');
  const [respuestaPromptPreviewError, setRespuestaPromptPreviewError] = useState<string | null>(null);
  const [respuestaPromptPreviewName, setRespuestaPromptPreviewName] = useState(
    DEFAULT_RESPUESTA_PROMPT_NAME
  );
  const [respuestaPromptPreviewVersion, setRespuestaPromptPreviewVersion] = useState<number | null>(
    null
  );
  const [respuestaPromptPreviewUsingCatalog, setRespuestaPromptPreviewUsingCatalog] =
    useState(false);
  const [showRespuestaExpertoPromptPreview, setShowRespuestaExpertoPromptPreview] = useState(false);
  const [loadingRespuestaExpertoPromptPreview, setLoadingRespuestaExpertoPromptPreview] =
    useState(false);
  const [respuestaExpertoPromptPreview, setRespuestaExpertoPromptPreview] = useState('');
  const [respuestaExpertoPromptPreviewPromptSection, setRespuestaExpertoPromptPreviewPromptSection] =
    useState('');
  const [respuestaExpertoPromptPreviewQuestionSection, setRespuestaExpertoPromptPreviewQuestionSection] =
    useState('');
  const [respuestaExpertoPromptPreviewStrategySection, setRespuestaExpertoPromptPreviewStrategySection] =
    useState('');
  const [respuestaExpertoPromptPreviewError, setRespuestaExpertoPromptPreviewError] =
    useState<string | null>(null);
  const [respuestaExpertoPromptPreviewName, setRespuestaExpertoPromptPreviewName] = useState(
    DEFAULT_RESPUESTA_EXPERTO_PROMPT_NAME
  );
  const [respuestaExpertoPromptPreviewVersion, setRespuestaExpertoPromptPreviewVersion] =
    useState<number | null>(null);
  const [respuestaExpertoPromptPreviewUsingCatalog, setRespuestaExpertoPromptPreviewUsingCatalog] =
    useState(false);
  const [promptCatalogOptions, setPromptCatalogOptions] = useState<CatalogPromptItem[]>([]);
  const [selectedPromptCatalogId, setSelectedPromptCatalogId] = useState('');
  const [selectedRespuestaPromptCatalogId, setSelectedRespuestaPromptCatalogId] = useState('');
  const [selectedRespuestaExpertoPromptCatalogId, setSelectedRespuestaExpertoPromptCatalogId] =
    useState('');
  const [loadingPromptCatalogOptions, setLoadingPromptCatalogOptions] = useState(false);
  const [promptCatalogOptionsError, setPromptCatalogOptionsError] = useState<string | null>(null);
  const [generatingRespuestaIa, setGeneratingRespuestaIa] = useState(false);
  const [generatingRespuestaExpertoIa, setGeneratingRespuestaExpertoIa] = useState(false);

  const preguntaIdNumber = useMemo(() => {
    const parsed = Number(preguntaId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [preguntaId]);

  const selectedPromptOption = useMemo(() => {
    return (
      promptCatalogOptions.find((item) => item.id === selectedPromptCatalogId) || null
    );
  }, [promptCatalogOptions, selectedPromptCatalogId]);

  const selectedRespuestaPromptOption = useMemo(() => {
    return (
      promptCatalogOptions.find((item) => item.id === selectedRespuestaPromptCatalogId) || null
    );
  }, [promptCatalogOptions, selectedRespuestaPromptCatalogId]);

  const selectedRespuestaExpertoPromptOption = useMemo(() => {
    return (
      promptCatalogOptions.find((item) => item.id === selectedRespuestaExpertoPromptCatalogId) ||
      null
    );
  }, [promptCatalogOptions, selectedRespuestaExpertoPromptCatalogId]);

  const currentPromptBadgeLabel = useMemo(() => {
    if (selectedPromptOption) {
      return `${selectedPromptOption.nombre_prompt} v${selectedPromptOption.version}`;
    }

    if (promptPreviewUsingCatalog) {
      return `${promptPreviewName}${promptPreviewVersion ? ` v${promptPreviewVersion}` : ''}`;
    }

    return `${DEFAULT_ESTRATEGIA_PROMPT_NAME} (base)`;
  }, [
    selectedPromptOption,
    promptPreviewName,
    promptPreviewUsingCatalog,
    promptPreviewVersion,
  ]);

  const currentRespuestaPromptBadgeLabel = useMemo(() => {
    if (selectedRespuestaPromptOption) {
      return `${selectedRespuestaPromptOption.nombre_prompt} v${selectedRespuestaPromptOption.version}`;
    }

    if (respuestaPromptPreviewUsingCatalog) {
      return `${respuestaPromptPreviewName}${
        respuestaPromptPreviewVersion ? ` v${respuestaPromptPreviewVersion}` : ''
      }`;
    }

    return `${DEFAULT_RESPUESTA_PROMPT_NAME} (base)`;
  }, [
    selectedRespuestaPromptOption,
    respuestaPromptPreviewName,
    respuestaPromptPreviewUsingCatalog,
    respuestaPromptPreviewVersion,
  ]);

  const currentRespuestaExpertoPromptBadgeLabel = useMemo(() => {
    if (selectedRespuestaExpertoPromptOption) {
      return `${selectedRespuestaExpertoPromptOption.nombre_prompt} v${selectedRespuestaExpertoPromptOption.version}`;
    }

    if (respuestaExpertoPromptPreviewUsingCatalog) {
      return `${respuestaExpertoPromptPreviewName}${
        respuestaExpertoPromptPreviewVersion ? ` v${respuestaExpertoPromptPreviewVersion}` : ''
      }`;
    }

    return `${DEFAULT_RESPUESTA_EXPERTO_PROMPT_NAME} (base)`;
  }, [
    selectedRespuestaExpertoPromptOption,
    respuestaExpertoPromptPreviewName,
    respuestaExpertoPromptPreviewUsingCatalog,
    respuestaExpertoPromptPreviewVersion,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadPregunta = async () => {
      if (!preguntaIdNumber) {
        if (isMounted) {
          setError('El identificador de la pregunta no es válido.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const catalogos = await fetchPreguntasCatalogos();
        const { pregunta: data } = await fetchPreguntaById(preguntaIdNumber, catalogos);

        if (!isMounted) return;

        setPersonas(catalogos.personas);
        setEspecialidades(catalogos.especialidades);

        if (!data) {
          setPregunta(null);
          setDraft(null);
          setError('No se encontró la pregunta solicitada.');
          return;
        }

        setPregunta(data);
        setDraft(buildDraftFromPregunta(data));
      } catch (err: any) {
        if (!isMounted) return;

        console.error('Error loading pregunta detail:', err);
        setError(err?.message || 'No fue posible cargar la pregunta.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPregunta();

    return () => {
      isMounted = false;
    };
  }, [preguntaIdNumber]);

  const loadPromptCatalogOptions = async (): Promise<CatalogPromptItem[]> => {
    try {
      setLoadingPromptCatalogOptions(true);
      setPromptCatalogOptionsError(null);

      const data = await fetchPromptCatalog();
      const sorted = sortPromptOptions(data);
      setPromptCatalogOptions(sorted);

      return sorted;
    } catch (err: any) {
      console.error('Error loading prompt catalog options:', err);
      setPromptCatalogOptionsError(
        err?.message || 'No fue posible cargar los prompts del catalogo.'
      );
      setPromptCatalogOptions([]);
      return [];
    } finally {
      setLoadingPromptCatalogOptions(false);
    }
  };

  const buildPreviewWithPromptSelection = async (
    preguntaTexto: string,
    promptOption: CatalogPromptItem | null
  ) => {
    const promptContext = await buildEstrategiaPromptContext(
      preguntaTexto,
      promptOption
        ? {
            promptCatalogoOverride: promptOption.prompt,
            promptNombreOverride: promptOption.nombre_prompt,
            promptVersionOverride: promptOption.version,
          }
        : {}
    );

    setPromptPreviewName(promptContext.promptNombreBase);
    setPromptPreviewVersion(promptContext.promptVersion);
    setPromptPreviewUsingCatalog(Boolean(promptContext.promptCatalogo));
    setPromptPreviewPromptSection((promptContext.promptCatalogo || '').trim());
    setPromptPreviewQuestionSection(preguntaTexto.trim());
    setPromptPreview(promptContext.promptCompleto);
  };

  const buildPreviewWithRespuestaPromptSelection = async (
    payloadInput: string,
    preguntaTexto: string,
    estrategiaTexto: string,
    promptOption: CatalogPromptItem | null
  ) => {
    const promptContext = await buildEstrategiaPromptContext(
      payloadInput,
      promptOption
        ? {
            promptCatalogoOverride: promptOption.prompt,
            promptNombreOverride: promptOption.nombre_prompt,
            promptVersionOverride: promptOption.version,
          }
        : {}
    );

    setRespuestaPromptPreviewName(promptContext.promptNombreBase);
    setRespuestaPromptPreviewVersion(promptContext.promptVersion);
    setRespuestaPromptPreviewUsingCatalog(Boolean(promptContext.promptCatalogo));
    setRespuestaPromptPreviewPromptSection((promptContext.promptCatalogo || '').trim());
    setRespuestaPromptPreviewQuestionSection(preguntaTexto.trim());
    setRespuestaPromptPreviewStrategySection(estrategiaTexto.trim());
    setRespuestaPromptPreview(promptContext.promptCompleto);
  };

  const buildPreviewWithRespuestaExpertoPromptSelection = async (
    payloadInput: string,
    preguntaTexto: string,
    estrategiaTexto: string,
    promptOption: CatalogPromptItem | null
  ) => {
    const promptContext = await buildEstrategiaPromptContext(
      payloadInput,
      promptOption
        ? {
            promptCatalogoOverride: promptOption.prompt,
            promptNombreOverride: promptOption.nombre_prompt,
            promptVersionOverride: promptOption.version,
          }
        : {}
    );

    setRespuestaExpertoPromptPreviewName(promptContext.promptNombreBase);
    setRespuestaExpertoPromptPreviewVersion(promptContext.promptVersion);
    setRespuestaExpertoPromptPreviewUsingCatalog(Boolean(promptContext.promptCatalogo));
    setRespuestaExpertoPromptPreviewPromptSection((promptContext.promptCatalogo || '').trim());
    setRespuestaExpertoPromptPreviewQuestionSection(preguntaTexto.trim());
    setRespuestaExpertoPromptPreviewStrategySection(estrategiaTexto.trim());
    setRespuestaExpertoPromptPreview(promptContext.promptCompleto);
  };

  const buildRespuestaIaPayloadInput = (): {
    preguntaTexto: string;
    estrategiaTexto: string;
    payloadInput: string;
  } | null => {
    const preguntaTexto = (pregunta?.texto || '').trim();
    const estrategiaTexto = (draft?.estrategia || pregunta?.estrategia || '').trim();
    if (!preguntaTexto || preguntaTexto === '-' || !estrategiaTexto) {
      return null;
    }

    return {
      preguntaTexto,
      estrategiaTexto,
      payloadInput: ['Pregunta:', preguntaTexto, '', 'Estrategia:', estrategiaTexto].join('\n'),
    };
  };

  useEffect(() => {
    let isMounted = true;

    const initializePromptSelection = async () => {
      if (!pregunta) return;

      const options = await loadPromptCatalogOptions();
      if (!isMounted) return;

      const selectedExists = options.some((item) => item.id === selectedPromptCatalogId);
      const selectedRespuestaExists = options.some(
        (item) => item.id === selectedRespuestaPromptCatalogId
      );
      const selectedRespuestaExpertoExists = options.some(
        (item) => item.id === selectedRespuestaExpertoPromptCatalogId
      );
      const defaultOption = findDefaultPromptOption(options);
      const nextSelectedId = selectedExists ? selectedPromptCatalogId : defaultOption?.id || '';
      const nextSelectedRespuestaId = selectedRespuestaExists
        ? selectedRespuestaPromptCatalogId
        : defaultOption?.id || '';
      const nextSelectedRespuestaExpertoId = selectedRespuestaExpertoExists
        ? selectedRespuestaExpertoPromptCatalogId
        : defaultOption?.id || '';

      if (nextSelectedId !== selectedPromptCatalogId) {
        setSelectedPromptCatalogId(nextSelectedId);
      }
      if (nextSelectedRespuestaId !== selectedRespuestaPromptCatalogId) {
        setSelectedRespuestaPromptCatalogId(nextSelectedRespuestaId);
      }
      if (nextSelectedRespuestaExpertoId !== selectedRespuestaExpertoPromptCatalogId) {
        setSelectedRespuestaExpertoPromptCatalogId(nextSelectedRespuestaExpertoId);
      }

      const effectiveOption = options.find((item) => item.id === nextSelectedId) || null;
      const effectiveRespuestaOption =
        options.find((item) => item.id === nextSelectedRespuestaId) || null;
      const effectiveRespuestaExpertoOption =
        options.find((item) => item.id === nextSelectedRespuestaExpertoId) || null;
      if (effectiveOption) {
        setPromptPreviewName(effectiveOption.nombre_prompt);
        setPromptPreviewVersion(effectiveOption.version);
        setPromptPreviewUsingCatalog(true);
      } else {
        setPromptPreviewName(DEFAULT_ESTRATEGIA_PROMPT_NAME);
        setPromptPreviewVersion(null);
        setPromptPreviewUsingCatalog(false);
      }

      if (effectiveRespuestaOption) {
        setRespuestaPromptPreviewName(effectiveRespuestaOption.nombre_prompt);
        setRespuestaPromptPreviewVersion(effectiveRespuestaOption.version);
        setRespuestaPromptPreviewUsingCatalog(true);
      } else {
        setRespuestaPromptPreviewName(DEFAULT_RESPUESTA_PROMPT_NAME);
        setRespuestaPromptPreviewVersion(null);
        setRespuestaPromptPreviewUsingCatalog(false);
      }

      if (effectiveRespuestaExpertoOption) {
        setRespuestaExpertoPromptPreviewName(effectiveRespuestaExpertoOption.nombre_prompt);
        setRespuestaExpertoPromptPreviewVersion(effectiveRespuestaExpertoOption.version);
        setRespuestaExpertoPromptPreviewUsingCatalog(true);
      } else {
        setRespuestaExpertoPromptPreviewName(DEFAULT_RESPUESTA_EXPERTO_PROMPT_NAME);
        setRespuestaExpertoPromptPreviewVersion(null);
        setRespuestaExpertoPromptPreviewUsingCatalog(false);
      }
    };

    initializePromptSelection();

    return () => {
      isMounted = false;
    };
  }, [pregunta?.id]);

  const handleBack = () => {
    if (codigoMyma) {
      navigate(adendasGestion(codigoMyma));
      return;
    }

    navigate(adendasList());
  };

  const handleStartEdit = () => {
    if (!pregunta) return;
    setDraft(buildDraftFromPregunta(pregunta));
    setIsEditing(true);
    setAiMessage(null);
    setAiRespuestaMessage(null);
    setAiRespuestaExpertoMessage(null);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    if (!pregunta) return;
    setDraft(buildDraftFromPregunta(pregunta));
    setIsEditing(false);
    setAiMessage(null);
    setAiRespuestaMessage(null);
    setAiRespuestaExpertoMessage(null);
  };

  const handleSave = async () => {
    if (!pregunta || !draft) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: UpdatePreguntaPayload = {};
      const originalEstado = normalizeEstadoPregunta(pregunta.estado);
      const originalComplejidad = normalizeComplejidadPregunta(pregunta.complejidad);

      if (draft.estado !== originalEstado) {
        payload.estado = draft.estado;
      }

      if (draft.complejidad !== originalComplejidad) {
        payload.complejidad = draft.complejidad;
      }

      if (draft.encargado_persona_id !== pregunta.encargado_persona_id) {
        payload.encargado_persona_id = draft.encargado_persona_id;
      }

      if (draft.especialidad_id !== pregunta.especialidad_id) {
        payload.especialidad_id = draft.especialidad_id;
      }

      const originalFechaCompromiso = toDateInputValue(pregunta.fecha_compromiso);
      const draftFechaCompromiso = draft.fecha_compromiso.trim();
      if (draftFechaCompromiso !== originalFechaCompromiso) {
        payload.fecha_compromiso = draftFechaCompromiso || null;
      }

      const originalEstrategia = (pregunta.estrategia || '').trim();
      const originalRespuestaIa = (pregunta.respuesta_ia || '').trim();
      const originalRespuestaExpertoIa = (pregunta.respuesta_experto_ia || '').trim();
      const draftEstrategia = draft.estrategia.trim();
      const draftRespuestaIa = draft.respuesta_ia.trim();
      const draftRespuestaExpertoIa = draft.respuesta_experto_ia.trim();

      if (draftEstrategia !== originalEstrategia) {
        payload.estrategia = draftEstrategia || null;
      }

      if (draftRespuestaIa !== originalRespuestaIa) {
        payload.respuesta_ia = draftRespuestaIa || null;
      }

      if (draftRespuestaExpertoIa !== originalRespuestaExpertoIa) {
        payload.respuesta_experto_ia = draftRespuestaExpertoIa || null;
      }

      if (Object.keys(payload).length > 0) {
        await updatePreguntaById(pregunta.id, payload);
      }

      const { pregunta: refreshed } = await fetchPreguntaById(pregunta.id, {
        personas,
        especialidades,
      });

      if (!refreshed) {
        setError('La pregunta fue actualizada, pero no se pudo recargar el detalle.');
        setIsEditing(false);
        return;
      }

      setPregunta(refreshed);
      setDraft(buildDraftFromPregunta(refreshed));
      setIsEditing(false);
      setAiMessage(null);
      setAiRespuestaMessage(null);
      setAiRespuestaExpertoMessage(null);
      setSuccessMessage('Cambios guardados correctamente.');
    } catch (err: any) {
      console.error('Error saving pregunta:', err);
      setError(err?.message || 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!pregunta || !draft) return;

    const adendaId = pregunta.adenda_id;
    if (!adendaId || !Number.isFinite(adendaId)) {
      setError('La pregunta no está asociada a una adenda válida.');
      return;
    }

    const preguntaTexto = (pregunta.texto || '').trim();
    if (!preguntaTexto || preguntaTexto === '-') {
      setError('La pregunta no tiene texto para generar la estrategia con IA.');
      return;
    }

    setGeneratingStrategy(true);
    setError(null);
    setSuccessMessage(null);
    setAiMessage(null);
    setAiRespuestaMessage(null);
    setAiRespuestaExpertoMessage(null);

    try {
      let promptForGeneration = selectedPromptOption;
      if (selectedPromptCatalogId && !promptForGeneration) {
        const reloadedOptions = await loadPromptCatalogOptions();
        promptForGeneration =
          reloadedOptions.find((item) => item.id === selectedPromptCatalogId) || null;
      }

      const answer = await generateEstrategiaFromNotebookChat(
        adendaId,
        preguntaTexto,
        promptForGeneration
          ? {
              promptCatalogoOverride: promptForGeneration.prompt,
              promptNombreOverride: promptForGeneration.nombre_prompt,
              promptVersionOverride: promptForGeneration.version,
            }
          : {}
      );
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              estrategia: answer,
            }
          : prev
      );
      setAiMessage('La IA completó la estrategia. Revisa el texto y luego guarda.');
    } catch (err: any) {
      console.error('Error generating strategy with AI:', err);
      setError(err?.message || 'No fue posible generar la estrategia con IA.');
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleGenerateRespuestaIa = async () => {
    if (!pregunta || !draft) return;

    const adendaId = pregunta.adenda_id;
    if (!adendaId || !Number.isFinite(adendaId)) {
      setError('La pregunta no está asociada a una adenda válida.');
      return;
    }

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setError(
        'Para generar Respuesta IA debes tener pregunta y estrategia en esta sección.'
      );
      return;
    }

    setGeneratingRespuestaIa(true);
    setError(null);
    setSuccessMessage(null);
    setAiMessage(null);
    setAiRespuestaMessage(null);
    setAiRespuestaExpertoMessage(null);

    try {
      let promptForGeneration = selectedRespuestaPromptOption;
      if (selectedRespuestaPromptCatalogId && !promptForGeneration) {
        const reloadedOptions = await loadPromptCatalogOptions();
        promptForGeneration =
          reloadedOptions.find((item) => item.id === selectedRespuestaPromptCatalogId) ||
          null;
      }

      const answer = await generateEstrategiaFromNotebookChat(
        adendaId,
        respuestaPayload.payloadInput,
        promptForGeneration
          ? {
              promptCatalogoOverride: promptForGeneration.prompt,
              promptNombreOverride: promptForGeneration.nombre_prompt,
              promptVersionOverride: promptForGeneration.version,
            }
          : {}
      );

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              respuesta_ia: answer,
            }
          : prev
      );
      setAiRespuestaMessage(
        'La IA completó la respuesta. Revisa el texto y luego guarda.'
      );
    } catch (err: any) {
      console.error('Error generating respuesta IA with AI:', err);
      setError(err?.message || 'No fue posible generar la respuesta IA.');
    } finally {
      setGeneratingRespuestaIa(false);
    }
  };

  const handleGenerateRespuestaExpertoIa = async () => {
    if (!pregunta || !draft) return;

    const adendaId = pregunta.adenda_id;
    if (!adendaId || !Number.isFinite(adendaId)) {
      setError('La pregunta no está asociada a una adenda válida.');
      return;
    }

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setError(
        'Para generar Respuesta con Experto IA debes tener pregunta y estrategia en esta sección.'
      );
      return;
    }

    setGeneratingRespuestaExpertoIa(true);
    setError(null);
    setSuccessMessage(null);
    setAiMessage(null);
    setAiRespuestaMessage(null);
    setAiRespuestaExpertoMessage(null);

    try {
      let promptForGeneration = selectedRespuestaExpertoPromptOption;
      if (selectedRespuestaExpertoPromptCatalogId && !promptForGeneration) {
        const reloadedOptions = await loadPromptCatalogOptions();
        promptForGeneration =
          reloadedOptions.find((item) => item.id === selectedRespuestaExpertoPromptCatalogId) ||
          null;
      }

      const answer = await generateEstrategiaFromNotebookChat(
        adendaId,
        respuestaPayload.payloadInput,
        promptForGeneration
          ? {
              promptCatalogoOverride: promptForGeneration.prompt,
              promptNombreOverride: promptForGeneration.nombre_prompt,
              promptVersionOverride: promptForGeneration.version,
            }
          : {}
      );

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              respuesta_experto_ia: answer,
            }
          : prev
      );
      setAiRespuestaExpertoMessage(
        'La IA completó la respuesta de Experto. Revisa el texto y luego guarda.'
      );
    } catch (err: any) {
      console.error('Error generating respuesta experto IA with AI:', err);
      setError(err?.message || 'No fue posible generar la respuesta con Experto IA.');
    } finally {
      setGeneratingRespuestaExpertoIa(false);
    }
  };

  const handleOpenPromptPreview = async () => {
    if (!pregunta) return;

    const preguntaTexto = (pregunta.texto || '').trim();
    if (!preguntaTexto || preguntaTexto === '-') {
      setError('La pregunta no tiene texto para armar el prompt de IA.');
      return;
    }

    setShowPromptPreview(true);
    setLoadingPromptPreview(true);
    setPromptPreviewError(null);
    setPromptPreview('');
    setPromptPreviewPromptSection('');
    setPromptPreviewQuestionSection('');
    setPromptPreviewVersion(null);
    setPromptPreviewUsingCatalog(false);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();

      const selectedExists = options.some((item) => item.id === selectedPromptCatalogId);
      const defaultOption = findDefaultPromptOption(options);
      const effectiveSelectedId = selectedExists ? selectedPromptCatalogId : defaultOption?.id || '';

      if (effectiveSelectedId !== selectedPromptCatalogId) {
        setSelectedPromptCatalogId(effectiveSelectedId);
      }

      const effectiveOption =
        options.find((item) => item.id === effectiveSelectedId) || null;

      await buildPreviewWithPromptSelection(preguntaTexto, effectiveOption);
    } catch (err: any) {
      console.error('Error loading prompt preview:', err);
      setPromptPreviewError(
        err?.message || 'No fue posible cargar el prompt que se usa para IA.'
      );
    } finally {
      setLoadingPromptPreview(false);
    }
  };

  const handleClosePromptPreview = () => {
    setShowPromptPreview(false);
  };

  const handleOpenRespuestaPromptPreview = async () => {
    if (!pregunta) return;

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setError('Para previsualizar Respuesta IA debes tener pregunta y estrategia.');
      return;
    }

    setShowRespuestaPromptPreview(true);
    setLoadingRespuestaPromptPreview(true);
    setRespuestaPromptPreviewError(null);
    setRespuestaPromptPreview('');
    setRespuestaPromptPreviewPromptSection('');
    setRespuestaPromptPreviewQuestionSection('');
    setRespuestaPromptPreviewStrategySection('');
    setRespuestaPromptPreviewVersion(null);
    setRespuestaPromptPreviewUsingCatalog(false);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();

      const selectedExists = options.some(
        (item) => item.id === selectedRespuestaPromptCatalogId
      );
      const defaultOption = findDefaultPromptOption(options);
      const effectiveSelectedId = selectedExists
        ? selectedRespuestaPromptCatalogId
        : defaultOption?.id || '';

      if (effectiveSelectedId !== selectedRespuestaPromptCatalogId) {
        setSelectedRespuestaPromptCatalogId(effectiveSelectedId);
      }

      const effectiveOption =
        options.find((item) => item.id === effectiveSelectedId) || null;

      await buildPreviewWithRespuestaPromptSelection(
        respuestaPayload.payloadInput,
        respuestaPayload.preguntaTexto,
        respuestaPayload.estrategiaTexto,
        effectiveOption
      );
    } catch (err: any) {
      console.error('Error loading respuesta IA prompt preview:', err);
      setRespuestaPromptPreviewError(
        err?.message ||
          'No fue posible cargar el prompt que se usa para la respuesta IA.'
      );
    } finally {
      setLoadingRespuestaPromptPreview(false);
    }
  };

  const handleCloseRespuestaPromptPreview = () => {
    setShowRespuestaPromptPreview(false);
  };

  const handleOpenRespuestaExpertoPromptPreview = async () => {
    if (!pregunta) return;

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setError('Para previsualizar Respuesta con Experto IA debes tener pregunta y estrategia.');
      return;
    }

    setShowRespuestaExpertoPromptPreview(true);
    setLoadingRespuestaExpertoPromptPreview(true);
    setRespuestaExpertoPromptPreviewError(null);
    setRespuestaExpertoPromptPreview('');
    setRespuestaExpertoPromptPreviewPromptSection('');
    setRespuestaExpertoPromptPreviewQuestionSection('');
    setRespuestaExpertoPromptPreviewStrategySection('');
    setRespuestaExpertoPromptPreviewVersion(null);
    setRespuestaExpertoPromptPreviewUsingCatalog(false);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();

      const selectedExists = options.some(
        (item) => item.id === selectedRespuestaExpertoPromptCatalogId
      );
      const defaultOption = findDefaultPromptOption(options);
      const effectiveSelectedId = selectedExists
        ? selectedRespuestaExpertoPromptCatalogId
        : defaultOption?.id || '';

      if (effectiveSelectedId !== selectedRespuestaExpertoPromptCatalogId) {
        setSelectedRespuestaExpertoPromptCatalogId(effectiveSelectedId);
      }

      const effectiveOption =
        options.find((item) => item.id === effectiveSelectedId) || null;

      await buildPreviewWithRespuestaExpertoPromptSelection(
        respuestaPayload.payloadInput,
        respuestaPayload.preguntaTexto,
        respuestaPayload.estrategiaTexto,
        effectiveOption
      );
    } catch (err: any) {
      console.error('Error loading respuesta experto IA prompt preview:', err);
      setRespuestaExpertoPromptPreviewError(
        err?.message ||
          'No fue posible cargar el prompt que se usa para la respuesta con Experto IA.'
      );
    } finally {
      setLoadingRespuestaExpertoPromptPreview(false);
    }
  };

  const handleCloseRespuestaExpertoPromptPreview = () => {
    setShowRespuestaExpertoPromptPreview(false);
  };

  const handlePromptSelectionChange = async (nextPromptId: string) => {
    setSelectedPromptCatalogId(nextPromptId);

    if (!pregunta) {
      return;
    }

    const preguntaTexto = (pregunta.texto || '').trim();
    if (!preguntaTexto || preguntaTexto === '-') {
      setPromptPreviewError('La pregunta no tiene texto para armar el prompt de IA.');
      return;
    }

    setLoadingPromptPreview(true);
    setPromptPreviewError(null);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();
      const selectedOption = options.find((item) => item.id === nextPromptId) || null;
      await buildPreviewWithPromptSelection(preguntaTexto, selectedOption);
    } catch (err: any) {
      console.error('Error changing prompt selection:', err);
      setPromptPreviewError(
        err?.message || 'No fue posible actualizar la vista previa del prompt.'
      );
    } finally {
      setLoadingPromptPreview(false);
    }
  };

  const handleRespuestaPromptSelectionChange = async (nextPromptId: string) => {
    setSelectedRespuestaPromptCatalogId(nextPromptId);

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setRespuestaPromptPreviewError(
        'Para previsualizar Respuesta IA debes tener pregunta y estrategia.'
      );
      return;
    }

    setLoadingRespuestaPromptPreview(true);
    setRespuestaPromptPreviewError(null);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();
      const selectedOption = options.find((item) => item.id === nextPromptId) || null;
      await buildPreviewWithRespuestaPromptSelection(
        respuestaPayload.payloadInput,
        respuestaPayload.preguntaTexto,
        respuestaPayload.estrategiaTexto,
        selectedOption
      );
    } catch (err: any) {
      console.error('Error changing respuesta IA prompt selection:', err);
      setRespuestaPromptPreviewError(
        err?.message ||
          'No fue posible actualizar la vista previa del prompt de respuesta IA.'
      );
    } finally {
      setLoadingRespuestaPromptPreview(false);
    }
  };

  const handleRespuestaExpertoPromptSelectionChange = async (nextPromptId: string) => {
    setSelectedRespuestaExpertoPromptCatalogId(nextPromptId);

    const respuestaPayload = buildRespuestaIaPayloadInput();
    if (!respuestaPayload) {
      setRespuestaExpertoPromptPreviewError(
        'Para previsualizar Respuesta con Experto IA debes tener pregunta y estrategia.'
      );
      return;
    }

    setLoadingRespuestaExpertoPromptPreview(true);
    setRespuestaExpertoPromptPreviewError(null);

    try {
      const options =
        promptCatalogOptions.length > 0
          ? promptCatalogOptions
          : await loadPromptCatalogOptions();
      const selectedOption = options.find((item) => item.id === nextPromptId) || null;
      await buildPreviewWithRespuestaExpertoPromptSelection(
        respuestaPayload.payloadInput,
        respuestaPayload.preguntaTexto,
        respuestaPayload.estrategiaTexto,
        selectedOption
      );
    } catch (err: any) {
      console.error('Error changing respuesta experto IA prompt selection:', err);
      setRespuestaExpertoPromptPreviewError(
        err?.message ||
          'No fue posible actualizar la vista previa del prompt de respuesta con Experto IA.'
      );
    } finally {
      setLoadingRespuestaExpertoPromptPreview(false);
    }
  };

  const getEstadoColor = (estado: EstadoPregunta) => {
    switch (estado) {
      case 'En revisión':
        return 'bg-gray-100 text-gray-800';
      case 'Pendientes':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completadas':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplejidadColor = (complejidad: ComplejidadPregunta) => {
    switch (complejidad) {
      case 'Baja':
        return 'bg-green-100 text-green-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'Alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoAdjuntoLabel = (tipo: string | null): string => {
    const normalized = (tipo || '').toLowerCase();
    if (normalized === 'figura') return 'Figura';
    if (normalized === 'tabla') return 'Tabla';
    return tipo || 'Adjunto';
  };

  const extractDriveFileId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      const pathnameMatch = parsedUrl.pathname.match(/\/d\/([^/]+)/);
      if (pathnameMatch?.[1]) {
        return pathnameMatch[1];
      }

      const idParam = parsedUrl.searchParams.get('id');
      if (idParam) {
        return idParam;
      }
    } catch {
      const rawMatch = url.match(/\/d\/([^/]+)/);
      if (rawMatch?.[1]) {
        return rawMatch[1];
      }
    }

    return null;
  };

  const getEmbeddedAdjuntoUrl = (adjunto: PreguntaAdjunto): string | null => {
    const rawUrl = adjunto.drive_preview_url || adjunto.drive_web_view_url;
    if (!rawUrl) {
      return null;
    }

    if (!rawUrl.includes('drive.google.com')) {
      return rawUrl;
    }

    if (rawUrl.includes('/preview')) {
      return rawUrl;
    }

    const fileId = extractDriveFileId(rawUrl);
    if (!fileId) {
      return rawUrl;
    }

    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const selectedAdjuntoUrl = useMemo(() => {
    if (!selectedAdjunto) {
      return null;
    }
    return getEmbeddedAdjuntoUrl(selectedAdjunto);
  }, [selectedAdjunto]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando pregunta...</p>
        </div>
      </div>
    );
  }

  if (!pregunta || !draft) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'No se encontró la pregunta'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const estadoUi = normalizeEstadoPregunta(pregunta.estado);
  const complejidadUi = normalizeComplejidadPregunta(pregunta.complejidad);
  const encargadoUi = pregunta.encargado_nombre || 'Sin encargado';
  const especialidadUi = pregunta.especialidad_nombre || 'Sin especialidad';
  const estrategiaTextoActual = isEditing ? draft.estrategia : pregunta.estrategia || '';
  const preguntaWordCount = countWords(pregunta.texto);
  const estrategiaWordCount = countWords(estrategiaTextoActual);

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver a preguntas</span>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-bold text-[#111318]">{pregunta.numero_formateado}</h1>
              <p className="text-sm text-gray-500">ID interno: {pregunta.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 rounded-lg text-sm bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="px-3 py-1.5 rounded-lg text-sm bg-[#059669] text-white hover:bg-[#047857]"
                >
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Estado</label>
              {isEditing ? (
                <select
                  value={draft.estado}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            estado: event.target.value as EstadoPregunta,
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="En revisión">En revisión</option>
                  <option value="Pendientes">Pendientes</option>
                  <option value="Completadas">Completadas</option>
                </select>
              ) : (
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getEstadoColor(estadoUi)}`}>
                  {estadoUi}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Complejidad</label>
              {isEditing ? (
                <select
                  value={draft.complejidad}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            complejidad: event.target.value as ComplejidadPregunta,
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              ) : (
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getComplejidadColor(
                    complejidadUi
                  )}`}
                >
                  {complejidadUi}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Encargado</label>
              {isEditing ? (
                <select
                  value={draft.encargado_persona_id ?? ''}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            encargado_persona_id: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Sin encargado</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-[#111318]">{encargadoUi}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Especialidad</label>
              {isEditing ? (
                <select
                  value={draft.especialidad_id ?? ''}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            especialidad_id: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Sin especialidad</option>
                  {especialidades.map((especialidad) => (
                    <option key={especialidad.id} value={especialidad.id}>
                      {especialidad.nombre_especialidad}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-[#111318]">{especialidadUi}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Fecha compromiso</label>
              {isEditing ? (
                <input
                  type="date"
                  value={draft.fecha_compromiso}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            fecha_compromiso: event.target.value,
                          }
                        : prev
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              ) : (
                <p className="text-sm text-[#111318]">
                  {toDateInputValue(pregunta.fecha_compromiso) || 'Sin fecha'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Capítulo</label>
            <p className="text-sm text-[#111318]">{pregunta.capitulo}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Temas principales</label>
              <p className="text-sm text-[#111318]">{pregunta.temas_principales_texto}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Temas secundarios</label>
              <p className="text-sm text-[#111318]">{pregunta.temas_secundarios_texto}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">
              Pregunta ({formatWordCount(preguntaWordCount)})
            </label>
            <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">{pregunta.texto}</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-500">
                  Estrategia ({formatWordCount(estrategiaWordCount)})
                </label>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Prompt: {currentPromptBadgeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPromptPreview}
                  disabled={loadingPromptPreview}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Ver prompt que usa IA"
                >
                  <span className="material-symbols-outlined text-base leading-none">
                    {loadingPromptPreview ? 'hourglass_top' : 'visibility'}
                  </span>
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateStrategy}
                    disabled={generatingStrategy || saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Generar estrategia con IA"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {generatingStrategy ? 'hourglass_top' : 'smart_toy'}
                    </span>
                    <span>{generatingStrategy ? 'Generando con IA...' : 'Generar con IA'}</span>
                  </button>
                )}
              </div>
            </div>
            {aiMessage && (
              <p className="mb-2 text-xs text-emerald-700">{aiMessage}</p>
            )}
            {isEditing ? (
              <textarea
                rows={4}
                value={draft.estrategia}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          estrategia: event.target.value,
                        }
                      : prev
                  )
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Define la estrategia para abordar esta observación"
              />
            ) : (
              <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">
                {pregunta.estrategia || 'Sin estrategia registrada.'}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-500">Respuesta IA</label>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Prompt: {currentRespuestaPromptBadgeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRespuestaPromptPreview}
                  disabled={loadingRespuestaPromptPreview}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Ver prompt que usa IA para respuesta"
                >
                  <span className="material-symbols-outlined text-base leading-none">
                    {loadingRespuestaPromptPreview ? 'hourglass_top' : 'visibility'}
                  </span>
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateRespuestaIa}
                    disabled={generatingRespuestaIa || saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Generar respuesta IA"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {generatingRespuestaIa ? 'hourglass_top' : 'smart_toy'}
                    </span>
                    <span>
                      {generatingRespuestaIa ? 'Generando con IA...' : 'Generar con IA'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            {aiRespuestaMessage && (
              <p className="mb-2 text-xs text-emerald-700">{aiRespuestaMessage}</p>
            )}
            {isEditing ? (
              <textarea
                rows={5}
                value={draft.respuesta_ia}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          respuesta_ia: event.target.value,
                        }
                      : prev
                  )
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Escribe o ajusta la respuesta IA para esta observación"
              />
            ) : (
              <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">
                {pregunta.respuesta_ia || 'Sin respuesta IA registrada.'}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-500">
                  Respuesta con Experto IA
                </label>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Prompt: {currentRespuestaExpertoPromptBadgeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRespuestaExpertoPromptPreview}
                  disabled={loadingRespuestaExpertoPromptPreview}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Ver prompt que usa IA para respuesta con experto"
                >
                  <span className="material-symbols-outlined text-base leading-none">
                    {loadingRespuestaExpertoPromptPreview ? 'hourglass_top' : 'visibility'}
                  </span>
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateRespuestaExpertoIa}
                    disabled={generatingRespuestaExpertoIa || saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#111318] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Generar respuesta con Experto IA"
                  >
                    <span className="material-symbols-outlined text-base leading-none">
                      {generatingRespuestaExpertoIa ? 'hourglass_top' : 'smart_toy'}
                    </span>
                    <span>
                      {generatingRespuestaExpertoIa ? 'Generando con IA...' : 'Generar con IA'}
                    </span>
                  </button>
                )}
              </div>
            </div>
            {aiRespuestaExpertoMessage && (
              <p className="mb-2 text-xs text-emerald-700">{aiRespuestaExpertoMessage}</p>
            )}
            {isEditing ? (
              <textarea
                rows={5}
                value={draft.respuesta_experto_ia}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          respuesta_experto_ia: event.target.value,
                        }
                      : prev
                  )
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Escribe o ajusta la respuesta con Experto IA para esta observación"
              />
            ) : (
              <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">
                {pregunta.respuesta_experto_ia || 'Sin respuesta con Experto IA registrada.'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Adjuntos</label>
            <p className="text-xs text-gray-500 mb-3">{getAdjuntosDescripcion(pregunta.adjuntos_resumen)}</p>

            {pregunta.adjuntos.length === 0 ? (
              <p className="text-sm text-gray-600">No hay adjuntos para esta pregunta.</p>
            ) : (
              <div className="space-y-2">
                {pregunta.adjuntos.map((adjunto) => {
                  const label = getTipoAdjuntoLabel(adjunto.tipo);
                  const hasViewer = Boolean(getEmbeddedAdjuntoUrl(adjunto));

                  return (
                    <div
                      key={adjunto.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            label === 'Figura'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {label}
                        </span>
                        <span className="text-sm text-[#111318]">{adjunto.filename || `Adjunto #${adjunto.id}`}</span>
                      </div>

                      {hasViewer ? (
                        <button
                          type="button"
                          onClick={() => setSelectedAdjunto(adjunto)}
                          className="text-sm text-primary hover:underline"
                        >
                          Ver adjunto
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Sin enlace de vista previa</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPromptPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleClosePromptPreview}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">Prompt usado por IA</h3>
                <p className="text-xs text-gray-500">
                  {promptPreviewUsingCatalog
                    ? `${promptPreviewName}${promptPreviewVersion ? ` v${promptPreviewVersion}` : ''} (version activa)`
                    : `Sin prompt activo en catalogo para "${promptPreviewName}". Se usa plantilla base.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePromptPreview}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar visor de prompt"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Prompt a utilizar en esta sección
                </label>
                <select
                  value={selectedPromptCatalogId}
                  onChange={(event) => {
                    void handlePromptSelectionChange(event.target.value);
                  }}
                  disabled={loadingPromptCatalogOptions || loadingPromptPreview}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111318] focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    Predeterminado: {DEFAULT_ESTRATEGIA_PROMPT_NAME} (ultimo activo)
                  </option>
                  {promptCatalogOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getPromptOptionLabel(item)}
                    </option>
                  ))}
                </select>
                {promptCatalogOptionsError && (
                  <p className="mt-2 text-xs text-red-600">{promptCatalogOptionsError}</p>
                )}
              </div>

              {loadingPromptPreview ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-gray-600">Cargando prompt...</p>
                  </div>
                </div>
              ) : promptPreviewError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {promptPreviewError}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      PRO (Prompt seleccionado)
                    </p>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {promptPreviewPromptSection || 'Sin prompt de catálogo (se enviará solo la pregunta).'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Pregunta Enviada
                    </p>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {promptPreviewQuestionSection || 'Sin pregunta.'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Payload Final (enviado a la API)
                    </p>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {promptPreview}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRespuestaPromptPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleCloseRespuestaPromptPreview}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  Prompt usado por IA (Respuesta IA)
                </h3>
                <p className="text-xs text-gray-500">
                  {respuestaPromptPreviewUsingCatalog
                    ? `${respuestaPromptPreviewName}${
                        respuestaPromptPreviewVersion
                          ? ` v${respuestaPromptPreviewVersion}`
                          : ''
                      } (version activa)`
                    : `Sin prompt activo en catalogo para "${respuestaPromptPreviewName}". Se usa plantilla base.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRespuestaPromptPreview}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar visor de prompt de respuesta"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Prompt a utilizar en Respuesta IA
                </label>
                <select
                  value={selectedRespuestaPromptCatalogId}
                  onChange={(event) => {
                    void handleRespuestaPromptSelectionChange(event.target.value);
                  }}
                  disabled={loadingPromptCatalogOptions || loadingRespuestaPromptPreview}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111318] focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    Predeterminado: {DEFAULT_RESPUESTA_PROMPT_NAME} (ultimo activo)
                  </option>
                  {promptCatalogOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getPromptOptionLabel(item)}
                    </option>
                  ))}
                </select>
                {promptCatalogOptionsError && (
                  <p className="mt-2 text-xs text-red-600">{promptCatalogOptionsError}</p>
                )}
              </div>

              {loadingRespuestaPromptPreview ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-gray-600">Cargando prompt...</p>
                  </div>
                </div>
              ) : respuestaPromptPreviewError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {respuestaPromptPreviewError}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      PRO (Prompt seleccionado)
                    </p>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaPromptPreviewPromptSection ||
                        'Sin prompt de catálogo (se enviarán pregunta + estrategia).'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Pregunta Enviada
                    </p>
                    <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaPromptPreviewQuestionSection || 'Sin pregunta.'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Estrategia Enviada
                    </p>
                    <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaPromptPreviewStrategySection || 'Sin estrategia.'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Payload Final (enviado a la API)
                    </p>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaPromptPreview}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRespuestaExpertoPromptPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleCloseRespuestaExpertoPromptPreview}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  Prompt usado por IA (Respuesta con Experto IA)
                </h3>
                <p className="text-xs text-gray-500">
                  {respuestaExpertoPromptPreviewUsingCatalog
                    ? `${respuestaExpertoPromptPreviewName}${
                        respuestaExpertoPromptPreviewVersion
                          ? ` v${respuestaExpertoPromptPreviewVersion}`
                          : ''
                      } (version activa)`
                    : `Sin prompt activo en catalogo para "${respuestaExpertoPromptPreviewName}". Se usa plantilla base.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRespuestaExpertoPromptPreview}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar visor de prompt de respuesta con experto"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Prompt a utilizar en Respuesta con Experto IA
                </label>
                <select
                  value={selectedRespuestaExpertoPromptCatalogId}
                  onChange={(event) => {
                    void handleRespuestaExpertoPromptSelectionChange(event.target.value);
                  }}
                  disabled={loadingPromptCatalogOptions || loadingRespuestaExpertoPromptPreview}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111318] focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    Predeterminado: {DEFAULT_RESPUESTA_EXPERTO_PROMPT_NAME} (ultimo activo)
                  </option>
                  {promptCatalogOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getPromptOptionLabel(item)}
                    </option>
                  ))}
                </select>
                {promptCatalogOptionsError && (
                  <p className="mt-2 text-xs text-red-600">{promptCatalogOptionsError}</p>
                )}
              </div>

              {loadingRespuestaExpertoPromptPreview ? (
                <div className="h-56 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p className="text-sm text-gray-600">Cargando prompt...</p>
                  </div>
                </div>
              ) : respuestaExpertoPromptPreviewError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {respuestaExpertoPromptPreviewError}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      PRO (Prompt seleccionado)
                    </p>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaExpertoPromptPreviewPromptSection ||
                        'Sin prompt de catálogo (se enviarán pregunta + estrategia).'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Pregunta Enviada
                    </p>
                    <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaExpertoPromptPreviewQuestionSection || 'Sin pregunta.'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Estrategia Enviada
                    </p>
                    <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaExpertoPromptPreviewStrategySection || 'Sin estrategia.'}
                    </pre>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Payload Final (enviado a la API)
                    </p>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                      {respuestaExpertoPromptPreview}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAdjunto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedAdjunto(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-6xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  {selectedAdjunto.filename || `Adjunto #${selectedAdjunto.id}`}
                </h3>
                <p className="text-xs text-gray-500">
                  Tipo: {getTipoAdjuntoLabel(selectedAdjunto.tipo)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdjunto(null)}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar visor"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4">
              {selectedAdjuntoUrl ? (
                <iframe
                  src={selectedAdjuntoUrl}
                  title={selectedAdjunto.filename || `Adjunto ${selectedAdjunto.id}`}
                  className="w-full h-[75vh] border border-gray-200 rounded-lg"
                  allow="autoplay"
                />
              ) : (
                <div className="h-[40vh] flex items-center justify-center text-sm text-gray-600">
                  No se pudo generar una vista previa para este adjunto.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreguntaDetailView;

