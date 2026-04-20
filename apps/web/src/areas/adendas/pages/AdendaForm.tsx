import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TipoAdendaSelector from '../components/TipoAdendaSelector';
import { TipoAdenda } from '../constants';
import { Adenda, NewAdendaPayload } from '../types';
import { fetchAdendaById, createAdenda, updateAdenda } from '../services/adendasService';
import { adendasList } from '../utils/routes';

const ADENDAS_PROXY_BASE = '/api/acreditacion/adendas';
const ADENDAS_LOCAL_PROXY_BASE = '/api/acreditacion/adendas-local';
const ADENDAS_LOCAL_DIRECT_BASE = (
  import.meta.env.VITE_ADENDAS_LOCAL_API_BASE_URL || 'http://localhost:8000/v1'
)
  .trim()
  .replace(/\/+$/, '');
const ADENDAS_LOCAL_API_KEY = (
  import.meta.env.VITE_ADENDAS_LOCAL_API_KEY ||
  import.meta.env.VITE_ICSARA_API_KEY ||
  ''
).trim();

const shouldUseLocalApiProxy = (() => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const targetUrl = new URL(ADENDAS_LOCAL_DIRECT_BASE);
    return (
      ['localhost', '127.0.0.1'].includes(targetUrl.hostname) &&
      targetUrl.origin !== window.location.origin
    );
  } catch (error) {
    console.warn('No se pudo analizar VITE_ADENDAS_LOCAL_API_BASE_URL, usando acceso directo.', error);
    return false;
  }
})();

const ADENDAS_LOCAL_BASE = shouldUseLocalApiProxy
  ? ADENDAS_LOCAL_PROXY_BASE
  : ADENDAS_LOCAL_DIRECT_BASE;

interface AdendasApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  strictHealthCheck?: boolean;
}

const ADENDAS_REMOTE_CONFIG: AdendasApiConfig = {
  baseUrl: ADENDAS_PROXY_BASE,
  strictHealthCheck: false,
};

const ADENDAS_LOCAL_CONFIG: AdendasApiConfig = {
  baseUrl: ADENDAS_LOCAL_BASE,
  strictHealthCheck: true,
  headers:
    !shouldUseLocalApiProxy && ADENDAS_LOCAL_API_KEY
      ? { 'X-API-Key': ADENDAS_LOCAL_API_KEY }
      : undefined,
};

const buildAdendasUrl = (baseUrl: string, path: string) => `${baseUrl}${path}`;
const getResponseContentType = (response: Response) =>
  response.headers.get('content-type')?.toLowerCase() ?? '';

/**
 * Verifica si el servidor de la API está disponible usando el endpoint de health check
 * Retorna un objeto con el estado y un mensaje de error si falla
 */
export async function verificarConexionApi(
  apiConfig: AdendasApiConfig = ADENDAS_REMOTE_CONFIG
): Promise<{ disponible: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos

    const healthUrl = buildAdendasUrl(apiConfig.baseUrl, '/health/live');
    console.log(`Verificando conexión con: ${healthUrl}`);

    const res = await fetch(healthUrl, {
      method: "GET",
      signal: controller.signal,
      headers: apiConfig.headers,
    });

    clearTimeout(timeoutId);
    
    console.log(`Respuesta del health check: ${res.status} ${res.statusText}`);

    if (apiConfig.strictHealthCheck && !res.ok) {
      return {
        disponible: false,
        error: `Health check falló con código ${res.status}: ${res.statusText}`,
      };
    }
    
    // Si obtenemos una respuesta (incluso si no es 200), el servidor está disponible
    if (res.ok || res.status < 500) {
      return { disponible: true };
    }
    
    return { 
      disponible: false, 
      error: `El servidor respondió con código ${res.status}: ${res.statusText}` 
    };
  } catch (error) {
    console.error('Error al verificar conexión:', error);
    
    // Si es un error de red (Failed to fetch), el servidor no está disponible
    if (error instanceof TypeError) {
      if (error.message === 'Failed to fetch') {
        return { 
          disponible: false, 
          error: `No se pudo conectar con el servidor en ${apiConfig.baseUrl}. Posibles causas: servidor no está corriendo o la ruta es incorrecta.` 
        };
      }
      return { 
        disponible: false, 
        error: `Error de red: ${error.message}` 
      };
    }
    
    // Si es un error de abort (timeout), el servidor no está disponible
    if (error instanceof Error && error.name === 'AbortError') {
      return { 
        disponible: false, 
        error: 'Timeout: El servidor no respondió en 5 segundos' 
      };
    }
    
    // Otros errores
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return { 
      disponible: false, 
      error: `Error al verificar conexión: ${errorMessage}` 
    };
  }
}

