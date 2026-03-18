import React from 'react';
import { AreaId } from '@contracts/areas';
import { fetchTutorialVideosByArea, TutorialVideo } from './tutorialsService';

interface TutorialVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: AreaId | null;
  areaDisplayName?: string;
}

const renderVideoPlayer = (video: TutorialVideo) => {
  if (video.provider === 'direct') {
    return (
      <video className="w-full h-full rounded-xl bg-black" controls preload="metadata">
        <source src={video.url} />
        Tu navegador no soporta la reproduccion de video.
      </video>
    );
  }

  if (video.embedUrl) {
    return (
      <iframe
        src={video.embedUrl}
        title={video.titulo}
        className="w-full h-full rounded-xl bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <div className="h-full min-h-[240px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center p-6 text-center">
      <div>
        <span className="material-symbols-outlined text-4xl text-gray-500 mb-3">open_in_new</span>
        <p className="text-sm text-[#616f89] mb-4">Este video no permite insercion embebida.</p>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined text-base">smart_display</span>
          Abrir video
        </a>
      </div>
    </div>
  );
};

const TutorialVideosModal: React.FC<TutorialVideosModalProps> = ({
  isOpen,
  onClose,
  areaId,
  areaDisplayName,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [videos, setVideos] = React.useState<TutorialVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen || !areaId) {
      setVideos([]);
      setSelectedVideoId(null);
      setError(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadVideos = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchTutorialVideosByArea(areaId);
        if (!mounted) return;
        setVideos(response);
        setSelectedVideoId((previousSelected) => {
          if (previousSelected && response.some((video) => video.id === previousSelected)) {
            return previousSelected;
          }
          return response[0]?.id ?? null;
        });
      } catch (err: any) {
        if (!mounted) return;
        console.error('Error loading tutorial videos:', err);
        setError('No pudimos cargar los tutoriales en este momento.');
        setVideos([]);
        setSelectedVideoId(null);
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
  }, [isOpen, areaId]);

  if (!isOpen) return null;

  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={onClose} />

      <div className="fixed inset-0 z-[81] flex items-center justify-center p-4">
        <div
          className="w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[#0f766e] text-sm font-semibold mb-1">
                <span className="material-symbols-outlined text-base">smart_display</span>
                Tutoriales
              </div>
              <h2 className="text-xl font-semibold text-[#111318]">
                {areaDisplayName ? `Tutoriales de ${areaDisplayName}` : 'Tutoriales del modulo'}
              </h2>
              <p className="text-sm text-[#616f89] mt-1">
                Aqui puedes revisar los videos disponibles para el modulo actual.
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(92vh-98px)]">
            {!areaId && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-sm text-[#616f89]">Selecciona un modulo para ver tutoriales.</p>
              </div>
            )}

            {areaId && loading && (
              <div className="py-14 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-3"></div>
                <p className="text-sm text-[#616f89]">Cargando tutoriales...</p>
              </div>
            )}

            {areaId && !loading && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            {areaId && !loading && !error && videos.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-500 mb-3">videocam_off</span>
                <p className="text-[#111318] font-medium mb-1">No hay tutoriales cargados para este modulo.</p>
                <p className="text-sm text-[#616f89]">
                  Cuando se registren videos en <code>dim_tutorial_video</code>, apareceran aqui.
                </p>
              </div>
            )}

            {areaId && !loading && !error && videos.length > 0 && selectedVideo && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6">
                <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="aspect-video">{renderVideoPlayer(selectedVideo)}</div>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-[#111318]">{selectedVideo.titulo}</h3>
                    {selectedVideo.descripcion && (
                      <p className="text-sm text-[#616f89] mt-2">{selectedVideo.descripcion}</p>
                    )}
                  </div>
                </section>

                <aside className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                  <h4 className="text-sm font-semibold text-[#111318] mb-3 px-1">Lista de tutoriales</h4>
                  <div className="space-y-2 max-h-[56vh] overflow-y-auto pr-1">
                    {videos.map((video, index) => {
                      const isActive = video.id === selectedVideo.id;

                      return (
                        <button
                          key={video.id}
                          onClick={() => setSelectedVideoId(video.id)}
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
                              {isActive ? 'pause_circle' : 'play_circle'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TutorialVideosModal;
