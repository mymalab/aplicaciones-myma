import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildNotebookChatPayloadCandidates,
  buildEstrategiaPromptContext,
  fetchCatalogoNotebookExpertos,
  fetchPreguntaById,
  fetchPreguntasCatalogos,
  generateEstrategiaFromNotebookChat,
  generateEstrategiaFromNotebookChatByNotebookId,
  generateRespuestaIaFromNotebookChatByNotebookId,
  getAdjuntosDescripcion,
  normalizeComplejidadPregunta,
  normalizeEstadoPregunta,
  updatePreguntaById,
} from '../services/preguntasService';
import type {
  CatalogoEspecialidad,
  CatalogoNotebookExperto,
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
import NotebookLmCookiesDialog from '../../notebooklm/components/NotebookLmCookiesDialog';
import {
  readStoredSelectedNotebook,
  type StoredSelectedNotebook,
} from '../../notebooklm/services/notebookLmCookieStorage';

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
const ADENDAS_NOTEBOOK_CHAT_BASE_URL = (
  import.meta.env.VITE_ADENDAS_NOTEBOOK_CHAT_BASE_URL || 'http://localhost:8001'
)
  .trim()
  .replace(/\/+$/, '');

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
  const { adendaId, preguntaId } = useParams<{ adendaId?: string; preguntaId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiRespuestaMessage, setAiRespuestaMessage] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState<PreguntaGestion | null>(null);
  const [personas, setPersonas] = useState<CatalogoPersona[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogoEspecialidad[]>([]);
  const [notebookExpertos, setNotebookExpertos] = useState<CatalogoNotebookExperto[]>([]);
  const [selectedNotebookExpertoId, setSelectedNotebookExpertoId] = useState('');
  const [notebookExpertosError, setNotebookExpertosError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [cookiesDialogOpen, setCookiesDialogOpen] = useState(false);
  const [selectedNotebookLm, setSelectedNotebookLm] = useState<StoredSelectedNotebook | null>(
    () => readStoredSelectedNotebook()
  );

  useEffect(() => {
    const syncSelectedNotebook = () => {
      setSelectedNotebookLm(readStoredSelectedNotebook());
    };
    window.addEventListener('storage', syncSelectedNotebook);
    return () => window.removeEventListener('storage', syncSelectedNotebook);
  }, []);
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
  const [promptCatalogOptions, setPromptCatalogOptions] = useState<CatalogPromptItem[]>([]);
  const [selectedPromptCatalogId, setSelectedPromptCatalogId] = useState('');
  const [loadingPromptCatalogOptions, setLoadingPromptCatalogOptions] = useState(false);
  const [promptCatalogOptionsError, setPromptCatalogOptionsError] = useState<string | null>(null);
  const [generatingRespuestaIa, setGeneratingRespuestaIa] = useState(false);
  const [showRespuestaIaRequestPreview, setShowRespuestaIaRequestPreview] = useState(false);

  const preguntaIdNumber = useMemo(() => {
    const parsed = Number(preguntaId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [preguntaId]);

  const selectedPromptOption = useMemo(() => {
    return (
      promptCatalogOptions.find((item) => item.id === selectedPromptCatalogId) || null
    );
  }, [promptCatalogOptions, selectedPromptCatalogId]);

  const selectedNotebookExperto = useMemo(() => {
    return notebookExpertos.find((item) => item.id === selectedNotebookExpertoId) || null;
  }, [notebookExpertos, selectedNotebookExpertoId]);

  const respuestaIaPayloadInput = useMemo(() => {
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
  }, [pregunta?.texto, pregunta?.estrategia, draft?.estrategia]);

  const respuestaIaEndpointPreview = useMemo(() => {
    if (!selectedNotebookExperto?.notebook_id) {
      return '';
    }

    return `${ADENDAS_NOTEBOOK_CHAT_BASE_URL}/notebooks/${encodeURIComponent(
      selectedNotebookExperto.notebook_id
    )}/chat`;
  }, [selectedNotebookExperto]);

  const respuestaIaInputPreview = respuestaIaPayloadInput?.payloadInput || '';
  const respuestaIaPayloadCandidates = useMemo(() => {
    return buildNotebookChatPayloadCandidates(respuestaIaInputPreview);
  }, [respuestaIaInputPreview]);

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

        const [catalogos, notebookExpertosResult] = await Promise.all([
          fetchPreguntasCatalogos(),
          fetchCatalogoNotebookExpertos()
            .then((data) => ({ data, error: null as string | null }))
            .catch((err: any) => {
              console.error('Error loading notebook expertos catalog:', err);
              return {
                data: [] as CatalogoNotebookExperto[],
                error:
                  err?.message ||
                  'No fue posible cargar el catalogo de expertos para Respuesta IA.',
              };
            }),
        ]);
        const { pregunta: data } = await fetchPreguntaById(preguntaIdNumber, catalogos);

        if (!isMounted) return;

        setPersonas(catalogos.personas);
        setEspecialidades(catalogos.especialidades);
        setNotebookExpertos(notebookExpertosResult.data);
        setNotebookExpertosError(notebookExpertosResult.error);
        setSelectedNotebookExpertoId((prev) => {
          const selectedExists = notebookExpertosResult.data.some((item) => item.id === prev);
          if (selectedExists) {
            return prev;
          }
          return notebookExpertosResult.data[0]?.id || '';
        });

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

  useEffect(() => {
    let isMounted = true;

    const initializePromptSelection = async () => {
      if (!pregunta) return;

      const options = await loadPromptCatalogOptions();
      if (!isMounted) return;

      const selectedExists = options.some((item) => item.id === selectedPromptCatalogId);
      const defaultOption = findDefaultPromptOption(options);
      const nextSelectedId = selectedExists ? selectedPromptCatalogId : defaultOption?.id || '';

      if (nextSelectedId !== selectedPromptCatalogId) {
        setSelectedPromptCatalogId(nextSelectedId);
      }

      const effectiveOption = options.find((item) => item.id === nextSelectedId) || null;
      if (effectiveOption) {
        setPromptPreviewName(effectiveOption.nombre_prompt);
        setPromptPreviewVersion(effectiveOption.version);
        setPromptPreviewUsingCatalog(true);
      } else {
        setPromptPreviewName(DEFAULT_ESTRATEGIA_PROMPT_NAME);
        setPromptPreviewVersion(null);
        setPromptPreviewUsingCatalog(false);
      }
    };

    initializePromptSelection();

    return () => {
      isMounted = false;
    };
  }, [pregunta?.id]);

  const handleBack = () => {
    if (adendaId) {
      navigate(adendasGestion(adendaId));
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
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    if (!pregunta) return;
    setDraft(buildDraftFromPregunta(pregunta));
    setIsEditing(false);
    setAiMessage(null);
    setAiRespuestaMessage(null);
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

    try {
      let promptForGeneration = selectedPromptOption;
      if (selectedPromptCatalogId && !promptForGeneration) {
        const reloadedOptions = await loadPromptCatalogOptions();
        promptForGeneration =
          reloadedOptions.find((item) => item.id === selectedPromptCatalogId) || null;
      }

      const promptOptions = promptForGeneration
        ? {
            promptCatalogoOverride: promptForGeneration.prompt,
            promptNombreOverride: promptForGeneration.nombre_prompt,
            promptVersionOverride: promptForGeneration.version,
          }
        : {};

      const answer = selectedNotebookLm?.notebook_id
        ? await generateEstrategiaFromNotebookChatByNotebookId(
            selectedNotebookLm.notebook_id,
            preguntaTexto,
            promptOptions
          )
        : await generateEstrategiaFromNotebookChat(
            adendaId,
            preguntaTexto,
            promptOptions
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

    const notebookIdForApi =
      selectedNotebookLm?.notebook_id || selectedNotebookExperto?.notebook_id;

    if (!notebookIdForApi) {
      setError(
        'Selecciona un notebook en "Cookies NotebookLM" o un experto con notebook_id valido antes de generar la respuesta IA.'
      );
      return;
    }

    if (!respuestaIaPayloadInput) {
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

    try {
      const answer = await generateRespuestaIaFromNotebookChatByNotebookId(
        notebookIdForApi,
        respuestaIaPayloadInput.payloadInput
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

  const handleOpenRespuestaIaRequestPreview = () => {
    setShowRespuestaIaRequestPreview(true);
  };

  const handleCloseRespuestaIaRequestPreview = () => {
    setShowRespuestaIaRequestPreview(false);
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
              <h1 className="text-4xl font-bold text-[#111318]">
                {pregunta.orden ?? pregunta.numero_formateado}
              </h1>
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
            <div className="mb-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="block text-sm font-medium text-gray-500">
                  Estrategia ({formatWordCount(estrategiaWordCount)})
                </label>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  Prompt: {currentPromptBadgeLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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

                {selectedNotebookLm && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700"
                    title={`Notebook seleccionado: ${selectedNotebookLm.nombre}`}
                  >
                    <span className="material-symbols-outlined text-sm leading-none">
                      menu_book
                    </span>
                    <span>{selectedNotebookLm.nombre}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCookiesDialogOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-[#111318] hover:bg-gray-50"
                  title="Pegar y validar cookies de NotebookLM"
                >
                  <span className="material-symbols-outlined text-base leading-none">key</span>
                  <span>Cookies NotebookLM</span>
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
              <div className="flex flex-wrap items-center gap-2">
                <label className="block text-sm font-medium text-gray-500">Respuesta IA</label>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500" htmlFor="respuesta-ia-experto-select">
                    Experto
                  </label>
                  <select
                    id="respuesta-ia-experto-select"
                    value={selectedNotebookExpertoId}
                    onChange={(event) => setSelectedNotebookExpertoId(event.target.value)}
                    disabled={notebookExpertos.length === 0}
                    className="h-8 min-w-[220px] max-w-[320px] rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-[#111318] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {notebookExpertos.length === 0 ? (
                      <option value="">Sin expertos disponibles</option>
                    ) : (
                      notebookExpertos.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRespuestaIaRequestPreview}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-[#111318] hover:bg-gray-50"
                  title="Ver solicitud enviada a la API"
                >
                  <span className="material-symbols-outlined text-base leading-none">visibility</span>
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateRespuestaIa}
                    disabled={
                      generatingRespuestaIa ||
                      saving ||
                      !selectedNotebookExperto?.notebook_id ||
                      !respuestaIaPayloadInput
                    }
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
            {notebookExpertosError && (
              <p className="mb-2 text-xs text-amber-700">{notebookExpertosError}</p>
            )}
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

      {showRespuestaIaRequestPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleCloseRespuestaIaRequestPreview}
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111318]">
                  Solicitud enviada a la API (Respuesta IA)
                </h3>
                <p className="text-xs text-gray-500">
                  Vista previa de lo que se enviara al endpoint al presionar "Generar con IA".
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseRespuestaIaRequestPreview}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Cerrar visor de solicitud de respuesta IA"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {!selectedNotebookExperto?.notebook_id && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Debes seleccionar un experto con notebook_id valido para generar Respuesta IA.
                </div>
              )}
              {!respuestaIaPayloadInput && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Falta contenido para enviar: debes tener Pregunta y Estrategia en esta sección.
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Destino
                </p>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                  {selectedNotebookExperto
                    ? [
                        `Experto: ${selectedNotebookExperto.nombre}`,
                        `Notebook ID: ${selectedNotebookExperto.notebook_id || '(sin valor)'}`,
                        `Endpoint: ${respuestaIaEndpointPreview || '(sin endpoint)'}`,
                      ].join('\n')
                    : 'Sin experto seleccionado.'}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Pregunta enviada
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                  {respuestaIaPayloadInput?.preguntaTexto || 'Sin pregunta.'}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Estrategia enviada
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                  {respuestaIaPayloadInput?.estrategiaTexto || 'Sin estrategia.'}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Texto final enviado al notebook
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                  {respuestaIaInputPreview || 'Sin contenido.'}
                </pre>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Payloads enviados (intentos en orden)
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-[#111318] font-mono">
                  {JSON.stringify(respuestaIaPayloadCandidates, null, 2)}
                </pre>
              </div>
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

      <NotebookLmCookiesDialog
        open={cookiesDialogOpen}
        onClose={() => setCookiesDialogOpen(false)}
        onNotebookSelected={(notebook) => setSelectedNotebookLm(notebook)}
      />
    </div>
  );
};

export default PreguntaDetailView;

