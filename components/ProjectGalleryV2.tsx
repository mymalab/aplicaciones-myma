import React, { useState, useEffect } from 'react';
import { ProjectGalleryItem } from '../types';
import AssignResponsiblesModal, { ResponsablesData } from './AssignResponsiblesModal';
import ProjectDetailView from './ProjectDetailView';
import SelectCompanyAndRequirementsView from './SelectCompanyAndRequirementsView';
import { updateResponsablesSolicitud, fetchEmpresaRequerimientos, createProyectoRequerimientos, updateProyectoRequerimientosResponsables, deleteSolicitudAcreditacion } from '../services/supabaseService';
import { supabase } from '../config/supabase';

interface ProjectGalleryV2Props {
  projects: ProjectGalleryItem[];
  onProjectUpdate?: () => void;
  onFilterSidebarChange?: (isOpen: boolean) => void;
}

const ProjectGalleryV2: React.FC<ProjectGalleryV2Props> = ({ projects, onProjectUpdate, onFilterSidebarChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectGalleryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showCompanyView, setShowCompanyView] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ title: string; message: string; details?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);

  // Obtener email del usuario actual
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch (error) {
        console.error('Error obteniendo email del usuario:', error);
      }
    };
    getUserEmail();
  }, []);

  // Obtener lista única de clientes
  const uniqueClients = Array.from(new Set(projects.map(p => p.clientName))).sort();

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus ? project.status === filterStatus : true;
    const matchesClient = filterClient ? project.clientName === filterClient : true;
    
    // Filtro por progreso
    let matchesProgress = true;
    if (filterProgress && project.totalTasks && project.totalTasks > 0) {
      const progressPercentage = ((project.completedTasks || 0) / project.totalTasks) * 100;
      if (filterProgress === 'low') {
        matchesProgress = progressPercentage < 25;
      } else if (filterProgress === 'medium') {
        matchesProgress = progressPercentage >= 25 && progressPercentage < 75;
      } else if (filterProgress === 'high') {
        matchesProgress = progressPercentage >= 75;
      }
    }
    
    return matchesSearch && matchesStatus && matchesClient && matchesProgress;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterClient('');
    setFilterProgress('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    // Por asignar requerimientos - Amarillo/Ámbar (aún no iniciado)
    if (statusLower.includes('por asignar requerimientos')) return 'bg-amber-100 text-amber-700 border-amber-200';
    // En proceso - Azul (trabajo en progreso)
    if (statusLower.includes('proceso')) return 'bg-blue-100 text-blue-700 border-blue-200';
    // Finalizado - Verde (completado exitosamente)
    if (statusLower.includes('finalizado')) return 'bg-green-100 text-green-700 border-green-200';
    // Cancelado - Rojo (detenido/cancelado)
    if (statusLower.includes('cancelado')) return 'bg-red-100 text-red-700 border-red-200';
    // Atrasado - Naranja (proyecto con retraso)
    if (statusLower.includes('atrasado')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getProjectBorderColor = (status: string) => {
    const statusLower = status.toLowerCase();
    // Por asignar requerimientos - Amarillo/Ámbar
    if (statusLower.includes('por asignar requerimientos')) return 'border-amber-500 bg-amber-50';
    // En proceso - Azul
    if (statusLower.includes('proceso')) return 'border-blue-500 bg-blue-50';
    // Finalizado - Verde
    if (statusLower.includes('finalizado')) return 'border-green-500 bg-green-50';
    // Cancelado - Rojo
    if (statusLower.includes('cancelado')) return 'border-red-500 bg-red-50';
    // Atrasado - Naranja
    if (statusLower.includes('atrasado')) return 'border-orange-500 bg-orange-50';
    return 'border-gray-500 bg-gray-50';
  };

  const getLeftBorderColor = (status: string) => {
    const statusLower = status.toLowerCase();
    // Por asignar requerimientos - Amarillo/Ámbar
    if (statusLower.includes('por asignar requerimientos')) return 'border-l-4 border-l-amber-500';
    // En proceso - Azul
    if (statusLower.includes('proceso')) return 'border-l-4 border-l-blue-500';
    // Finalizado - Verde
    if (statusLower.includes('finalizado')) return 'border-l-4 border-l-green-500';
    // Cancelado - Rojo
    if (statusLower.includes('cancelado')) return 'border-l-4 border-l-red-500';
    // Atrasado - Naranja
    if (statusLower.includes('atrasado')) return 'border-l-4 border-l-orange-500';
    return 'border-l-4 border-l-gray-500';
  };

  const getProjectDuration = (createdAt: string) => {
    if (!createdAt) return { value: '-', unit: '' };
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return { value: '0', unit: 'días' };
    } else if (diffInDays === 1) {
      return { value: '1', unit: 'día' };
    } else {
      return { value: diffInDays.toString(), unit: 'días' };
    }
  };

  const handleProjectClick = (project: ProjectGalleryItem) => {
    setSelectedProject(project);
    
    const statusLower = project.status.toLowerCase();
    
    // Si el proyecto está en estado "Por asignar requerimientos", abre la vista de selección de empresa
    if (statusLower.includes('por asignar requerimientos')) {
      setShowCompanyView(true);
    }
    // Si el proyecto está en estado "Por asignar responsables", abre el modal de asignación
    else if (statusLower.includes('por asignar responsables') || statusLower.includes('por asignar')) {
      setIsModalOpen(true);
    }
    // Para cualquier otro estado, abre la vista de detalle
    else {
      setShowDetailView(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedProject(null);
    // Recargar datos después de ver el detalle (por si hubo cambios)
    if (onProjectUpdate) {
      onProjectUpdate();
    }
  };

  const handleBackFromCompanyView = () => {
    setShowCompanyView(false);
    setSelectedProject(null);
    // Recargar datos después de ver la vista de empresa (por si hubo cambios)
    if (onProjectUpdate) {
      onProjectUpdate();
    }
  };

  const handleDeleteProject = async (project: ProjectGalleryItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active el onClick del contenedor
    
    if (!project.id || typeof project.id !== 'number') {
      alert('Error: El proyecto no tiene un ID válido');
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar el proyecto "${project.projectCode}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setDeletingProjectId(project.id);
      await deleteSolicitudAcreditacion(project.id);
      
      // Notificar al componente padre para que recargue los datos
      if (onProjectUpdate) {
        onProjectUpdate();
      }
      
      setSuccess({
        title: 'Proyecto Eliminado',
        message: `El proyecto "${project.projectCode}" ha sido eliminado exitosamente.`
      });
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      setError(`Error al eliminar el proyecto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setTimeout(() => setError(null), 8000);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleSaveResponsables = async (responsables: ResponsablesData) => {
    // Validación inicial
    if (!selectedProject) {
      console.error('❌ No hay proyecto seleccionado');
      throw new Error('No hay proyecto seleccionado');
    }

    // Validar que el proyecto tenga un ID válido
    if (!selectedProject.id || typeof selectedProject.id !== 'number') {
      console.error('❌ El proyecto no tiene un ID válido:', selectedProject);
      throw new Error(`El proyecto ${selectedProject.projectCode || 'desconocido'} no tiene un ID válido. Por favor, recarga la página.`);
    }

    try {
      setSaving(true);
      
      console.log('═══════════════════════════════════════════════════');
      console.log('💾 GUARDANDO RESPONSABLES Y REQUERIMIENTOS');
      console.log('═══════════════════════════════════════════════════');
      console.log('Proyecto ID:', selectedProject.id);
      console.log('Proyecto:', selectedProject.projectCode);
      console.log('Empresa:', responsables.empresa_nombre);
      console.log('Responsables seleccionados:', {
        JPRO: responsables.jpro_nombre || 'Sin asignar',
        EPR: responsables.epr_nombre || 'Sin asignar',
        RRHH: responsables.rrhh_nombre || 'Sin asignar',
        Legal: responsables.legal_nombre || 'Sin asignar'
      });
      console.log('Requerimientos recibidos:', responsables.empresaRequerimientos?.length || 0);
      console.log('Datos completos a guardar:', JSON.stringify(responsables, null, 2));
      
      // 1. Guardar responsables en la base de datos (esto es lo PRINCIPAL)
      // Esto también cambiará el estado a "En proceso"
      console.log('\n📝 Paso 1: Guardando responsables en fct_acreditacion_solicitud...');
      console.log('   ID del proyecto:', selectedProject.id);
      console.log('   Datos a guardar:', {
        empresa_id: responsables.empresa_id,
        empresa_nombre: responsables.empresa_nombre,
        jpro_id: responsables.jpro_id,
        jpro_nombre: responsables.jpro_nombre,
        epr_id: responsables.epr_id,
        epr_nombre: responsables.epr_nombre,
        rrhh_id: responsables.rrhh_id,
        rrhh_nombre: responsables.rrhh_nombre,
        legal_id: responsables.legal_id,
        legal_nombre: responsables.legal_nombre,
      });
      
      const result = await updateResponsablesSolicitud(selectedProject.id, responsables);
      console.log('✅ Responsables guardados exitosamente');
      console.log('📊 Resultado de la actualización:', result);
      
      // Actualizar el proyecto seleccionado con los nuevos datos
      if (result) {
        setSelectedProject({
          ...selectedProject,
          empresa_id: result.empresa_id,
          empresa_nombre: result.empresa_nombre,
          jpro_id: result.jpro_id,
          jpro_nombre: result.jpro_nombre,
          epr_id: result.epr_id,
          epr_nombre: result.epr_nombre,
          rrhh_id: result.rrhh_id,
          rrhh_nombre: result.rrhh_nombre,
          legal_id: result.legal_id,
          legal_nombre: result.legal_nombre,
        } as ProjectGalleryItem);
        console.log('🔄 Proyecto actualizado en el estado local');
      }

      // 2. Actualizar nombres de responsables en brg_acreditacion_solicitud_requerimiento
      console.log('\n📝 Paso 2: Actualizando responsables en brg_acreditacion_solicitud_requerimiento...');
      try {
        await updateProyectoRequerimientosResponsables(
          selectedProject.projectCode,
          {
            jpro_nombre: responsables.jpro_nombre,
            epr_nombre: responsables.epr_nombre,
            rrhh_nombre: responsables.rrhh_nombre,
            legal_nombre: responsables.legal_nombre,
          }
        );
        console.log('✅ Responsables actualizados en requerimientos exitosamente');
      } catch (reqError) {
        console.error('❌ Error actualizando responsables en requerimientos:', reqError);
        console.warn('⚠️ Los responsables se guardaron en fct_acreditacion_solicitud, pero hubo un problema actualizando los requerimientos');
      }
      
      // 3. Guardar requerimientos del proyecto si hay empresa y requerimientos (legacy - ya no se usa)
      if (responsables.empresa_nombre && responsables.empresaRequerimientos && responsables.empresaRequerimientos.length > 0) {
        try {
          console.log('\n📋 Paso 2: Guardando requerimientos en brg_acreditacion_solicitud_requerimiento...');
          console.log(`Total de requerimientos a guardar: ${responsables.empresaRequerimientos.length}`);
          console.log('\nVista previa de los primeros 3 requerimientos:');
          
          responsables.empresaRequerimientos.slice(0, 3).forEach((req, i) => {
            const nombreResp = req.responsable === 'JPRO' ? responsables.jpro_nombre :
                              req.responsable === 'EPR' ? responsables.epr_nombre :
                              req.responsable === 'RRHH' ? responsables.rrhh_nombre :
                              req.responsable === 'Legal' ? responsables.legal_nombre : 'Sin asignar';
            
            console.log(`\n  ${i + 1}. ${req.requerimiento}`);
            console.log(`     Cargo: ${req.responsable}`);
            console.log(`     Nombre Responsable: ${nombreResp || 'Sin asignar'}`);
            console.log(`     Categoría: ${req.categoria_requerimiento}`);
          });
          
          if (responsables.empresaRequerimientos.length > 3) {
            console.log(`\n  ... y ${responsables.empresaRequerimientos.length - 3} más`);
          }
          
          // Crear requerimientos del proyecto con los nombres de responsables seleccionados
          await createProyectoRequerimientos(
            selectedProject.projectCode,
            responsables.empresa_nombre,
            responsables.empresaRequerimientos,
            {
              jpro_nombre: responsables.jpro_nombre,
              epr_nombre: responsables.epr_nombre,
              rrhh_nombre: responsables.rrhh_nombre,
              legal_nombre: responsables.legal_nombre
            }
          );
          
          console.log('\n✅ Requerimientos del proyecto guardados exitosamente en la BD');
          console.log('═══════════════════════════════════════════════════\n');
        } catch (reqError) {
          // Si falla la creación de requerimientos, mostrar error detallado
          console.error('═══════════════════════════════════════════════════');
          console.error('❌ ERROR AL GUARDAR REQUERIMIENTOS');
          console.error('═══════════════════════════════════════════════════');
          console.error('Error completo:', reqError);
          console.error('Tipo:', typeof reqError);
          
          if (reqError instanceof Error) {
            console.error('Mensaje:', reqError.message);
            console.error('Stack:', reqError.stack);
          }
          
          console.error('═══════════════════════════════════════════════════\n');
          console.warn('⚠️ Los responsables se guardaron, pero hubo un problema con los requerimientos');
          
          // Mostrar error al usuario
          setError(`Los responsables se guardaron correctamente, pero hubo un error al crear los requerimientos: ${reqError instanceof Error ? reqError.message : String(reqError)}`);
          setTimeout(() => setError(null), 10000);
        }
      } else {
        console.log('\n⚠️ No hay requerimientos para guardar');
        console.log('Razones posibles:');
        console.log('  - No se seleccionó empresa:', !responsables.empresa_nombre);
        console.log('  - No hay requerimientos:', !responsables.empresaRequerimientos || responsables.empresaRequerimientos.length === 0);
      }
      
      // 3. Notificar al componente padre para que recargue los datos
      console.log('🔄 Notificando al componente padre para recargar datos...');
      if (onProjectUpdate) {
        onProjectUpdate();
        // Esperar un momento para que el componente padre tenga tiempo de recargar
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 4. Preparar mensaje de éxito con detalles
      const responsablesDetails: string[] = [];
      if (responsables.jpro_nombre) responsablesDetails.push(`JPRO: ${responsables.jpro_nombre}`);
      if (responsables.epr_nombre) responsablesDetails.push(`EPR: ${responsables.epr_nombre}`);
      if (responsables.rrhh_nombre) responsablesDetails.push(`RRHH: ${responsables.rrhh_nombre}`);
      if (responsables.legal_nombre) responsablesDetails.push(`Legal: ${responsables.legal_nombre}`);

      let message = `Proyecto: ${selectedProject.projectCode}`;
      if (responsables.empresa_nombre) {
        message += `\nEmpresa: ${responsables.empresa_nombre}`;
      }
      if (responsables.empresaRequerimientos && responsables.empresaRequerimientos.length > 0) {
        message += `\nRequerimientos creados: ${responsables.empresaRequerimientos.length}`;
      }

      setSuccess({
        title: 'Guardado Exitoso',
        message: message,
        details: responsablesDetails.length > 0 ? responsablesDetails : undefined
      });
      
      // Cerrar modal después de un breve delay para que el usuario vea el mensaje
      console.log('⏳ Esperando antes de cerrar el modal...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🚪 Cerrando modal...');
      handleCloseModal();
      
      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('❌ Error guardando responsables:', error);
      
      // Mostrar error detallado
      let errorMsg = 'Error al guardar los responsables.';
      
      if (error instanceof Error) {
        errorMsg = `Error al guardar: ${error.message}`;
        
        // Ayuda específica según el error
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          errorMsg += ' Las columnas de responsables no existen en la base de datos. Ejecuta el script sql/add_responsables_columns.sql en Supabase SQL Editor.';
        } else if (error.message.includes('table') || error.message.includes('relation')) {
          errorMsg += ' La tabla fct_acreditacion_solicitud no existe. Verifica tu configuración de Supabase.';
        }
      } else {
        errorMsg = 'Error desconocido. Revisa la consola del navegador (F12)';
      }
      
      setError(errorMsg);
      setTimeout(() => setError(null), 10000);
    } finally {
      setSaving(false);
    }
  };

  // Calcular estadísticas
  const totalProjects = projects.length;
  const totalWorkers = projects.reduce((sum, p) => sum + p.totalWorkers, 0);
  const totalVehicles = projects.reduce((sum, p) => sum + p.totalVehicles, 0);
  const totalTasksCompleted = projects.reduce((sum, p) => sum + (p.completedTasks || 0), 0);
  const totalTasksAll = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  // Proyectos activos = todos los que NO estén cancelados ni finalizados
  const activeProjects = projects.filter(p => {
    const statusLower = p.status.toLowerCase();
    return !statusLower.includes('cancelado') && !statusLower.includes('finalizado');
  }).length;
  
  // Calcular proyectos atrasados: contar solo los que tienen estado "Atrasado"
  const overdueProjects = projects.filter(p => {
    const statusLower = p.status.toLowerCase();
    return statusLower.includes('atrasado');
  }).length;
  
  // Calcular tiempo promedio de proyectos finalizados (en días)
  const finishedProjects = projects.filter(p => p.status.toLowerCase().includes('finalizado'));
  const averageDuration = finishedProjects.length > 0
    ? Math.round(
        finishedProjects.reduce((sum, p) => {
          const created = new Date(p.createdAt);
          const now = new Date();
          const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffInDays;
        }, 0) / finishedProjects.length
      )
    : 0;

  // Si se está mostrando la vista de selección de empresa, renderizar ese componente
  if (showCompanyView && selectedProject) {
    return <SelectCompanyAndRequirementsView project={selectedProject} onBack={handleBackFromCompanyView} onUpdate={onProjectUpdate} />;
  }

  // Si se está mostrando la vista de detalle, renderizar ese componente
  if (showDetailView && selectedProject) {
    return <ProjectDetailView project={selectedProject} onBack={handleBackFromDetail} onUpdate={onProjectUpdate} onFilterSidebarChange={onFilterSidebarChange} />;
  }

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">assignment</span>
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">Gestión de Solicitudes de Acreditación</h1>
            </div>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              Vista general de todas las solicitudes de acreditación y proyectos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">ACREDITACIONES COMPLETADAS</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-blue-600">{finishedProjects.length}</p>
                  <span className="text-sm font-semibold text-gray-400">/</span>
                  <p className="text-xl font-bold text-gray-500">{totalProjects}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Total de proyectos</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">done_all</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tareas Completadas</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-green-600">{totalTasksCompleted}</p>
                  <span className="text-sm font-semibold text-gray-400">/</span>
                  <p className="text-xl font-bold text-gray-500">{totalTasksAll}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Todas las tareas</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">task_alt</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Promedio</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-amber-600">{averageDuration}</p>
                  <p className="text-sm font-semibold text-amber-600">{averageDuration === 1 ? 'día' : 'días'}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Proyectos finalizados</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-2xl">schedule</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proyectos Activos</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{activeProjects}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sin finalizar</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-2xl">pending_actions</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proyectos Atrasados</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{overdueProjects}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Con retraso</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">warning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 relative">
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
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los clientes</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="Por asignar requerimientos">Por asignar requerimientos</option>
                <option value="Por asignar responsables">Por asignar responsables</option>
                <option value="En proceso">En proceso</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Atrasado">Atrasado</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={filterProgress}
                onChange={(e) => setFilterProgress(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todo progreso</option>
                <option value="low">Menos de 25%</option>
                <option value="medium">Entre 25% y 75%</option>
                <option value="high">75% o más</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-2">
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
            filteredProjects.map((project) => {
              // Determinar color de hover según el estado
              const getHoverColor = () => {
                const statusLower = project.status.toLowerCase();
                if (statusLower.includes('por asignar requerimientos')) return 'group-hover:to-amber-50';
                if (statusLower.includes('proceso')) return 'group-hover:to-blue-50';
                if (statusLower.includes('finalizado')) return 'group-hover:to-green-50';
                if (statusLower.includes('cancelado')) return 'group-hover:to-red-50';
                if (statusLower.includes('atrasado')) return 'group-hover:to-orange-50';
                return 'group-hover:to-gray-50';
              };

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
                >
                  {/* Project Header Compacto */}
                  <div className={`bg-gradient-to-r from-gray-50 to-white px-5 py-3 group-hover:from-gray-100 ${getHoverColor()} ${getLeftBorderColor(project.status)} transition-colors duration-300`}>
                  {/* Título y Estado en línea */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Icono más pequeño */}
                      <div className="w-11 h-11 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-300">
                        <span className="material-symbols-outlined text-white text-xl">folder_open</span>
                      </div>
                      
                      {/* Info del proyecto */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-[#111318]">{project.projectCode}</h3>
                          {project.projectName && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              {project.projectName}
                            </span>
                          )}
                        </div>
                        
                        {/* Info en línea compacta */}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">business</span>
                            <span className="font-medium">{project.clientName}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            <span>{project.projectManager}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">event</span>
                            <span>{formatDate(project.fieldStartDate)}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          {/* Tiempo transcurrido inline */}
                          {(() => {
                            const createdDate = new Date(project.createdAt);
                            const now = new Date();
                            const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            let timeText = '';
                            if (diffDays === 0) {
                              timeText = 'Hoy';
                            } else if (diffDays === 1) {
                              timeText = '1 día';
                            } else {
                              timeText = `${diffDays} días`;
                            }
                            
                            return (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                <span className="font-semibold">{timeText}</span>
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Estado compacto */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {(() => {
                        const progressPercentage = project.totalTasks && project.totalTasks > 0 
                          ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)
                          : 0;
                        const displayStatus = (progressPercentage === 100 && project.status.toLowerCase().includes('proceso')) 
                          ? 'Finalizado' 
                          : project.status;
                        const statusColor = getStatusColor(displayStatus);
                        
                        return (
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 whitespace-nowrap shadow-sm ${statusColor}`}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                      {/* Botón de eliminar - Solo visible para cmansilla@myma.cl */}
                      {userEmail === 'cmansilla@myma.cl' && (
                        <button
                          onClick={(e) => handleDeleteProject(project, e)}
                          disabled={deletingProjectId === project.id}
                          className="mt-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Eliminar proyecto"
                        >
                          {deletingProjectId === project.id ? (
                            <>
                              <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              Eliminar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progreso General Compacto */}
                  {project.totalTasks && project.totalTasks > 0 && (
                    <div className="mt-3 mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[16px]">track_changes</span>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Progreso</span>
                          <span className="text-xs text-gray-500 font-medium">
                            {project.completedTasks || 0}/{project.totalTasks}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-green-600">
                          {Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)}%
                        </span>
                      </div>
                      {/* Barra de progreso más delgada */}
                      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-500 to-green-600"
                          style={{ width: `${Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Progreso por Responsable - Vista compacta */}
                  {(() => {
                    const responsables = [
                      { id: project.jpro_id, nombre: project.jpro_nombre, rol: 'JPRO', color: 'blue' },
                      { id: project.epr_id, nombre: project.epr_nombre, rol: 'EPR', color: 'orange' },
                      { id: project.rrhh_id, nombre: project.rrhh_nombre, rol: 'RRHH', color: 'green' },
                      { id: project.legal_id, nombre: project.legal_nombre, rol: 'Legal', color: 'purple' }
                    ].filter(r => r.id);

                    if (responsables.length === 0) {
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 group-hover:bg-gray-100 transition-all duration-300">
                            <span className="material-symbols-outlined text-[18px]">info</span>
                            <span>Sin responsables asignados</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="grid grid-cols-4 gap-1.5">
                          {responsables.map((resp) => {
                            const tareas = (project.tasks || []).filter((t: any) => t.responsable === resp.rol);
                            const completadas = tareas.filter((t: any) => t.realizado).length;
                            const total = tareas.length;
                            const porcentaje = total > 0 ? (completadas / total) : 0;

                            const colorMap = {
                              blue: { bg: 'bg-blue-50/80', border: 'border-blue-200/50', ring: '#DBEAFE', stroke: '#3B82F6', text: 'text-blue-600' },
                              orange: { bg: 'bg-orange-50/80', border: 'border-orange-200/50', ring: '#FED7AA', stroke: '#F97316', text: 'text-orange-600' },
                              green: { bg: 'bg-green-50/80', border: 'border-green-200/50', ring: '#D1FAE5', stroke: '#10B981', text: 'text-green-600' },
                              purple: { bg: 'bg-purple-50/80', border: 'border-purple-200/50', ring: '#E9D5FF', stroke: '#A855F7', text: 'text-purple-600' }
                            };
                            const colors = colorMap[resp.color as keyof typeof colorMap] || colorMap.blue;

                            return (
                              <div key={resp.rol} className={`flex items-center gap-2 ${colors.bg} rounded-lg border ${colors.border} px-2.5 py-2 transition-all duration-300`}>
                                {/* Anillo de progreso más pequeño */}
                                <div className="relative flex items-center justify-center flex-shrink-0">
                                  <svg className="w-11 h-11 transform -rotate-90">
                                    <circle cx="22" cy="22" r="18" stroke={colors.ring} strokeWidth="3" fill="none" />
                                    <circle
                                      cx="22"
                                      cy="22"
                                      r="18"
                                      stroke={colors.stroke}
                                      strokeWidth="3"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 18}`}
                                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - porcentaje)}`}
                                      strokeLinecap="round"
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-extrabold text-gray-800">
                                      {Math.round(porcentaje * 100)}%
                                    </span>
                                  </div>
                                </div>
                                {/* Info compacta */}
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                  <div className="flex items-baseline gap-1 mb-0.5">
                                    <p className={`text-xs font-extrabold uppercase ${colors.text}`}>{resp.rol}</p>
                                    <div className="flex items-baseline gap-0.5">
                                      <p className={`text-sm font-bold ${colors.text}`}>{completadas}</p>
                                      <span className="text-[10px] font-semibold text-gray-400">/</span>
                                      <p className="text-xs font-semibold text-gray-500">{total}</p>
                                    </div>
                                  </div>
                                  {resp.nombre && (
                                    <p className="text-[11px] text-gray-600 font-medium truncate leading-tight">
                                      {resp.nombre}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Workers List */}
                {project.workers && project.workers.length > 0 && (
                  <div className="p-6">
                    <h4 className="text-sm font-bold text-[#111318] mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                      Trabajadores Asignados
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.workers.map((worker, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#111318] truncate">{worker.name}</p>
                            {worker.phone && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">phone</span>
                                {worker.phone}
                              </p>
                            )}
                            {worker.company && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">business</span>
                                {worker.company}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            worker.type?.includes('Interno') 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {worker.type?.includes('Interno') ? 'INT' : 'EXT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
            })
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

      {/* Modal de Asignación de Responsables */}
      {selectedProject && selectedProject.id && typeof selectedProject.id === 'number' && (
        <AssignResponsiblesModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveResponsables}
          projectName={selectedProject.projectCode}
          projectCode={selectedProject.projectCode}
          currentResponsables={{
            empresa_id: (selectedProject as any).empresa_id,
            empresa_nombre: (selectedProject as any).empresa_nombre,
            jpro_id: (selectedProject as any).jpro_id,
            jpro_nombre: (selectedProject as any).jpro_nombre,
            epr_id: (selectedProject as any).epr_id,
            epr_nombre: (selectedProject as any).epr_nombre,
            rrhh_id: (selectedProject as any).rrhh_id,
            rrhh_nombre: (selectedProject as any).rrhh_nombre,
            legal_id: (selectedProject as any).legal_id,
            legal_nombre: (selectedProject as any).legal_nombre,
          }}
        />
      )}

      {/* Mensaje de éxito */}
      {success && (
        <div className="fixed top-4 right-4 z-[60] bg-green-50 border-2 border-green-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">{success.title}</h4>
              <p className="text-sm text-green-700 whitespace-pre-line mb-2">{success.message}</p>
              {success.details && success.details.length > 0 && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs font-medium text-green-800 mb-1">Responsables Asignados:</p>
                  <ul className="text-xs text-green-700 space-y-1">
                    {success.details.map((detail, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="text-green-600">•</span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="fixed top-4 right-4 z-[60] bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error al guardar</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGalleryV2;

