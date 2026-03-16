import { OrganigramaPersona } from '../types';

/**
 * Obtener datos dummy del organigrama
 */
export const fetchOrganigramaData = async (): Promise<OrganigramaPersona[]> => {
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 500));

  // Datos dummy del organigrama
  const dummyData: OrganigramaPersona[] = [
    { id: "carlos", persona_id: 1, name: "Carlos Barrera", role: "Gerente General", area: "Gerencia General", managerId: null },
    
    { id: "adm_fin", persona_id: 2, name: "Ángel Galaz", role: "Gerente", area: "Admin., Fin. y RR.HH", managerId: "carlos" },
    { id: "tecnica", persona_id: 3, name: "Christian Peralta", role: "Gerente", area: "Gerencia Técnica", managerId: "carlos" },
    { id: "operaciones", persona_id: 4, name: "Sebastián Galaz", role: "Gerente", area: "Gerencia de Operaciones", managerId: "carlos" },
    { id: "innovacion", persona_id: 5, name: "Cristopher Marchant", role: "Gerente", area: "Gerencia de I+D", managerId: "carlos" },
    { id: "negocios", persona_id: 6, name: "Luis Ayala", role: "Gerente", area: "Gerencia de Negocios", managerId: "carlos" },
    
    // Subordinados de Operaciones
    { id: "mr", persona_id: 7, name: "Marcia Romero", role: "Gerente de Proyectos", area: "Gerencia de Operaciones", managerId: "operaciones" },
    { id: "ja", persona_id: 8, name: "Javiera Azagra", role: "Gerente de Proyectos", area: "Gerencia de Operaciones", managerId: "operaciones" },
    { id: "pa", persona_id: 9, name: "Paulina Acuña", role: "Gerente de Proyectos", area: "Gerencia de Operaciones", managerId: "operaciones" },
    { id: "permisos", persona_id: 10, name: "Paula Reyes", role: "Gerente de Permisos", area: "Gerencia de Operaciones", managerId: "operaciones" },
    
    // Subordinados de Admin., Fin. y RR.HH
    { id: "mario_sainz", persona_id: 11, name: "Mario Sainz", role: "Jefe de Administración", area: "Admin., Fin. y RR.HH", managerId: "adm_fin" },
    
    // Subordinados de Negocios
    { id: "catalina_rodriguez", persona_id: 12, name: "Catalina Rodríguez", role: "Coordinadora de Negocios", area: "Gerencia de Negocios", managerId: "negocios" },
    
    // Subordinados de Técnica
    { id: "fernando_galaz", persona_id: 13, name: "Fernando Galaz", role: "Abogado", area: "Gerencia Técnica", managerId: "tecnica" },
    
    // Subordinados de I+D
    { id: "camilo_mansilla", persona_id: 14, name: "Camilo Mansilla", role: "Ingeniero I+D", area: "Gerencia de I+D", managerId: "innovacion" },
    { id: "eduardo_gallardo", persona_id: 15, name: "Eduardo Gallardo", role: "Ingeniero I+D", area: "Gerencia de I+D", managerId: "innovacion" },
    
    // Equipos bajo MR
    { id: "carolina_pacheco", persona_id: 16, name: "Carolina Pacheco", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "mr" },
    { id: "sebastian_calderon", persona_id: 17, name: "Sebastián Calderón", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "mr" },
    { id: "luis_navea", persona_id: 18, name: "Luis Navea", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "mr" },
    { id: "loreto_williams", persona_id: 19, name: "Loreto Williams", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "mr" },
    
    // Equipos bajo JA
    { id: "paula_olivares", persona_id: 20, name: "Paula Olivares", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "ja" },
    { id: "christopher_lopez", persona_id: 21, name: "Christopher López", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "ja" },
    { id: "roxana_betanzo", persona_id: 22, name: "Roxana Betanzo", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "ja" },
    { id: "jocelyn_palma", persona_id: 23, name: "Jocelyn Palma", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "ja" },
    
    // Equipos bajo PA
    { id: "macarena_ojeda", persona_id: 24, name: "Macarena Ojeda", role: "Jefe de proyectos", area: "Gerencia de Operaciones", managerId: "pa" },
    { id: "ignacio_riquelme", persona_id: 25, name: "Ignacio Riquelme", role: "Jefe de Proyectos", area: "Gerencia de Operaciones", managerId: "pa" },
    
    // Equipos bajo Permisos
    { id: "diego_munoz", persona_id: 26, name: "Diego Muñoz", role: "Jefe de Permisos", area: "Gerencia de Operaciones", managerId: "permisos" },
    { id: "elizabeth_tapia", persona_id: 27, name: "Elizabeth Tapia", role: "Jefe de Permisos", area: "Gerencia de Operaciones", managerId: "permisos" },
  ];

  return dummyData;
};

