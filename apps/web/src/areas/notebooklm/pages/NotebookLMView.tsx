import React, { useEffect, useMemo, useState } from 'react';
import {
  downloadSeiaDocuments,
  fetchNotebookAuthorizedPeople,
  fetchNotebookOptions,
  getDownloadSeiaDocumentsStatus,
} from '../services/notebookLMService';
import type {
  DownloadSeiaDocumentItem,
  DownloadSeiaDocumentsStatusResponse,
  NotebookAuthorizedPerson,
  NotebookOption,
} from '../services/notebookLMService';

type NotebookDocumentType = 'EIA' | 'DIA' | 'ADENDA';
type NotebookTargetMode = 'new' | 'existing';
type NotebookModuleStep = '01' | '02' | '03';

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

type DomPollingStatus = 'idle' | 'running' | 'listed' | 'failed' | 'success' | 'partial_success';

const DEFAULT_KEYWORDS = [
  'planitmetria',
  'planimetria',
  'hds',
  'plano',
  'planos',
  'lamina',
  'laminas',
  'apendices',
  'apendice',
  'foto',
];

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

const NotebookLMView: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NotebookModuleStep>('01');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState<NotebookDocumentType>('EIA');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [notebookTargetMode, setNotebookTargetMode] = useState<NotebookTargetMode>('new');
  const [newNotebookName, setNewNotebookName] = useState('');
  const [selectedNotebookCatalogId, setSelectedNotebookCatalogId] = useState('');
  const [notebookId, setNotebookId] = useState('');
  const [availableNotebooks, setAvailableNotebooks] = useState<NotebookOption[]>([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(true);
  const [notebooksError, setNotebooksError] = useState('');
  const [people, setPeople] = useState<NotebookAuthorizedPerson[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [peopleError, setPeopleError] = useState('');
  const [personSearchTerm, setPersonSearchTerm] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<number[]>([]);
  const [preparedNotebook, setPreparedNotebook] = useState<PreparedNotebook | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGeneratingDom, setIsGeneratingDom] = useState(false);
  const [domGenerationError, setDomGenerationError] = useState('');
  const [domRunId, setDomRunId] = useState('');
  const [domStatus, setDomStatus] = useState<DomPollingStatus>('idle');
  const [domProgress, setDomProgress] = useState<DownloadSeiaDocumentsStatusResponse | null>(null);
  const [domDocuments, setDomDocuments] = useState<DownloadSeiaDocumentItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadNotebooks = async () => {
      try {
        setLoadingNotebooks(true);
        setNotebooksError('');
        const data = await fetchNotebookOptions();
        if (!mounted) return;
        setAvailableNotebooks(data);
      } catch (error) {
        console.error('Error loading notebooks:', error);
        if (!mounted) return;
        setAvailableNotebooks([]);
        setNotebooksError('No pudimos cargar los notebooks disponibles.');
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
  }, []);

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

  const selectedNotebook = useMemo(() => {
    return (
      availableNotebooks.find((notebook) => notebook.id === selectedNotebookCatalogId) || null
    );
  }, [availableNotebooks, selectedNotebookCatalogId]);

  useEffect(() => {
    if (notebookTargetMode === 'existing') {
      setNotebookId(selectedNotebook?.notebook_id || '');
      return;
    }

    setSelectedNotebookCatalogId('');
    setNotebookId('');
  }, [notebookTargetMode, selectedNotebook]);

  const keywordOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_KEYWORDS, ...selectedKeywords])).sort((a, b) =>
      a.localeCompare(b, 'es')
    );
  }, [selectedKeywords]);

  const selectedPeople = useMemo(() => {
    const selectedSet = new Set(selectedPersonIds);
    return people.filter((person) => selectedSet.has(person.id));
  }, [people, selectedPersonIds]);

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

  const documentColumns = useMemo(() => {
    const keys = new Set<string>();
    domDocuments.forEach((document) => {
      Object.keys(document).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [domDocuments]);

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextUrl = documentUrl.trim();
    if (!isValidHttpUrl(nextUrl)) {
      setErrorMessage('Ingresa una URL valida del documento.');
      return;
    }

    if (notebookTargetMode === 'new' && !newNotebookName.trim()) {
      setErrorMessage('Ingresa el nombre del notebook nuevo.');
      return;
    }

    if (notebookTargetMode === 'existing' && !selectedNotebookCatalogId) {
      setErrorMessage('Selecciona el notebook donde se cargaran los archivos.');
      return;
    }

    setErrorMessage('');
    setPreparedNotebook({
      id: `NB-${Date.now()}`,
      documentUrl: nextUrl,
      documentType,
      keywords: selectedKeywords,
      notebookTargetMode,
      notebookName: displayNotebookName,
      notebookId: notebookId.trim(),
      authorizedPeople: selectedPeople.map((person) => ({
        id: person.id,
        name: person.nombre_completo,
        email: getPersonaEmail(person),
      })),
      createdAt: new Date().toLocaleString('es-CL'),
    });
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
    setDomProgress(null);
    setDomDocuments([]);
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
    } catch (error) {
      setDomStatus('failed');
      setDomGenerationError(
        error instanceof Error ? error.message : 'No pudimos generar el DOM.'
      );
    } finally {
      setIsGeneratingDom(false);
    }
  };

  useEffect(() => {
    if (!domRunId) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const terminalStatuses = new Set(['listed', 'failed', 'success', 'partial_success']);

    const pollStatus = async () => {
      try {
        const nextStatus = await getDownloadSeiaDocumentsStatus(domRunId);
        if (cancelled) return;

        const normalizedStatus = String(nextStatus.status || 'running').toLowerCase();
        setDomProgress(nextStatus);
        setDomDocuments(Array.isArray(nextStatus.documents) ? nextStatus.documents : []);

        if (
          normalizedStatus === 'listed' ||
          normalizedStatus === 'failed' ||
          normalizedStatus === 'success' ||
          normalizedStatus === 'partial_success'
        ) {
          setDomStatus(normalizedStatus as DomPollingStatus);
        } else {
          setDomStatus('running');
        }

        if (normalizedStatus === 'failed' && nextStatus.error_message) {
          setDomGenerationError(nextStatus.error_message);
        }

        if (!terminalStatuses.has(normalizedStatus)) {
          timeoutId = setTimeout(() => {
            void pollStatus();
          }, 3000);
        }
      } catch (error) {
        if (cancelled) return;
        setDomStatus('failed');
        setDomGenerationError(
          error instanceof Error
            ? error.message
            : 'No pudimos consultar el estado de la generacion del DOM.'
        );
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [domRunId]);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 md:p-6">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
              <span className="material-symbols-outlined text-base">auto_stories</span>
              NotebookLM
            </div>
            <h1 className="text-3xl font-bold text-[#111318]">Crear Notebook</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#616f89]">
              Descarga, filtra, carga y comparte documentos ambientales desde un solo flujo.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#059669] px-4 py-2 font-medium text-white transition-colors hover:bg-[#047857]"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Crear Notebook
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
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
                      Pega la URL del documento, define su tipo y marca las palabras que aplican.
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
                  {isGeneratingDom ? 'Generando...' : 'GenerarDOM'}
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
                  Selecciona una o varias palabras y agrega las que falten.
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
                      <div>
                        <p className="text-sm font-semibold text-[#111318]">Estado de descarga</p>
                        <p className="mt-1 text-sm text-[#616f89]">
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

                    {domStatus === 'listed' && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-[#111318]">
                          Documentos listados ({domDocuments.length})
                        </p>
                        {domDocuments.length > 0 ? (
                          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50">
                                <tr>
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
                                {domDocuments.map((document, index) => (
                                  <tr key={`${index}-${String(document.url || document.nombre || 'doc')}`}>
                                    {documentColumns.map((column) => (
                                      <td
                                        key={column}
                                        className="px-3 py-2 align-top text-[#111318]"
                                      >
                                        {String(document[column] ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-[#616f89]">
                            La API termino en estado `listed`, pero no devolvio documentos.
                          </p>
                        )}
                      </div>
                    )}

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
                  <select
                    id="existing-notebook"
                    value={selectedNotebookCatalogId}
                    onChange={(event) => setSelectedNotebookCatalogId(event.target.value)}
                    disabled={loadingNotebooks || availableNotebooks.length === 0}
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-[#111318] focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option value="">
                      {loadingNotebooks
                        ? 'Cargando notebooks...'
                        : 'Selecciona un notebook'}
                    </option>
                    {availableNotebooks.map((notebook) => (
                      <option key={notebook.id} value={notebook.id}>
                        {notebook.nombre}
                      </option>
                    ))}
                  </select>
                  {notebooksError && (
                    <p className="mt-2 text-xs text-amber-700">{notebooksError}</p>
                  )}
                  {!loadingNotebooks && availableNotebooks.length === 0 && !notebooksError && (
                    <p className="mt-2 text-xs text-[#616f89]">
                      No hay notebooks disponibles en el catalogo.
                    </p>
                  )}
                </div>
              )}
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
      </form>
    </div>
  );
};

export default NotebookLMView;
