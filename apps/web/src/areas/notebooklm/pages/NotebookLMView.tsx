import React, { useEffect, useMemo, useState } from 'react';
import NotebookLmAuthBanner from '../components/NotebookLmAuthBanner';
import {
  createAndLoadNotebookFiltered,
  deleteNotebookLmCredentials,
  downloadSelectedDocumentsZip,
  downloadRetryDocumentsZip,
  downloadSeiaDocuments,
  fetchNotebookAuthorizedPeople,
  fetchNotebookLmAccountNotebooks,
  getDownloadSeiaDocumentsStatus,
  retryNotebookUpload,
  shareNotebookWithUser,
  storeNotebookLmCredentials,
  validateNotebookLmCookies,
} from '../services/notebookLMService';
import type {
  DownloadSeiaDocumentItem,
  DownloadSeiaDocumentsStatusResponse,
  NotebookAuthorizedPerson,
  NotebookLmAuthPayload,
  NotebookLmCookieValidationResponse,
  NotebookOption,
  NotebookSharePermission,
} from '../services/notebookLMService';
import {
  clearStoredNotebookLmState,
  readStoredNotebookLmRawCookies,
  readStoredNotebookLmValidation,
  writeStoredNotebookLmAuthPayload,
  writeStoredNotebookLmRawCookies,
  writeStoredNotebookLmValidation,
} from '../services/notebookLmCookieStorage';
import { useNotebookLmAuthStatus } from '../hooks/useNotebookLmAuthStatus';

type NotebookDocumentType = 'EIA' | 'DIA' | 'ADENDA';
type NotebookTargetMode = 'new' | 'existing';
type NotebookModuleStep = '01' | '02' | '03';
type DomPollingMode = 'listing' | 'uploading' | null;

interface AuthorizedPerson {
  id: number;
  name: string;
  email: string;
}

interface PreparedNotebook {
  id: string;
  documentUrl: string;
  documentType: NotebookDocumentType;
  keywords: string[];
  notebookTargetMode: NotebookTargetMode;
  notebookName: string;
  notebookId: string;
  authorizedPeople: AuthorizedPerson[];
  createdAt: string;
}

type DomPollingStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'listed'
  | 'uploading'
  | 'success'
  | 'partial_success'
  | 'failed';

interface PendingNotebookUpload {
  notebookName: string;
  notebookId: string;
  targetMode: NotebookTargetMode;
}

type ShareFeedbackTone = 'success' | 'warning' | 'error';

const DEFAULT_KEYWORDS = [
  'planitmetria',
  'planimetria',
  'hds',
  'plano',
  'planos',
  'lamina',
  'laminas',
  'anexo',
  'apendices',
  'apendice',
  'ci',
  'foto',
  'dwg',
];

const HIDDEN_DOM_TABLE_COLUMNS = new Set([
  'document_id',
  'seleccionar',
  'selected',
  'url_origen',
  'nombre_archivo_final',
  'nombre_para_notebook',
  'formato',
  'ruta_relativa',
  'tamano_bytes',
  'nivel_descarga_descompresion',
  'origen',
  'upload_status',
]);

const DOM_STATUS_POLL_INTERVAL_MS = 5000;

const NOTEBOOK_LM_WEB_BASE_URL = (
  import.meta.env.VITE_NOTEBOOK_LM_WEB_BASE_URL || 'https://notebooklm.google.com'
)
  .trim()
  .replace(/\/+$/, '');

const MODULE_STEPS = [
  {
    number: '01',
    title: 'Modulo 1: Descarga y filtrado',
    description: 'URL, tipo de expediente y palabras que aplican.',
    icon: 'filter_alt',
  },
  {
    number: '02',
    title: 'Modulo 2: Carga a NotebookLM',
    description: 'Crear un notebook nuevo o cargar en uno existente.',
    icon: 'upload_file',
  },
  {
    number: '03',
    title: 'Modulo 3: Personas autorizadas',
    description: 'Guardar el ID y definir con quienes se comparte.',
    icon: 'group_add',
  },
];

const normalizeKeyword = (value: string) => value.trim().toLowerCase();

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getPersonaEmail = (persona: NotebookAuthorizedPerson) => persona.correo || '';

const normalizeApiString = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

const buildNotebookWebUrl = (value: string) => {
  const normalizedNotebookId = value.trim();
  return normalizedNotebookId
    ? `${NOTEBOOK_LM_WEB_BASE_URL}/notebook/${encodeURIComponent(normalizedNotebookId)}`
    : '';
};

const isLikelyNotebookId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  ) || /^[A-Za-z0-9_-]{6,}$/.test(value);

const extractNotebookIdFromInput = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return '';
  }

  const pathMatch = normalizedValue.match(/\/notebook\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]).trim();
  }

  try {
    const url = new URL(normalizedValue);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const notebookSegmentIndex = pathSegments.findIndex(
      (segment) => segment.toLowerCase() === 'notebook'
    );

    if (
      notebookSegmentIndex >= 0 &&
      typeof pathSegments[notebookSegmentIndex + 1] === 'string'
    ) {
      return decodeURIComponent(pathSegments[notebookSegmentIndex + 1]).trim();
    }

    const notebookIdFromQuery =
      normalizeApiString(url.searchParams.get('notebook_id')) ||
      normalizeApiString(url.searchParams.get('id'));

    if (notebookIdFromQuery) {
      return notebookIdFromQuery;
    }
  } catch {
    // Si no es URL valida, seguimos con la deteccion de ID manual.
  }

  return isLikelyNotebookId(normalizedValue) ? normalizedValue : '';
};

const getDomDocumentId = (document: DownloadSeiaDocumentItem) =>
  normalizeApiString(document.document_id);

const getDomDocumentUploadStatus = (document: DownloadSeiaDocumentItem) =>
  normalizeApiString(document.upload_status).toLowerCase();

const getDomDocumentFileName = (document: DownloadSeiaDocumentItem) => {
  const candidates = [
    document.nombre_para_notebook,
    document.nombre_archivo,
    document.file_name,
    document.filename,
    document.document_name,
    document.nombre_documento,
    document.nombre,
  ];

  const resolvedName = candidates.map(normalizeApiString).find(Boolean);
  if (resolvedName) {
    return resolvedName;
  }

  const sourceUrl = normalizeApiString(document.url_origen);
  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname;
      const lastSegment = pathname.split('/').filter(Boolean).pop();
      if (lastSegment) {
        return decodeURIComponent(lastSegment);
      }
    } catch {
      const lastSegment = sourceUrl.split('/').filter(Boolean).pop();
      if (lastSegment) {
        return decodeURIComponent(lastSegment);
      }
    }
  }

  return 'Archivo sin nombre';
};

const readObjectProperty = (value: unknown, key: string): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !(key in value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
};

const extractNotebookIdFromResponse = (response: unknown): string => {
  const data = readObjectProperty(response, 'data');
  const result = readObjectProperty(response, 'result');
  const notebook = readObjectProperty(response, 'notebook');

  const candidates = [
    readObjectProperty(response, 'notebook_id'),
    readObjectProperty(response, 'notebooklm_id'),
    readObjectProperty(response, 'id'),
    readObjectProperty(data, 'notebook_id'),
    readObjectProperty(data, 'notebooklm_id'),
    readObjectProperty(data, 'id'),
    readObjectProperty(result, 'notebook_id'),
    readObjectProperty(result, 'notebooklm_id'),
    readObjectProperty(result, 'id'),
    readObjectProperty(notebook, 'notebook_id'),
    readObjectProperty(notebook, 'notebooklm_id'),
    readObjectProperty(notebook, 'id'),
  ];

  return candidates.map(normalizeApiString).find(Boolean) || '';
};

const mergeDomDocumentsWithServerProgress = (
  currentDocuments: DownloadSeiaDocumentItem[],
  incomingDocuments: DownloadSeiaDocumentItem[]
): DownloadSeiaDocumentItem[] => {
  if (currentDocuments.length === 0) {
    return incomingDocuments;
  }

  const incomingById = new Map(
    incomingDocuments
      .map((document) => [getDomDocumentId(document), document] as const)
      .filter(([documentId]) => documentId)
  );

  return currentDocuments.map((document) => {
    const documentId = getDomDocumentId(document);
    if (!documentId || !incomingById.has(documentId)) {
      return document;
    }

    return {
      ...document,
      ...incomingById.get(documentId),
    };
  });
};

const progressMessageStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  overflowWrap: 'anywhere',
};