export async function subirPdfAApi(
  pdfFile: File,
  idAdenda: number,
  apiConfig: AdendasApiConfig = ADENDAS_REMOTE_CONFIG
) {
  try {
    const uploadUrl = buildAdendasUrl(apiConfig.baseUrl, '/jobs');
    console.log(`Intentando subir PDF a: ${uploadUrl}`);
    console.log(`Tamaño del archivo: ${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("id_adenda", String(idAdenda));
    formData.append("classify", "true");
    formData.append("include_png", "true");

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: apiConfig.headers,
      body: formData,
    });

    console.log(`Respuesta del servidor: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Error del servidor: ${errorText}`);
      throw new Error(`Error al subir PDF: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const contentType = getResponseContentType(res);
    if (!contentType.includes('application/json')) {
      const rawBody = await res.text();
      throw new Error(
        `La API respondió sin JSON válido (${contentType || 'sin content-type'}). ${rawBody}`
      );
    }

    const responseData = await res.json();
    console.log('Respuesta exitosa:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error completo al subir PDF:', error);
    
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `No se pudo conectar con el servidor en ${apiConfig.baseUrl}/jobs. ` +
        `Posibles causas:\n` +
        `- El servidor no está corriendo\n` +
        `- La ruta no está disponible\n\n` +
        `Verifica la consola del navegador (F12) para más detalles.`
      );
    }
    throw error;
  }
}

export async function esperarResultado(
  jobId: string,
  apiConfig: AdendasApiConfig = ADENDAS_REMOTE_CONFIG
) {
  while (true) {
    try {
      const res = await fetch(buildAdendasUrl(apiConfig.baseUrl, `/jobs/${jobId}`), {
        headers: apiConfig.headers,
      });

      if (!res.ok) {
        throw new Error(`Error al consultar el estado del job: ${res.status} ${res.statusText}`);
      }

      const contentType = getResponseContentType(res);
      if (!contentType.includes('application/json')) {
        const rawBody = await res.text();
        throw new Error(
          `Estado del job sin JSON válido (${contentType || 'sin content-type'}). ${rawBody}`
        );
      }

      const s = await res.json();

      if (s.status === "done") {
        const resultRes = await fetch(buildAdendasUrl(apiConfig.baseUrl, `/jobs/${jobId}/result`), {
          headers: apiConfig.headers,
        });

        if (!resultRes.ok) {
          throw new Error(`Error al obtener el resultado: ${resultRes.status} ${resultRes.statusText}`);
        }

        const resultContentType = getResponseContentType(resultRes);
        if (!resultContentType.includes('application/json')) {
          const rawBody = await resultRes.text();
          throw new Error(
            `Resultado sin JSON válido (${resultContentType || 'sin content-type'}). ${rawBody}`
          );
        }

        return resultRes.json();
      }

      if (s.status === "failed" || s.status === "expired") {
        throw new Error(`${s.status}: ${s.error_message || ""}`);
      }

      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`No se pudo conectar con el servidor. Verifica que ${apiConfig.baseUrl} esté disponible.`);
      }
      throw error;
    }
  }
}

/**
 * Obtiene las preguntas clasificadas del resultado del job
 */
