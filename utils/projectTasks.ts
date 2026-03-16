// Utilidades para gestionar tareas de proyectos

export interface ProjectTask {
  id: number;
  responsable: string;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  fechaFinalizada?: string;
}

// Generar tareas estándar para un proyecto basado en sus responsables
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

  const statusLower = projectStatus.toLowerCase();
  const isFinished = statusLower.includes('finalizada');
  const isInProgress = statusLower.includes('proceso');

  // Tareas del JPRO (Jefe de Proyecto)
  if (hasJPRO) {
    tasks.push({
      id: taskId++,
      responsable: 'JPRO',
      requerimiento: 'Inducción al Proyecto',
      categoria: 'Exámenes',
      realizado: isFinished || (isInProgress && Math.random() > 0.5),
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
    tasks.push({
      id: taskId++,
      responsable: 'JPRO',
      requerimiento: 'Licencia de Conducir',
      categoria: 'Conducción',
      realizado: isFinished,
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
  }

  // Tareas del EPR (Especialista en Prevención de Riesgo)
  if (hasEPR) {
    tasks.push({
      id: taskId++,
      responsable: 'EPR',
      requerimiento: 'Examen Pre-ocupacional',
      categoria: 'Exámenes',
      realizado: isFinished || (isInProgress && Math.random() > 0.3),
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
    tasks.push({
      id: taskId++,
      responsable: 'EPR',
      requerimiento: 'Capacitación en Altura',
      categoria: 'Exámenes',
      realizado: isFinished,
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
  }

  // Tareas de RRHH
  if (hasRRHH) {
    tasks.push({
      id: taskId++,
      responsable: 'RRHH',
      requerimiento: 'Contrato de Trabajo',
      categoria: 'Legal',
      realizado: isFinished || (isInProgress && Math.random() > 0.4),
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
  }

  // Tareas del área Legal
  if (hasLegal) {
    tasks.push({
      id: taskId++,
      responsable: 'Legal',
      requerimiento: 'Certificado Antecedentes',
      categoria: 'Legal',
      realizado: isFinished || (isInProgress && Math.random() > 0.6),
      fechaFinalizada: isFinished ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined
    });
  }

  // Si no hay responsables asignados, agregar tareas genéricas
  if (tasks.length === 0) {
    tasks.push(
      {
        id: taskId++,
        responsable: 'Sin asignar',
        requerimiento: 'Asignar responsables del proyecto',
        categoria: 'Administrativo',
        realizado: false,
        fechaFinalizada: undefined
      },
      {
        id: taskId++,
        responsable: 'Sin asignar',
        requerimiento: 'Definir alcance del proyecto',
        categoria: 'Administrativo',
        realizado: false,
        fechaFinalizada: undefined
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