const NotebookLMView: React.FC = () => {
  const {
    status: notebookAuthStatus,
    loading: loadingNotebookAuthStatus,
    refresh: refreshNotebookAuthStatus,
  } = useNotebookLmAuthStatus(true);
  const [activeModule, setActiveModule] = useState<NotebookModuleStep>('01');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState<NotebookDocumentType>('EIA');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [notebookTargetMode, setNotebookTargetMode] = useState<NotebookTargetMode>('new');
  const [newNotebookName, setNewNotebookName] = useState('');
  const [existingNotebookInput, setExistingNotebookInput] = useState('');
  const [notebookCookiesInput, setNotebookCookiesInput] = useState('');
  const [notebookCookieAuth, setNotebookCookieAuth] = useState<NotebookLmAuthPayload | null>(
    null
  );
  const [notebookCookieValidation, setNotebookCookieValidation] =
    useState<NotebookLmCookieValidationResponse | null>(null);
  const [isValidatingNotebookCookies, setIsValidatingNotebookCookies] = useState(false);
  const [notebookId, setNotebookId] = useState('');
  const [availableNotebooks, setAvailableNotebooks] = useState<NotebookOption[]>([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(true);
  const [notebooksError, setNotebooksError] = useState('');
  const [people, setPeople] = useState<NotebookAuthorizedPerson[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');
  const [personSearchTerm, setPersonSearchTerm] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [sharePermission, setSharePermission] = useState<NotebookSharePermission>('viewer');
  const [isSharingNotebook, setIsSharingNotebook] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<{
    tone: ShareFeedbackTone;
    message: string;
  } | null>(null);
  const [preparedNotebook, setPreparedNotebook] = useState<PreparedNotebook | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGeneratingDom, setIsGeneratingDom] = useState(false);
  const [domGenerationError, setDomGenerationError] = useState('');
  const [domRunId, setDomRunId] = useState('');
  const [domStatus, setDomStatus] = useState<DomPollingStatus>('idle');
  const [domPollingMode, setDomPollingMode] = useState<DomPollingMode>(null);
  const [domPollingKey, setDomPollingKey] = useState(0);
  const [domProgress, setDomProgress] = useState<DownloadSeiaDocumentsStatusResponse | null>(null);
  const [domDocuments, setDomDocuments] = useState<DownloadSeiaDocumentItem[]>([]);
  const [selectedDomDocumentIds, setSelectedDomDocumentIds] = useState<string[]>([]);
  const [currentNotebookUploadDocumentIds, setCurrentNotebookUploadDocumentIds] = useState<string[]>([]);
  const [isSubmittingNotebook, setIsSubmittingNotebook] = useState(false);
  const [isRetryingNotebookUpload, setIsRetryingNotebookUpload] = useState(false);
  const [isDownloadingRetryDocuments, setIsDownloadingRetryDocuments] = useState(false);
  const [isDownloadingSelectedDocuments, setIsDownloadingSelectedDocuments] = useState(false);
  const [pendingNotebookUpload, setPendingNotebookUpload] =
    useState<PendingNotebookUpload | null>(null);

  useEffect(() => {
    setNotebookCookiesInput(readStoredNotebookLmRawCookies());
    setNotebookCookieValidation(readStoredNotebookLmValidation());
    setNotebookCookieAuth(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadNotebooks = async () => {
      const canUseServerCredentials = Boolean(notebookAuthStatus?.valid);
      if (!notebookCookieAuth && !canUseServerCredentials) {
        if (!mounted) {
          return;
        }

        setLoadingNotebooks(false);
        setAvailableNotebooks([]);
        setNotebooksError(
          'Valida y guarda cookies para listar los notebooks de la cuenta que esta usando la app.'
        );
        return;
      }

      try {
        setLoadingNotebooks(true);
        setNotebooksError('');
        const data = await fetchNotebookLmAccountNotebooks(notebookCookieAuth);
        if (!mounted) return;
        setAvailableNotebooks(data);
      } catch (error) {
        console.error('Error loading account notebooks:', error);
        if (!mounted) return;
        setAvailableNotebooks([]);
        setNotebooksError(
          'No pudimos cargar los notebooks de la cuenta autenticada. Igual puedes pegar la URL o el ID manualmente.'
        );
      } finally {
        if (mounted) {
          setLoadingNotebooks(false);
        }
      }
    };

    void loadNotebooks();

    return () => {
      mounted = false;
    };
  }, [notebookAuthStatus?.valid, notebookCookieAuth]);

  useEffect(() => {
    let mounted = true;

    const loadPeople = async () => {
      try {
        setLoadingPeople(true);
        setPeopleError('');
        const data = await fetchNotebookAuthorizedPeople();
        if (!mounted) return;
        setPeople(data);
      } catch (error) {
        console.error('Error loading authorized people:', error);
        if (!mounted) return;
        setPeople([]);
        setPeopleError('No pudimos cargar las personas disponibles.');
      } finally {
        if (mounted) {
          setLoadingPeople(false);
        }
      }
    };

    void loadPeople();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedExistingNotebookId = useMemo(() => {
    const normalizedInput = existingNotebookInput.trim();
    if (!normalizedInput) {
      return '';
    }

    const normalizedLookup = normalizedInput.toLowerCase();
    const matchedNotebook = availableNotebooks.find((notebook) => {
      return (
        notebook.id.toLowerCase() === normalizedLookup ||
        notebook.notebook_id.toLowerCase() === normalizedLookup ||
        notebook.nombre.toLowerCase() === normalizedLookup
      );
    });

    return matchedNotebook?.notebook_id || extractNotebookIdFromInput(normalizedInput);
  }, [availableNotebooks, existingNotebookInput]);

  const selectedNotebook = useMemo(() => {
    const normalizedInput = existingNotebookInput.trim().toLowerCase();
    const normalizedNotebookId = resolvedExistingNotebookId.toLowerCase();

    return (
      availableNotebooks.find((notebook) => {
        return (
          notebook.notebook_id.toLowerCase() === normalizedNotebookId ||
          notebook.id.toLowerCase() === normalizedInput ||
          notebook.nombre.toLowerCase() === normalizedInput
        );
      }) || null
    );
  }, [availableNotebooks, existingNotebookInput, resolvedExistingNotebookId]);

  useEffect(() => {
    if (notebookTargetMode === 'existing') {
      setNotebookId(resolvedExistingNotebookId);
      return;
    }

    setNotebookId('');
  }, [notebookTargetMode, resolvedExistingNotebookId]);

  const hasLocalNotebookCookieAuth =
    Boolean(notebookCookieAuth) &&
    Boolean(notebookCookieValidation?.ok) &&
    Boolean(notebookCookieValidation?.token_fetch_ok);
  const hasStoredNotebookCookieAuth = Boolean(notebookAuthStatus?.valid);
  const hasValidNotebookCookieAuth = hasLocalNotebookCookieAuth || hasStoredNotebookCookieAuth;
  const notebookCookieStatusMessage =
    hasStoredNotebookCookieAuth && !hasLocalNotebookCookieAuth
      ? 'Cookies guardadas en MyMA listas para usar. La app esta consultando el estado guardado y no necesitas volver a pegarlas.'
      : notebookCookieValidation?.message || '';
  const notebookCookieDomains = notebookCookieValidation?.cookie_domains || [];
  const notebookCookieNames = notebookCookieValidation?.selected_cookie_names || [];
  const notebookCookieMissingRequired =
    notebookCookieValidation?.missing_required_cookies || [];

  const keywordOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_KEYWORDS, ...selectedKeywords])).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [selectedKeywords]);

  const selectedPeople = useMemo(() => {
    const selectedSet = new Set(selectedPersonIds);
    return people.filter((person) => selectedSet.has(person.id));
  }, [people, selectedPersonIds]);

  const selectedPeopleWithEmail = useMemo(() => {
    const uniqueByEmail = new Map<string, AuthorizedPerson>();

    selectedPeople.forEach((person) => {
      const email = getPersonaEmail(person).trim();
      if (!email) {
        return;
      }

      const normalizedEmail = email.toLowerCase();
      if (!uniqueByEmail.has(normalizedEmail)) {
        uniqueByEmail.set(normalizedEmail, {
          id: person.id,
          name: person.nombre_completo,
          email,
        });
      }
    });

    return Array.from(uniqueByEmail.values());
  }, [selectedPeople]);

  const selectedPeopleWithoutEmail = useMemo(() => {
    return selectedPeople.filter((person) => !getPersonaEmail(person).trim());
  }, [selectedPeople]);

  useEffect(() => {
    setShareFeedback(null);
  }, [notebookId, selectedPersonIds, sharePermission]);

  const filteredPeople = useMemo(() => {
    const query = personSearchTerm.trim().toLowerCase();

    if (!query) {
      return people;
    }

    return people.filter((person) => {
      const email = getPersonaEmail(person);
      return [
        person.nombre_completo,
        person.rut,
        email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [people, personSearchTerm]);

  const displayNotebookName =
    notebookTargetMode === 'existing'
      ? selectedNotebook?.nombre || 'Notebook existente'
      : newNotebookName.trim() || 'Notebook nuevo';
  const notebookUrl = buildNotebookWebUrl(notebookId);

  const documentColumns = useMemo(() => {
    const keys = new Set<string>();
    domDocuments.forEach((document) => {
      Object.keys(document).forEach((key) => keys.add(key));
    });
    return Array.from(keys).filter(
      (key) => !HIDDEN_DOM_TABLE_COLUMNS.has(key.trim().toLowerCase())
    );
  }, [domDocuments]);

  const domDocumentsWithIds = useMemo(
    () =>
      domDocuments.map((document, index) => ({
        clientId: `${index}-${String(document.document_id ?? document.url_origen ?? document.nombre_archivo ?? 'doc')}`,
        document,
      })),
    [domDocuments]
  );

  const allDomDocumentsSelected =
    domDocumentsWithIds.length > 0 &&
    domDocumentsWithIds.every((item) => selectedDomDocumentIds.includes(item.clientId));

  const filteredDocumentIds = useMemo(
    () => Array.from(new Set(domDocuments.map((document) => getDomDocumentId(document)).filter(Boolean))),
    [domDocuments]
  );

  const isNotebookUploadRunning =
    domPollingMode === 'uploading' &&
    !['success', 'partial_success', 'failed'].includes(domStatus);

  const shouldShowNotebookUploadProgress =
    isSubmittingNotebook ||
    isRetryingNotebookUpload ||
    domPollingMode === 'uploading' ||
    domStatus === 'queued' ||
    domStatus === 'running' ||
    domStatus === 'uploading' ||
    domStatus === 'success' ||
    domStatus === 'partial_success' ||
    (domStatus === 'failed' &&
      (domProgress?.progress_stage === 'uploading' ||
        domProgress?.progress_stage === 'creating_notebook' ||
        domProgress?.progress_stage === 'upload_queued'));

  const retryDocumentsCount = Math.max(0, Number(domProgress?.retry_documents_count || 0));
  const retryAttempts = Math.max(0, Number(domProgress?.retry_attempts || 0));
  const retryDocumentIds = useMemo(
    () =>
      Array.isArray(domProgress?.retry_document_ids)
        ? domProgress.retry_document_ids.filter(
            (documentId): documentId is string =>
              typeof documentId === 'string' && documentId.trim().length > 0
          )
        : [],
    [domProgress?.retry_document_ids]
  );
  const retryDocumentNames = useMemo(() => {
    if (retryDocumentIds.length === 0) {
      return [];
    }

    const documentsById = new Map(
      domDocuments
        .map((document) => [getDomDocumentId(document), getDomDocumentFileName(document)] as const)
        .filter(([documentId]) => documentId)
    );

    return retryDocumentIds.map(
      (documentId, index) => documentsById.get(documentId) || `Archivo pendiente ${index + 1}`
    );
  }, [domDocuments, retryDocumentIds]);
  const hasCompletedNotebookUploadAttempt =
    ['success', 'partial_success', 'failed'].includes(domStatus) &&
    domPollingMode !== 'uploading' &&
    !isNotebookUploadRunning &&
    !isSubmittingNotebook &&
    !isRetryingNotebookUpload;
  const shouldShowRetryNotebookUploadActions =
    hasCompletedNotebookUploadAttempt && retryDocumentsCount > 0;
  const shouldShowManualRetryDownload =
    shouldShowRetryNotebookUploadActions && retryAttempts > 0;
  const canRetryNotebookUpload =
    hasValidNotebookCookieAuth &&
    !!domRunId.trim() &&
    shouldShowRetryNotebookUploadActions;
  const canDownloadRetryDocuments =
    !!domRunId.trim() &&
    shouldShowManualRetryDownload &&
    !isDownloadingRetryDocuments;
  const canDownloadSelectedDocuments =
    !!domRunId.trim() &&
    filteredDocumentIds.length > 0 &&
    !isDownloadingSelectedDocuments;

  const notebookUploadDocumentStats = useMemo(() => {
    const summary = {
      active: 0,
      uploaded: 0,
      failed: 0,
      pending: 0,
    };

    const trackedDocumentIds = new Set(
      currentNotebookUploadDocumentIds.map((documentId) => documentId.trim()).filter(Boolean)
    );

    const documentsToTrack =
      trackedDocumentIds.size > 0
        ? domDocuments.filter((document) => trackedDocumentIds.has(getDomDocumentId(document)))
        : domDocuments.filter((document) => {
            const uploadStatus = getDomDocumentUploadStatus(document);
            return ['selected', 'uploading', 'uploaded', 'failed', 'not_uploaded'].includes(
              uploadStatus
            );
          });

    documentsToTrack.forEach((document) => {
      const uploadStatus = getDomDocumentUploadStatus(document);

      if (uploadStatus === 'uploading') {
        summary.active += 1;
        return;
      }

      if (uploadStatus === 'uploaded') {
        summary.uploaded += 1;
        return;
      }

      if (uploadStatus === 'failed') {
        summary.failed += 1;
        return;
      }

      if (
        uploadStatus === 'selected' ||
        uploadStatus === 'pending' ||
        uploadStatus === 'not_uploaded'
      ) {
        summary.pending += 1;
      }
    });

    return summary;
  }, [currentNotebookUploadDocumentIds, domDocuments]);

  const moduleTwoActionLabel = isSubmittingNotebook || isNotebookUploadRunning
    ? 'Cargando...'
    : notebookTargetMode === 'new'
      ? 'Crear'
      : 'Guardar';
  const moduleTwoActionIcon = notebookTargetMode === 'new' ? 'note_add' : 'save';
  const mainSubmitLabel =
    activeModule === '02' ? moduleTwoActionLabel : 'Crear Notebook';
  const mainSubmitIcon =
    activeModule === '02' ? moduleTwoActionIcon : 'add';
  const isModuleTwoActionDisabled =
    !hasValidNotebookCookieAuth ||
    (notebookTargetMode === 'new'
      ? !newNotebookName.trim() ||
        !domRunId.trim() ||
        filteredDocumentIds.length === 0 ||
        isSubmittingNotebook ||
        isRetryingNotebookUpload ||
        isNotebookUploadRunning
      : !resolvedExistingNotebookId ||
        isSubmittingNotebook ||
        isRetryingNotebookUpload ||
        isNotebookUploadRunning);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((current) =>
      current.includes(keyword)
        ? current.filter((item) => item !== keyword)
        : [...current, keyword]
    );
  };

  const togglePerson = (personId: number) => {
    setSelectedPersonIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
  };

  const handleAddKeyword = () => {
    const nextKeyword = normalizeKeyword(customKeyword);
    if (!nextKeyword) return;

    setSelectedKeywords((current) =>
      current.includes(nextKeyword) ? current : [...current, nextKeyword]
    );
    setCustomKeyword('');
  };

  const handleValidateAndSaveNotebookCookies = async () => {
    const rawCookies = notebookCookiesInput.trim();
    if (!rawCookies) {
      setNotebookCookieValidation({
        ok: false,
        message: 'Pega cookies antes de validarlas.',
        format_detected: 'unknown',
        cookie_domains: [],
        selected_cookie_names: [],
        missing_required_cookies: [],
        token_fetch_ok: false,
        auth_payload: null,
      });
      setNotebookCookieAuth(null);
      writeStoredNotebookLmRawCookies('');
      writeStoredNotebookLmAuthPayload(null);
      writeStoredNotebookLmValidation(null);
      return;
    }

    setIsValidatingNotebookCookies(true);
    try {
      const response = await validateNotebookLmCookies(rawCookies);
      setNotebookCookieValidation(response);
      writeStoredNotebookLmRawCookies(rawCookies);
      writeStoredNotebookLmValidation(response);

      if (response.ok && response.token_fetch_ok && response.auth_payload) {
        setNotebookCookieAuth(response.auth_payload);
        writeStoredNotebookLmAuthPayload(response.auth_payload);
        try {
          await storeNotebookLmCredentials(rawCookies);
          await refreshNotebookAuthStatus();
        } catch (storeError) {
          const validationMessage =
            storeError instanceof Error
              ? storeError.message
              : 'Las cookies se validaron, pero no pudimos guardarlas en tu cuenta.';
          setNotebookCookieValidation({
            ...response,
            message: `${response.message} ${validationMessage}`.trim(),
          });
        }
        return;
      }

      setNotebookCookieAuth(null);
      writeStoredNotebookLmAuthPayload(null);
    } catch (error) {
      const nextValidation: NotebookLmCookieValidationResponse = {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'No pudimos validar las cookies de NotebookLM.',
        format_detected: 'unknown',
        cookie_domains: [],
        selected_cookie_names: [],
        missing_required_cookies: [],
        token_fetch_ok: false,
        auth_payload: null,
      };
      setNotebookCookieValidation(nextValidation);
      setNotebookCookieAuth(null);
      writeStoredNotebookLmRawCookies(rawCookies);
      writeStoredNotebookLmValidation(nextValidation);
      writeStoredNotebookLmAuthPayload(null);
    } finally {
      setIsValidatingNotebookCookies(false);
    }
  };

  const handleClearNotebookCookies = async () => {
    setNotebookCookiesInput('');
    setNotebookCookieAuth(null);
    setNotebookCookieValidation(null);
    clearStoredNotebookLmState();

    const shouldDeleteServerCredentials = window.confirm(
      'Se limpiaran las cookies guardadas en este navegador. ¿Tambien quieres eliminar las credenciales guardadas en tu cuenta MyMA?'
    );

    if (shouldDeleteServerCredentials) {
      try {
        await deleteNotebookLmCredentials();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'No pudimos eliminar las credenciales guardadas en tu cuenta.'
        );
      }
    }

    await refreshNotebookAuthStatus();
    setAvailableNotebooks([]);
    setLoadingNotebooks(false);
    setNotebooksError(
      'Valida y guarda cookies para listar los notebooks de la cuenta que esta usando la app.'
    );
  };

  const handleShareNotebook = async () => {
    if (!hasValidNotebookCookieAuth) {
      setShareFeedback({
        tone: 'error',
        message:
          'Valida y guarda cookies de NotebookLM antes de compartir con otros usuarios.',
      });
      return;
    }

    const resolvedNotebookId = notebookId.trim();

    if (!resolvedNotebookId) {
      setShareFeedback({
        tone: 'error',
        message: 'Ingresa un notebook_id valido antes de compartir.',
      });
      return;
    }

    if (selectedPeopleWithEmail.length === 0) {
      setShareFeedback({
        tone: 'error',
        message: 'Selecciona al menos una persona con correo valido para compartir.',
      });
      return;
    }

    setShareFeedback(null);
    setIsSharingNotebook(true);

    const sharedEmails: string[] = [];
    const failedShares: string[] = [];

    try {
      for (const person of selectedPeopleWithEmail) {
        try {
          await shareNotebookWithUser(resolvedNotebookId, {
            email: person.email,
            permission: sharePermission,
            notify: true,
            welcome_message: 'Te comparto este notebook.',
          }, notebookCookieAuth || undefined);
          sharedEmails.push(person.email);
        } catch (error) {
          failedShares.push(
            error instanceof Error ? error.message : `No pudimos compartir con ${person.email}.`
          );
        }
      }

      const skippedPeople = selectedPeopleWithoutEmail.map((person) => person.nombre_completo);
      const feedbackParts: string[] = [];

      if (sharedEmails.length > 0) {
        feedbackParts.push(
          `Compartido con ${sharedEmails.length} usuario${sharedEmails.length === 1 ? '' : 's'}.`
        );
      }

      if (skippedPeople.length > 0) {
        feedbackParts.push(
          `Omitidos sin correo: ${skippedPeople.join(', ')}.`
        );
      }

      if (failedShares.length > 0) {
        feedbackParts.push(failedShares.join(' '));
      }

      await refreshNotebookAuthStatus();
      setShareFeedback({
        tone:
          failedShares.length > 0 || skippedPeople.length > 0
            ? sharedEmails.length > 0
              ? 'warning'
              : 'error'
            : 'success',
        message:
          feedbackParts.join(' ') ||
          'No se realizaron envios de comparticion.',
      });
    } finally {
      setIsSharingNotebook(false);
    }
  };

  const buildPreparedNotebook = (
    resolvedNotebookId?: string,
    overrides?: Partial<PendingNotebookUpload>
  ): PreparedNotebook => ({
    id: resolvedNotebookId?.trim() || overrides?.notebookId?.trim() || `NB-${Date.now()}`,
    documentUrl: documentUrl.trim(),
    documentType,
    keywords: selectedKeywords,
    notebookTargetMode: overrides?.targetMode || notebookTargetMode,
    notebookName: overrides?.notebookName?.trim() || displayNotebookName,
    notebookId:
      resolvedNotebookId?.trim() || overrides?.notebookId?.trim() || notebookId.trim(),
    authorizedPeople: selectedPeople.map((person) => ({
      id: person.id,
      name: person.nombre_completo,
      email: getPersonaEmail(person),
    })),
    createdAt: new Date().toLocaleString('es-CL'),
  });

  const finalizeNotebookPreparation = (
    statusResponse: DownloadSeiaDocumentsStatusResponse,
    fallbackUpload?: PendingNotebookUpload | null
  ) => {
    const resolvedNotebookId =
      normalizeApiString(statusResponse.notebooklm_id) ||
      fallbackUpload?.notebookId ||
      notebookId.trim();
    const resolvedNotebookName =
      normalizeApiString(statusResponse.nombre_notebooklm) ||
      fallbackUpload?.notebookName ||
      displayNotebookName;
    const remainingRetryCount = Math.max(
      0,
      Number(statusResponse.retry_documents_count || 0)
    );

    if (resolvedNotebookId) {
      setNotebookId(resolvedNotebookId);
    }

    setPreparedNotebook(
      buildPreparedNotebook(resolvedNotebookId, {
        notebookId: resolvedNotebookId,
        notebookName: resolvedNotebookName,
        targetMode: fallbackUpload?.targetMode || notebookTargetMode,
      })
    );

    if (remainingRetryCount === 0) {
      setPendingNotebookUpload(null);
      setActiveModule('03');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setPendingNotebookUpload(
      fallbackUpload || {
        notebookId: resolvedNotebookId,
        notebookName: resolvedNotebookName,
        targetMode: notebookTargetMode,
      }
    );
    setActiveModule('02');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmittingNotebook || isNotebookUploadRunning) {
      return;
    }

    if (!hasValidNotebookCookieAuth) {
      setErrorMessage(
        'Valida y guarda cookies de NotebookLM antes de crear, reutilizar o cargar notebooks.'
      );
      return;
    }

    const nextUrl = documentUrl.trim();
    if (!isValidHttpUrl(nextUrl)) {
      setErrorMessage('Ingresa una URL valida del documento.');
      return;
    }

    if (notebookTargetMode === 'new' && !newNotebookName.trim()) {
      setErrorMessage('Ingresa el nombre del notebook nuevo.');
      return;
    }

    if (notebookTargetMode === 'existing' && !resolvedExistingNotebookId) {
      setErrorMessage('Pega la URL completa o el notebook_id del notebook destino.');
      return;
    }

    if (!domRunId.trim()) {
      setErrorMessage('Primero descarga los documentos para obtener el run_id.');
      return;
    }

    if (filteredDocumentIds.length === 0) {
      setErrorMessage(
        'No hay document_id disponibles en la tabla filtrada para cargar al notebook.'
      );
      return;
    }

    setErrorMessage('');
    setPreparedNotebook(null);
    setIsSubmittingNotebook(true);

    try {
      const resolvedNotebookIdForSubmit =
        notebookTargetMode === 'existing' ? resolvedExistingNotebookId : notebookId.trim();
      const initialNotebookName =
        notebookTargetMode === 'new' ? newNotebookName.trim() : displayNotebookName;
      const requestPayloadBase = {
        run_id: domRunId,
        selected_document_ids: filteredDocumentIds,
      };

      setCurrentNotebookUploadDocumentIds(filteredDocumentIds);
      setPendingNotebookUpload({
        notebookId: resolvedNotebookIdForSubmit,
        notebookName: initialNotebookName,
        targetMode: notebookTargetMode,
      });
      setDomStatus('queued');
      setDomProgress((current) => ({
        ...(current || {}),
        run_id: domRunId,
        status: 'queued',
        progress_stage: 'upload_queued',
        progress_current: 0,
        progress_total: filteredDocumentIds.length,
        progress_percent: 0,
        progress_message:
          notebookTargetMode === 'new'
            ? 'Solicitando creacion y carga del notebook...'
            : 'Solicitando carga al notebook...',
        notebooklm_id: resolvedNotebookIdForSubmit,
        nombre_notebooklm: initialNotebookName,
      }));
      setDomPollingMode('uploading');
      setDomPollingKey((current) => current + 1);

      const requestPayload =
        notebookTargetMode === 'new'
          ? {
              ...requestPayloadBase,
              nombre_notebook: newNotebookName.trim(),
            }
          : {
              ...requestPayloadBase,
              notebook_id: resolvedNotebookIdForSubmit,
            };

      const response = await createAndLoadNotebookFiltered(
        requestPayload,
        notebookCookieAuth || undefined
      );
      const queuedRunId = normalizeApiString(response.run_id) || domRunId;
      const responseNotebookId = extractNotebookIdFromResponse(response);
      const plannedNotebookId =
        responseNotebookId || resolvedNotebookIdForSubmit;
      const plannedNotebookName =
        normalizeApiString(response.nombre_notebooklm) || displayNotebookName;

      setPendingNotebookUpload({
        notebookId: plannedNotebookId,
        notebookName: plannedNotebookName,
        targetMode: notebookTargetMode,
      });
      setDomRunId(queuedRunId);
      setDomStatus('uploading');
      setDomProgress((current) => ({
        ...(current || {}),
        run_id: queuedRunId,
        status: normalizeApiString(response.status) || 'queued',
        progress_stage: 'upload_queued',
        progress_current: 0,
        progress_total: filteredDocumentIds.length,
        progress_percent: 0,
        progress_message: 'Carga al notebook en cola.',
        notebooklm_id: plannedNotebookId,
        nombre_notebooklm: plannedNotebookName,
      }));
      setDomPollingMode('uploading');
      setDomPollingKey((current) => current + 1);
      await refreshNotebookAuthStatus();
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error
          ? error.message
          : 'No pudimos crear y cargar el notebook filtrado.';
      setDomStatus('failed');
      setDomPollingMode(null);
      setDomProgress((current) => ({
        ...(current || {}),
        status: 'failed',
        progress_message: nextErrorMessage,
        error_message: nextErrorMessage,
      }));
      setPendingNotebookUpload(null);
      setErrorMessage(
        nextErrorMessage
      );
    } finally {
      setIsSubmittingNotebook(false);
    }
  };

  const handleRetryFailedNotebookUploads = async () => {
    if (!canRetryNotebookUpload) {
      return;
    }

    if (!hasValidNotebookCookieAuth) {
      setErrorMessage(
        'Valida y guarda cookies de NotebookLM antes de reintentar la carga.'
      );
      return;
    }

    setErrorMessage('');
    setIsRetryingNotebookUpload(true);
    setCurrentNotebookUploadDocumentIds(retryDocumentIds);
    setDomStatus('uploading');
    setDomProgress((current) => ({
      ...(current || {}),
      status: 'uploading',
      progress_stage: 'uploading',
      progress_current: 0,
      progress_total: retryDocumentsCount,
      progress_percent: 0,
      retry_attempts: Math.max(retryAttempts + 1, Number(current?.retry_attempts || 0)),
      progress_message: `Reintentando ${retryDocumentsCount} documento(s) pendiente(s)...`,
    }));

    try {
      await retryNotebookUpload({ run_id: domRunId }, notebookCookieAuth || undefined);
      const refreshedStatus = await getDownloadSeiaDocumentsStatus(domRunId);
      const normalizedStatus = String(refreshedStatus.status || 'running').toLowerCase();
      const incomingDocuments = Array.isArray(refreshedStatus.documents)
        ? refreshedStatus.documents
        : [];

      setDomProgress(refreshedStatus);
      setDomDocuments((current) =>
        mergeDomDocumentsWithServerProgress(current, incomingDocuments)
      );
      setDomStatus(
        ['queued', 'listed', 'uploading', 'failed', 'success', 'partial_success'].includes(
          normalizedStatus
        )
          ? (normalizedStatus as DomPollingStatus)
          : 'running'
      );

      if (normalizedStatus === 'failed') {
        const retryErrorMessage =
          refreshedStatus.error_message || 'No pudimos completar el reintento de carga.';
        setErrorMessage(retryErrorMessage);
        return;
      }

      if (normalizedStatus === 'success' || normalizedStatus === 'partial_success') {
        finalizeNotebookPreparation(refreshedStatus, pendingNotebookUpload);
      }
      await refreshNotebookAuthStatus();
    } catch (error) {
      const retryErrorMessage =
        error instanceof Error
          ? error.message
          : 'No pudimos reintentar la carga de documentos al notebook.';
      setDomStatus('failed');
      setDomProgress((current) => ({
        ...(current || {}),
        status: 'failed',
        progress_message: retryErrorMessage,
        error_message: retryErrorMessage,
      }));
      setErrorMessage(retryErrorMessage);
    } finally {
      setIsRetryingNotebookUpload(false);
    }
  };

  const handleDownloadRetryDocuments = async () => {
    if (!canDownloadRetryDocuments) {
      return;
    }

    setErrorMessage('');
    setIsDownloadingRetryDocuments(true);

    try {
      const { blob, filename } = await downloadRetryDocumentsZip(domRunId);
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos descargar los documentos fallidos para carga manual.'
      );
    } finally {
      setIsDownloadingRetryDocuments(false);
    }
  };

  const handleDownloadSelectedDocuments = async () => {
    if (!canDownloadSelectedDocuments) {
      return;
    }

    setErrorMessage('');
    setIsDownloadingSelectedDocuments(true);

    try {
      const { blob, filename } = await downloadSelectedDocumentsZip(domRunId, {
        selected_document_ids: filteredDocumentIds,
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No pudimos descargar el zip de documentos visibles.'
      );
    } finally {
      setIsDownloadingSelectedDocuments(false);
    }
  };

  const handleGenerateDom = async () => {
    const nextUrl = documentUrl.trim();
    if (!isValidHttpUrl(nextUrl)) {
      setDomGenerationError('Ingresa una URL valida antes de generar el DOM.');
      setDomProgress(null);
      setDomDocuments([]);
      return;
    }

    setDomGenerationError('');
    setDomRunId('');
    setDomStatus('running');
    setDomPollingMode('listing');
    setDomProgress(null);
    setDomDocuments([]);
    setSelectedDomDocumentIds([]);
    setCurrentNotebookUploadDocumentIds([]);
    setPendingNotebookUpload(null);
    setIsGeneratingDom(true);

    try {
      const response = await downloadSeiaDocuments({
        documento_seia: nextUrl,
        tipo: documentType,
        exclude_keywords: selectedKeywords,
      });

      if (!response.run_id?.trim()) {
        throw new Error('La API no devolvio un run_id para seguir el progreso.');
      }

      setDomRunId(response.run_id.trim());
      setDomPollingKey((current) => current + 1);
    } catch (error) {
      setDomStatus('failed');
      setDomGenerationError(
        error instanceof Error ? error.message : 'No pudimos generar el DOM.'
      );
      setDomPollingMode(null);
    } finally {
      setIsGeneratingDom(false);
    }
  };

  useEffect(() => {
    if (!domRunId || !domPollingMode) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const terminalStatuses =
      domPollingMode === 'uploading'
        ? new Set(['success', 'partial_success', 'failed'])
        : new Set(['listed', 'failed']);

    const pollStatus = async () => {
      try {
        const nextStatus = await getDownloadSeiaDocumentsStatus(domRunId);
        if (cancelled) return;

        const normalizedStatus = String(nextStatus.status || 'running').toLowerCase();
        const incomingDocuments = Array.isArray(nextStatus.documents) ? nextStatus.documents : [];
        const isListingAwaitingDocuments =
          domPollingMode === 'listing' &&
          normalizedStatus === 'listed' &&
          incomingDocuments.length === 0 &&
          Number(nextStatus.progress_current || 0) > 0;
        setDomProgress(nextStatus);
        if (domPollingMode === 'uploading') {
          setDomDocuments((current) =>
            mergeDomDocumentsWithServerProgress(current, incomingDocuments)
          );
        } else {
          setDomDocuments(incomingDocuments);
          setSelectedDomDocumentIds([]);
        }

        if (
          normalizedStatus === 'queued' ||
          normalizedStatus === 'listed' ||
          normalizedStatus === 'uploading' ||
          normalizedStatus === 'failed' ||
          normalizedStatus === 'success' ||
          normalizedStatus === 'partial_success'
        ) {
          setDomStatus(
            isListingAwaitingDocuments ? 'running' : (normalizedStatus as DomPollingStatus)
          );
        } else {
          setDomStatus('running');
        }

        if (normalizedStatus === 'failed' && nextStatus.error_message) {
          if (domPollingMode === 'uploading') {
            setErrorMessage(nextStatus.error_message);
          } else {
            setDomGenerationError(nextStatus.error_message);
          }
        }

        if (terminalStatuses.has(normalizedStatus) && !isListingAwaitingDocuments) {
          setDomPollingMode(null);
          if (
            domPollingMode === 'uploading' &&
            (normalizedStatus === 'success' || normalizedStatus === 'partial_success')
          ) {
            finalizeNotebookPreparation(nextStatus, pendingNotebookUpload);
          }
          if (domPollingMode === 'uploading' && normalizedStatus === 'failed') {
            setPendingNotebookUpload(null);
          }
          return;
        }

        if (!terminalStatuses.has(normalizedStatus)) {
          timeoutId = setTimeout(() => {
            void pollStatus();
          }, DOM_STATUS_POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) return;
        setDomPollingMode(null);
        setDomStatus('failed');
        const fallbackMessage =
          error instanceof Error
            ? error.message
            : domPollingMode === 'uploading'
              ? 'No pudimos consultar el estado de la carga al notebook.'
              : 'No pudimos consultar el estado de la generacion del DOM.';
        if (domPollingMode === 'uploading') {
          setErrorMessage(fallbackMessage);
        } else {
          setDomGenerationError(fallbackMessage);
        }
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    domPollingKey,
    domPollingMode,
    domRunId,
    displayNotebookName,
    notebookId,
    notebookTargetMode,
    pendingNotebookUpload,
  ]);

  const toggleDomDocumentSelection = (clientId: string) => {
    setSelectedDomDocumentIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId]
    );
  };

  const toggleSelectAllDomDocuments = () => {
    setSelectedDomDocumentIds((current) =>
      allDomDocumentsSelected ? [] : domDocumentsWithIds.map((item) => item.clientId)
    );
  };

  const handleDeleteSelectedDomDocuments = () => {
    if (selectedDomDocumentIds.length === 0) {
      return;
    }

    const selectedSet = new Set(selectedDomDocumentIds);
    setDomDocuments((current) =>
      current.filter((document, index) => {
        const clientId = `${index}-${String(document.document_id ?? document.url_origen ?? document.nombre_archivo ?? 'doc')}`;
        return !selectedSet.has(clientId);
      })
    );
    setSelectedDomDocumentIds([]);
  };

  const handleConfirmDomSelection = () => {
    setActiveModule('02');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111318]">Crear Notebook</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#616f89]">
              Descarga, filtra, carga y comparte documentos ambientales desde un solo flujo.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2 font-medium text-white transition-colors hover:bg-[#047857]"
          >
            <span className="material-symbols-outlined text-lg">{mainSubmitIcon}</span>
            {mainSubmitLabel}
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {MODULE_STEPS.map((step) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveModule(step.number as NotebookModuleStep)}
              aria-pressed={activeModule === step.number}
              className={`rounded-lg border p-4 text-left shadow-sm transition-all ${
                activeModule === step.number
                  ? 'border-[#059669] bg-teal-50 ring-2 ring-[#059669]/15'
                  : 'border-gray-200 bg-white hover:border-primary hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    activeModule === step.number
                      ? 'bg-[#059669] text-white'
                      : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      activeModule === step.number ? 'text-[#047857]' : 'text-[#059669]'
                    }`}
                  >
                    {step.number}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-[#111318]">
                    {step.title}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#616f89]">
                    {step.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {preparedNotebook && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            <div>
              <p className="font-semibold">Notebook preparado</p>
              <p>
                {preparedNotebook.id} listo para {preparedNotebook.notebookName}.
              </p>
            </div>
          </div>
        )}

        <NotebookLmAuthBanner
          status={notebookAuthStatus}
          loading={loadingNotebookAuthStatus}
          onOpenCookiesDialog={() => setActiveModule('02')}
          onRefresh={() => {
            void refreshNotebookAuthStatus();
          }}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {(activeModule === '02' || activeModule === '03') && (
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <span className="material-symbols-outlined">shield_lock</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Auth NotebookLM
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#111318]">
                      Cookies de la cuenta del usuario
                    </h2>
                    <p className="mt-1 text-sm text-[#616f89]">
                      Pega cookies de NotebookLM/Google, validalas y se guardaran en tu cuenta
                      MyMA para reutilizarlas hasta que las reemplaces o las elimines.
                    </p>
                  </div>
                </div>

                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="notebook-cookies"
                >
                  Pegar cookies
                </label>
                <textarea
                  id="notebook-cookies"
                  value={notebookCookiesInput}
                  onChange={(event) => setNotebookCookiesInput(event.target.value)}
                  placeholder="Pega aqui cookies en formato Netscape o storage JSON de Playwright"
                  spellCheck={false}
                  className="mt-2 min-h-[180px] w-full rounded-lg border border-gray-200 px-4 py-3 font-mono text-sm text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClearNotebookCookies}
                    disabled={isValidatingNotebookCookies && !notebookCookiesInput.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#111318] transition-colors hover:border-primary hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    Limpiar cookies
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleValidateAndSaveNotebookCookies();
                    }}
                    disabled={isValidatingNotebookCookies}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isValidatingNotebookCookies ? 'progress_activity' : 'verified_user'}
                    </span>
                    {isValidatingNotebookCookies ? 'Validando...' : 'Validar y guardar'}
                  </button>
                </div>

                {notebookCookieValidation && (
                  <div
                    className={`mt-4 rounded-lg border p-4 text-sm ${
                      hasValidNotebookCookieAuth
                        ? 'border-teal-200 bg-teal-50 text-teal-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    <p className="font-semibold">
                      {hasValidNotebookCookieAuth
                        ? 'Cookies listas para usar'
                        : 'Cookies pendientes de correccion'}
                    </p>
                    <p className="mt-1 leading-6">{notebookCookieStatusMessage}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                          Formato detectado
                        </p>
                        <p className="mt-1 break-words">
                          {notebookCookieValidation.format_detected || 'unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                          Estado auth/token
                        </p>
                        <p className="mt-1">
                          {hasStoredNotebookCookieAuth
                            ? 'Valido guardado en MyMA'
                            : notebookCookieValidation.token_fetch_ok
                              ? 'Valido'
                              : 'No valido'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                          Dominios permitidos
                        </p>
                        <p className="mt-1 break-words">
                          {notebookCookieDomains.length > 0
                            ? notebookCookieDomains.join(', ')
                            : 'No detectados'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide">
                          Cookies seleccionadas
                        </p>
                        <p className="mt-1 break-words">
                          {notebookCookieNames.length > 0
                            ? notebookCookieNames.join(', ')
                            : 'Ninguna'}
                        </p>
                      </div>
                    </div>
                    {notebookCookieMissingRequired.length > 0 && (
                      <div className="mt-3 rounded-lg border border-amber-300 bg-white/70 p-3 text-xs leading-6 text-amber-900">
                        <p className="font-semibold">Cookies obligatorias faltantes</p>
                        <p>{notebookCookieMissingRequired.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}

                {notebookAuthStatus?.has_credentials && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">Estado guardado en MyMA</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Estado
                        </p>
                        <p className="mt-1">{notebookAuthStatus.status || 'missing'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Expiracion preventiva
                        </p>
                        <p className="mt-1">
                          {typeof notebookAuthStatus.days_until_soft_expiry === 'number'
                            ? `${notebookAuthStatus.days_until_soft_expiry} dia(s)`
                            : 'Sin dato'}
                        </p>
                      </div>
                    </div>
                    {notebookAuthStatus.last_error && (
                      <p className="mt-3 text-xs leading-5 text-slate-600">
                        Ultimo error: {notebookAuthStatus.last_error}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeModule === '01' && (
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <span className="material-symbols-outlined">filter_alt</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                      Modulo 1
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-[#111318]">
                      Descarga y filtrado
                    </h2>
                    <p className="mt-1 text-sm text-[#616f89]">
                      Pega la URL del documento, define su tipo y marca las palabras que contienen
                      los documentos que quieres eliminar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleGenerateDom();
                  }}
                  disabled={isGeneratingDom}
                  className="inline-flex items-center justify-center rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
                >
                  {isGeneratingDom ? 'Generando...' : 'Descargar'}
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label
                    className="block text-sm font-semibold text-gray-700"
                    htmlFor="document-url"
                  >
                    URL del documento
                  </label>
                  <input
                    id="document-url"
                    type="url"
                    value={documentUrl}
                    onChange={(event) => setDocumentUrl(event.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold text-gray-700"
                    htmlFor="document-type"
                  >
                    Tipo
                  </label>
                  <select
                    id="document-type"
                    value={documentType}
                    onChange={(event) =>
                      setDocumentType(event.target.value as NotebookDocumentType)
                    }
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="EIA">EIA</option>
                    <option value="DIA">DIA</option>
                    <option value="ADENDA">Adenda</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-gray-700">Si aplica</p>
                <p className="mt-1 text-sm text-[#616f89]">
                  Selecciona una o varias palabras que identifiquen los documentos que quieres
                  eliminar y agrega las que falten.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {keywordOptions.map((keyword) => {
                    const isSelected = selectedKeywords.includes(keyword);

                    return (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => toggleKeyword(keyword)}
                        aria-pressed={isSelected}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-[#059669] bg-[#059669] text-white hover:bg-[#047857]'
                            : 'border-gray-200 bg-white text-[#111318] hover:border-primary hover:bg-gray-50'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-base">check</span>
                        )}
                        {keyword}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(event) => setCustomKeyword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="Agregar palabra"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 font-medium text-[#111318] transition-colors hover:border-primary hover:bg-gray-50"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Agregar
                  </button>
                </div>

                {domGenerationError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {domGenerationError}
                  </div>
                )}

                {(domRunId || domStatus !== 'idle') && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="sm:min-w-0 sm:flex-1 sm:pr-4">
                        <p className="text-sm font-semibold text-[#111318]">Estado de descarga</p>
                        <p
                          className="mt-1 text-sm leading-5 text-[#616f89]"
                          style={progressMessageStyle}
                        >
                          {domProgress?.progress_message ||
                            domProgress?.progress_stage ||
                            (domStatus === 'running'
                              ? 'Iniciando proceso'
                              : `Estado final: ${domStatus}`)}
                        </p>
                      </div>
                      <div className="text-sm text-[#616f89]">
                        <span className="font-medium text-[#111318]">Status:</span>{' '}
                        {domProgress?.status || domStatus}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#059669] transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, Number(domProgress?.progress_percent || 0))
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex flex-col gap-1 text-xs text-[#616f89] sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {domProgress?.progress_stage || 'Preparando'}
                        </span>
                        <span>
                          {domProgress?.progress_current ?? 0}/{domProgress?.progress_total ?? 0} |{' '}
                          {Math.round(Number(domProgress?.progress_percent || 0))}%
                        </span>
                      </div>
                    </div>

                    {(domStatus === 'success' || domStatus === 'partial_success') && (
                      <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
                        El proceso termino con estado {domStatus}.
                      </div>
                    )}

                    {domStatus === 'failed' && domProgress?.error_message && (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {domProgress.error_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
            )}

            {activeModule === '02' && (
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Modulo 2
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[#111318]">
                    Carga a NotebookLM
                  </h2>
                  <p className="mt-1 text-sm text-[#616f89]">
                    Crea un notebook nuevo o usa uno existente para guardar los archivos.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setNotebookTargetMode('new')}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    notebookTargetMode === 'new'
                      ? 'border-[#059669] bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        notebookTargetMode === 'new' ? 'text-[#059669]' : 'text-[#616f89]'
                      }`}
                    >
                      note_add
                    </span>
                    <div>
                      <p className="font-semibold text-[#111318]">Crear uno nuevo</p>
                      <p className="mt-1 text-sm text-[#616f89]">
                        Solicitar el nombre del notebook.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNotebookTargetMode('existing')}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    notebookTargetMode === 'existing'
                      ? 'border-[#059669] bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        notebookTargetMode === 'existing'
                          ? 'text-[#059669]'
                          : 'text-[#616f89]'
                      }`}
                    >
                      library_books
                    </span>
                    <div>
                      <p className="font-semibold text-[#111318]">Seleccionar Notebook</p>
                      <p className="mt-1 text-sm text-[#616f89]">
                        Guardar archivos en un notebook existente.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {!hasValidNotebookCookieAuth && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Valida y guarda cookies de NotebookLM para listar notebooks de la cuenta del
                  usuario y habilitar la carga.
                </div>
              )}

              {notebookTargetMode === 'new' ? (
                <div className="mt-4">
                  <label
                    className="block text-sm font-semibold text-gray-700"
                    htmlFor="notebook-name"
                  >
                    Nombre del notebook
                  </label>
                  <input
                    id="notebook-name"
                    type="text"
                    value={newNotebookName}
                    onChange={(event) => setNewNotebookName(event.target.value)}
                    placeholder="Ej: EIA Proyecto Norte"
                    disabled={!hasValidNotebookCookieAuth}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <label
                    className="block text-sm font-semibold text-gray-700"
                    htmlFor="existing-notebook"
                  >
                    Notebook existente
                  </label>
                  <input
                    id="existing-notebook"
                    type="text"
                    value={existingNotebookInput}
                    onChange={(event) => setExistingNotebookInput(event.target.value)}
                    placeholder="Pega la URL completa o escribe el notebook_id"
                    autoComplete="off"
                    spellCheck={false}
                    list="existing-notebook-options"
                    disabled={!hasValidNotebookCookieAuth}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <datalist id="existing-notebook-options">
                    {availableNotebooks.map((notebook) => (
                      <option
                        key={notebook.notebook_id}
                        value={notebook.notebook_id}
                        label={notebook.nombre}
                      />
                    ))}
                  </datalist>
                  <p className="mt-2 text-xs text-[#616f89]">
                    Puedes pegar la URL completa de NotebookLM o solo el notebook_id.
                  </p>
                  {loadingNotebooks && hasValidNotebookCookieAuth && (
                    <p className="mt-2 text-xs text-[#616f89]">
                      Cargando notebooks de la cuenta autenticada...
                    </p>
                  )}
                  {!loadingNotebooks &&
                    hasValidNotebookCookieAuth &&
                    availableNotebooks.length > 0 && (
                      <p className="mt-2 text-xs text-[#616f89]">
                        Se cargaron {availableNotebooks.length} notebook
                        {availableNotebooks.length === 1 ? '' : 's'} de la cuenta. Puedes elegir
                        uno desde las sugerencias del campo.
                      </p>
                    )}
                  {existingNotebookInput.trim() && (
                    resolvedExistingNotebookId ? (
                      <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
                        <p className="font-semibold">Notebook detectado</p>
                        <p className="mt-1 break-all">
                          notebook_id: {resolvedExistingNotebookId}
                        </p>
                        {selectedNotebook?.nombre && (
                          <p className="mt-1 text-xs text-teal-700">
                            Nombre: {selectedNotebook.nombre}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        No pudimos extraer un notebook_id valido desde ese texto.
                      </div>
                    )
                  )}
                  {notebooksError && (
                    <p className="mt-2 text-xs text-amber-700">
                      {notebooksError} Igual puedes pegar la URL o el ID manualmente.
                    </p>
                  )}
                  {!loadingNotebooks && availableNotebooks.length === 0 && !notebooksError && (
                    <p className="mt-2 text-xs text-[#616f89]">
                      No hay notebooks disponibles en el catalogo, pero puedes pegar la URL o el ID.
                    </p>
                  )}
                </div>
              )}

              {shouldShowNotebookUploadProgress && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="sm:min-w-0 sm:flex-1 sm:pr-4">
                      <p className="text-sm font-semibold text-[#111318]">
                        Estado de carga al notebook
                      </p>
                      <p
                        className="mt-1 text-sm leading-5 text-[#616f89]"
                        style={progressMessageStyle}
                      >
                        {domProgress?.progress_message ||
                          domProgress?.progress_stage ||
                          (isNotebookUploadRunning
                            ? 'Preparando carga al notebook'
                            : `Estado final: ${domStatus}`)}
                      </p>
                    </div>
                    <div className="text-sm text-[#616f89]">
                      <span className="font-medium text-[#111318]">Status:</span>{' '}
                      {domProgress?.status || domStatus}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#059669] transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, Number(domProgress?.progress_percent || 0))
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-[#616f89] sm:flex-row sm:items-center sm:justify-between">
                      <span>{domProgress?.progress_stage || 'Preparando'}</span>
                      <span>
                        {domProgress?.progress_current ?? 0}/{domProgress?.progress_total ?? 0} |{' '}
                        {Math.round(Number(domProgress?.progress_percent || 0))}%
                      </span>
                    </div>
                  </div>

                  {domDocuments.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                          Uploads activos
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-blue-950">
                          {notebookUploadDocumentStats.active}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-blue-700">
                          Subidas en paralelo corriendo ahora mismo.
                        </p>
                      </div>
                      <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                          Subidos
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-teal-950">
                          {notebookUploadDocumentStats.uploaded}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-teal-700">
                          Documentos que ya quedaron en NotebookLM.
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          Pendientes
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-amber-950">
                          {notebookUploadDocumentStats.pending}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-amber-700">
                          Aun no terminan de subirse o esperan reintento.
                        </p>
                      </div>
                      <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                          Fallidos
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-rose-950">
                          {notebookUploadDocumentStats.failed}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-rose-700">
                          Documentos que necesitaran reintento.
                        </p>
                      </div>
                    </div>
                  )}

                  {shouldShowRetryNotebookUploadActions && (
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleRetryFailedNotebookUploads();
                        }}
                        disabled={!canRetryNotebookUpload}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        {isRetryingNotebookUpload
                          ? 'Reintentando...'
                          : `Reintentar fallidos (${retryDocumentsCount})`}
                      </button>
                      {shouldShowManualRetryDownload && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleDownloadRetryDocuments();
                          }}
                          disabled={!canDownloadRetryDocuments}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          {isDownloadingRetryDocuments
                            ? 'Descargando...'
                            : `Descargar documentos fallidos (${retryDocumentsCount})`}
                        </button>
                      )}
                    </div>
                  )}

                  {(domStatus === 'success' || domStatus === 'partial_success') && (
                    <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
                      La carga al notebook termino con estado {domStatus}.
                    </div>
                  )}

                  {shouldShowRetryNotebookUploadActions && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="sm:min-w-0 sm:flex-1">
                        <p className="font-semibold">
                          {shouldShowManualRetryDownload
                            ? `Quedaron ${retryDocumentsCount} documento(s) que no pudieron ser cargados`
                            : `Quedaron ${retryDocumentsCount} documento(s) pendiente(s) de carga`}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          {shouldShowManualRetryDownload
                            ? 'Quedaron documentos que no pudieron ser cargados, asi que por favor descargalos y subamoslos de manera manual.'
                            : 'Puedes revisar los documentos que fallaron o no alcanzaron a subirse correctamente antes de reintentar.'}
                        </p>
                        {shouldShowManualRetryDownload && (
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                            Reintentos manuales realizados: {retryAttempts}
                          </p>
                        )}
                        {retryDocumentNames.length > 0 && (
                          <div className="mt-2 text-[11px] leading-5 text-amber-700">
                            <p className="font-semibold">Archivos pendientes:</p>
                            <div className="mt-1 space-y-1">
                              {retryDocumentNames.map((fileName, index) => (
                                <p key={`${fileName}-${index}`} className="break-words">
                                  {fileName}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {domStatus === 'failed' && errorMessage && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={isModuleTwoActionDisabled}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">
                    {moduleTwoActionIcon}
                  </span>
                  {moduleTwoActionLabel}
                </button>
              </div>
            </section>
            )}

            {activeModule === '03' && (
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <span className="material-symbols-outlined">group_add</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Modulo 3
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[#111318]">
                    Personas autorizadas
                  </h2>
                  <p className="mt-1 text-sm text-[#616f89]">
                    Guarda el ID del notebook y selecciona con quienes compartirlo.
                  </p>
                </div>
              </div>

              <div>
                {!hasValidNotebookCookieAuth && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Valida y guarda cookies de NotebookLM antes de compartir el notebook con otras
                    personas.
                  </div>
                )}
                <label
                  className="block text-sm font-semibold text-gray-700"
                  htmlFor="notebook-id"
                >
                  ID del Notebook
                </label>
                <input
                  id="notebook-id"
                  type="text"
                  value={notebookId}
                  onChange={(event) => setNotebookId(event.target.value)}
                  placeholder="Se completara al crear o seleccionar el notebook"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {notebookUrl && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Link completo del notebook
                    </p>
                    <a
                      href={notebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block break-all text-sm font-medium text-[#0f766e] underline decoration-transparent underline-offset-2 transition hover:decoration-current"
                    >
                      {notebookUrl}
                    </a>
                    <p className="mt-2 text-xs text-[#616f89]">
                      Abre el notebook en otra pestana para compartirlo desde NotebookLM.
                    </p>
                    <div className="mt-3">
                      <label
                        className="block text-sm font-semibold text-gray-700"
                        htmlFor="share-permission"
                      >
                        Permiso de acceso
                      </label>
                      <select
                        id="share-permission"
                        value={sharePermission}
                        onChange={(event) =>
                          setSharePermission(event.target.value as NotebookSharePermission)
                        }
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="viewer">viewer</option>
                        <option value="editor">editor</option>
                      </select>
                      <p className="mt-2 text-xs text-[#616f89]">
                        Se enviara un POST por cada usuario con `notify: true` y el mensaje
                        `Te comparto este notebook.`
                      </p>
                    </div>
                    {shareFeedback && (
                      <div
                        className={`mt-3 rounded-lg border p-3 text-sm ${
                          shareFeedback.tone === 'success'
                            ? 'border-teal-200 bg-teal-50 text-teal-800'
                            : shareFeedback.tone === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {shareFeedback.message}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          void handleShareNotebook();
                        }}
                        disabled={
                          isSharingNotebook ||
                          !hasValidNotebookCookieAuth ||
                          !notebookId.trim() ||
                          selectedPersonIds.length === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isSharingNotebook ? 'progress_activity' : 'share'}
                        </span>
                        {isSharingNotebook ? 'Compartiendo...' : 'Compartir'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label
                      className="block text-sm font-semibold text-gray-700"
                      htmlFor="authorized-person-search"
                    >
                      Personas para compartir
                    </label>
                    <p className="mt-1 text-sm text-[#616f89]">
                      Busca por nombre, RUT, correo, cargo o gerencia.
                    </p>
                  </div>
                  {selectedPersonIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedPersonIds([])}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#111318] transition-colors hover:border-primary hover:bg-gray-50"
                    >
                      Limpiar seleccion
                    </button>
                  )}
                </div>

                <input
                  id="authorized-person-search"
                  type="text"
                  value={personSearchTerm}
                  onChange={(event) => setPersonSearchTerm(event.target.value)}
                  placeholder="Buscar persona"
                  className="mt-3 w-full rounded-lg border border-gray-200 px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                  {loadingPeople ? (
                    <div className="flex items-center justify-center gap-3 p-6 text-sm text-[#616f89]">
                      <div className="size-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin"></div>
                      Cargando personas...
                    </div>
                  ) : peopleError ? (
                    <div className="p-4 text-sm text-amber-700">{peopleError}</div>
                  ) : filteredPeople.length === 0 ? (
                    <div className="p-4 text-sm text-[#616f89]">
                      No hay personas para mostrar.
                    </div>
                  ) : (
                    filteredPeople.map((person) => {
                      const isSelected = selectedPersonIds.includes(person.id);
                      const email = getPersonaEmail(person);

                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => togglePerson(person.id)}
                          className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                            isSelected ? 'bg-teal-50' : 'bg-white hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${
                              isSelected
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-gray-300 bg-white text-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[#111318]">
                              {person.nombre_completo}
                            </span>
                            <span className="mt-1 block text-xs text-[#616f89]">
                              {[email, person.rut].filter(Boolean).join(' · ') ||
                                'Sin correo registrado'}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
            )}
          </div>

          <aside className="h-fit rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111318]">Resumen</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="font-semibold text-gray-700">Documento</p>
                <p className="mt-1 break-words text-[#616f89]">
                  {documentUrl.trim() || 'Sin URL cargada'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Tipo</p>
                <p className="mt-1 text-[#616f89]">{documentType}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Notebook</p>
                <p className="mt-1 text-[#616f89]">
                  {displayNotebookName}
                </p>
                <p className="mt-1 break-words text-xs text-[#616f89]">
                  ID: {notebookId.trim() || 'Pendiente'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Si aplica</p>
                {selectedKeywords.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedKeywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-[#111318]"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[#616f89]">Sin palabras seleccionadas</p>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-700">Personas autorizadas</p>
                {selectedPeople.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedPeople.map((person) => (
                      <div
                        key={person.id}
                        className="rounded-lg bg-gray-100 px-3 py-2"
                      >
                        <p className="font-medium text-[#111318]">{person.nombre_completo}</p>
                        <p className="mt-0.5 break-words text-xs text-[#616f89]">
                          {getPersonaEmail(person) || 'Sin correo registrado'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[#616f89]">Sin personas seleccionadas</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {domStatus === 'listed' && activeModule === '01' && (
          <section className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#111318]">
                  Documentos listados ({domDocuments.length})
                </h2>
                <p className="mt-1 text-sm text-[#616f89]">
                  Selecciona filas para limpiar la tabla mostrada en pantalla o descarga un
                  ZIP con los nombres preparados para NotebookLM.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleConfirmDomSelection}
                  className="inline-flex items-center justify-center rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#047857]"
                >
                  Confirmar y pasar al Modulo 2
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSelectedDocuments}
                  disabled={!canDownloadSelectedDocuments}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                  {isDownloadingSelectedDocuments
                    ? 'Preparando ZIP...'
                    : `Descargar ZIP visibles (${filteredDocumentIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={toggleSelectAllDomDocuments}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111318] transition-colors hover:border-primary hover:bg-gray-50"
                >
                  {allDomDocumentsSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedDomDocuments}
                  disabled={selectedDomDocumentIds.length === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar seleccionados ({selectedDomDocumentIds.length})
                </button>
              </div>
            </div>

            {domDocuments.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-14 px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#616f89]">
                        Sel.
                      </th>
                      {documentColumns.map((column) => (
                        <th
                          key={column}
                          className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-[#616f89]"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {domDocumentsWithIds.map(({ clientId, document }) => {
                      const isSelected = selectedDomDocumentIds.includes(clientId);

                      return (
                        <tr key={clientId} className={isSelected ? 'bg-teal-50' : 'bg-white'}>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDomDocumentSelection(clientId)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#059669] focus:ring-[#059669]"
                            />
                          </td>
                          {documentColumns.map((column) => (
                            <td key={column} className="px-3 py-2 align-top text-[#111318]">
                              {String(document[column] ?? '')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#616f89]">
                No quedan documentos visibles en la tabla.
              </p>
            )}
          </section>
        )}
      </form>
    </div>
  );
};

export default NotebookLMView;