export async function obtenerPreguntasClasificadas(
  jobId: string,
  apiConfig: AdendasApiConfig = ADENDAS_REMOTE_CONFIG
) {
  try {
    const url = buildAdendasUrl(apiConfig.baseUrl, `/jobs/${jobId}/preguntas_clasificadas`);
    console.log(`Obteniendo preguntas clasificadas de: ${url}`);

    const res = await fetch(url, {
      method: "GET",
      headers: apiConfig.headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error al obtener preguntas clasificadas: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const contentType = getResponseContentType(res);
    if (!contentType.includes('application/json')) {
      const rawBody = await res.text();
      throw new Error(
        `Preguntas clasificadas sin JSON válido (${contentType || 'sin content-type'}). ${rawBody}`
      );
    }

    const preguntasClasificadas = await res.json();
    console.log('Preguntas clasificadas obtenidas:', preguntasClasificadas);
    return preguntasClasificadas;
  } catch (error) {
    console.error('Error al obtener preguntas clasificadas:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`No se pudo conectar con el servidor. Verifica que ${apiConfig.baseUrl} esté disponible.`);
    }
    throw error;
  }
}

interface AdendaFormProps {
  onBack?: () => void;
  onSave?: () => void;
}

type SubmitTarget = 'remote' | 'local' | null;

const AdendaForm: React.FC<AdendaFormProps> = ({ onBack, onSave }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [tipo, setTipo] = useState<TipoAdenda | undefined>(undefined);
  const [codigoMyma, setCodigoMyma] = useState('');
  const [nombre, setNombre] = useState('');
  const [urlProyecto, setUrlProyecto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [estado, setEstado] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget>(null);
  const [error, setError] = useState<string | null>(null);
  const [preguntasClasificadas, setPreguntasClasificadas] = useState<any>(null);
  const [mostrarPopup, setMostrarPopup] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadAdenda(parseInt(id));
    }
  }, [isEditing, id]);

  const loadAdenda = async (adendaId: number) => {
    try {
      setLoading(true);
      const adenda = await fetchAdendaById(adendaId);
      if (adenda) {
        setTipo(adenda.tipo);
        setCodigoMyma(adenda.codigo_myma || '');
        setNombre(adenda.nombre || '');
        setUrlProyecto(adenda.url_proyecto || '');
        setDescripcion(adenda.descripcion || '');
        setFechaEntrega(adenda.fecha_entrega || '');
        setEstado(adenda.estado || '');
      }
    } catch (error) {
      console.error('Error loading adenda:', error);
      setError('Error al cargar la adenda');
    } finally {
      setLoading(false);
    }
  };

  const finalizarGuardado = () => {
    if (onSave) {
      onSave();
    } else {
      navigate(adendasList());
    }
  };

  const guardarAdenda = async (redirect = true): Promise<Adenda> => {
    try {
      setSaving(true);
      setError(null);

      const payload: NewAdendaPayload = {
        tipo,
        codigo_myma: codigoMyma || undefined,
        nombre: nombre || undefined,
        url_proyecto: urlProyecto.trim() || undefined,
        descripcion: descripcion || undefined,
        fecha_entrega: fechaEntrega || undefined,
        estado: estado || undefined,
      };

      let adendaGuardada: Adenda;
      if (isEditing && id) {
        adendaGuardada = await updateAdenda(parseInt(id), payload);
      } else {
        adendaGuardada = await createAdenda(payload);
      }

      if (redirect) {
        finalizarGuardado();
      }

      return adendaGuardada;
    } catch (error) {
      console.error('Error saving adenda:', error);
      setError('Error al guardar la adenda. Por favor, intente nuevamente.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleCerrarPopup = async () => {
    setMostrarPopup(false);
    // Esperar un momento para que el popup se cierre visualmente
    await new Promise(resolve => setTimeout(resolve, 100));
    finalizarGuardado();
  };

  const procesarGuardado = async (
    apiConfig: AdendasApiConfig,
    target: Exclude<SubmitTarget, null>
  ) => {
    if (!tipo) {
      setError('Debe seleccionar un tipo de adenda');
      return;
    }

    setSubmitTarget(target);

    try {
      setSaving(true);
      setError(null);

      // Subir PDF a la API si hay un archivo seleccionado
      if (archivo) {
        try {
          setProcesandoPdf(true);
          
          // Verificar conexión con el servidor antes de intentar subir
          console.log('Verificando conexión con el servidor...');
          const conexion = await verificarConexionApi(apiConfig);
          
          if (!conexion.disponible) {
            console.warn('Advertencia de conexión:', conexion.error);
            if (apiConfig.strictHealthCheck) {
              throw new Error(conexion.error || 'Health check falló para la API local.');
            }
            // Mostramos un warning pero continuamos, ya que el error real se mostrará al intentar subir
            // Esto ayuda a diagnosticar problemas de CORS que pueden afectar el health check pero no el POST
            const mensajeWarning = conexion.error || 
              `No se pudo verificar la conexión con el servidor. Intentando subir el archivo de todas formas...`;
            console.warn(mensajeWarning);
            // No lanzamos error aquí, dejamos que el intento de subida muestre el error real
          } else {
            console.log('Conexión verificada exitosamente.');
          }
          
          const adendaGuardada = await guardarAdenda(false);
          console.log('Subiendo PDF a la API...');
          const jobResponse = await subirPdfAApi(archivo, adendaGuardada.id, apiConfig);
          console.log('PDF subido exitosamente, respuesta:', jobResponse);
          
          // Obtener el jobId del response (puede ser jobResponse.id, jobResponse.job_id, etc.)
          const jobId = jobResponse.id || jobResponse.job_id || jobResponse.jobId;
          
          if (!jobId) {
            console.error('Respuesta de la API:', jobResponse);
            throw new Error('No se recibió un jobId válido de la API. Verifica la respuesta del servidor.');
          }

          // Esperar el resultado del procesamiento
          console.log('Esperando resultado del procesamiento, jobId:', jobId);
          const resultado = await esperarResultado(jobId, apiConfig);
          console.log('Resultado del procesamiento:', resultado);
          
          // Obtener las preguntas clasificadas
          console.log('Obteniendo preguntas clasificadas...');
          const preguntas = await obtenerPreguntasClasificadas(jobId, apiConfig);
          console.log('Preguntas clasificadas:', preguntas);
          
          // Guardar las preguntas clasificadas y mostrar el popup
          setPreguntasClasificadas(preguntas);
          setMostrarPopup(true);
          
          // Detener aquí para que el usuario pueda ver el popup
          // El guardado continuará cuando el usuario cierre el popup
          setProcesandoPdf(false);
          return; // Salir temprano para no guardar/navegar todavía
        } catch (error) {
          console.error('Error al procesar PDF:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          setError(errorMessage);
          setSaving(false);
          setProcesandoPdf(false);
          return;
        } finally {
          setProcesandoPdf(false);
        }
      }

      // Si llegamos aquí y no hay popup abierto, guardar la adenda normalmente
      // (esto solo ocurre si no hay archivo PDF)
      await guardarAdenda();
    } catch (error) {
      console.error('Error en procesarGuardado:', error);
      setError('Error al procesar la solicitud. Por favor, intente nuevamente.');
      setSaving(false);
      setProcesandoPdf(false);
    } finally {
      setSubmitTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await procesarGuardado(ADENDAS_REMOTE_CONFIG, 'remote');
  };

  const handleGuardarEnLocal = async () => {
    await procesarGuardado(ADENDAS_LOCAL_CONFIG, 'local');
  };

  const isRemoteSubmitting = submitTarget === 'remote' && (saving || procesandoPdf);
  const isLocalSubmitting = submitTarget === 'local' && (saving || procesandoPdf);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(adendasList());
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      setArchivo(file);
      setError(null);
    } else {
      setError('Por favor, seleccione un archivo PDF válido.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setArchivo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando adenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </button>
          <h1 className="text-3xl font-bold text-[#111318]">
            {isEditing ? 'Editar Adenda' : 'Nueva Adenda'}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Tipo de Adenda Selector */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Tipo de Adenda <span className="text-red-500">*</span>
              </label>
              <TipoAdendaSelector value={tipo} onChange={setTipo} />
            </div>

            {/* Código MyMA */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Código MyMA
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={codigoMyma}
                  onChange={(e) => setCodigoMyma(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: MY-50-2025"
                  list="codigos-myma"
                />
                <datalist id="codigos-myma">
                  <option value="MY-50-2025" />
                  <option value="MY-15-2025" />
                  <option value="MY-22-2025" />
                  <option value="MY-16-2025" />
                  <option value="MY-98-2025" />
                </datalist>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese el nombre de la adenda"
              />
            </div>

            {/* URL del proyecto */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                URL del proyecto
              </label>
              <input
                type="url"
                value={urlProyecto}
                onChange={(e) => setUrlProyecto(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese la descripción de la adenda"
              />
            </div>

            {/* Fecha de entrega */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Fecha de entrega
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese el estado"
              />
            </div>

            {/* Carga de Archivo PDF */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Archivo PDF
              </label>
              
              {archivo ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-600 text-2xl">description</span>
                      <div>
                        <p className="text-sm font-medium text-[#111318]">{archivo.name}</p>
                        <p className="text-xs text-gray-500">
                          {(archivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Eliminar archivo"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">
                      description
                    </span>
                    <p className="text-sm text-gray-600 mb-2">Arrastra tu archivo aquí</p>
                    <span className="text-gray-400 text-sm">o</span>
                    <label className="block mt-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="file-input"
                      />
                      <span className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 cursor-pointer transition-colors">
                        Seleccionar archivo
                      </span>
                    </label>
                  </div>
                  
                  {/* Mensaje de advertencia */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <span className="material-symbols-outlined text-yellow-600 text-lg">warning</span>
                    <p className="text-sm text-yellow-800">
                      Asegúrate de que el archivo sea un PDF válido para procesar la adenda.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[#111318] hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarEnLocal}
              disabled={saving || procesandoPdf || !tipo}
              className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLocalSubmitting && (
                <span className="material-symbols-outlined animate-spin">sync</span>
              )}
              {isLocalSubmitting
                ? procesandoPdf
                  ? 'Procesando PDF...'
                  : 'Guardando...'
                : 'Guardar en local'}
            </button>
            <button
              type="submit"
              disabled={saving || procesandoPdf || !tipo}
              className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRemoteSubmitting && (
                <span className="material-symbols-outlined animate-spin">sync</span>
              )}
              {isRemoteSubmitting
                ? procesandoPdf
                  ? 'Procesando PDF...'
                  : 'Guardando...'
                : isEditing
                  ? 'Actualizar'
                  : 'Crear'}
            </button>
          </div>
        </form>
      </div>

      {/* Popup para mostrar preguntas clasificadas */}
      {mostrarPopup && preguntasClasificadas && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Solo cerrar si se hace clic en el fondo, no en el contenido
            if (e.target === e.currentTarget) {
              handleCerrarPopup();
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del popup */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-[#111318]">Preguntas Clasificadas</h2>
              <button
                onClick={handleCerrarPopup}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Cerrar y continuar"
                disabled={saving}
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Contenido del popup */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm">
                {JSON.stringify(preguntasClasificadas, null, 2)}
              </pre>
            </div>

            {/* Footer del popup */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  // Copiar al portapapeles
                  navigator.clipboard.writeText(JSON.stringify(preguntasClasificadas, null, 2));
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-[#111318] hover:bg-gray-50 transition-colors flex items-center gap-2"
                disabled={saving}
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                Copiar JSON
              </button>
              <button
                onClick={handleCerrarPopup}
                className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdendaForm;

