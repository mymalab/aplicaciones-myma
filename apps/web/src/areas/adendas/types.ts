/**
 * TypeScript types for the Adendas module
 */

import { TipoAdenda } from './constants';

export interface Adenda {
  id: number;
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  descripcion?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  estado?: string;
}

export interface NewAdendaPayload {
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  descripcion?: string;
  estado?: string;
}

export interface AdendaListItem {
  id: number;
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  estado?: string;
  fecha_creacion?: string;
}

export type EstadoPregunta = 'En revisión' | 'Pendientes' | 'Completadas';
export type ComplejidadPregunta = 'Baja' | 'Media' | 'Alta';

export interface CatalogoPersona {
  id: number;
  nombre_completo: string;
}

export interface CatalogoEspecialidad {
  id: number;
  nombre_especialidad: string;
}

export interface PreguntaAdjunto {
  id: number;
  question_id: number;
  filename: string | null;
  tipo: string | null;
  parte: number | null;
  mime_type: string | null;
  drive_preview_url: string | null;
  drive_web_view_url: string | null;
}

export interface PreguntaAdjuntosResumen {
  figura: number;
  tabla: number;
  total: number;
}

export interface PreguntaGestion {
  id: number;
  adenda_id: number | null;
  numero: number | null;
  numero_formateado: string;
  capitulo: string;
  texto: string;
  temas_principales_texto: string;
  temas_secundarios_texto: string;
  estado: EstadoPregunta | null;
  complejidad: ComplejidadPregunta | null;
  encargado_persona_id: number | null;
  encargado_nombre: string | null;
  especialidad_id: number | null;
  especialidad_nombre: string | null;
  estrategia: string | null;
  respuesta_ia: string | null;
  adjuntos: PreguntaAdjunto[];
  adjuntos_resumen: PreguntaAdjuntosResumen;
  created_at: string | null;
}

export interface UpdatePreguntaPayload {
  estado?: EstadoPregunta | null;
  complejidad?: ComplejidadPregunta | null;
  encargado_persona_id?: number | null;
  especialidad_id?: number | null;
  estrategia?: string | null;
  respuesta_ia?: string | null;
}

