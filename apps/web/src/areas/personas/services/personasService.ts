import { supabase } from '@shared/api-client/supabase';
import { Persona, PersonaWithDetails } from '../types';

/**
 * Calcular la edad a partir de la fecha de nacimiento
 */
const calculateAge = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  const birthDate = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Formatear fecha DD/MM/YYYY
 */
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

/**
 * Obtener todas las personas con información completa
 */
export const fetchPersonas = async (): Promise<PersonaWithDetails[]> => {
  try {
    // Obtener todas las personas activas
    const { data: personasData, error: personasError } = await supabase
      .from('dim_core_persona')
      .select('*')
      .eq('estado', 'Activo')
      .order('nombre_completo', { ascending: true });

    if (personasError) {
      console.error('Error fetching personas:', personasError);
      throw personasError;
    }

    if (!personasData || personasData.length === 0) {
      return [];
    }

    // Obtener IDs únicos de cargos, gerencias y reporta_a
    const cargoIds = [...new Set(personasData.map((p: any) => p.cargo_myma_id).filter(Boolean))];
    const gerenciaIds = [...new Set(personasData.map((p: any) => p.gerencia_id).filter(Boolean))];
    const reportaAIds = [...new Set(personasData.map((p: any) => p.reporta_a_id || p.reporta_a).filter(Boolean))];

    // Obtener nombres de cargos
    let cargosMap: Record<string, string> = {};
    if (cargoIds.length > 0) {
      try {
        const { data: cargosData } = await supabase
          .from('dim_core_cargo_myma')
          .select('id, nombre')
          .in('id', cargoIds);

        if (cargosData) {
          cargosMap = cargosData.reduce((acc: Record<string, string>, cargo: any) => {
            acc[cargo.id] = cargo.nombre;
            return acc;
          }, {});
        }
      } catch (err) {
        console.warn('Error obteniendo cargos:', err);
      }
    }

    // Obtener nombres de gerencias
    let gerenciasMap: Record<string, string> = {};
    if (gerenciaIds.length > 0) {
      try {
        const { data: gerenciasData } = await supabase
          .from('dim_core_gerencia')
          .select('id, nombre')
          .in('id', gerenciaIds);

        if (gerenciasData) {
          gerenciasMap = gerenciasData.reduce((acc: Record<string, string>, gerencia: any) => {
            acc[gerencia.id] = gerencia.nombre;
            return acc;
          }, {});
        }
      } catch (err) {
        console.warn('Error obteniendo gerencias:', err);
      }
    }

    // Obtener nombres de personas a las que reportan
    let reportaAMap: Record<number, string> = {};
    if (reportaAIds.length > 0) {
      try {
        const { data: reportaAData } = await supabase
          .from('dim_core_persona')
          .select('id, nombre_completo')
          .in('id', reportaAIds);

        if (reportaAData) {
          reportaAMap = reportaAData.reduce((acc: Record<number, string>, persona: any) => {
            acc[persona.id] = persona.nombre_completo;
            return acc;
          }, {});
        }
      } catch (err) {
        console.warn('Error obteniendo reporta_a:', err);
      }
    }

    // Mapear los datos con información completa
    const personas: PersonaWithDetails[] = personasData.map((persona: any) => {
      const edad = calculateAge(persona.fecha_nacimiento);
      const fechaNacimientoFormateada = formatDate(persona.fecha_nacimiento);
      const reportaAId = persona.reporta_a_id || persona.reporta_a;

      return {
        ...persona,
        cargo_nombre: persona.cargo_myma_id ? (cargosMap[persona.cargo_myma_id] || '') : '',
        gerencia_nombre: persona.gerencia_id ? (gerenciasMap[persona.gerencia_id] || '') : '',
        reporta_a_nombre: reportaAId ? (reportaAMap[reportaAId] || '') : '',
        reporta_a_id: reportaAId,
        edad,
        fecha_nacimiento: fechaNacimientoFormateada,
        genero: persona.genero || persona.sexo || '-',
        nacionalidad: persona.nacionalidad || 'Chilena',
        estudios_pregrado: persona.estudios_pregrado || persona.estudios || '-',
        anos_experiencia: persona.anos_experiencia || persona.anios_experiencia || 0,
        antiguedad_myma: persona.antiguedad_myma || persona.antiguedad || 0,
        fecha_titulacion: formatDate(persona.fecha_titulacion || persona.fecha_titulacion_graduacion),
      };
    });

    return personas;
  } catch (error) {
    console.error('Error en fetchPersonas:', error);
    throw error;
  }
};

/**
 * Obtener una persona por ID
 */
export const fetchPersonaById = async (id: number): Promise<PersonaWithDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('dim_core_persona')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching persona:', error);
      throw error;
    }

    if (!data) return null;

    // Obtener información relacionada
    const cargoId = data.cargo_myma_id;
    const gerenciaId = data.gerencia_id;
    const reportaAId = data.reporta_a_id || data.reporta_a;

    let cargoNombre = '';
    let gerenciaNombre = '';
    let reportaANombre = '';

    if (cargoId) {
      const { data: cargoData } = await supabase
        .from('dim_core_cargo_myma')
        .select('nombre')
        .eq('id', cargoId)
        .single();
      cargoNombre = cargoData?.nombre || '';
    }

    if (gerenciaId) {
      const { data: gerenciaData } = await supabase
        .from('dim_core_gerencia')
        .select('nombre')
        .eq('id', gerenciaId)
        .single();
      gerenciaNombre = gerenciaData?.nombre || '';
    }

    if (reportaAId) {
      const { data: reportaAData } = await supabase
        .from('dim_core_persona')
        .select('nombre_completo')
        .eq('id', reportaAId)
        .single();
      reportaANombre = reportaAData?.nombre_completo || '';
    }

    const edad = calculateAge(data.fecha_nacimiento);
    const fechaNacimientoFormateada = formatDate(data.fecha_nacimiento);

    return {
      ...data,
      cargo_nombre: cargoNombre,
      gerencia_nombre: gerenciaNombre,
      reporta_a_nombre: reportaANombre,
      reporta_a_id: reportaAId,
      edad,
      fecha_nacimiento: fechaNacimientoFormateada,
      genero: data.genero || data.sexo || '-',
      nacionalidad: data.nacionalidad || 'Chilena',
      estudios_pregrado: data.estudios_pregrado || data.estudios || '-',
      anos_experiencia: data.anos_experiencia || data.anios_experiencia || 0,
      antiguedad_myma: data.antiguedad_myma || data.antiguedad || 0,
      fecha_titulacion: formatDate(data.fecha_titulacion || data.fecha_titulacion_graduacion),
    };
  } catch (error) {
    console.error('Error en fetchPersonaById:', error);
    throw error;
  }
};

