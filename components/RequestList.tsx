import React, { useState, useEffect } from 'react';
import { RequestItem, RequestStatus, RequirementType, RequestCategory } from '../types';

interface RequestListProps {
  requests: RequestItem[];
  onCreateNew: () => void;
  onEdit: (item: RequestItem) => void;
}

const RequestList: React.FC<RequestListProps> = ({ requests, onCreateNew, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [openDriveMenuId, setOpenDriveMenuId] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRequirement, setFilterRequirement] = useState('');

  // Cerrar menú de drive al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openDriveMenuId && !target.closest('.drive-menu-container')) {
        setOpenDriveMenuId(null);
      }
    };

    if (openDriveMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDriveMenuId]);

  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase();
    
    // Search Logic:
    // 1. Name match (standard)
    // 2. RUT match: allows searching with or without dots by stripping dots from both source and term
    // 3. Requirement match (standard)
    
    const rutNoDots = req.rut.toLowerCase().replace(/\./g, '');
    const termNoDots = term.replace(/\./g, '');
    
    const matchesSearch = 
      req.name.toLowerCase().includes(term) || 
      req.rut.toLowerCase().includes(term) ||
      rutNoDots.includes(termNoDots) ||
      req.requirement.toLowerCase().includes(term);
      
    const matchesStatus = filterStatus ? req.status === filterStatus : true;
    const matchesCategory = filterCategory ? req.category === filterCategory : true;
    const matchesRequirement = filterRequirement ? req.requirement === filterRequirement : true;

    return matchesSearch && matchesStatus && matchesCategory && matchesRequirement;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterRequirement('');
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RequestStatus.InRenewal:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case RequestStatus.Expiring:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case RequestStatus.Expired:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current: return 'bg-emerald-600';
      case RequestStatus.InRenewal: return 'bg-blue-600';
      case RequestStatus.Expiring: return 'bg-amber-600';
      case RequestStatus.Expired: return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === '-' || dateString === 'Indefinido') return dateString;
    // Assume input is YYYY-MM-DD, output DD/MM/YYYY
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  // Función para extraer el ID del archivo de un link de Google Drive
  const getFileIdFromDriveLink = (link: string): string | null => {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  // Función para obtener URLs según la acción
  const getDriveUrls = (link: string) => {
    const fileId = getFileIdFromDriveLink(link);
    
    if (!fileId) {
      return {
        preview: link,
        drive: link
      };
    }
    
    return {
      preview: `https://drive.google.com/file/d/${fileId}/preview`,
      drive: `https://drive.google.com/file/d/${fileId}/view`
    };
  };

  const handleDriveAction = (link: string, action: 'preview' | 'drive', e: React.MouseEvent) => {
    e.stopPropagation();
    const urls = getDriveUrls(link);
    
    if (action === 'preview') {
      // Abrir en modal
      setPreviewLink(urls.preview);
      setIsPreviewModalOpen(true);
    } else {
      // Abrir carpeta o archivo en nueva pestaña
      window.open(urls[action], '_blank', 'noopener,noreferrer');
    }
    setOpenDriveMenuId(null);
  };

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setPreviewLink(null);
  };

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:px-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <a href="#" className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Inicio</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">Listado de Requerimientos</span>
        </div>

        {/* Header */}
        <div className="mb-6 lg:mb-8 border-b border-gray-200 pb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="flex flex-col gap-4 flex-1">
              {/* Título principal con icono */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-2xl">description</span>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
                    Gestión de Requerimientos
                  </h1>
                  <p className="text-gray-500 text-sm font-medium mt-0.5">
                    Listado de requerimientos por persona
                  </p>
                </div>
              </div>
              
              {/* Descripción con badges de categorías */}
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-gray-600 text-sm lg:text-base">
                  Visualice y gestione los requerimientos de documentación de los colaboradores.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                    <span className="material-symbols-outlined text-sm">folder_copy</span>
                    Gestión de Documentación
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botón de acción */}
            <div className="flex-shrink-0">
              <button 
                onClick={onCreateNew}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span className="hidden sm:inline">Nuevo Requerimiento</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, RUT..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none px-4 py-2.5 border rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[18px]">filter_list</span> 
                <span className="hidden sm:inline">Filtros</span>
                {(filterStatus || filterCategory || filterRequirement) && (
                  <span className="flex h-2 w-2 rounded-full bg-primary ml-1"></span>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Filters Panel */}
          {showFilters && (
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col lg:flex-row gap-6 items-end justify-between">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full lg:flex-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todos</option>
                      {Object.values(RequestStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</label>
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todas</option>
                      {Object.values(RequestCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requerimiento</label>
                    <select 
                      value={filterRequirement}
                      onChange={(e) => setFilterRequirement(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todos</option>
                      {Object.values(RequirementType).map(req => (
                        <option key={req} value={req}>{req}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button 
                    onClick={clearFilters}
                    className="w-full lg:w-auto px-6 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table - Hidden on mobile */}
        <div className="hidden md:block w-full overflow-x-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm inline-block min-w-full">
            <table className="w-full text-sm text-left" style={{ minWidth: '1000px' }}>
              <thead className="text-xs text-[#616f89] uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Nombre</th>
                  <th scope="col" className="px-6 py-4 font-semibold">RUT</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Requerimiento</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Categoría</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Estado</th>
                  <th scope="col" className="px-6 py-4 font-semibold">F. Adjudicación</th>
                  <th scope="col" className="px-6 py-4 font-semibold">F. Vencimiento</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Documento</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 font-medium text-[#111318]">
                      {req.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{req.rut}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">
                      {req.requirement}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {req.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getStatusBadge(req.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(req.status)}`}></span> 
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${req.adjudicationDate !== '-' ? 'text-primary' : 'text-gray-400'}`}>event_available</span>
                        {formatDate(req.adjudicationDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${req.expirationDate !== '-' ? 'text-red-500' : 'text-gray-400'}`}>event_busy</span>
                        {formatDate(req.expirationDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {req.link && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDriveAction(req.link || '', 'preview', e);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                            title="Visualizar documento"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDriveAction(req.link || '', 'drive', e);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                            title="Abrir en Google Drive"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onEdit(req)}
                        className="text-gray-400 hover:text-primary hover:bg-primary-light p-1.5 rounded-full transition-colors" 
                        title="Editar Solicitud"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                <p>No se encontraron registros que coincidan con los filtros.</p>
                {(filterStatus || filterCategory || filterRequirement || searchTerm) && (
                  <button onClick={clearFilters} className="text-primary font-medium hover:underline text-sm">
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cards - Shown only on mobile */}
        <div className="md:hidden flex flex-col gap-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 relative">
              {/* Status Badge - Top Right */}
              <div className="absolute top-4 right-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getStatusBadge(req.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(req.status)}`}></span> 
                  {req.status}
                </span>
              </div>

              {/* Name and RUT */}
              <div className="mb-4 pr-24">
                <h3 className="font-semibold text-[#111318] text-lg mb-1">{req.name}</h3>
                <p className="font-mono text-sm text-gray-600">{req.rut}</p>
              </div>

              {/* Documento */}
              {req.link && (
                <div className="mb-4 pr-24">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Documento</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDriveAction(req.link || '', 'preview', e);
                      }}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm"
                      title="Visualizar documento"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDriveAction(req.link || '', 'drive', e);
                      }}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm"
                      title="Abrir en Google Drive"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      <span>Abrir</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">assignment</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Requerimiento</p>
                    <p className="text-sm text-gray-900">{req.requirement}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">folder</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Categoría</p>
                    <span className="inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {req.category}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">F. Adjudicación</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span className={`material-symbols-outlined text-[16px] ${req.adjudicationDate !== '-' ? 'text-primary' : 'text-gray-400'}`}>event_available</span>
                      {formatDate(req.adjudicationDate)}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">F. Vencimiento</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span className={`material-symbols-outlined text-[16px] ${req.expirationDate !== '-' ? 'text-red-500' : 'text-gray-400'}`}>event_busy</span>
                      {formatDate(req.expirationDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => onEdit(req)}
                className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2.5 rounded-lg font-medium transition-all border border-primary/20"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
                Editar Solicitud
              </button>
            </div>
          ))}

          {filteredRequests.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
              <p>No se encontraron registros que coincidan con los filtros.</p>
              {(filterStatus || filterCategory || filterRequirement || searchTerm) && (
                <button onClick={clearFilters} className="text-primary font-medium hover:underline text-sm">
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Vista Previa del Documento */}
      {isPreviewModalOpen && previewLink && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={handleClosePreviewModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-2xl">description</span>
                <h2 className="text-xl font-bold text-white">Vista Previa del Documento</h2>
              </div>
              <button
                onClick={handleClosePreviewModal}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                title="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content - Iframe */}
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={previewLink}
                className="w-full h-full min-h-[600px] border-0 rounded-lg"
                title="Vista previa del documento"
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;