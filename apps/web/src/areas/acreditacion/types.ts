export enum RequestStatus {
  Current = 'Vigente',
  InRenewal = 'En Renovación',
  Expiring = 'A vencer',
  Expired = 'Vencida',
}

export enum RequestCategory {
  Exams = 'Exámenes',
  Courses = 'Cursos',
  Driving = 'Conducción',
  Legal = 'Legal',
}

export enum RequirementType {
  AUD = 'AUD',
  CTT = 'C.TT',
  CCD = 'CCD',
  CEXT = 'C.EXT',
  EPP = 'EPP',
  X4X4 = '4X4',
}

// Tipos de Supabase
export interface Persona {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  obs_salud?: string;
  estado: string;
  gerencia_id: string;
  comuna_id: string;
  cargo_myma_id: string;
  especialidad_id: string;
  created_at: string;
  updated_at: string;
  sst_drive_folder_id?: string | null;
  cargo_nombre?: string;
  area_nombre?: string;
}

export interface Requerimiento {
  id: number;
  requerimiento: string;
  categoria_requerimiento: string;
  fe_inicio: string;
  fe_vencimiento: string;
  dias_anticipacion_notificacion?: number;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  rut?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResponsableRequerimiento {
  id: number;
  nombre_responsable: string;
  rut_responsable: string;
  cargo_responsable: string;
  created_at: string;
  updated_at: string;
}

export interface EmpresaRequerimiento {
  id?: number;
  empresa: string;
  requerimiento: string;
  categoria_requerimiento: string;
  responsable: 'JPRO' | 'EPR' | 'RRHH' | 'Legal';
  observaciones?: string;
  orden?: number;
  obligatorio?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProyectoRequerimientoAcreditacion {
  id?: number;
  codigo_proyecto: string;
  requerimiento: string;
  responsable: string; // JPRO, EPR, RRHH, Legal
  estado?: string; // Pendiente, En Proceso, Completado, Cancelado
  created_at?: string;
  updated_at?: string;
  cliente: string;
  categoria_requerimiento?: string;
  observaciones?: string;
  nombre_responsable?: string;
  nombre_trabajador?: string; // Nombre de la persona asociada a este requerimiento (trabajador/conductor)
  categoria_empresa?: string; // MyMA o Contratista
  id_proyecto_trabajador?: number; // ID de la entidad asociada reutilizado para compatibilidad (trabajador/conductor/vehiculo)
  patente_vehiculo?: string; // Patente asociada cuando el requerimiento es de categoría Vehiculos
  empresa_acreditacion?: string; // Empresa de acreditación (MyMA, nombre del contratista, etc.)
  drive_doc_url?: string; // URL del documento en Google Drive
}

// Tipo para las tareas del proyecto en la galería
export interface ProjectTask {
  id: number;
  responsable: string;
  nombre_responsable?: string;
  nombre_trabajador?: string; // Persona asociada (trabajador/conductor)
  categoria_empresa?: string;
  id_proyecto_trabajador?: number; // Campo reutilizado como identificador de entidad asociada
  patente_vehiculo?: string;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  fechaFinalizada?: string;
  drive_doc_url?: string;
}

export interface ProyectoTrabajador {
  id?: number;
  id_proyecto: number;
  codigo_proyecto: string;
  nombre_trabajador: string;
  categoria_empresa: 'MyMA' | 'Contratista';
  rut?: string;
  telefono?: string;
  persona_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PersonaRequerimientoSST {
  id: number;
  persona_id: number;
  requerimiento_id: number;
  rut?: string;
  nombre_completo?: string;
  dias_anticipacion?: number;
  requerimiento?: string;
  categoria_requerimiento?: string;
  fecha_vigencia?: string;
  fecha_vencimiento?: string;
  estado?: string;
  link?: string;
  drive_folder_id?: string;
  drive_folder_url?: string;
  created_at: string;
}

// Tipo para el formulario de creación/edición
export interface RequestItem {
  id: string;
  name: string;
  rut: string;
  requirement: string;
  category: string;
  status: RequestStatus;
  adjudicationDate: string;
  expirationDate: string;
  persona_id?: number;
  requerimiento_id?: number;
  link?: string;
  drive_folder_id?: string;
  drive_folder_url?: string;
}

export interface NewRequestPayload {
  persona_id: number;
  requerimiento_id: number;
  fecha_vigencia: string;
  fecha_vencimiento: string;
  estado?: RequestStatus;
  link?: string;
  documento_subida?: {
    documento_base64: string;
    nombre_documento: string;
    fecha_inicio: string;
    folder_id: string | null;
    nombre_persona: string;
    rut_persona: string;
    id_registro_sst?: number;
  };
}

// === Tipos para Solicitud de Terreno ===

export enum WorkerType {
  INTERNAL = 'Interno (MYMA)',
  EXTERNAL = 'Externo'
}

export interface Worker {
  id: string;
  name: string;
  type: WorkerType;
  phone?: string;
  company?: string;
  rut?: string;
  // ID de la persona en dim_core_persona (solo para trabajadores internos seleccionados desde BD)
  personaId?: number;
  // Si es true, al guardar la solicitud se sincroniza en dim_trabajador_externo
  syncExternalOnSave?: boolean;
}

export interface ProveedorAcreditacion {
  id: number;
  nombre_proveedor: string;
  rut?: string | null;
}

export interface TrabajadorExterno {
  id: number;
  rut: string;
  correo?: string | null;
  telefono?: string | null;
  empresa_razon_social?: string | null;
  empresa_rut?: string | null;
  nombre_completo: string;
  created_at?: string;
  updated_at?: string;
}

export interface RequestFormData {
  requestDate: string;
  requesterName: string;
  kickoffDate: string;
  projectCode: string;
  esContratoMarco: string;
  requirement: string;
  clientName: string;
  clientContactName: string;
  clientContactEmail: string;
  projectManager: string;
  accreditationFollowUp: string;
  fieldStartDate: string;
  fechaEntregaCarpetaArranque: string;
  riskPreventionNotice: string;
  companyAccreditationRequired: string;
  requiereAcreditarTrabajadoresMyma: string;
  contractAdmin: string;
  // Información del Contrato
  nombreContrato: string;
  numeroContrato: string;
  administradorContrato: string;
  // Condiciones Laborales
  jornadaTrabajo: string;
  horarioTrabajo: string;
  // Información de Vehículos
  cantidadVehiculos: string;
  placaPatente: string;
  // Pregunta sobre Contratista
  requiereAcreditarContratista: string;
  requiereAcreditarTrabajadoresContratista: string;
  // Información del Contrato (Contratista)
  modalidadContrato: string;
  razonSocialContratista: string;
  nombreResponsableContratista: string;
  telefonoResponsableContratista: string;
  emailResponsableContratista: string;
  // Vehículos Contratista
  cantidadVehiculosContratista: string;
  placasVehiculosContratista: string;
  // SST
  registroSstTerreo: string;
  // Cantidad de trabajadores
  cantidad_trabajadores_myma?: number;
  cantidad_trabajadores_contratista?: number;
}

export interface FieldRequestFormSnapshot {
  formData: RequestFormData;
  workers: Worker[];
  workersContratista: Worker[];
  targetWorkerCountMyma: number;
  targetWorkerCountContratista: number;
  horarios: Array<{
    dias: string;
    horario: string;
  }>;
  vehiculosMyma: Array<{
    placa: string;
    conductor: string;
  }>;
  vehiculosContratista: Array<{
    placa: string;
    conductor: string;
  }>;
  missingFields?: string[];
}

export const SOLICITUD_ACREDITACION_STATUS = {
  POR_ASIGNAR_REQUERIMIENTOS: 'Por asignar requerimientos',
  POR_ASIGNAR_RESPONSABLES: 'Por asignar responsables',
  EN_PROCESO: 'En proceso',
  DOCUMENTACION_SUBIDA: 'Documentación subida',
  EN_REVISION_CLIENTE: 'En revisión por Cliente',
  ACREDITACION_FINALIZADA: 'Acreditación finalizada',
  CANCELADO: 'Cancelado',
  ATRASADO: 'Atrasado',
} as const;

export type SolicitudAcreditacionStatus =
  (typeof SOLICITUD_ACREDITACION_STATUS)[keyof typeof SOLICITUD_ACREDITACION_STATUS];

// Tipo para la tabla solicitud_acreditacion
export interface SolicitudAcreditacion {
  id: number;
  fecha_solicitud: string;
  nombre_solicitante: string;
  fecha_reunion_arranque: string;
  codigo_proyecto: string;
  requisito: string;
  nombre_cliente: string;
  contacto_cliente_nombre?: string;
  contacto_cliente_email?: string;
  jefe_proyectos_myma?: string;
  encargado_seguimiento?: string;
  fecha_inicio_terreno?: string;
  aviso_prevencion_riesgo?: string;
  requiere_acreditar_empresa?: string;
  admin_contrato_myma?: string;
  nombre_contrato?: string;
  numero_contrato?: string;
  administrador_contrato?: string;
  trabajadores_myma?: any; // JSON con array de trabajadores
  cantidad_trabajadores_myma?: number; // Cantidad total de trabajadores MYMA
  horarios_trabajo?: any; // JSON con array de horarios
  vehiculos_cantidad?: number;
  vehiculos_placas?: any; // JSON con array de placas
  requiere_acreditar_contratista?: string;
  modalidad_contrato_contratista?: string;
  razon_social_contratista?: string;
  responsable_contratista_nombre?: string;
  responsable_contratista_telefono?: string;
  responsable_contratista_email?: string;
  trabajadores_contratista?: any; // JSON con array de trabajadores contratista
  cantidad_trabajadores_contratista?: number; // Cantidad total de trabajadores contratista
  vehiculos_contratista_cantidad?: number;
  vehiculos_contratista_placas?: any; // JSON con array de placas
  registro_sst_terreno?: string;
  email_usuario?: string | null;
  solicitud_prueba?: boolean;
  estado?: string;
  estado_solicitud_acreditacion?: SolicitudAcreditacionStatus | string; // Estado específico de la solicitud
  estado_carpeta_arranque?: string | null;
  carpeta_arranque_url?: string | null;
  // Responsables del proyecto
  empresa_id?: string; // ID de la Empresa Contratista
  empresa_nombre?: string; // Nombre de la Empresa Contratista
  jpro_id?: number; // ID del Jefe de Proyecto
  jpro_nombre?: string; // Nombre del Jefe de Proyecto
  epr_id?: number; // ID del Especialista en Prevención de Riesgo
  epr_nombre?: string; // Nombre del Especialista en Prevención de Riesgo
  rrhh_id?: number; // ID del Responsable de RRHH
  rrhh_nombre?: string; // Nombre del Responsable de RRHH
  legal_id?: number; // ID del Responsable Legal
  legal_nombre?: string; // Nombre del Responsable Legal
  drive_folder_id?: string; // ID de la carpeta de Google Drive del proyecto
  drive_folder_url?: string; // URL de la carpeta de Google Drive del proyecto
  fecha_finalizacion?: string | null;
  created_at: string;
  updated_at?: string;
}

// Tipo para la vista de galería de proyectos
export interface ProjectGalleryItem {
  id: number;
  projectCode: string;
  projectName: string;
  clientName: string;
  razonSocialContratista?: string;
  requesterName?: string;
  projectManager: string;
  fieldStartDate: string;
  fechaInicioTerreno?: string;
  totalWorkers: number;
  totalVehicles: number;
  status: SolicitudAcreditacionStatus | string;
  estadoCarpetaArranque?: string;
  carpetaArranqueUrl?: string;
  workers: Worker[];
  createdAt: string;
  fechaFinalizacion?: string | null;
  // Progreso de tareas
  completedTasks?: number;
  totalTasks?: number;
  tasks?: ProjectTask[]; // Array de tareas del proyecto
  // Responsables del proyecto
  empresa_id?: string;
  empresa_nombre?: string;
  jpro_id?: number;
  jpro_nombre?: string;
  epr_id?: number;
  epr_nombre?: string;
  rrhh_id?: number;
  rrhh_nombre?: string;
  legal_id?: number;
  legal_nombre?: string;
}

export const REGIONS = [
  "Metropolitana",
  "Valparaíso",
  "Biobío",
  "Antofagasta",
  "Araucanía",
  "Los Lagos"
];

export const PROJECT_MANAGERS = [
  "Juan Pérez",
  "Maria González",
  "Carlos Ruiz",
  "Ana Silva"
];

export const MOCK_WORKERS_DB = [
  { name: "Ana Silva", phone: "+56 9 8765 4321" },
  { name: "Pedro Torres", phone: "+56 9 1234 5678" },
  { name: "Luisa Fernández", phone: "+56 9 1111 2222" },
  { name: "Roberto Díaz", phone: "+56 9 3333 4444" }
];

export const MOCK_COMPANIES = [
  { id: 'tech_mining', name: 'Tech Mining SpA' },
  { id: 'servicios_log', name: 'Servicios Logísticos del Norte' },
  { id: 'geo_consult', name: 'GeoConsulting Ltda.' },
  { id: 'construcciones_sur', name: 'Construcciones del Sur Limitada' },
  { id: 'ingenieria_total', name: 'Ingeniería Total S.A.' },
  { id: 'transportes_norte', name: 'Transportes y Logística Norte Chile' },
  { id: 'mantenciones_ind', name: 'Mantenciones Industriales ProService' },
  { id: 'energia_renovable', name: 'Energía Renovable del Pacífico' },
  { id: 'seguridad_integral', name: 'Seguridad Integral Profesional' },
  { id: 'equipos_pesados', name: 'Equipos Pesados y Maquinaria Ltda.' }
];

export const MOCK_EXTERNAL_WORKERS_BY_COMPANY: Record<string, {name: string, phone: string}[]> = {
  'tech_mining': [
    { name: 'Jorge External', phone: '+56 9 9999 0001' },
    { name: 'Marta Drilling', phone: '+56 9 9999 0002' }
  ],
  'servicios_log': [
    { name: 'Pedro Chofer', phone: '+56 9 8888 0001' },
    { name: 'Lucas Carga', phone: '+56 9 8888 0002' }
  ],
  'geo_consult': [
    { name: 'Valentina Suelos', phone: '+56 9 7777 0001' }
  ]
};

