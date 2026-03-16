import React, { useState, useEffect } from 'react';
import { ProjectGalleryItem, RequestItem, RequestStatus } from '../types';
import type { AcreditacionAccessLevel } from '../utils/navigationPolicy';
import { updateRequerimientoEstado, fetchProyectoRequerimientoObservaciones, fetchProyectoRequerimientos, fetchPersonaRequerimientosByNombre, sendWebhookViaEdgeFunction, fetchSolicitudAcreditacionByCodigo, enviarIdProyectoN8n } from '../services/acreditacionService';
import { supabase } from '@shared/api-client/supabase';

interface ProjectRequirement {
  id: number;
  responsable: string;
  nombre_responsable?: string;
  nombre_trabajador?: string;
  categoria_empresa?: string;
  id_proyecto_trabajador?: number;
  patente_vehiculo?: string;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  estado?: string; // Estado del requerimiento (Pendiente, Completado, En Proceso, etc.)
  empresa_acreditacion?: string; // Empresa de acreditación (MyMA, nombre del contratista, etc.)
  fechaFinalizada?: string;
  drive_doc_url?: string;
  localFileUrl?: string; // URL local del archivo subido (antes de que esté en Drive)
  localFileName?: string; // Nombre del archivo local
}

interface ProjectDetailViewProps {
  project: ProjectGalleryItem;
  onBack: () => void;
  onUpdate?: () => void;
  onFilterSidebarChange?: (isOpen: boolean) => void;
  accessLevel?: AcreditacionAccessLevel;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  onBack,
  onUpdate,
  onFilterSidebarChange,
  accessLevel = 'none',
}) => {
  // Estado local para el status del proyecto (para actualizar sin recargar)
  const [projectStatus, setProjectStatus] = useState<string>(project.status);

  const isReadOnlyCollaborator = accessLevel === 'editor' || accessLevel === 'viewer';
  const isMymaEmpresaAcreditacion = (empresaAcreditacion?: string) =>
    (empresaAcreditacion || '').trim().toLowerCase() === 'myma';

  const canUploadRequirementDocument = (requerimiento: ProjectRequirement) => {
    if (accessLevel === 'admin' || accessLevel === 'accreditor') return true;
    if (accessLevel === 'editor') return !isMymaEmpresaAcreditacion(requerimiento.empresa_acreditacion);
    return false;
  };

  const canViewRequirementDocument = (requerimiento: ProjectRequirement) => {
    if (accessLevel !== 'editor') return true;
    return !isMymaEmpresaAcreditacion(requerimiento.empresa_acreditacion);
  };

  const canDeleteDocuments = !isReadOnlyCollaborator;
  const canToggleRealizado = !isReadOnlyCollaborator;
  const canOpenWorkerName = !isReadOnlyCollaborator;
  const canSaveLinkedDocument = !isReadOnlyCollaborator;
  const canPreviewDocument = true;
  const canOpenDriveDocument = true;
  const canSendProjectDetail = accessLevel !== 'none';
  
  // Estado para controlar qué dropdown de columna está abierto
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);

  // Estados de filtros
  const [filterCargo, setFilterCargo] = useState('');
  const [filterNombreResponsable, setFilterNombreResponsable] = useState('');
  const [filterNombreTrabajador, setFilterNombreTrabajador] = useState('');
  const [filterCategoriaEmpresa, setFilterCategoriaEmpresa] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEmpresaAcreditacion, setFilterEmpresaAcreditacion] = useState('');
  const [filterRealizado, setFilterRealizado] = useState('');

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterDropdown && !(event.target as Element).closest('.filter-dropdown-container')) {
        setOpenFilterDropdown(null);
      }
    };

    if (openFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openFilterDropdown]);

  // Estados para el modal de observaciones
  const [observacionesModalOpen, setObservacionesModalOpen] = useState(false);
  const [observacionesText, setObservacionesText] = useState<string | null>(null);
  const [loadingObservaciones, setLoadingObservaciones] = useState(false);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<string>('');
  // Set de requerimientos que tienen observaciones
  const [requerimientosConObservaciones, setRequerimientosConObservaciones] = useState<Set<string>>(new Set());

  // Estados para el modal de documentos de persona
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [documentosPersona, setDocumentosPersona] = useState<RequestItem[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [guardandoDocumentos, setGuardandoDocumentos] = useState(false);
  const [subiendoDocumento, setSubiendoDocumento] = useState<number | null>(null); // ID del requerimiento que está subiendo documento
  
  // Estado para el modal de completación del proyecto
  const [proyectoCompletadoModalOpen, setProyectoCompletadoModalOpen] = useState(false);

  // Estados para el modal de confirmación de eliminación de documento
  const [eliminarDocumentoModalOpen, setEliminarDocumentoModalOpen] = useState(false);
  const [requerimientoAEliminar, setRequerimientoAEliminar] = useState<number | null>(null);
  const [enviandoEliminacion, setEnviandoEliminacion] = useState(false);

  // Estados para el botón de enviar ID del proyecto
  const [enviandoProyecto, setEnviandoProyecto] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  // Cerrar automáticamente el modal de proyecto completado después de 2 segundos y luego redirigir
  useEffect(() => {
    if (proyectoCompletadoModalOpen) {
      console.log('⏱️ Popup abierto, se cerrará en 2 segundos...');
      const timer = setTimeout(() => {
        console.log('✅ 2 segundos transcurridos, cerrando popup y redirigiendo...');
        setProyectoCompletadoModalOpen(false);
        // Redirigir/recargar el proyecto DESPUÉS de cerrar el popup
        // Usar un pequeño delay para asegurar que el estado se actualizó
        setTimeout(() => {
          if (onUpdate) {
            onUpdate();
          }
        }, 100);
      }, 2000); // 2 segundos

      return () => {
        console.log('🧹 Limpiando timer del popup');
        clearTimeout(timer);
      };
    }
  }, [proyectoCompletadoModalOpen]);

  // Sincronizar el estado local del proyecto cuando cambie el prop
  useEffect(() => {
    setProjectStatus(project.status);
  }, [project.status]);

  const areRequirementsEquivalent = (
    currentReq: ProjectRequirement,
    nextReq: ProjectRequirement
  ): boolean => {
    return (
      currentReq.id === nextReq.id &&
      currentReq.responsable === nextReq.responsable &&
      (currentReq.estado || '') === (nextReq.estado || '') &&
      currentReq.realizado === nextReq.realizado &&
      (currentReq.drive_doc_url || '') === (nextReq.drive_doc_url || '') &&
      (currentReq.nombre_responsable || '') === (nextReq.nombre_responsable || '') &&
      (currentReq.nombre_trabajador || '') === (nextReq.nombre_trabajador || '') &&
      (currentReq.categoria_empresa || '') === (nextReq.categoria_empresa || '') &&
      (currentReq.requerimiento || '') === (nextReq.requerimiento || '') &&
      (currentReq.categoria || '') === (nextReq.categoria || '') &&
      (currentReq.empresa_acreditacion || '') === (nextReq.empresa_acreditacion || '') &&
      (currentReq.fechaFinalizada || '') === (nextReq.fechaFinalizada || '') &&
      (currentReq.localFileUrl || '') === (nextReq.localFileUrl || '') &&
      (currentReq.localFileName || '') === (nextReq.localFileName || '')
    );
  };

  const areRequirementCollectionsEquivalent = (
    currentRequirements: ProjectRequirement[],
    nextRequirements: ProjectRequirement[]
  ): boolean => {
    if (currentRequirements.length !== nextRequirements.length) {
      return false;
    }

    for (let i = 0; i < currentRequirements.length; i += 1) {
      if (!areRequirementsEquivalent(currentRequirements[i], nextRequirements[i])) {
        return false;
      }
    }

    return true;
  };

  // Cargar requerimientos del proyecto al montar para saber cuáles tienen observaciones
  useEffect(() => {
    const loadRequerimientosConObservaciones = async () => {
      if (!project.id) return;

      try {
        const proyectoRequerimientos = await fetchProyectoRequerimientos(project.id);
        const requerimientosConObs = new Set<string>();
        
        proyectoRequerimientos.forEach(req => {
          if (req.observaciones && req.observaciones.trim() !== '') {
            requerimientosConObs.add(req.requerimiento);
          }
        });
        
        setRequerimientosConObservaciones(requerimientosConObs);
      } catch (error) {
        console.error('Error al cargar requerimientos del proyecto:', error);
      }
    };

    loadRequerimientosConObservaciones();
  }, [project.id]);

  // Actualizar todos los requerimientos cada 5 segundos
  useEffect(() => {
    if (!project.id) return;

    const actualizarRequerimientos = async () => {
      try {
        const proyectoRequerimientos = await fetchProyectoRequerimientos(project.id);
        
        // Mapear los requerimientos actualizados al formato ProjectRequirement
        const requerimientosActualizados: ProjectRequirement[] = proyectoRequerimientos.map(req => ({
          id: req.id!,
          responsable: req.responsable,
          nombre_responsable: req.nombre_responsable,
          nombre_trabajador: req.nombre_trabajador,
          categoria_empresa: req.categoria_empresa,
          id_proyecto_trabajador: req.id_proyecto_trabajador,
          patente_vehiculo: req.patente_vehiculo,
          requerimiento: req.requerimiento,
          categoria: req.categoria_requerimiento || '',
          realizado: req.estado === 'Completado',
          estado: req.estado || 'Pendiente',
          empresa_acreditacion: req.empresa_acreditacion,
          fechaFinalizada: req.updated_at && req.estado === 'Completado' 
            ? req.updated_at.split('T')[0] 
            : undefined,
          drive_doc_url: req.drive_doc_url
        }));

        // Actualizar estado solo cuando hay cambios reales.
        // Esto reduce re-render y evita "parpadeo" visual en la tabla/estadísticas.
        setRequirements(prev => {
          const prevById = new Map(prev.map(req => [req.id, req]));

          const mergedRequirements = requerimientosActualizados.map(reqActualizado => {
            const reqAnterior = prevById.get(reqActualizado.id);

            if (!reqAnterior) {
              return reqActualizado;
            }

            // Si hay un archivo local y ahora hay un drive_doc_url, limpiar el local
            if (reqActualizado.drive_doc_url && reqAnterior.localFileUrl) {
              URL.revokeObjectURL(reqAnterior.localFileUrl);
              return {
                ...reqActualizado,
                localFileUrl: undefined,
                localFileName: undefined,
              };
            }

            // Preservar archivos locales si todavía no hay drive_doc_url
            if (!reqActualizado.drive_doc_url && reqAnterior.localFileUrl) {
              return {
                ...reqActualizado,
                localFileUrl: reqAnterior.localFileUrl,
                localFileName: reqAnterior.localFileName,
              };
            }

            return reqActualizado;
          });

          // Mantener el orden actual de la UI:
          // 1) conservar posiciones existentes
          // 2) agregar nuevos requerimientos al final
          const mergedById = new Map(mergedRequirements.map(req => [req.id, req]));
          const orderedMergedRequirements: ProjectRequirement[] = [];

          prev.forEach(prevReq => {
            const currentReq = mergedById.get(prevReq.id);
            if (currentReq) {
              orderedMergedRequirements.push(currentReq);
              mergedById.delete(prevReq.id);
            }
          });

          mergedById.forEach(newReq => {
            orderedMergedRequirements.push(newReq);
          });

          if (areRequirementCollectionsEquivalent(prev, orderedMergedRequirements)) {
            return prev;
          }

          return orderedMergedRequirements;
        });
      } catch (error) {
        console.error('Error al actualizar requerimientos:', error);
      }
    };

    // Ejecutar inmediatamente al montar
    actualizarRequerimientos();

    // Configurar intervalo para ejecutar cada 5 segundos
    const interval = setInterval(actualizarRequerimientos, 5000);

    // Limpiar el intervalo al desmontar
    return () => clearInterval(interval);
  }, [project.id]);

  // Limpiar objetos URL locales al desmontar el componente
  useEffect(() => {
    return () => {
      requirements.forEach(req => {
        if (req.localFileUrl) {
          URL.revokeObjectURL(req.localFileUrl);
        }
      });
    };
  }, []); // Solo se ejecuta al desmontar

  // Usar las tareas del proyecto (vienen de ProjectGalleryItem)
  const [requirements, setRequirements] = useState<ProjectRequirement[]>(
    (project.tasks || []).map(task => ({
      id: task.id,
      responsable: task.responsable,
      nombre_responsable: task.nombre_responsable,
      nombre_trabajador: task.nombre_trabajador,
      categoria_empresa: task.categoria_empresa,
      id_proyecto_trabajador: task.id_proyecto_trabajador,
      patente_vehiculo: task.patente_vehiculo,
      requerimiento: task.requerimiento,
      categoria: task.categoria,
      realizado: task.realizado,
      estado: task.realizado ? 'Completado' : 'Pendiente',
      fechaFinalizada: task.fechaFinalizada,
      drive_doc_url: task.drive_doc_url
    }))
  );

  const getRequirementEntityLabel = (req: Pick<ProjectRequirement, 'nombre_trabajador' | 'patente_vehiculo'>) =>
    req.nombre_trabajador || req.patente_vehiculo || '';

  const isVehicleRequirement = (req: Pick<ProjectRequirement, 'nombre_trabajador' | 'patente_vehiculo'>) =>
    !!req.patente_vehiculo && !req.nombre_trabajador;

  // Filtrar requerimientos
  const filteredRequirements = requirements.filter(req => {
    const matchesCargo = filterCargo ? req.responsable === filterCargo : true;
    const matchesNombreResponsable = filterNombreResponsable ? req.nombre_responsable === filterNombreResponsable : true;
    const matchesNombreTrabajador = filterNombreTrabajador ? getRequirementEntityLabel(req) === filterNombreTrabajador : true;
    const matchesCategoriaEmpresa = filterCategoriaEmpresa ? req.categoria_empresa === filterCategoriaEmpresa : true;
    const matchesCategoria = filterCategoria ? req.categoria === filterCategoria : true;
    const matchesEmpresaAcreditacion = filterEmpresaAcreditacion ? req.empresa_acreditacion === filterEmpresaAcreditacion : true;
    const matchesRealizado = filterRealizado === '' ? true : 
      filterRealizado === 'realizado' ? req.realizado : !req.realizado;
    
    return matchesCargo && matchesNombreResponsable && matchesNombreTrabajador && 
           matchesCategoriaEmpresa && matchesCategoria && matchesEmpresaAcreditacion && matchesRealizado;
  });

  // Obtener listas únicas para filtros
  const cargos = Array.from(new Set(requirements.map(r => r.responsable).filter(Boolean)));
  const nombresResponsables = Array.from(new Set(requirements.map(r => r.nombre_responsable).filter(Boolean)));
  const nombresTrabajadores = Array.from(new Set(requirements.map(r => getRequirementEntityLabel(r)).filter(Boolean)));
  const categoriasEmpresa = Array.from(new Set(requirements.map(r => r.categoria_empresa).filter(Boolean)));
  const categorias = Array.from(new Set(requirements.map(r => r.categoria).filter(Boolean)));
  const empresasAcreditacion = Array.from(new Set(requirements.map(r => r.empresa_acreditacion).filter(Boolean)));

  // Handler para toggle de dropdown de filtro
  const handleFilterToggle = (column: string) => {
    setOpenFilterDropdown(openFilterDropdown === column ? null : column);
  };

  // Handler para aplicar filtro desde dropdown
  const handleFilterSelect = (column: string, value: string) => {
    switch (column) {
      case 'cargo':
        setFilterCargo(filterCargo === value ? '' : value);
        break;
      case 'responsable':
        setFilterNombreResponsable(filterNombreResponsable === value ? '' : value);
        break;
      case 'trabajador':
        setFilterNombreTrabajador(filterNombreTrabajador === value ? '' : value);
        break;
      case 'categoria_empresa':
        setFilterCategoriaEmpresa(filterCategoriaEmpresa === value ? '' : value);
        break;
      case 'categoria':
        setFilterCategoria(filterCategoria === value ? '' : value);
        break;
      case 'empresa_acreditacion':
        setFilterEmpresaAcreditacion(filterEmpresaAcreditacion === value ? '' : value);
        break;
      case 'realizado':
        setFilterRealizado(filterRealizado === value ? '' : value);
        break;
    }
    setOpenFilterDropdown(null);
  };


  const handleToggleRealizado = async (e: React.MouseEvent, id: number) => {
    // Detener la propagación para evitar que se active el click del contenedor
    e.stopPropagation();

    if (!canToggleRealizado) {
      return;
    }
    
    const requirement = requirements.find(r => r.id === id);
    if (!requirement) return;

    const newRealizado = !requirement.realizado;
    const newEstado = newRealizado ? 'Completado' : 'Pendiente';

    // Verificar cuántos requerimientos estaban completados antes de la actualización
    const completedBefore = requirements.filter(r => r.realizado).length;
    const totalRequerimientos = requirements.length;
    const wasLastOne = newRealizado && completedBefore === totalRequerimientos - 1;

    try {
      // Actualizar en la base de datos
      const result = await updateRequerimientoEstado(id, newEstado);
      
      // Actualizar estado local inmediatamente sin recargar
      setRequirements(prev => prev.map(req => {
        if (req.id === id) {
          return {
            ...req,
            realizado: newRealizado,
            estado: newEstado, // Actualizar el estado también
            fechaFinalizada: newRealizado ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return req;
      }));
      
      console.log(`✅ Requerimiento ${id} actualizado a ${newEstado}`);
      
      // Si se completó el último requerimiento y todos están completados, mostrar popup
      // El popup manejará la redirección después de 2 segundos
      if (wasLastOne && result.allCompleted) {
        // Actualizar estado local del proyecto
        setProjectStatus('Finalizado');
        // Mostrar modal de éxito (se cerrará automáticamente después de 2 segundos y luego se recargará)
        setProyectoCompletadoModalOpen(true);
        // NO ejecutar onUpdate aquí, el popup lo manejará después de 2 segundos
      }
      // Si el estado del proyecto cambió a "En proceso" (desde Finalizado), solo actualizar el estado local sin redirigir
      else if (result.proyectoEstadoCambio === 'En proceso') {
        setProjectStatus('En proceso');
        // NO recargar, solo actualizar el badge de estado
      }
      // Si el estado cambió a "Finalizado" (pero no fue el último requerimiento), actualizar estado local
      else if (result.proyectoEstadoCambio === 'Finalizado') {
        setProjectStatus('Finalizado');
      }
    } catch (error) {
      console.error('❌ Error actualizando requerimiento:', error);
      alert('Error al actualizar el requerimiento. Por favor, intente nuevamente.');
    }
  };

  const completedCount = filteredRequirements.filter(r => r.realizado).length;
  const totalCount = filteredRequirements.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  // Calcular fechas y días usando fechas normalizadas (sin hora) para evitar desfases
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const parseLocalDate = (fecha?: string | null): Date | null => {
    if (!fecha || fecha === '-') return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  };

  const diffInCalendarDays = (from: Date, to: Date) => {
    const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.floor((toDay.getTime() - fromDay.getTime()) / MS_PER_DAY);
  };

  const fechaIngreso = project.createdAt || null;
  const fechaIngresoDate = parseLocalDate(fechaIngreso);
  const fechaInicioTerrenoDate = parseLocalDate(project.fechaInicioTerreno || null);
  const hoy = new Date();

  // Días transcurridos desde la fecha de ingreso hasta hoy
  const diasTranscurridos = fechaIngresoDate
    ? Math.max(0, diffInCalendarDays(fechaIngresoDate, hoy))
    : 0;

  // Días restantes hasta la Fecha de Inicio de Terreno (0 si ya pasó)
  const diasRestantesInicioTerreno = fechaInicioTerrenoDate
    ? Math.max(0, diffInCalendarDays(hoy, fechaInicioTerrenoDate))
    : null;
  // Formatear fecha de ingreso
  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    try {
      const date = parseLocalDate(fecha);
      if (!date) return 'N/A';
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return fecha;
    }
  };

  // Función para manejar el clic en el icono de información
  const handleInfoClick = async (requerimiento: string) => {
    if (!project.projectCode) {
      console.warn('No hay código de proyecto');
      return;
    }

    setRequerimientoSeleccionado(requerimiento);
    setLoadingObservaciones(true);
    setObservacionesModalOpen(true);
    setObservacionesText(null);

    try {
      const observaciones = await fetchProyectoRequerimientoObservaciones(
        project.projectCode,
        requerimiento
      );
      setObservacionesText(observaciones);
    } catch (error) {
      console.error('Error al obtener observaciones:', error);
      setObservacionesText(null);
    } finally {
      setLoadingObservaciones(false);
    }
  };

  // Función para cerrar el modal
  const handleCloseObservacionesModal = () => {
    setObservacionesModalOpen(false);
    setObservacionesText(null);
    setRequerimientoSeleccionado('');
  };

  // Función para manejar el clic en el nombre del trabajador
  const handleTrabajadorClick = async (nombreTrabajador: string) => {
    if (!canOpenWorkerName) return;
    if (!nombreTrabajador) return;
    
    setPersonaSeleccionada(nombreTrabajador);
    setLoadingDocumentos(true);
    setDocumentosModalOpen(true);
    setDocumentosPersona([]);
    setDocumentoSeleccionado(null);

    try {
      const documentos = await fetchPersonaRequerimientosByNombre(nombreTrabajador);
      setDocumentosPersona(documentos);
    } catch (error) {
      console.error('Error al cargar documentos de la persona:', error);
      setDocumentosPersona([]);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  // Función para cerrar el modal de documentos
  const handleCloseDocumentosModal = () => {
    setDocumentosModalOpen(false);
    setPersonaSeleccionada('');
    setDocumentosPersona([]);
    setDocumentoSeleccionado(null);
  };

  // Función para manejar la selección de documentos (solo uno, y no "Vencida" o "Sin documento")
  const handleToggleDocumentoSeleccionado = (documentoId: string, estado: string, tieneLink: boolean) => {
    if (!canSaveLinkedDocument) {
      return;
    }

    // No permitir seleccionar documentos en estado "Vencida" o "Sin documento"
    if (estado === 'Vencida' || estado === 'Sin documento' || !tieneLink) {
      return;
    }
    
    // Si ya está seleccionado, deseleccionarlo. Si no, seleccionarlo (reemplazando cualquier otro seleccionado)
    setDocumentoSeleccionado(prev => prev === documentoId ? null : documentoId);
  };

  // Función para obtener URLs de Google Drive
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

  // Función para manejar la visualización del documento de un requerimiento (Drive)
  const handleVerDocumentoRequerimiento = (driveDocUrl: string) => {
    if (!driveDocUrl) return;

    const urls = getDriveUrls(driveDocUrl);
    setPreviewLink(urls.preview);
    setIsPreviewModalOpen(true);
  };

  // Función para manejar la visualización del archivo local
  const handleVerArchivoLocal = (localFileUrl: string) => {
    if (!localFileUrl) return;
    
    setPreviewLink(localFileUrl);
    setIsPreviewModalOpen(true);
  };

  // Función para abrir el documento en Google Drive
  const handleAbrirDocumentoRequerimiento = (driveDocUrl: string) => {
    if (!driveDocUrl) return;

    const urls = getDriveUrls(driveDocUrl);
    window.open(urls.drive, '_blank', 'noopener,noreferrer');
  };

  // Función para abrir el popup de confirmación de eliminación
  const handleEliminarDocumentoRequerimiento = (requerimientoId: number) => {
    if (!canDeleteDocuments) {
      return;
    }

    const requerimiento = requirements.find(req => req.id === requerimientoId);
    
    // Permitir eliminar si hay drive_doc_url o localFileUrl
    if (!requerimiento || (!requerimiento.drive_doc_url && !requerimiento.localFileUrl)) {
      alert('Error: No se encontró el documento.');
      return;
    }

    setRequerimientoAEliminar(requerimientoId);
    setEliminarDocumentoModalOpen(true);
  };

  // Función para cerrar el popup de confirmación
  const handleCerrarEliminarDocumentoModal = () => {
    setEliminarDocumentoModalOpen(false);
    setRequerimientoAEliminar(null);
    setEnviandoEliminacion(false);
  };

  // Función para confirmar y enviar webhook de eliminación de documento (no elimina, solo envía información)
  const confirmarEliminacionDocumento = async () => {
    if (!canDeleteDocuments) {
      return;
    }

    if (!requerimientoAEliminar) return;

    // Obtener el requerimiento del estado local para tener todos los datos
    const requerimiento = requirements.find(req => req.id === requerimientoAEliminar);
    
    // Solo permitir eliminar si hay drive_doc_url (documentos en Drive)
    // Si solo hay localFileUrl, simplemente limpiarlo sin enviar webhook
    if (!requerimiento) {
      alert('Error: No se encontró el requerimiento.');
      handleCerrarEliminarDocumentoModal();
      return;
    }

    // Si solo hay archivo local (no hay drive_doc_url), limpiarlo directamente
    if (!requerimiento.drive_doc_url && requerimiento.localFileUrl) {
      setRequirements(prev => prev.map(req => {
        if (req.id === requerimientoAEliminar) {
          // Limpiar el objeto URL local
          if (req.localFileUrl) {
            URL.revokeObjectURL(req.localFileUrl);
          }
          return {
            ...req,
            localFileUrl: undefined,
            localFileName: undefined
          };
        }
        return req;
      }));
      alert('✅ Archivo local eliminado.');
      handleCerrarEliminarDocumentoModal();
      return;
    }

    // Si no hay documento en Drive, no se puede eliminar
    if (!requerimiento.drive_doc_url) {
      alert('Error: No se encontró el documento en Drive.');
      handleCerrarEliminarDocumentoModal();
      return;
    }

    setEnviandoEliminacion(true);

    // Obtener drive_folder_id y drive_folder_url del proyecto desde solicitud_acreditacion
    let driveFolderId = null;
    let driveFolderUrl = null;
    
    console.log('🔍 Obteniendo datos de carpeta para proyecto:', project.projectCode);
    
    try {
      const solicitud = await fetchSolicitudAcreditacionByCodigo(project.projectCode || '');
      if (solicitud) {
        driveFolderId = solicitud.drive_folder_id || null;
        driveFolderUrl = solicitud.drive_folder_url || null;
        console.log('📁 Datos de carpeta del proyecto obtenidos:', { 
          driveFolderId, 
          driveFolderUrl,
          proyecto: project.projectCode 
        });
      } else {
        console.warn('⚠️ No se encontró solicitud_acreditacion para el proyecto:', project.projectCode);
      }
    } catch (error) {
      console.error('❌ Error al obtener datos del proyecto:', error);
    }

    // Extraer drive_doc_id del drive_doc_url
    const driveDocId = getFileIdFromDriveLink(requerimiento.drive_doc_url);

    try {
      // Construir el payload del webhook
      const documentosParaEnviar = [{
        id: '',
        nombre: getRequirementEntityLabel(requerimiento),
        rut: '',
        requerimiento: requerimiento.requerimiento,
        categoria: requerimiento.categoria,
        estado: '',
        fecha_vigencia: '-',
        fecha_vencimiento: '-',
        link_drive: requerimiento.drive_doc_url,
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
        persona_id: null,
        requerimiento_id: requerimiento.id,
        drive_doc_url: requerimiento.drive_doc_url,
        drive_doc_id: driveDocId,
      }];

      const payload = {
        persona: getRequirementEntityLabel(requerimiento),
        proyecto: project.projectCode || '',
        fecha_envio: new Date().toISOString(),
        id_solicitud: project.id,
        requerimiento_id: requerimiento.id,
        tipo_documento: 'documento_eliminado',
        documentos: documentosParaEnviar,
      };

      console.log('📤 Enviando webhook de eliminación con payload:', payload);

      // Enviar webhook
      const result = await sendWebhookViaEdgeFunction(payload);

      console.log('📥 Respuesta del webhook:', result);

      if (!result.success) {
        throw new Error(result.error || `Error ${result.status || 'desconocido'}`);
      }
      
      console.log('✅ Webhook enviado exitosamente:', result.data);
      
      // Limpiar el estado local del requerimiento (tanto drive_doc_url como localFileUrl)
      setRequirements(prev => prev.map(req => {
        if (req.id === requerimientoAEliminar) {
          // Limpiar el objeto URL local si existe
          if (req.localFileUrl) {
            URL.revokeObjectURL(req.localFileUrl);
          }
          return {
            ...req,
            drive_doc_url: undefined,
            localFileUrl: undefined,
            localFileName: undefined
          };
        }
        return req;
      }));
      
      alert('✅ Información de eliminación enviada exitosamente.');
      handleCerrarEliminarDocumentoModal();
    } catch (error) {
      console.error('❌ Error al enviar webhook:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet o si el servidor está disponible.';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`❌ Error al enviar la información: ${errorMessage}`);
      setEnviandoEliminacion(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Vigente':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'En Renovación':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'A vencer':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Vencida':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Función para enviar el ID del proyecto a n8n
  const handleEnviarIdProyecto = async () => {
    if (!canSendProjectDetail) {
      return;
    }

    if (!project.id) {
      alert('Error: No se pudo obtener el ID del proyecto.');
      return;
    }

    setEnviandoProyecto(true);
    setMensajeEnvio(null);

    try {
      const result = await enviarIdProyectoN8n(project.id);
      
      console.log('✅ ID del proyecto enviado exitosamente:', result);
      
      setMensajeEnvio({
        tipo: 'success',
        texto: 'La información de la solicitud de acreditación se envió correctamente.'
      });

      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        setMensajeEnvio(null);
      }, 5000);
    } catch (error: any) {
      console.error('❌ Error al enviar ID del proyecto:', error);
      
      setMensajeEnvio({
        tipo: 'error',
        texto: `Error al enviar detalle del proyecto: ${error.message || 'Error desconocido'}`
      });

      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        setMensajeEnvio(null);
      }, 5000);
    } finally {
      setEnviandoProyecto(false);
    }
  };

  // Función para enviar webhook con el documento seleccionado
  const handleGuardarDocumentos = async () => {
    if (!canSaveLinkedDocument) {
      return;
    }

    if (!documentoSeleccionado) {
      alert('Por favor, selecciona un documento para guardar.');
      return;
    }

    // Obtener drive_folder_id y drive_folder_url del proyecto desde solicitud_acreditacion
    let driveFolderId = null;
    let driveFolderUrl = null;
    
    console.log('🔍 Obteniendo datos de carpeta para proyecto:', project.projectCode);
    
    try {
      const solicitud = await fetchSolicitudAcreditacionByCodigo(project.projectCode || '');
      if (solicitud) {
        driveFolderId = solicitud.drive_folder_id || null;
        driveFolderUrl = solicitud.drive_folder_url || null;
        console.log('📁 Datos de carpeta del proyecto obtenidos:', { 
          driveFolderId, 
          driveFolderUrl,
          proyecto: project.projectCode 
        });
      } else {
        console.warn('⚠️ No se encontró solicitud_acreditacion para el proyecto:', project.projectCode);
      }
    } catch (error) {
      console.error('❌ Error al obtener datos del proyecto:', error);
    }
    
    console.log('📋 Valores finales que se enviarán:', { driveFolderId, driveFolderUrl });

    // Obtener el documento seleccionado con toda su información
    const documentoSeleccionadoData = documentosPersona.find(doc => doc.id === documentoSeleccionado);
    
    if (!documentoSeleccionadoData) {
      alert('Error: No se encontró el documento seleccionado.');
      return;
    }

    // Buscar el requerimiento correspondiente a la persona seleccionada
    // El requerimiento que se marca como completado es el que tiene el mismo nombre_trabajador
    const requerimientoEncontrado = requirements.find(req => 
      req.nombre_trabajador === personaSeleccionada
    );

    const documentosParaEnviar = [{
      id: String(documentoSeleccionadoData.id || ''),
      nombre: String(documentoSeleccionadoData.name || ''),
      rut: String(documentoSeleccionadoData.rut || ''),
      requerimiento: String(documentoSeleccionadoData.requirement || ''),
      categoria: String(documentoSeleccionadoData.category || ''),
      estado: String(documentoSeleccionadoData.status || ''),
      fecha_vigencia: documentoSeleccionadoData.adjudicationDate || '-',
      fecha_vencimiento: documentoSeleccionadoData.expirationDate || '-',
      link_drive: documentoSeleccionadoData.link || null,
      drive_folder_id: driveFolderId,
      drive_folder_url: driveFolderUrl,
      persona_id: documentoSeleccionadoData.persona_id ? Number(documentoSeleccionadoData.persona_id) : null,
      requerimiento_id: documentoSeleccionadoData.requerimiento_id ? Number(documentoSeleccionadoData.requerimiento_id) : null,
    }];

    const payload = {
      persona: personaSeleccionada || '',
      proyecto: project.projectCode || '',
      fecha_envio: new Date().toISOString(),
      id_solicitud: project.id,
      requerimiento_id: requerimientoEncontrado?.id || null,
      tipo_documento: 'documento_vinculado',
      documentos: documentosParaEnviar,
    };

    console.log('📤 Enviando webhook con payload:', payload);

    setGuardandoDocumentos(true);

    try {
      // Usar la función edge de Supabase como proxy para evitar CORS
      const result = await sendWebhookViaEdgeFunction(payload);

      console.log('📥 Respuesta del webhook:', result);

      if (!result.success) {
        throw new Error(result.error || `Error ${result.status || 'desconocido'}`);
      }
      
      console.log('✅ Webhook enviado exitosamente:', result.data);
      
      // Si se encontró el requerimiento y no está completado, marcarlo como "Completado"
      if (requerimientoEncontrado && !requerimientoEncontrado.realizado) {
        try {
          console.log(`🔄 Marcando requerimiento ${requerimientoEncontrado.id} como "Completado" para ${personaSeleccionada}...`);
          
          // Verificar cuántos requerimientos estaban completados antes de la actualización
          const completedBefore = requirements.filter(r => r.realizado).length;
          const totalRequerimientos = requirements.length;
          const wasLastOne = completedBefore === totalRequerimientos - 1;
          
          console.log(`📊 Estado antes de actualizar: ${completedBefore}/${totalRequerimientos} completados, ¿era el último?: ${wasLastOne}`);
          
          const resultEstado = await updateRequerimientoEstado(requerimientoEncontrado.id, 'Completado');
          
          console.log(`📊 Resultado de actualización: allCompleted=${resultEstado.allCompleted}, estadoCambio=${resultEstado.proyectoEstadoCambio}`);
          
          // Actualizar estado local del requerimiento
          setRequirements(prev => prev.map(req => {
            if (req.id === requerimientoEncontrado.id) {
              return {
                ...req,
                realizado: true,
                fechaFinalizada: new Date().toISOString().split('T')[0]
              };
            }
            return req;
          }));
          
          console.log('✅ Requerimiento marcado como "Completado"');
          
          // Si se completó el último requerimiento, mostrar popup
          if (wasLastOne && resultEstado.allCompleted) {
            console.log('🎉 Se completó el último requerimiento, mostrando popup...');
            setProjectStatus('Finalizado');
            setProyectoCompletadoModalOpen(true);
          }
          // Si el estado del proyecto cambió, actualizar el estado local
          else if (resultEstado.proyectoEstadoCambio === 'En proceso') {
            setProjectStatus('En proceso');
          }
          else if (resultEstado.proyectoEstadoCambio === 'Finalizado') {
            setProjectStatus('Finalizado');
          }
        } catch (errorEstado) {
          console.error('❌ Error al marcar requerimiento como completado:', errorEstado);
          // No fallar el guardado del documento si falla la actualización del estado
        }
      } else if (requerimientoEncontrado && requerimientoEncontrado.realizado) {
        console.log(`ℹ️ El requerimiento para ${personaSeleccionada} ya está completado`);
      } else {
        console.log(`⚠️ No se encontró requerimiento para ${personaSeleccionada}`);
      }
      
      alert('✅ Documento enviado exitosamente.');
      
      // Cerrar el modal de documentos después de guardar exitosamente
      handleCloseDocumentosModal();
    } catch (error) {
      console.error('❌ Error completo al enviar webhook:', error);
      
      let errorMessage = 'Error desconocido';
      let isCorsError = false;
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          // Verificar si es un error de CORS
          const errorString = error.toString().toLowerCase();
          if (errorString.includes('cors') || errorString.includes('access-control')) {
            isCorsError = true;
            errorMessage = 'Error de CORS: El webhook de n8n no permite solicitudes desde el navegador.\n\n' +
              'SOLUCIONES:\n' +
              '1. Configura CORS en n8n: En la configuración del webhook, permite solicitudes desde tu dominio.\n' +
              '2. Usa un proxy: Crea una función edge de Supabase que haga el proxy al webhook.\n' +
              '3. Contacta al administrador del webhook para habilitar CORS.';
          } else {
            errorMessage = 'Error de conexión. Verifica tu conexión a internet o si el servidor está disponible.';
          }
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (isCorsError) {
        // Mostrar un alert más detallado para errores de CORS
        alert(`❌ Error de CORS al guardar los documentos\n\n${errorMessage}\n\nRevisa la consola para más detalles.`);
      } else {
        alert(`❌ Error al guardar los documentos: ${errorMessage}`);
      }
    } finally {
      setGuardandoDocumentos(false);
    }
  };

  // Función para convertir archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]; // Remover el prefijo data:type;base64,
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Función para manejar la subida de un documento
  const handleSubirDocumento = async (file: File, requerimiento: ProjectRequirement) => {
    if (!canUploadRequirementDocument(requerimiento)) {
      return;
    }

    if (!file) {
      alert('Por favor, selecciona un archivo para subir.');
      return;
    }

    setSubiendoDocumento(requerimiento.id);

    // Obtener drive_folder_id y drive_folder_url del proyecto desde solicitud_acreditacion
    let driveFolderId = null;
    let driveFolderUrl = null;
    
    console.log('🔍 Obteniendo datos de carpeta para proyecto:', project.projectCode);
    
    try {
      const solicitud = await fetchSolicitudAcreditacionByCodigo(project.projectCode || '');
      if (solicitud) {
        driveFolderId = solicitud.drive_folder_id || null;
        driveFolderUrl = solicitud.drive_folder_url || null;
        console.log('📁 Datos de carpeta del proyecto obtenidos:', { 
          driveFolderId, 
          driveFolderUrl,
          proyecto: project.projectCode 
        });
      } else {
        console.warn('⚠️ No se encontró solicitud_acreditacion para el proyecto:', project.projectCode);
      }
    } catch (error) {
      console.error('❌ Error al obtener datos del proyecto:', error);
    }

    try {
      // Convertir archivo a base64
      const fileBase64 = await fileToBase64(file);
      
      const documentosParaEnviar = [{
        id: '',
        nombre: getRequirementEntityLabel(requerimiento),
        rut: '',
        requerimiento: requerimiento.requerimiento,
        categoria: requerimiento.categoria,
        estado: '',
        fecha_vigencia: '-',
        fecha_vencimiento: '-',
        link_drive: null,
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
        persona_id: null,
        requerimiento_id: requerimiento.id,
        file_name: file.name,
        file_base64: fileBase64,
      }];

      const payload = {
        persona: getRequirementEntityLabel(requerimiento),
        proyecto: project.projectCode || '',
        fecha_envio: new Date().toISOString(),
        id_solicitud: project.id,
        requerimiento_id: requerimiento.id,
        tipo_documento: 'documento_cargado',
        documentos: documentosParaEnviar,
      };

      console.log('📤 Enviando webhook con documento subido, payload:', { ...payload, documentos: [{ ...documentosParaEnviar[0], file_base64: '[BASE64_DATA]' }] });

      // Usar la función edge de Supabase como proxy para evitar CORS
      const result = await sendWebhookViaEdgeFunction(payload);

      console.log('📥 Respuesta del webhook:', result);

      if (!result.success) {
        throw new Error(result.error || `Error ${result.status || 'desconocido'}`);
      }
      
      console.log('✅ Webhook enviado exitosamente:', result.data);
      
      // Crear URL local del archivo para visualización inmediata
      const localFileUrl = URL.createObjectURL(file);
      
      // Actualizar el requerimiento con el archivo local
      setRequirements(prev => prev.map(req => {
        if (req.id === requerimiento.id) {
          return {
            ...req,
            localFileUrl: localFileUrl,
            localFileName: file.name
          };
        }
        return req;
      }));
      
      // Si el requerimiento no está completado, marcarlo como "Completado"
      if (!requerimiento.realizado) {
        try {
          console.log(`🔄 Marcando requerimiento ${requerimiento.id} como "Completado" después de subir documento...`);
          
          // Verificar cuántos requerimientos estaban completados antes de la actualización
          const completedBefore = requirements.filter(r => r.realizado).length;
          const totalRequerimientos = requirements.length;
          const wasLastOne = completedBefore === totalRequerimientos - 1;
          
          console.log(`📊 Estado antes de actualizar: ${completedBefore}/${totalRequerimientos} completados, ¿era el último?: ${wasLastOne}`);
          
          const resultEstado = await updateRequerimientoEstado(requerimiento.id, 'Completado');
          
          console.log(`📊 Resultado de actualización: allCompleted=${resultEstado.allCompleted}, estadoCambio=${resultEstado.proyectoEstadoCambio}`);
          
          // Actualizar estado local del requerimiento
          setRequirements(prev => prev.map(req => {
            if (req.id === requerimiento.id) {
              return {
                ...req,
                realizado: true,
                fechaFinalizada: new Date().toISOString().split('T')[0]
              };
            }
            return req;
          }));
          
          console.log('✅ Requerimiento marcado como "Completado"');
          
          // Si se completó el último requerimiento, mostrar popup
          if (wasLastOne && resultEstado.allCompleted) {
            console.log('🎉 Se completó el último requerimiento, mostrando popup...');
            setProjectStatus('Finalizado');
            setProyectoCompletadoModalOpen(true);
          }
          // Si el estado del proyecto cambió, actualizar el estado local
          else if (resultEstado.proyectoEstadoCambio === 'En proceso') {
            setProjectStatus('En proceso');
          }
          else if (resultEstado.proyectoEstadoCambio === 'Finalizado') {
            setProjectStatus('Finalizado');
          }
        } catch (errorEstado) {
          console.error('❌ Error al marcar requerimiento como completado:', errorEstado);
          // No fallar el guardado del documento si falla la actualización del estado
        }
      } else {
        console.log(`ℹ️ El requerimiento ${requerimiento.id} ya está completado`);
      }
      
      alert('✅ Documento subido y enviado exitosamente.');
    } catch (error) {
      console.error('❌ Error completo al enviar webhook:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet o si el servidor está disponible.';
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`❌ Error al subir el documento: ${errorMessage}`);
    } finally {
      setSubiendoDocumento(null);
    }
  };

  return (
    <div className="layout-container flex h-full grow flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header Compacto */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group mb-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-medium text-sm">Volver a Proyectos</span>
          </button>

          {/* Información del Proyecto - Layout Horizontal */}
          <div className="flex items-center justify-between gap-6 flex-wrap">
            {/* Columna Izquierda: Info Principal */}
            <div className="flex items-center gap-4">
              {/* Icono */}
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">folder_open</span>
              </div>
              
              {/* Info del Proyecto */}
              <div>
                <h1 className="text-xl font-bold text-[#111318] mb-0.5">{project.projectCode}</h1>
                <p className="text-xs text-gray-500">{project.projectName}</p>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Cliente */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">business</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold leading-none">Cliente</p>
                  <p className="text-sm font-bold text-indigo-900">{project.clientName || 'Sin asignar'}</p>
                </div>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Info adicional compacta */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">business</span>
                  <span>{project.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{project.projectManager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>{project.totalWorkers} trabajadores</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Progreso y Estado */}
            <div className="flex items-center gap-4">
              {/* Barra de progreso compacta */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-primary">{completedCount}/{totalCount}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Tareas</span>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center font-semibold">{progressPercentage.toFixed(0)}% completado</p>
                </div>
              </div>
              
              {/* Estado */}
              <span className={`px-4 py-2 rounded-lg text-xs font-bold border-2 ${
                projectStatus.toLowerCase().includes('por asignar requerimientos') ? 'bg-amber-100 text-amber-700 border-amber-300' :
                projectStatus.toLowerCase().includes('proceso') ? 'bg-blue-100 text-blue-700 border-blue-300' :
                projectStatus.toLowerCase().includes('finalizado') ? 'bg-green-100 text-green-700 border-green-300' :
                projectStatus.toLowerCase().includes('cancelado') ? 'bg-red-100 text-red-700 border-red-300' :
                projectStatus.toLowerCase().includes('atrasado') ? 'bg-orange-100 text-orange-700 border-orange-300' :
                'bg-gray-100 text-gray-700 border-gray-300'
              }`}>
                {projectStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Estadísticas */}
      <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-6 py-5 shadow-sm">
        {/* Primera fila: Estadísticas Generales */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Izquierda: Información de Fechas */}
          <div className="flex items-center gap-8">
            {/* Fecha de Ingreso */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center border-2 border-indigo-300 shadow-sm">
                <span className="material-symbols-outlined text-indigo-600 text-[24px]">event</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Fecha Ingreso</p>
                <p className="text-sm font-bold text-gray-900">{formatearFecha(fechaIngreso)}</p>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-300"></div>

            {/* Días Transcurridos */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center border-2 border-purple-300 shadow-sm">
                <span className="material-symbols-outlined text-purple-600 text-[24px]">schedule</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Días Transcurridos</p>
                <p className="text-sm font-bold text-gray-900">{diasTranscurridos} días</p>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-300"></div>

            {/* Días Restantes */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center border-2 border-teal-300 shadow-sm">
                <span className="material-symbols-outlined text-teal-600 text-[24px]">event_available</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Días Restantes</p>
                <p className="text-sm font-bold text-gray-900">
                  {diasRestantesInicioTerreno !== null ? `${diasRestantesInicioTerreno} días` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-px h-12 bg-gray-300"></div>

          {/* Derecha: Estadísticas en línea - Más grandes */}
          <div className="flex items-center gap-8">
            {/* Completados */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center border-2 border-green-300 shadow-sm">
                <span className="material-symbols-outlined text-green-600 text-[24px]">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 leading-none">{completedCount}</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Completados</p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-gray-300"></div>
            
            {/* Pendientes */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-amber-300 shadow-sm">
                <span className="material-symbols-outlined text-amber-600 text-[24px]">pending</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 leading-none">{totalCount - completedCount}</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Pendientes</p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-gray-300"></div>
            
            {/* Progreso */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-300 shadow-sm">
                <span className="material-symbols-outlined text-blue-600 text-[24px]">analytics</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 leading-none">{Math.round((completedCount / totalCount) * 100)}%</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Progreso</p>
              </div>
            </div>

            <div className="w-px h-12 bg-gray-300"></div>

            {/* Botón Enviar ID Proyecto */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnviarIdProyecto}
                disabled={enviandoProyecto || !canSendProjectDetail}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                  enviandoProyecto || !canSendProjectDetail
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-md'
                }`}
              >
                {enviandoProyecto ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Enviar detalle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de éxito/error */}
        {mensajeEnvio && (
          <div className={`mt-4 p-4 rounded-lg border-2 flex items-center gap-3 ${
            mensajeEnvio.tipo === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className={`material-symbols-outlined text-[24px] ${
              mensajeEnvio.tipo === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              {mensajeEnvio.tipo === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="text-sm font-medium flex-1">{mensajeEnvio.texto}</p>
            <button
              onClick={() => setMensajeEnvio(null)}
              className="p-1 rounded hover:bg-black/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}

        {/* Segunda fila: Cumplimiento por Responsables */}
        {(() => {
          const responsables = [
            { id: project.jpro_id, nombre: project.jpro_nombre, rol: 'JPRO', color: 'blue' },
            { id: project.epr_id, nombre: project.epr_nombre, rol: 'EPR', color: 'orange' },
            { id: project.rrhh_id, nombre: project.rrhh_nombre, rol: 'RRHH', color: 'green' },
            { id: project.legal_id, nombre: project.legal_nombre, rol: 'Legal', color: 'purple' }
          ].filter(r => r.id);

          if (responsables.length === 0) {
            return (
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-[20px]">info</span>
                  <span>Sin responsables asignados</span>
                </div>
              </div>
            );
          }

          return (
            <div className="pt-4 border-t border-gray-200">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Cumplimiento por Responsable
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {responsables.map((resp) => {
                  const tareas = requirements.filter((t) => t.responsable === resp.rol);
                  const completadas = tareas.filter((t) => t.realizado).length;
                  const total = tareas.length;
                  const porcentaje = total > 0 ? (completadas / total) : 0;

                  const colorMap = {
                    blue: { bg: 'bg-blue-50', border: 'border-blue-200', ring: '#DBEAFE', stroke: '#3B82F6', text: 'text-blue-600' },
                    orange: { bg: 'bg-orange-50', border: 'border-orange-200', ring: '#FED7AA', stroke: '#F97316', text: 'text-orange-600' },
                    green: { bg: 'bg-green-50', border: 'border-green-200', ring: '#D1FAE5', stroke: '#10B981', text: 'text-green-600' },
                    purple: { bg: 'bg-purple-50', border: 'border-purple-200', ring: '#E9D5FF', stroke: '#A855F7', text: 'text-purple-600' }
                  };
                  const colors = colorMap[resp.color as keyof typeof colorMap] || colorMap.blue;

                  return (
                    <div key={resp.rol} className={`flex items-center gap-3 ${colors.bg} rounded-lg border-2 ${colors.border} px-4 py-3 transition-all duration-300 shadow-sm hover:shadow-md`}>
                      {/* Anillo de progreso */}
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke={colors.ring} strokeWidth="4" fill="none" />
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            stroke={colors.stroke}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 26}`}
                            strokeDashoffset={`${2 * Math.PI * 26 * (1 - porcentaje)}`}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-base font-extrabold text-gray-800">
                            {Math.round(porcentaje * 100)}%
                          </span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className={`text-sm font-extrabold uppercase ${colors.text}`}>{resp.rol}</p>
                          <div className="flex items-baseline gap-1">
                            <p className={`text-lg font-bold ${colors.text}`}>{completadas}</p>
                            <span className="text-xs font-semibold text-gray-400">/</span>
                            <p className="text-sm font-semibold text-gray-500">{total}</p>
                          </div>
                        </div>
                        {resp.nombre && (
                          <p className="text-xs text-gray-600 font-medium truncate leading-tight">
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

      {/* Tabla de Requerimientos */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Cargo</span>
                      <button
                        onClick={() => handleFilterToggle('cargo')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCargo ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'cargo' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('cargo', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCargo ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Cargos
                            </button>
                            {cargos.map(cargo => (
                              <button
                                key={cargo}
                                onClick={() => handleFilterSelect('cargo', cargo)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCargo === cargo ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cargo}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Responsable</span>
                      <button
                        onClick={() => handleFilterToggle('responsable')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterNombreResponsable ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'responsable' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('responsable', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterNombreResponsable ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Responsables
                            </button>
                            {nombresResponsables.map(nombre => (
                              <button
                                key={nombre}
                                onClick={() => handleFilterSelect('responsable', nombre)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterNombreResponsable === nombre ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>TRABAJADOR / PATENTE</span>
                      <button
                        onClick={() => handleFilterToggle('trabajador')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterNombreTrabajador ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'trabajador' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('trabajador', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterNombreTrabajador ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Trabajadores
                            </button>
                            {nombresTrabajadores.map(nombre => (
                              <button
                                key={nombre}
                                onClick={() => handleFilterSelect('trabajador', nombre)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterNombreTrabajador === nombre ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Categoría Empresa</span>
                      <button
                        onClick={() => handleFilterToggle('categoria_empresa')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCategoriaEmpresa ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'categoria_empresa' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('categoria_empresa', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCategoriaEmpresa ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todas las Empresas
                            </button>
                            {categoriasEmpresa.map(cat => (
                              <button
                                key={cat}
                                onClick={() => handleFilterSelect('categoria_empresa', cat)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCategoriaEmpresa === cat ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Requerimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Categoría</span>
                      <button
                        onClick={() => handleFilterToggle('categoria')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCategoria ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'categoria' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('categoria', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCategoria ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todas las Categorías
                            </button>
                            {categorias.map(cat => (
                              <button
                                key={cat}
                                onClick={() => handleFilterSelect('categoria', cat)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCategoria === cat ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Empresa Acreditacion</span>
                      <button
                        onClick={() => handleFilterToggle('empresa_acreditacion')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterEmpresaAcreditacion ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'empresa_acreditacion' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('empresa_acreditacion', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterEmpresaAcreditacion ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todas las Empresas
                            </button>
                            {empresasAcreditacion.map((empresa) => (
                              <button
                                key={empresa}
                                onClick={() => handleFilterSelect('empresa_acreditacion', empresa)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterEmpresaAcreditacion === empresa ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {empresa}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2 relative filter-dropdown-container">
                      <span>Realizado</span>
                      <button
                        onClick={() => handleFilterToggle('realizado')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterRealizado ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'realizado' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('realizado', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterRealizado ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Estados
                            </button>
                            <button
                              onClick={() => handleFilterSelect('realizado', 'realizado')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterRealizado === 'realizado' ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              ✅ Realizados
                            </button>
                            <button
                              onClick={() => handleFilterSelect('realizado', 'pendiente')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterRealizado === 'pendiente' ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              ⏳ Pendientes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fecha Finalizada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => {
                    // Colores según el cargo
                    const cargoColors = {
                      'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                      'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                      'RRHH': 'bg-green-100 text-green-700 border-green-300',
                      'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                    };
                    const colorClass = cargoColors[req.responsable as keyof typeof cargoColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                    return (
                      <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Cargo */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${colorClass}`}>
                            {req.responsable}
                          </span>
                        </td>
                        
                        {/* Responsable */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">account_circle</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {req.nombre_responsable || <span className="text-gray-400 italic font-normal">Sin asignar</span>}
                            </span>
                          </div>
                        </td>

                        {/* Nombre Trabajador */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">
                              {isVehicleRequirement(req) ? 'directions_car' : 'person'}
                            </span>
                            {req.nombre_trabajador ? (
                              canOpenWorkerName ? (
                                <button
                                  onClick={() => handleTrabajadorClick(req.nombre_trabajador!)}
                                  className="text-sm text-primary hover:text-primary-hover hover:underline font-medium transition-colors cursor-pointer"
                                >
                                  {req.nombre_trabajador}
                                </button>
                              ) : (
                                <span className="text-sm font-medium text-gray-900">
                                  {req.nombre_trabajador}
                                </span>
                              )
                            ) : isVehicleRequirement(req) ? (
                              <span className="text-sm font-medium text-gray-900">
                                {getRequirementEntityLabel(req)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 italic text-xs">N/A</span>
                            )}
                          </div>
                        </td>

                        {/* Categoría Empresa */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.categoria_empresa ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              req.categoria_empresa === 'MyMA' 
                                ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              {req.categoria_empresa}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">N/A</span>
                          )}
                        </td>

                        {/* Requerimiento */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{req.requerimiento}</span>
                            {requerimientosConObservaciones.has(req.requerimiento) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInfoClick(req.requerimiento);
                                }}
                                className="flex-shrink-0 p-1.5 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                title="Ver observaciones"
                              >
                                <span className="material-symbols-outlined text-lg">info</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {req.categoria}
                          </span>
                        </td>

                        {/* Empresa Acreditación */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.empresa_acreditacion ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              req.empresa_acreditacion === 'MyMA' 
                                ? 'bg-teal-50 text-teal-700 border-teal-300' 
                                : 'bg-purple-50 text-purple-700 border-purple-300'
                            }`}>
                              {req.empresa_acreditacion}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">N/A</span>
                          )}
                        </td>

                        {/* Documentos */}
                        <td className="px-6 py-4">
                          {canUploadRequirementDocument(req) ? (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    e.stopPropagation();
                                    await handleSubirDocumento(file, req);
                                    // Resetear el input para permitir subir el mismo archivo de nuevo
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                                  input?.click();
                                }}
                                disabled={subiendoDocumento === req.id}
                                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-xs font-semibold ${
                                  subiendoDocumento === req.id
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300'
                                }`}
                              >
                                {subiendoDocumento === req.id ? (
                                  <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                    <span>Subiendo...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                    <span>Subir</span>
                                  </>
                                )}
                              </button>
                            </label>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Documento */}
                        <td className="px-6 py-4 text-center">
                          {req.drive_doc_url ? (
                            canViewRequirementDocument(req) || canDeleteDocuments ? (
                              <div className="flex items-center justify-center gap-1">
                                {canViewRequirementDocument(req) && canPreviewDocument && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVerDocumentoRequerimiento(req.drive_doc_url!);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                                    title="Visualizar documento"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                  </button>
                                )}
                                {canViewRequirementDocument(req) && canOpenDriveDocument && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAbrirDocumentoRequerimiento(req.drive_doc_url!);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                    title="Abrir en Google Drive"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                  </button>
                                )}
                                {canDeleteDocuments && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEliminarDocumentoRequerimiento(req.id);
                                    }}
                                    className="text-gray-600 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                    title="Eliminar documento"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )
                          ) : req.localFileUrl ? (
                            canViewRequirementDocument(req) ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerArchivoLocal(req.localFileUrl!);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                                  title={`Visualizar documento (${req.localFileName || "archivo local"})`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Realizado */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleRealizado(e, req.id)}
                              disabled={!canToggleRealizado}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                                req.realizado 
                                  ? canToggleRealizado
                                    ? 'bg-green-100 hover:bg-green-200 border-2 border-green-500'
                                    : 'bg-green-100 border-2 border-green-500 cursor-not-allowed opacity-70'
                                  : canToggleRealizado
                                    ? 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                                    : 'bg-gray-100 border-2 border-gray-300 cursor-not-allowed opacity-70'
                              }`}
                            >
                            {req.realizado ? (
                              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-gray-400 text-2xl">radio_button_unchecked</span>
                            )}
                            </button>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            req.estado === 'Completado' 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : req.estado === 'En Proceso'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}>
                            {req.estado || 'Pendiente'}
                          </span>
                        </td>

                        {/* Fecha Finalizada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.fechaFinalizada ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="material-symbols-outlined text-[18px]">event</span>
                              <span>{new Date(req.fechaFinalizada).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-gray-300 text-5xl">search_off</span>
                        <p className="text-gray-500 text-lg">No se encontraron requerimientos</p>
                        <p className="text-gray-400 text-sm">Intenta ajustar los filtros</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Observaciones */}
      {observacionesModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseObservacionesModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Observaciones del Requerimiento</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{requerimientoSeleccionado}</p>
                </div>
              </div>
              <button
                onClick={handleCloseObservacionesModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingObservaciones ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-gray-600 text-sm">Cargando observaciones...</p>
                  </div>
                </div>
              ) : observacionesText ? (
                <div className="prose max-w-none">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{observacionesText}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">info</span>
                  <p className="text-gray-500 text-base">No hay observaciones disponibles para este requerimiento</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={handleCloseObservacionesModal}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Documentos de Persona */}
      {documentosModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseDocumentosModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <span className="material-symbols-outlined text-primary">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Documentos de {personaSeleccionada}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {documentosPersona.length} documento{documentosPersona.length !== 1 ? 's' : ''} encontrado{documentosPersona.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDocumentosModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDocumentos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-gray-600 text-sm">Cargando documentos...</p>
                  </div>
                </div>
              ) : documentosPersona.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold w-12">
                          Seleccionar
                        </th>
                        <th scope="col" className="px-6 py-3 font-semibold">NOMBRE</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Requerimiento</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Categoría</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                        <th scope="col" className="px-6 py-3 font-semibold text-center">Documento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documentosPersona.map((doc) => {
                        const esVencida = doc.status === RequestStatus.Expired;
                        const esSinDocumento = !doc.link;
                        const estaSeleccionado = documentoSeleccionado === doc.id;
                        const puedeSeleccionar = canSaveLinkedDocument && !esVencida && !esSinDocumento;
                        const estaDeshabilitado = !canSaveLinkedDocument || esVencida || esSinDocumento;
                        
                        return (
                        <tr 
                          key={doc.id} 
                          className={`transition-colors ${
                            estaSeleccionado ? 'bg-blue-50' : estaDeshabilitado ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                          } ${puedeSeleccionar ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                          onClick={() => puedeSeleccionar && handleToggleDocumentoSeleccionado(doc.id, doc.status, !!doc.link)}
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="radio"
                              name="documentoSeleccionado"
                              checked={estaSeleccionado}
                              onChange={() => puedeSeleccionar && handleToggleDocumentoSeleccionado(doc.id, doc.status, !!doc.link)}
                              disabled={estaDeshabilitado}
                              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{doc.name}</td>
                          <td className="px-6 py-4 text-gray-600">{doc.requirement}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {doc.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getStatusBadge(doc.status)}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {doc.link ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const urls = getDriveUrls(doc.link!);
                                    setPreviewLink(urls.preview);
                                    setIsPreviewModalOpen(true);
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
                                    const urls = getDriveUrls(doc.link!);
                                    window.open(urls.drive, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                  title="Abrir en Google Drive"
                                >
                                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin documento</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">description</span>
                  <p className="text-gray-500 text-base">No se encontraron documentos para esta persona</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0">
              <div className="text-sm text-gray-600">
                {documentoSeleccionado && (
                  <span className="font-medium">
                    1 documento seleccionado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGuardarDocumentos}
                  disabled={!canSaveLinkedDocument || !documentoSeleccionado || guardandoDocumentos}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    !canSaveLinkedDocument || !documentoSeleccionado || guardandoDocumentos
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {guardandoDocumentos ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Guardar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCloseDocumentosModal}
                  disabled={guardandoDocumentos}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    guardandoDocumentos
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa del Documento */}
      {isPreviewModalOpen && previewLink && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setIsPreviewModalOpen(false);
            setPreviewLink(null);
          }}
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
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewLink(null);
                }}
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

      {/* Modal de Proyecto Completado */}
      {proyectoCompletadoModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => setProyectoCompletadoModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con gradiente verde */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-6 flex items-center justify-center flex-col">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">¡Proyecto Completado!</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700 mb-2">
                  Todos los requerimientos del proyecto
                </p>
                <p className="text-xl font-bold text-primary mb-4">
                  {project.projectCode}
                </p>
                <p className="text-gray-600">
                  han sido completados exitosamente.
                </p>
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    El proyecto ha sido marcado como <span className="font-bold">"Finalizado"</span>
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setProyectoCompletadoModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">check</span>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Documento */}
      {eliminarDocumentoModalOpen && requerimientoAEliminar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={handleCerrarEliminarDocumentoModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con gradiente rojo */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-6 flex items-center justify-center flex-col">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <span className="material-symbols-outlined text-red-600 text-5xl">delete</span>
              </div>
              <h2 className="text-2xl font-bold text-white text-center">Confirmar Eliminación</h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700 mb-4">
                  ¿Estás seguro de que deseas enviar la información para eliminar este documento?
                </p>
                {(() => {
                  const requerimiento = requirements.find(req => req.id === requerimientoAEliminar);
                  if (requerimiento) {
                    const entityLabel = getRequirementEntityLabel(requerimiento);
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        {entityLabel && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-semibold">Identificador:</span> {entityLabel}
                          </p>
                        )}
                        <p className={`text-sm text-gray-600 ${entityLabel ? '' : 'mb-0'}`}>
                          <span className="font-semibold">Requerimiento:</span> {requerimiento.requerimiento}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
                <p className="text-sm text-gray-500">
                  Se eliminará el documento de la carpeta del Drive asociada al proyecto.
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCerrarEliminarDocumentoModal}
                  disabled={enviandoEliminacion}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    enviandoEliminacion
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacionDocumento}
                  disabled={enviandoEliminacion}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    enviandoEliminacion
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {enviandoEliminacion ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      <span>Confirmar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailView;
