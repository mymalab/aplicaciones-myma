import { CurriculumData } from '../types';

/**
 * Obtener datos dummy del currículo de una persona
 */
export const fetchCurriculumData = async (personaId?: number): Promise<CurriculumData> => {
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 500));

  // Datos dummy del currículo
  const dummyData: CurriculumData = {
    persona_id: 5,
    nombre_completo: "Cristopher Marchant Sepúlveda",
    fecha_nacimiento: "26/05/1987",
    edad: 38,
    genero: "Masculino",
    nacionalidad: "Chilena",
    email_corporativo: "cmarchant@myma.cl",
    contacto: "+56 9 8765 4321",
    titulo_profesional: "Ingeniería Civil en Geografía",
    resumen_profesional: "Ingeniero Civil en Geografía con amplia experiencia en modelación ambiental, análisis de riesgos naturales y gestión territorial aplicada al sector minero e industrial. Especialista en el uso de herramientas SIG y software de modelación atmosférica y de inundaciones para la evaluación de impactos ambientales y cumplimiento normativo. Ha liderado equipos multidisciplinarios en la ejecución de estudios de impacto ambiental (EIA) y declaraciones de impacto ambiental (DIA) para proyectos de gran envergadura a nivel nacional.",
    experiencia_profesional: [
      {
        id: 1,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        empresa: "MYMA",
        cargo: "Gerente de Especialidades e Innovación",
        ano_inicio: 2024,
        ano_termino: null,
        ano_termino_display: "ACTUAL",
        funciones: "Implementación y liderazgo de la gerencia de especialistas ambientales. Coordinación de caracterizaciones ambientales por componente y evaluación de impactos. Impulso de proyectos de innovación y geomática para productividad y eficiencia.",
        aptitudes: ["Gestión ambiental", "Liderazgo", "Innovación", "Gestión de proyectos mineros"],
      },
      {
        id: 2,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        empresa: "MYMA",
        cargo: "Jefe de Innovación",
        ano_inicio: 2023,
        ano_termino: 2024,
        ano_termino_display: "2024",
        funciones: "Liderazgo del área de calidad del aire y transversalización de desarrollos e innovaciones a la organización. Automatización de flujos y aseguramiento técnico.",
        aptitudes: ["Gestión ambiental", "Innovación", "Liderazgo", "Cumplimiento normativo"],
      },
      {
        id: 3,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        empresa: "Algoritmos (ALS)",
        cargo: "Ingeniero de Proyectos",
        ano_inicio: 2012,
        ano_termino: 2012,
        ano_termino_display: "2012",
        funciones: "Estudios de calidad del aire, meteorología, inventario de emisiones y modelación atmosférica.",
        aptitudes: ["Gestión ambiental", "Regulación ambiental"],
      },
    ],
    formacion_academica: [
      {
        id: 1,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        nombre_estudio: "Ingeniero Civil en Geografía",
        universidad_institucion: "Universidad de Santiago de Chile",
        tipo: "Pregrado",
        ano: 2011,
        etiquetas: ["Geografía", "Planificación Territorial", "Calidad del Aire"],
      },
      {
        id: 2,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        nombre_estudio: "Diplomado en uso de drones para la captura y procesamiento de geoinformación",
        universidad_institucion: "Universidad de Santiago de Chile",
        tipo: "Diplomado",
        ano: 2018,
        etiquetas: ["Drones", "SIG", "Teledetección"],
      },
      {
        id: 3,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        nombre_estudio: "Diplomado en Reducción del Riesgo de Desastres: Prevención y gestión",
        universidad_institucion: "Pontificia Universidad Católica de Chile",
        tipo: "Diplomado",
        ano: 2016,
        etiquetas: ["Gestión de Riesgos", "Remoción en masa", "Hidrología"],
      },
      {
        id: 4,
        persona_id: 5,
        nombre_completo: "Cristopher Marchant Sepúlveda",
        nombre_estudio: "Curso de modelación atmosférica WRF (Geacore)",
        universidad_institucion: "Universidad de Concepción",
        tipo: "Curso",
        ano: 2022,
        etiquetas: ["Modelación Atmosférica", "Modelación Climática"],
      },
    ],
  };

  return dummyData;
};

