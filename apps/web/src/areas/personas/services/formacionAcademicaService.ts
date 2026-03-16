import { FormacionAcademica } from '../types';

/**
 * Obtener todas las formaciones académicas (datos dummy)
 */
export const fetchFormacionesAcademicas = async (): Promise<FormacionAcademica[]> => {
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 500));

  // Datos dummy de formaciones académicas
  const dummyData: FormacionAcademica[] = [
    {
      id: 1,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Postítulo en Contaminación Atmosférica",
      universidad_institucion: "Universidad de Chile",
      tipo: "Postitulo",
      ano: 2014,
      etiquetas: ["CONTAMINACIÓN", "EMISIONES", "CALIDAD DEL AIRE"],
    },
    {
      id: 2,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Ingeniería Civil en Biotecnología",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2009,
      etiquetas: ["INGENIERÍA CIVIL", "BIOTECNOLOGÍA"],
    },
    {
      id: 3,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Curso de modelación de inundaciones HEC-RAS",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Curso",
      ano: 2017,
      etiquetas: ["HEC-RAS", "MODELACIÓN AMBIENTAL", "DESBORDE DE RÍOS"],
    },
    {
      id: 4,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Diplomado en uso de drones para geoinformación",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Diplomado",
      ano: 2018,
      etiquetas: ["GEOGRAFÍA", "SIG", "DRONES"],
    },
    {
      id: 5,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Diplomado en Reducción de Riesgo de Desastres",
      universidad_institucion: "Pontificia Universidad Católica de Chile",
      tipo: "Diplomado",
      ano: 2016,
      etiquetas: ["GESTIÓN DE RIESGOS", "HIDROLOGÍA"],
    },
    {
      id: 6,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Postítulo en Derecho Ambiental",
      universidad_institucion: "Universidad de Chile",
      tipo: "Postitulo",
      ano: 2018,
      etiquetas: ["DERECHO AMBIENTAL"],
    },
    {
      id: 7,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Ingeniería Civil en Geografía",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Pregrado",
      ano: 2011,
      etiquetas: ["Geografía", "Planificación Territorial", "Calidad del Aire"],
    },
    {
      id: 8,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Curso de modelación atmosférica WRF (Geacore)",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Curso",
      ano: 2022,
      etiquetas: ["Modelación Atmosférica", "Modelación Climática"],
    },
    {
      id: 9,
      persona_id: 2,
      nombre_completo: "Ángel Galaz",
      nombre_estudio: "Ingeniería Comercial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1985,
      etiquetas: ["Administración", "Finanzas", "Gestión"],
    },
    {
      id: 10,
      persona_id: 3,
      nombre_completo: "Christian Peralta",
      nombre_estudio: "Ingeniería en Construcción",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1995,
      etiquetas: ["Construcción", "Ingeniería", "Proyectos"],
    },
    {
      id: 11,
      persona_id: 4,
      nombre_completo: "Sebastián Galaz",
      nombre_estudio: "Ingeniería Civil Industrial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1998,
      etiquetas: ["Ingeniería Industrial", "Gestión", "Operaciones"],
    },
    {
      id: 12,
      persona_id: 6,
      nombre_completo: "Luis Ayala",
      nombre_estudio: "Ingeniería Civil Industrial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2015,
      etiquetas: ["Ingeniería Industrial", "Negocios", "Comercial"],
    },
    {
      id: 13,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Diplomado en Gestión de Residuos Industriales",
      universidad_institucion: "Universidad Católica de Chile",
      tipo: "Diplomado",
      ano: 2016,
      etiquetas: ["GESTIÓN DE RESIDUOS", "INDUSTRIA"],
    },
    {
      id: 14,
      persona_id: 7,
      nombre_completo: "María González Silva",
      nombre_estudio: "Ingeniería Ambiental",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Pregrado",
      ano: 2018,
      etiquetas: ["INGENIERÍA AMBIENTAL", "GESTIÓN AMBIENTAL"],
    },
    {
      id: 15,
      persona_id: 8,
      nombre_completo: "Roberto Martínez López",
      nombre_estudio: "Magíster en Gestión y Planificación Ambiental",
      universidad_institucion: "Universidad de Chile",
      tipo: "Magister",
      ano: 2016,
      etiquetas: ["GESTIÓN AMBIENTAL", "PLANIFICACIÓN", "MAGÍSTER"],
    },
    {
      id: 16,
      persona_id: 9,
      nombre_completo: "Ana Fernández Torres",
      nombre_estudio: "Diplomado en Permisos Ambientales",
      universidad_institucion: "Pontificia Universidad Católica de Chile",
      tipo: "Diplomado",
      ano: 2018,
      etiquetas: ["PERMISOS AMBIENTALES", "REGULACIÓN"],
    },
    {
      id: 17,
      persona_id: 10,
      nombre_completo: "Carlos Ramírez Soto",
      nombre_estudio: "Ingeniería Civil Química",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Pregrado",
      ano: 2014,
      etiquetas: ["INGENIERÍA QUÍMICA", "PROCESOS"],
    },
    {
      id: 18,
      persona_id: 11,
      nombre_completo: "Patricia Morales Rojas",
      nombre_estudio: "Magíster en Ciencias Ambientales",
      universidad_institucion: "Universidad de Chile",
      tipo: "Magister",
      ano: 2015,
      etiquetas: ["CIENCIAS AMBIENTALES", "MAGÍSTER"],
    },
    {
      id: 19,
      persona_id: 12,
      nombre_completo: "Jorge Herrera Díaz",
      nombre_estudio: "Doctorado en Ciencias Ambientales",
      universidad_institucion: "Universidad de Chile",
      tipo: "Doctorado",
      ano: 2018,
      etiquetas: ["CIENCIAS AMBIENTALES", "DOCTORADO", "INVESTIGACIÓN"],
    },
    {
      id: 20,
      persona_id: 13,
      nombre_completo: "Laura Sánchez Pérez",
      nombre_estudio: "Ingeniería Civil en Minas",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2019,
      etiquetas: ["INGENIERÍA DE MINAS", "MINERÍA"],
    },
    {
      id: 21,
      persona_id: 14,
      nombre_completo: "Diego Torres Muñoz",
      nombre_estudio: "Postítulo en Evaluación de Impacto Ambiental",
      universidad_institucion: "Universidad de Chile",
      tipo: "Postitulo",
      ano: 2013,
      etiquetas: ["EIA", "EVALUACIÓN AMBIENTAL"],
    },
    {
      id: 22,
      persona_id: 15,
      nombre_completo: "Carmen Vega Castro",
      nombre_estudio: "Magíster en Conservación de Biodiversidad",
      universidad_institucion: "Pontificia Universidad Católica de Chile",
      tipo: "Magister",
      ano: 2018,
      etiquetas: ["BIODIVERSIDAD", "CONSERVACIÓN", "MAGÍSTER"],
    },
    {
      id: 23,
      persona_id: 16,
      nombre_completo: "Fernando Castro Ruiz",
      nombre_estudio: "Geología",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2016,
      etiquetas: ["GEOLOGÍA", "CIENCIAS DE LA TIERRA"],
    },
    {
      id: 24,
      persona_id: 17,
      nombre_completo: "Valentina López Gutiérrez",
      nombre_estudio: "Curso de Modelación de Calidad del Aire",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Curso",
      ano: 2019,
      etiquetas: ["MODELACIÓN", "CALIDAD DEL AIRE"],
    },
    {
      id: 25,
      persona_id: 18,
      nombre_completo: "Andrés Jiménez Flores",
      nombre_estudio: "Ingeniería Civil Industrial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2014,
      etiquetas: ["INGENIERÍA INDUSTRIAL", "GESTIÓN"],
    },
    {
      id: 26,
      persona_id: 19,
      nombre_completo: "Isabel Contreras Méndez",
      nombre_estudio: "Diplomado en Normativa Ambiental",
      universidad_institucion: "Universidad de Chile",
      tipo: "Diplomado",
      ano: 2020,
      etiquetas: ["NORMATIVA AMBIENTAL", "REGULACIÓN"],
    },
    {
      id: 27,
      persona_id: 20,
      nombre_completo: "Ricardo Peña Moreno",
      nombre_estudio: "Ingeniería Química",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Pregrado",
      ano: 2015,
      etiquetas: ["INGENIERÍA QUÍMICA", "PROCESOS"],
    },
    {
      id: 28,
      persona_id: 21,
      nombre_completo: "Natalia Díaz Herrera",
      nombre_estudio: "Magíster en Gestión de Personas",
      universidad_institucion: "Universidad Adolfo Ibáñez",
      tipo: "Magister",
      ano: 2017,
      etiquetas: ["GESTIÓN DE PERSONAS", "RECURSOS HUMANOS", "MAGÍSTER"],
    },
    {
      id: 29,
      persona_id: 22,
      nombre_completo: "Mauricio Silva Rojas",
      nombre_estudio: "Ingeniería Civil",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2013,
      etiquetas: ["INGENIERÍA CIVIL", "CONSTRUCCIÓN"],
    },
    {
      id: 30,
      persona_id: 23,
      nombre_completo: "Gabriela Muñoz Campos",
      nombre_estudio: "Magíster en Sostenibilidad",
      universidad_institucion: "Universidad de Chile",
      tipo: "Magister",
      ano: 2019,
      etiquetas: ["SUSTENTABILIDAD", "GESTIÓN CORPORATIVA", "MAGÍSTER"],
    },
    {
      id: 31,
      persona_id: 24,
      nombre_completo: "Héctor Vargas Núñez",
      nombre_estudio: "Diplomado en Monitoreo Ambiental",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Diplomado",
      ano: 2018,
      etiquetas: ["MONITOREO AMBIENTAL", "GESTIÓN DE DATOS"],
    },
    {
      id: 32,
      persona_id: 25,
      nombre_completo: "Sofía Rojas Martínez",
      nombre_estudio: "Ingeniería Ambiental",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Pregrado",
      ano: 2014,
      etiquetas: ["INGENIERÍA AMBIENTAL", "GESTIÓN AMBIENTAL"],
    },
  ];

  return dummyData;
};

/**
 * Buscar formaciones académicas por término de búsqueda
 */
export const searchFormacionesAcademicas = async (
  searchTerm: string
): Promise<FormacionAcademica[]> => {
  const allFormaciones = await fetchFormacionesAcademicas();
  
  const term = searchTerm.toLowerCase().trim();
  if (!term) {
    return allFormaciones;
  }

  // Filtrar por término de búsqueda
  return allFormaciones.filter(form => {
    const nombreMatch = form.nombre_completo?.toLowerCase().includes(term);
    const estudioMatch = form.nombre_estudio?.toLowerCase().includes(term);
    const institucionMatch = form.universidad_institucion?.toLowerCase().includes(term);
    const etiquetasMatch = form.etiquetas?.some(etq => etq.toLowerCase().includes(term));
    return nombreMatch || estudioMatch || institucionMatch || etiquetasMatch;
  });
};

