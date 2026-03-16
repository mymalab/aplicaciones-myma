import React, { useState } from 'react';
import { RequestItem, RequestStatus } from '../types';

interface ProjectGalleryProps {
  requests: RequestItem[];
}

const ProjectGallery: React.FC<ProjectGalleryProps> = ({ requests }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Agrupar solicitudes por proyecto (usando projectCode si existe, o creando grupos únicos)
  const projectGroups = requests.reduce((acc, req) => {
    // Usamos el nombre del proyecto o el requerimiento como clave de agrupación
    const projectKey = req.requirement || 'Sin Proyecto';
    
    if (!acc[projectKey]) {
      acc[projectKey] = {
        name: projectKey,
        requests: [],
        totalWorkers: 0,
        statuses: new Set<RequestStatus>()
      };
    }
    
    acc[projectKey].requests.push(req);
    acc[projectKey].totalWorkers += 1;
    acc[projectKey].statuses.add(req.status);
    
    return acc;
  }, {} as Record<string, { name: string; requests: RequestItem[]; totalWorkers: number; statuses: Set<RequestStatus> }>);

  const projects = Object.values(projectGroups);

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus) {
      matchesStatus = project.requests.some(req => req.status === filterStatus);
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current:
        return 'bg-green-100 text-green-700 border-green-200';
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

  const getProjectStatusColor = (statuses: Set<RequestStatus>) => {
    if (statuses.has(RequestStatus.Expired)) return 'border-red-500 bg-red-50';
    if (statuses.has(RequestStatus.Expiring)) return 'border-amber-500 bg-amber-50';
    if (statuses.has(RequestStatus.InRenewal)) return 'border-blue-500 bg-blue-50';
    return 'border-green-500 bg-green-50';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">bar_chart</span>
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">Reportes de Proyectos</h1>
            </div>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              Vista general de todos los proyectos y sus acreditaciones
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Proyectos</p>
                <p className="text-2xl font-bold text-[#111318] mt-1">{projects.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">work</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trabajadores</p>
                <p className="text-2xl font-bold text-[#111318] mt-1">{requests.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">group</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">A Vencer</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {requests.filter(r => r.status === RequestStatus.Expiring).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vencidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {requests.filter(r => r.status === RequestStatus.Expired).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            <div className="md:col-span-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los estados</option>
                <option value={RequestStatus.Current}>Vigente</option>
                <option value={RequestStatus.InRenewal}>En Renovación</option>
                <option value={RequestStatus.Expiring}>A vencer</option>
                <option value={RequestStatus.Expired}>Vencida</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Projects Gallery */}
        <div className="space-y-4">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden hover:shadow-lg transition-all ${getProjectStatusColor(project.statuses)}`}
              >
                {/* Project Header */}
                <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">folder_open</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#111318]">{project.name}</h3>
                        <p className="text-sm text-gray-500">Proyecto de acreditación</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajadores</p>
                        <p className="text-xl font-bold text-primary">{project.totalWorkers}</p>
                      </div>
                      <div className="flex gap-2">
                        {Array.from(project.statuses).map(status => (
                          <span key={status} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workers Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">RUT</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Requerimiento</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">F. Adjudicación</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">F. Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {project.requests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 font-medium text-[#111318]">{req.name}</td>
                          <td className="px-6 py-4 font-mono text-sm text-gray-600">{req.rut}</td>
                          <td className="px-6 py-4 text-gray-600 text-center text-sm">{req.requirement}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {req.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">event_available</span>
                              {formatDate(req.adjudicationDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-red-500">event_busy</span>
                              {formatDate(req.expirationDate)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <span className="material-symbols-outlined text-gray-300 text-6xl mb-4 block">search_off</span>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron proyectos</h3>
              <p className="text-gray-500 mb-4">No hay proyectos que coincidan con los filtros seleccionados.</p>
              {(searchTerm || filterStatus) && (
                <button
                  onClick={clearFilters}
                  className="text-primary font-medium hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectGallery;

