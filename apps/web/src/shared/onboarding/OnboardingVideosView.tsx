import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hasModuleAccessPermission,
  PermissionsByModule,
} from '@shared/rbac/permissionsService';
import { useHasPermissions } from '@shared/rbac/useHasPermissions';
import { fetchTutorialVideos, TutorialVideo } from '@shared/tutorials/tutorialsService';

interface ModuleOption {
  key: string;
  label: string;
  count: number;
}

const ALL_MODULES_FILTER = '__all__';

const canAccessTutorialVideo = (
  video: TutorialVideo,
  permissions: PermissionsByModule
): boolean => {
  if (!video.necesitaPermisos) {
    return true;
  }

  return (
    hasModuleAccessPermission(permissions, video.modulo) ||
    hasModuleAccessPermission(permissions, video.moduleKey)
  );
};

const OnboardingVideosView: React.FC = () => {
  const navigate = useNavigate();
  const { permissions, loading: permissionsLoading } = useHasPermissions();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [videos, setVideos] = React.useState<TutorialVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = React.useState<string>(ALL_MODULES_FILTER);

  React.useEffect(() => {
    let mounted = true;

    const loadVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchTutorialVideos();
        if (!mounted) return;
        setVideos(response);
      } catch (err: any) {
        if (!mounted) return;
        console.error('Error loading onboarding videos:', err);
        setError('No pudimos cargar el contenido de onboarding en este momento.');
        setVideos([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadVideos();

    return () => {
      mounted = false;
    };
  }, []);

  const accessibleVideos = React.useMemo(
    () => videos.filter((video) => canAccessTutorialVideo(video, permissions)),
    [videos, permissions]
  );

  const moduleOptions = React.useMemo<ModuleOption[]>(() => {
    const byModule = new Map<string, ModuleOption>();

    accessibleVideos.forEach((video) => {
      const current = byModule.get(video.moduleKey);
      if (current) {
        current.count += 1;
        return;
      }

      byModule.set(video.moduleKey, {
        key: video.moduleKey,
        label: video.modulo,
        count: 1,
      });
    });

    return Array.from(byModule.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [accessibleVideos]);

  React.useEffect(() => {
    if (
      selectedModuleKey !== ALL_MODULES_FILTER &&
      !moduleOptions.some((option) => option.key === selectedModuleKey)
    ) {
      setSelectedModuleKey(ALL_MODULES_FILTER);
    }
  }, [moduleOptions, selectedModuleKey]);

  const filteredVideos = React.useMemo(() => {
    if (selectedModuleKey === ALL_MODULES_FILTER) {
      return accessibleVideos;
    }

    return accessibleVideos.filter((video) => video.moduleKey === selectedModuleKey);
  }, [accessibleVideos, selectedModuleKey]);

  React.useEffect(() => {
    setSelectedVideoId((previousSelected) => {
      if (previousSelected && filteredVideos.some((video) => video.id === previousSelected)) {
        return previousSelected;
      }
      return filteredVideos[0]?.id ?? null;
    });
  }, [filteredVideos]);

  const selectedVideo = filteredVideos.find((video) => video.id === selectedVideoId) ?? null;
  const isBusy = loading || permissionsLoading;

  const openVideoInNewTab = React.useCallback((video: TutorialVideo) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.open(video.url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleVideoSelect = React.useCallback(
    (video: TutorialVideo) => {
      setSelectedVideoId(video.id);
      openVideoInNewTab(video);
    },
    [openVideoInNewTab]
  );

  return (
    <div
      className="bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50 px-4 py-10 md:px-6 md:py-12"
      style={{ minHeight: 'calc(100vh - 81px)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111318] shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver al inicio
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">
            <span className="material-symbols-outlined text-sm">school</span>
            Onboarding
          </div>
        </div>

        <div className="w-full bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="inline-flex items-center gap-2 text-[#0f766e] text-sm font-semibold mb-1">
              <span className="material-symbols-outlined text-base">smart_display</span>
              Onboarding
            </div>
            <h2 className="text-xl font-semibold text-[#111318]">Biblioteca de onboarding</h2>
            <p className="text-sm text-[#616f89] mt-1">
              Puedes filtrar por modulo. Se muestran contenidos con acceso permitido y
              videos marcados sin requerimiento de permisos. Al seleccionar uno, se abrira en
              una pestana nueva.
            </p>
          </div>

          <div className="p-6">
            {isBusy && (
              <div className="py-14 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-3"></div>
                <p className="text-sm text-[#616f89]">Cargando contenido de onboarding y permisos...</p>
              </div>
            )}

            {!isBusy && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!isBusy && !error && accessibleVideos.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-500 mb-3">videocam_off</span>
                <p className="text-[#111318] font-medium mb-1">
                  No hay contenido de onboarding disponible para tus permisos actuales.
                </p>
                <p className="text-sm text-[#616f89]">
                  Verifica tus permisos o marca videos con
                  <code className="ml-1">necesita_permisos = FALSE</code>.
                </p>
              </div>
            )}

            {!isBusy && !error && accessibleVideos.length > 0 && (
              <>
                <div className="mb-6 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 via-white to-blue-50/80 p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 text-teal-700 text-xs font-semibold uppercase tracking-wide">
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        Filtro de modulo
                      </div>
                      <p className="text-sm text-[#616f89] mt-1">
                        Elige el modulo que quieres revisar.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-white border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-700">
                        {moduleOptions.length} modulo(s)
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {accessibleVideos.length} video(s)
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 relative w-full md:max-w-[420px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-teal-600 pointer-events-none">
                      widgets
                    </span>
                    <select
                      value={selectedModuleKey}
                      onChange={(event) => setSelectedModuleKey(event.target.value)}
                      className="w-full h-11 appearance-none bg-white/95 border border-teal-200 rounded-xl pl-10 pr-10 text-sm font-medium text-[#111318] shadow-sm transition-colors hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value={ALL_MODULES_FILTER}>Todos los modulos ({accessibleVideos.length})</option>
                      {moduleOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} ({option.count})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[#616f89] pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                {filteredVideos.length === 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-[#616f89]">
                      No hay videos para el modulo seleccionado.
                    </p>
                  </div>
                )}

                {filteredVideos.length > 0 && selectedVideo && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
                    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                      <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-blue-50 p-5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 shadow-sm">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Apertura externa
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-[#111318]">
                          {selectedVideo.titulo}
                        </h3>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700 mt-2">
                          {selectedVideo.modulo}
                        </p>
                        <p className="mt-4 text-sm leading-6 text-[#516079]">
                          {selectedVideo.descripcion ||
                            'Este contenido ya no se reproduce dentro de MyMA. Usa la lista para abrirlo directamente en una nueva pestana.'}
                        </p>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openVideoInNewTab(selectedVideo)}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
                          >
                            <span className="material-symbols-outlined text-base">smart_display</span>
                            Abrir video
                          </button>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-[#516079]">
                            <span className="material-symbols-outlined text-sm text-teal-600">
                              tips_and_updates
                            </span>
                            La seleccion abre YouTube en otra pestana.
                          </div>
                        </div>
                      </div>
                    </section>

                    <aside className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                      <h4 className="text-sm font-semibold text-[#111318] mb-3 px-1">Lista de contenidos</h4>
                      <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-1">
                        {filteredVideos.map((video, index) => {
                          const isActive = video.id === selectedVideo.id;

                          return (
                            <button
                              key={video.id}
                              type="button"
                              onClick={() => handleVideoSelect(video)}
                              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                                isActive
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 size-6 rounded-full text-xs font-semibold flex items-center justify-center ${
                                    isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#111318]">{video.titulo}</p>
                                  <p className="text-xs text-[#616f89] mt-1">{video.modulo}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-500 text-base">
                                  open_in_new
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </aside>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingVideosView;
