// Utilidades para gestionar tareas de proyectos

export interface ProjectTask {
  id: number;
  responsable: string;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  fechaFinalizada?: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const getDeterministicScore = (projectId: number, taskIndex: number): number => {
  const normalizedProjectId = Number.isFinite(projectId) ? projectId : 0;
  const rawValue =
    Math.abs((normalizedProjectId + 1) * 97 + (taskIndex + 1) * 53 + (normalizedProjectId - taskIndex) * 29) %
    1000;
  return rawValue / 1000;
};

const getDeterministicCompletionDate = (projectId: number, taskIndex: number): string => {
  const completionOffsetDays = Math.floor(getDeterministicScore(projectId, taskIndex) * 10);
  const completionDate = new Date();
  completionDate.setHours(0, 0, 0, 0);
  completionDate.setTime(completionDate.getTime() - completionOffsetDays * MS_PER_DAY);
  return completionDate.toISOString().split('T')[0];
};

// Generar tareas estandar para un proyecto basado en sus responsables
export const generateProjectTasks = (
  projectId: number,
  hasJPRO: boolean,
  hasEPR: boolean,
  hasRRHH: boolean,
  hasLegal: boolean,
  projectStatus: string
): ProjectTask[] => {
  const tasks: ProjectTask[] = [];
  let taskId = projectId * 100; // Base ID para evitar conflictos
  let taskIndex = 0;

  const statusLower = projectStatus.toLowerCase();
  const isFinished = statusLower.includes('finalizado') || statusLower.includes('finalizada');
  const isInProgress = statusLower.includes('proceso');

  const buildTaskState = (index: number): { realizado: boolean; fechaFinalizada?: string } => {
    if (isFinished) {
      return {
        realizado: true,
        fechaFinalizada: getDeterministicCompletionDate(projectId, index),
      };
    }

    if (isInProgress) {
      return {
        realizado: getDeterministicScore(projectId, index) >= 0.5,
        fechaFinalizada: undefined,
      };
    }

    return {
      realizado: false,
      fechaFinalizada: undefined,
    };
  };

  const createTask = (
    responsable: string,
    requerimiento: string,
    categoria: string
  ): ProjectTask => {
    const currentTaskIndex = taskIndex;
    taskIndex += 1;
    const taskState = buildTaskState(currentTaskIndex);

    return {
      id: taskId++,
      responsable,
      requerimiento,
      categoria,
      realizado: taskState.realizado,
      fechaFinalizada: taskState.fechaFinalizada,
    };
  };

  // Tareas del JPRO (Jefe de Proyecto)
  if (hasJPRO) {
    tasks.push(createTask('JPRO', 'Inducción al Proyecto', 'Exámenes'));
    tasks.push(createTask('JPRO', 'Licencia de Conducir', 'Conducción'));
  }

  // Tareas del EPR (Especialista en Prevencion de Riesgo)
  if (hasEPR) {
    tasks.push(createTask('EPR', 'Examen Pre-ocupacional', 'Exámenes'));
    tasks.push(createTask('EPR', 'Capacitación en Altura', 'Exámenes'));
  }

  // Tareas de RRHH
  if (hasRRHH) {
    tasks.push(createTask('RRHH', 'Contrato de Trabajo', 'Legal'));
  }

  // Tareas del area Legal
  if (hasLegal) {
    tasks.push(createTask('Legal', 'Certificado Antecedentes', 'Legal'));
  }

  // Si no hay responsables asignados, agregar tareas genericas
  if (tasks.length === 0) {
    tasks.push(
      {
        id: taskId++,
        responsable: 'Sin asignar',
        requerimiento: 'Asignar responsables del proyecto',
        categoria: 'Administrativo',
        realizado: false,
        fechaFinalizada: undefined,
      },
      {
        id: taskId++,
        responsable: 'Sin asignar',
        requerimiento: 'Definir alcance del proyecto',
        categoria: 'Administrativo',
        realizado: false,
        fechaFinalizada: undefined,
      }
    );
  }

  return tasks;
};

// Calcular tareas completadas de una lista de tareas
export const calculateCompletedTasks = (tasks: ProjectTask[]): { completed: number; total: number } => {
  const completed = tasks.filter(t => t.realizado).length;
  const total = tasks.length;
  return { completed, total };
};
