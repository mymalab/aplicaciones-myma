/**
 * Tipos para el área de Proveedores
 */

export enum TipoProveedor {
  EMPRESA = 'Empresa',
  PERSONA = 'Persona',
}

export enum Especialidad {
  LABORATORIO = 'Laboratorio',
  ARQUITECTURA = 'Arquitectura',
  RECURSOS_HIDRICOS = 'Recursos Hídricos',
  INGENIERIA = 'Ingeniería',
  CONSTRUCCION = 'Construcción',
  SUMINISTROS_TI = 'Suministros TI',
  CONSULTORIA_AMBIENTAL = 'Consultoría Ambiental',
  OTROS = 'Otros',
}

export enum Clasificacion {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export interface Proveedor {
  id: number;
  nombre: string;
  razonSocial?: string;
  rut: string;
  tipo: TipoProveedor;
  especialidad: string[]; // Array de especialidades desde brg_core_proveedor_especialidad
  email?: string;
  telefono?: string;
  contacto?: string;
  evaluacion: number; // Porcentaje 0-100
  promedio_nota_total_ponderada?: number | null; // Decimal 0-1
  clasificacion: Clasificacion;
  activo: boolean;
  competencia_directa?: boolean | null;
  habilitado?: boolean | null;
  acuerdo_confidencialidad_NDA?: boolean | null;
  ETFA?: boolean | null;
  tieneServiciosEjecutados?: boolean; // Indica si el proveedor tiene servicios ejecutados
  cantidad_a?: number; // Cantidad de evaluaciones con clasificación A
  cantidad_b?: number; // Cantidad de evaluaciones con clasificación B
  cantidad_c?: number; // Cantidad de evaluaciones con clasificación C
  total_evaluaciones?: number; // Total de evaluaciones del proveedor
  cruce?: string | null; // Estado de cruce de informacion
  created_at?: string;
  updated_at?: string;
}

export interface ProveedorFormData {
  nombre: string;
  razonSocial?: string;
  rut: string;
  tipo: TipoProveedor;
  especialidad: Especialidad;
  email?: string;
  telefono?: string;
  contacto?: string;
  clasificacion?: Clasificacion;
}

export enum EstadoInteres {
  MUY_ALTO = 'Muy Alto',
  ALTO = 'Alto',
  MEDIO = 'Medio',
  BAJO = 'Bajo',
  MUY_BAJO = 'Muy Bajo',
}

export enum EstadoContacto {
  EN_CONTACTO = 'En Contacto',
  SIN_CONTACTAR = 'Sin Contactar',
  EN_NEGOCIACION = 'En Negociación',
  RECHAZADO = 'Rechazado',
  ACEPTADO = 'Aceptado',
}

export enum Origen {
  WEB = 'Web',
  REFERIDO = 'Referido',
  FERIA = 'Feria',
  REDES_SOCIALES = 'Redes Sociales',
  OTROS = 'Otros',
}

export interface ProveedorPotencial {
  id: number;
  nombre: string;
  web?: string;
  referencia?: string; // Ej: "Referido por: J. Pérez"
  contactoPrincipal: {
    nombre: string;
    email?: string;
    telefono?: string;
  };
  especialidad: Especialidad;
  interes: EstadoInteres;
  estado: EstadoContacto;
  origen: Origen;
  created_at?: string;
  updated_at?: string;
}
