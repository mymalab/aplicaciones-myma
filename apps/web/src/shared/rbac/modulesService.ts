import { supabase } from '../api-client/supabase';

/**
 * Interfaz para un módulo de la tabla rbac_module
 */
export interface RBACModule {
  id: number;
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

/**
 * Consultar todos los módulos activos desde rbac_module
 * Mapea diferentes posibles nombres de columnas a una estructura estándar
 */
export const fetchAvailableModules = async (): Promise<RBACModule[]> => {
  try {
    // Intentar consultar con diferentes posibles nombres de columnas
    const { data, error } = await supabase
      .from('rbac_module')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching modules from rbac_module:', error);
      throw error;
    }

    if (!data) return [];

    // Mapear los datos a la estructura estándar, manejando diferentes nombres de columnas
    return data
      .map((module: any) => {
        // Mapear diferentes posibles nombres de columnas
        const mapped: RBACModule = {
          id: module.id || module.module_id,
          code: module.code || module.module_code || module.codigo,
          name: module.name || module.module_name || module.nombre,
          description: module.description || module.descripcion,
          active: module.active !== undefined ? module.active : (module.is_active !== undefined ? module.is_active : true),
        };

        return mapped;
      })
      .filter((module: RBACModule) => module.active !== false) // Filtrar solo activos
      .filter((module: RBACModule) => module.code && module.name); // Filtrar módulos válidos
  } catch (error) {
    console.error('Error in fetchAvailableModules:', error);
    return [];
  }
};

/**
 * Formatear el nombre del módulo: primera letra mayúscula y conjugado (singular)
 * Ej: "acreditaciones" -> "Acreditación", "proveedores" -> "Proveedor"
 */
export const formatModuleName = (name: string): string => {
  if (!name) return '';
  
  // Convertir a minúsculas primero
  const lowerName = name.toLowerCase().trim();
  
  // Casos especiales que no siguen la regla general
  const specialCases: Record<string, string> = {
    'finanzas': 'Finanza',
    'operaciones': 'Operación',
    'acreditaciones': 'Acreditación',
    'proveedores': 'Proveedor',
  };
  
  if (specialCases[lowerName]) {
    return specialCases[lowerName];
  }
  
  // Remover plurales comunes (es, s)
  let singular = lowerName;
  if (lowerName.endsWith('es')) {
    singular = lowerName.slice(0, -2);
  } else if (lowerName.endsWith('s') && !lowerName.endsWith('us') && !lowerName.endsWith('is')) {
    singular = lowerName.slice(0, -1);
  }
  
  // Primera letra mayúscula
  return singular.charAt(0).toUpperCase() + singular.slice(1);
};

