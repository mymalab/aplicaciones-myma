import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchPreguntaById,
  fetchPreguntasCatalogos,
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

interface DraftPregunta {
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
  encargado_persona_id: number | null;
  especialidad_id: number | null;
  estrategia: string;
  respuesta_ia: string;
}

const buildDraftFromPregunta = (pregunta: PreguntaGestion): DraftPregunta => ({
  estado: normalizeEstadoPregunta(pregunta.estado),
  complejidad: normalizeComplejidadPregunta(pregunta.complejidad),
  encargado_persona_id: pregunta.encargado_persona_id,
  especialidad_id: pregunta.especialidad_id,
  estrategia: pregunta.estrategia || '',
  respuesta_ia: pregunta.respuesta_ia || '',
});

const PreguntaDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma, preguntaId } = useParams<{ codigoMyma?: string; preguntaId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState<PreguntaGestion | null>(null);
  const [personas, setPersonas] = useState<CatalogoPersona[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogoEspecialidad[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftPregunta | null>(null);
  const [selectedAdjunto, setSelectedAdjunto] = useState<PreguntaAdjunto | null>(null);

  const preguntaIdNumber = useMemo(() => {
    const parsed = Number(preguntaId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [preguntaId]);

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
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    if (!pregunta) return;
    setDraft(buildDraftFromPregunta(pregunta));
    setIsEditing(false);
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

      const originalEstrategia = (pregunta.estrategia || '').trim();
      const originalRespuestaIa = (pregunta.respuesta_ia || '').trim();
      const draftEstrategia = draft.estrategia.trim();
      const draftRespuestaIa = draft.respuesta_ia.trim();

      if (draftEstrategia !== originalEstrategia) {
        payload.estrategia = draftEstrategia || null;
      }

      if (draftRespuestaIa !== originalRespuestaIa) {
        payload.respuesta_ia = draftRespuestaIa || null;
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
      setSuccessMessage('Cambios guardados correctamente.');
    } catch (err: any) {
      console.error('Error saving pregunta:', err);
      setError(err?.message || 'No fue posible guardar los cambios.');
    } finally {
      setSaving(false);
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
            <label className="block text-sm font-medium text-gray-500 mb-2">Pregunta</label>
            <p className="text-sm text-[#111318] leading-relaxed whitespace-pre-wrap">{pregunta.texto}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Estrategia</label>
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
            <label className="block text-sm font-medium text-gray-500 mb-2">Respuesta IA</label>
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

