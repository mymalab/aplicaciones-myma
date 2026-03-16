// Tipos para el módulo de Personas

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
  cargo_nombre?: string;
  gerencia_nombre?: string;
  reporta_a_nombre?: string;
  reporta_a_id?: number;
  edad?: number;
  genero?: string;
  nacionalidad?: string;
  estudios_pregrado?: string;
  anos_experiencia?: number;
  antiguedad_myma?: number;
  fecha_titulacion?: string;
}

export interface PersonaWithDetails extends Persona {
  // Campos adicionales para la vista detallada
  cargo_nombre: string;
  gerencia_nombre: string;
  reporta_a_nombre: string;
  edad: number;
  genero: string;
  nacionalidad: string;
  estudios_pregrado: string;
  anos_experiencia: number;
  antiguedad_myma: number;
  fecha_titulacion: string;
}

export interface ExperienciaProfesional {
  id: number;
  persona_id: number;
  nombre_completo?: string;
  empresa: string;
  cargo: string;
  ano_inicio: number;
  ano_termino?: number | null;
  ano_termino_display?: string; // Para mostrar "ACTUAL" si es null
  funciones?: string;
  aptitudes?: string[]; // Array de aptitudes/conocimientos
  aptitudes_texto?: string; // Texto separado por comas
  created_at?: string;
  updated_at?: string;
}

export interface FormacionAcademica {
  id: number;
  persona_id: number;
  nombre_completo?: string;
  nombre_estudio: string;
  universidad_institucion: string;
  tipo: 'Pregrado' | 'Postitulo' | 'Diplomado' | 'Curso' | 'Magister' | 'Doctorado';
  ano: number;
  etiquetas?: string[]; // Array de etiquetas
  etiquetas_texto?: string; // Texto separado por comas
  created_at?: string;
  updated_at?: string;
}

export interface OrganigramaPersona {
  id: string;
  persona_id: number;
  name: string;
  role: string;
  area: string;
  managerId: string | null;
  nombre_completo?: string;
  cargo_nombre?: string;
  gerencia_nombre?: string;
}

export interface CurriculumData {
  persona_id: number;
  nombre_completo: string;
  fecha_nacimiento: string;
  edad: number;
  genero: string;
  nacionalidad: string;
  email_corporativo: string;
  contacto: string;
  titulo_profesional: string;
  resumen_profesional: string;
  experiencia_profesional: ExperienciaProfesional[];
  formacion_academica: FormacionAcademica[];
}

