/**
 * Constantes para el módulo de Adendas
 */

export enum TipoAdenda {
  ADENDA = 'adenda',
  ADENDA_COMPLEMENTARIA = 'adenda_complementaria',
}

export interface TipoAdendaConfig {
  id: TipoAdenda;
  displayName: string;
  icon: string;
  color: string;
  description?: string;
}

export const TIPOS_ADENDA: Record<TipoAdenda, TipoAdendaConfig> = {
  [TipoAdenda.ADENDA]: {
    id: TipoAdenda.ADENDA,
    displayName: 'Adenda',
    icon: 'description',
    color: '#f97316', // naranja
    description: 'Adenda estándar',
  },
  [TipoAdenda.ADENDA_COMPLEMENTARIA]: {
    id: TipoAdenda.ADENDA_COMPLEMENTARIA,
    displayName: 'Adenda complementaria',
    icon: 'add_circle',
    color: '#a855f7', // morado
    description: 'Adenda complementaria',
  },
};

/**
 * Obtener todos los tipos de adenda disponibles
 */
export const getAllTiposAdenda = () => Object.values(TIPOS_ADENDA);

/**
 * Obtener tipo de adenda por ID
 */
export const getTipoAdendaById = (tipoId: TipoAdenda) => TIPOS_ADENDA[tipoId];

