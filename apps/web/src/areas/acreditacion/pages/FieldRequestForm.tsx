import React, { useState, useEffect } from 'react';
import { WorkerList } from './WorkerList';
import { Worker, WorkerType, RequestFormData, MOCK_COMPANIES, Persona, Cliente, FieldRequestFormSnapshot } from '../types';
import {
  createSolicitudAcreditacion,
  createProyectoTrabajadores,
  createProyectoHorarios,
  createProyectoConductores,
  createProyectoVehiculos,
  fetchClientes,
  fetchProveedores,
  fetchPersonas,
  fetchProyectoTrabajadoresByProyecto,
  fetchProyectoConductoresByProyecto,
  fetchProyectoVehiculosByProyecto,
  logResumenSolicitudAcreditacion,
  crearCarpetasProyecto,
  enviarIdProyectoN8n,
} from '../services/acreditacionService';
import { supabase } from '@shared/api-client/supabase';

interface Horario {
  dias: string;
  horario: string;
}

interface VehiculoMyma {
  placa: string;
  conductor: string;
}

interface VehiculoContratista {
  placa: string;
  conductor: string;
}

interface FieldRequestFormProps {
  onBack: () => void;
  mode?: 'create' | 'view';
  initialSnapshot?: FieldRequestFormSnapshot | null;
  loadingSnapshot?: boolean;
  snapshotMeta?: {
    projectCode?: string;
    createdAt?: string;
  };
}

const FieldRequestForm: React.FC<FieldRequestFormProps> = ({
  onBack,
  mode = 'create',
  initialSnapshot = null,
  loadingSnapshot = false,
  snapshotMeta,
}) => {
  const PROJECT_CODE_PREFIX = 'MY-';
  const PROJECT_CODE_REGEX = /^MY-\d{3}-\d{4}$/;
  const formatProjectCodeInput = (rawValue: string): string => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 7);
    const middleBlock = digits.slice(0, 3);
    const yearBlock = digits.slice(3, 7);

    if (digits.length === 0) return PROJECT_CODE_PREFIX;
    if (middleBlock.length < 3) return `${PROJECT_CODE_PREFIX}${middleBlock}`;
    return `${PROJECT_CODE_PREFIX}${middleBlock}-${yearBlock}`;
  };

  const isViewMode = mode === 'view';
  const [formData, setFormData] = useState<RequestFormData>({
    requestDate: '',
    requesterName: '',
    kickoffDate: '',
    projectCode: PROJECT_CODE_PREFIX,
    requirement: '',
    clientName: '',
    clientContactName: '',
    clientContactEmail: '',
    projectManager: '',
    accreditationFollowUp: '',
    fieldStartDate: '',
    riskPreventionNotice: '',
    companyAccreditationRequired: '', // Iniciar sin selección
    requiereAcreditarTrabajadoresMyma: '',
    contractAdmin: '',
    // Información del Contrato
    nombreContrato: '',
    numeroContrato: '',
    administradorContrato: '',
    // Condiciones Laborales
    jornadaTrabajo: '',
    horarioTrabajo: '',
    // Información de Vehículos
    cantidadVehiculos: '',
    placaPatente: '',
    // Pregunta sobre Contratista
    requiereAcreditarContratista: '', // Iniciar sin selección
    requiereAcreditarTrabajadoresContratista: '',
    // Información del Contrato (Contratista)
    modalidadContrato: '',
    razonSocialContratista: '',
    nombreResponsableContratista: '',
    telefonoResponsableContratista: '',
    emailResponsableContratista: '',
    // Vehículos Contratista
    cantidadVehiculosContratista: '',
    placasVehiculosContratista: '',
    // SST
    registroSstTerreo: '', // Iniciar sin selección
  });

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersContratista, setWorkersContratista] = useState<Worker[]>([]);
  const [targetWorkerCountMyma, setTargetWorkerCountMyma] = useState(0);
  const [targetWorkerCountContratista, setTargetWorkerCountContratista] = useState(0);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [vehiculosMyma, setVehiculosMyma] = useState<VehiculoMyma[]>([]);
  const [vehiculosContratista, setVehiculosContratista] = useState<VehiculoContratista[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Estados para el buscador de solicitante
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [filteredPersonasSolicitante, setFilteredPersonasSolicitante] = useState<Persona[]>([]);
  const [searchQuerySolicitante, setSearchQuerySolicitante] = useState('');
  const [selectedPersonaSolicitante, setSelectedPersonaSolicitante] = useState<Persona | null>(null);
  const [isManualSolicitante, setIsManualSolicitante] = useState(false);
  const [showDropdownSolicitante, setShowDropdownSolicitante] = useState(false);
  const [filteredPersonasJefeProyecto, setFilteredPersonasJefeProyecto] = useState<Persona[]>([]);
  const [searchQueryJefeProyecto, setSearchQueryJefeProyecto] = useState('');
  const [selectedPersonaJefeProyecto, setSelectedPersonaJefeProyecto] = useState<Persona | null>(null);
  const [isManualJefeProyecto, setIsManualJefeProyecto] = useState(false);
  const [showDropdownJefeProyecto, setShowDropdownJefeProyecto] = useState(false);
  const [filteredPersonasAdminContrato, setFilteredPersonasAdminContrato] = useState<Persona[]>([]);
  const [searchQueryAdminContrato, setSearchQueryAdminContrato] = useState('');
  const [selectedPersonaAdminContrato, setSelectedPersonaAdminContrato] = useState<Persona | null>(null);
  const [isManualAdminContrato, setIsManualAdminContrato] = useState(false);
  const [showDropdownAdminContrato, setShowDropdownAdminContrato] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchQueryCliente, setSearchQueryCliente] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDropdownCliente, setShowDropdownCliente] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [solicitudPrueba, setSolicitudPrueba] = useState(true);
  const [omitirCamposObligatorios, setOmitirCamposObligatorios] = useState(false);

  useEffect(() => {
    if (!isViewMode || !initialSnapshot) {
      return;
    }

    setFormData(initialSnapshot.formData);
    setWorkers(initialSnapshot.workers || []);
    setWorkersContratista(initialSnapshot.workersContratista || []);
    setTargetWorkerCountMyma(initialSnapshot.targetWorkerCountMyma || 0);
    setTargetWorkerCountContratista(initialSnapshot.targetWorkerCountContratista || 0);
    setHorarios(initialSnapshot.horarios || []);
    setVehiculosMyma(initialSnapshot.vehiculosMyma || []);
    setVehiculosContratista(initialSnapshot.vehiculosContratista || []);

    // Sincronizar inputs tipo buscador mientras las listas remotas cargan.
    setSearchQuerySolicitante(initialSnapshot.formData.requesterName || '');
    setSearchQueryJefeProyecto(initialSnapshot.formData.projectManager || '');
    setSearchQueryAdminContrato(initialSnapshot.formData.contractAdmin || '');
    setSearchQueryCliente(initialSnapshot.formData.clientName || '');

    setSelectedPersonaSolicitante(null);
    setSelectedPersonaJefeProyecto(null);
    setSelectedPersonaAdminContrato(null);
    setIsManualSolicitante(false);
    setIsManualJefeProyecto(false);
    setIsManualAdminContrato(false);
    setSelectedCliente(null);
    setShowDropdownSolicitante(false);
    setShowDropdownJefeProyecto(false);
    setShowDropdownAdminContrato(false);
    setShowDropdownCliente(false);
  }, [isViewMode, initialSnapshot]);

  // Limpiar todos los campos cuando se monta el componente
  useEffect(() => {
    if (isViewMode) {
      return;
    }
    // Limpiar sessionStorage para evitar cargar borradores previos
    const STORAGE_KEY = 'field_request_form_draft';
    try {
      // Hotfix: preservar borrador en sessionStorage ante remounts accidentales.
      // sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error limpiando sessionStorage:', error);
    }

    // Resetear todos los campos del formulario a valores vacíos
    setFormData({
      requestDate: '',
      requesterName: '',
      kickoffDate: '',
      projectCode: PROJECT_CODE_PREFIX,
      requirement: '',
      clientName: '',
      clientContactName: '',
      clientContactEmail: '',
      projectManager: '',
      accreditationFollowUp: '',
      fieldStartDate: '',
      riskPreventionNotice: '',
      companyAccreditationRequired: '', // Limpiar campo de radio (ninguno seleccionado)
      requiereAcreditarTrabajadoresMyma: '',
      contractAdmin: '',
      nombreContrato: '',
      numeroContrato: '',
      administradorContrato: '',
      jornadaTrabajo: '',
      horarioTrabajo: '',
      cantidadVehiculos: '',
      placaPatente: '',
      requiereAcreditarContratista: '', // Limpiar campo de radio (ninguno seleccionado)
      requiereAcreditarTrabajadoresContratista: '',
      modalidadContrato: '',
      razonSocialContratista: '',
      nombreResponsableContratista: '',
      telefonoResponsableContratista: '',
      emailResponsableContratista: '',
      cantidadVehiculosContratista: '',
      placasVehiculosContratista: '',
      registroSstTerreo: '', // Limpiar campo de radio (ninguno seleccionado)
    });
    
    // Limpiar otros estados
    setWorkers([]);
    setWorkersContratista([]);
    setTargetWorkerCountMyma(0);
    setTargetWorkerCountContratista(0);
    setHorarios([]);
    setVehiculosMyma([]);
    setVehiculosContratista([]);
    setSearchQuerySolicitante('');
    setSelectedPersonaSolicitante(null);
    setIsManualSolicitante(false);
    setShowDropdownSolicitante(false);
    setSearchQueryJefeProyecto('');
    setSelectedPersonaJefeProyecto(null);
    setIsManualJefeProyecto(false);
    setShowDropdownJefeProyecto(false);
    setSearchQueryAdminContrato('');
    setSelectedPersonaAdminContrato(null);
    setIsManualAdminContrato(false);
    setShowDropdownAdminContrato(false);
    setSearchQueryCliente('');
    setSelectedCliente(null);
    setShowDropdownCliente(false);
  }, [isViewMode]); // Solo se ejecuta al montar el componente (modo creación)

  // Cargar proveedores desde la base de datos
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        const proveedoresData = await fetchProveedores();
        const nombresProveedores = proveedoresData.map(p => p.nombre_proveedor);
        setProveedores(nombresProveedores);
      } catch (error) {
        console.error('Error cargando proveedores:', error);
        // Si falla, usar MOCK_COMPANIES como fallback
        setProveedores(MOCK_COMPANIES.map(c => c.name));
      }
    };

    loadProveedores();
  }, []);

  // Cargar personas para el buscador de solicitante
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const data = await fetchPersonas();
        setPersonas(data);
        setFilteredPersonasSolicitante(data);
        setFilteredPersonasJefeProyecto(data);
        setFilteredPersonasAdminContrato(data);
      } catch (error) {
        console.error('Error cargando personas:', error);
      }
    };

    loadPersonas();
  }, []);

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await fetchClientes();
        setClientes(data);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setClientes([]);
      }
    };

    loadClientes();
  }, []);

  // Filtrar clientes cuando cambia el término de búsqueda del cliente
  useEffect(() => {
    if (searchQueryCliente.trim() === '') {
      setFilteredClientes(clientes);
    } else {
      const query = searchQueryCliente.toLowerCase();
      const filtered = clientes.filter(cliente =>
        (cliente.nombre || '').toLowerCase().includes(query) ||
        (cliente.rut || '').toLowerCase().includes(query)
      );
      setFilteredClientes(filtered);
    }
  }, [searchQueryCliente, clientes]);

  // Sincronizar UI del buscador con clientName cuando se rellena programáticamente
  useEffect(() => {
    if (formData.clientName.trim() !== '') {
      const clienteEncontrado = clientes.find(
        cliente => (cliente.nombre || '').toLowerCase() === formData.clientName.toLowerCase()
      );

      if (clienteEncontrado) {
        setSelectedCliente(clienteEncontrado);
        setSearchQueryCliente(clienteEncontrado.nombre);
      } else {
        setSelectedCliente(null);
        setSearchQueryCliente(formData.clientName);
      }
      return;
    }

    if (!showDropdownCliente) {
      setSelectedCliente(null);
      setSearchQueryCliente('');
    }
  }, [formData.clientName, clientes, showDropdownCliente]);

  // Clave para el almacenamiento del formulario
  const STORAGE_KEY = 'field_request_form_draft';

  // NOTA: Se deshabilitó la carga automática de borradores desde sessionStorage
  // para que el formulario siempre se inicie limpio cuando se navega desde el sidebar
  // Si se necesita restaurar borradores, se puede habilitar esta funcionalidad con un botón específico
  /*
  // Cargar datos guardados al montar el componente
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Restaurar formData
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        
        // Restaurar workers
        if (parsed.workers) {
          setWorkers(parsed.workers);
        }
        
        // Restaurar workersContratista
        if (parsed.workersContratista) {
          setWorkersContratista(parsed.workersContratista);
        }
        
        // Restaurar targetWorkerCountMyma
        if (parsed.targetWorkerCountMyma !== undefined) {
          setTargetWorkerCountMyma(parsed.targetWorkerCountMyma);
        }
        
        // Restaurar targetWorkerCountContratista
        if (parsed.targetWorkerCountContratista !== undefined) {
          setTargetWorkerCountContratista(parsed.targetWorkerCountContratista);
        }
        
        // Restaurar horarios
        if (parsed.horarios) {
          setHorarios(parsed.horarios);
        }
        
        // Restaurar vehiculosMyma
        if (parsed.vehiculosMyma) {
          setVehiculosMyma(parsed.vehiculosMyma);
        }
        
        // Restaurar vehiculosContratista
        if (parsed.vehiculosContratista) {
          setVehiculosContratista(parsed.vehiculosContratista);
        }
        
        // Restaurar selectedPersonaSolicitante
        if (parsed.selectedPersonaSolicitante) {
          setSelectedPersonaSolicitante(parsed.selectedPersonaSolicitante);
        }
        
        // Restaurar searchQuerySolicitante
        if (parsed.searchQuerySolicitante) {
          setSearchQuerySolicitante(parsed.searchQuerySolicitante);
        }
      }
    } catch (error) {
      console.error('Error cargando datos guardados del formulario:', error);
    }
  }, []);
  */

  // Guardar datos cuando cambian
  useEffect(() => {
    if (isViewMode) {
      return;
    }
    try {
      const dataToSave = {
        formData,
        workers,
        workersContratista,
        targetWorkerCountMyma,
        targetWorkerCountContratista,
        horarios,
        vehiculosMyma,
        vehiculosContratista,
        selectedPersonaSolicitante,
        searchQuerySolicitante,
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error guardando datos del formulario:', error);
    }
  }, [
    formData,
    workers,
    workersContratista,
    targetWorkerCountMyma,
    targetWorkerCountContratista,
    horarios,
    vehiculosMyma,
    vehiculosContratista,
    selectedPersonaSolicitante,
    searchQuerySolicitante,
    isViewMode,
  ]);

  // Filtrar personas cuando cambia el término de búsqueda del solicitante
  useEffect(() => {
    if (searchQuerySolicitante.trim() === '') {
      setFilteredPersonasSolicitante(personas);
    } else {
      const filtered = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(searchQuerySolicitante.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchQuerySolicitante.toLowerCase())
      );
      setFilteredPersonasSolicitante(filtered);
    }
  }, [searchQuerySolicitante, personas]);

  // Sincronizar UI del buscador con requesterName cuando se rellena programáticamente
  useEffect(() => {
    if (formData.requesterName.trim() !== '') {
      const personaSeleccionada = personas.find(
        persona => persona.nombre_completo.toLowerCase() === formData.requesterName.toLowerCase()
      );

      if (personaSeleccionada) {
        setSelectedPersonaSolicitante(personaSeleccionada);
        setSearchQuerySolicitante(`${personaSeleccionada.nombre_completo} - ${personaSeleccionada.rut}`);
        setIsManualSolicitante(false);
      } else {
        setSelectedPersonaSolicitante(null);
        setSearchQuerySolicitante(formData.requesterName);
        setIsManualSolicitante(true);
      }
      return;
    }

    if (!showDropdownSolicitante) {
      setSelectedPersonaSolicitante(null);
      setSearchQuerySolicitante('');
      setIsManualSolicitante(false);
    }
  }, [formData.requesterName, personas, showDropdownSolicitante]);

  // Filtrar personas cuando cambia el término de búsqueda del jefe de proyecto
  useEffect(() => {
    if (searchQueryJefeProyecto.trim() === '') {
      setFilteredPersonasJefeProyecto(personas);
    } else {
      const filtered = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(searchQueryJefeProyecto.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchQueryJefeProyecto.toLowerCase())
      );
      setFilteredPersonasJefeProyecto(filtered);
    }
  }, [searchQueryJefeProyecto, personas]);

  // Sincronizar UI del buscador con projectManager cuando se rellena programáticamente
  useEffect(() => {
    if (formData.projectManager.trim() !== '') {
      const personaSeleccionada = personas.find(
        persona => persona.nombre_completo.toLowerCase() === formData.projectManager.toLowerCase()
      );

      if (personaSeleccionada) {
        setSelectedPersonaJefeProyecto(personaSeleccionada);
        setSearchQueryJefeProyecto(`${personaSeleccionada.nombre_completo} - ${personaSeleccionada.rut}`);
        setIsManualJefeProyecto(false);
      } else {
        setSelectedPersonaJefeProyecto(null);
        setSearchQueryJefeProyecto(formData.projectManager);
        setIsManualJefeProyecto(true);
      }
      return;
    }

    if (!showDropdownJefeProyecto) {
      setSelectedPersonaJefeProyecto(null);
      setSearchQueryJefeProyecto('');
      setIsManualJefeProyecto(false);
    }
  }, [formData.projectManager, personas, showDropdownJefeProyecto]);

  // Filtrar personas cuando cambia el término de búsqueda del administrador de contrato
  useEffect(() => {
    if (searchQueryAdminContrato.trim() === '') {
      setFilteredPersonasAdminContrato(personas);
    } else {
      const filtered = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(searchQueryAdminContrato.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchQueryAdminContrato.toLowerCase())
      );
      setFilteredPersonasAdminContrato(filtered);
    }
  }, [searchQueryAdminContrato, personas]);

  // Sincronizar UI del buscador con contractAdmin cuando se rellena programáticamente
  useEffect(() => {
    if (formData.contractAdmin.trim() !== '') {
      const personaSeleccionada = personas.find(
        persona => persona.nombre_completo.toLowerCase() === formData.contractAdmin.toLowerCase()
      );

      if (personaSeleccionada) {
        setSelectedPersonaAdminContrato(personaSeleccionada);
        setSearchQueryAdminContrato(`${personaSeleccionada.nombre_completo} - ${personaSeleccionada.rut}`);
        setIsManualAdminContrato(false);
      } else {
        setSelectedPersonaAdminContrato(null);
        setSearchQueryAdminContrato(formData.contractAdmin);
        setIsManualAdminContrato(true);
      }
      return;
    }

    // No limpiar mientras el usuario escribe (se mantiene abierto el dropdown)
    if (!showDropdownAdminContrato) {
      setSelectedPersonaAdminContrato(null);
      setSearchQueryAdminContrato('');
      setIsManualAdminContrato(false);
    }
  }, [formData.contractAdmin, personas, showDropdownAdminContrato]);

  // Cerrar dropdown del solicitante al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#solicitante_search') && !target.closest('.dropdown-results-solicitante')) {
        setShowDropdownSolicitante(false);
      }
    };

    if (showDropdownSolicitante) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownSolicitante]);

  // Cerrar dropdown del jefe de proyecto al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#jefe_proyecto_search') && !target.closest('.dropdown-results-jefe-proyecto')) {
        setShowDropdownJefeProyecto(false);
      }
    };

    if (showDropdownJefeProyecto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownJefeProyecto]);

  // Cerrar dropdown del administrador de contrato al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#admin_contrato_search') && !target.closest('.dropdown-results-admin-contrato')) {
        setShowDropdownAdminContrato(false);
      }
    };

    if (showDropdownAdminContrato) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownAdminContrato]);

  // Cerrar dropdown de cliente al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#cliente_search') && !target.closest('.dropdown-results-cliente')) {
        setShowDropdownCliente(false);
      }
    };

    if (showDropdownCliente) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownCliente]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'projectCode') {
      setFormData(prev => ({ ...prev, projectCode: formatProjectCodeInput(value) }));
      return;
    }

    setFormData(prev => {
      const nextFormData = { ...prev, [name]: value };

      if (name === 'companyAccreditationRequired' && value !== 'yes') {
        nextFormData.nombreContrato = '';
        nextFormData.numeroContrato = '';
        nextFormData.administradorContrato = '';
      }

      if (name === 'requiereAcreditarTrabajadoresMyma' && value !== 'yes') {
        nextFormData.cantidadVehiculos = '';
      }

      if (name === 'requiereAcreditarContratista' && value !== 'yes') {
        nextFormData.modalidadContrato = '';
        nextFormData.nombreResponsableContratista = '';
        nextFormData.telefonoResponsableContratista = '';
        nextFormData.emailResponsableContratista = '';
      }

      if (name === 'requiereAcreditarTrabajadoresContratista' && value !== 'yes') {
        nextFormData.cantidadVehiculosContratista = '';
        nextFormData.registroSstTerreo = '';
      }

      const esCambioFlagsContratista =
        name === 'requiereAcreditarContratista' || name === 'requiereAcreditarTrabajadoresContratista';
      const debeMantenerRazonSocialContratista =
        nextFormData.requiereAcreditarContratista === 'yes' ||
        nextFormData.requiereAcreditarTrabajadoresContratista === 'yes';

      if (esCambioFlagsContratista && !debeMantenerRazonSocialContratista) {
        nextFormData.razonSocialContratista = '';
      }

      return nextFormData;
    });

    if (name === 'requiereAcreditarTrabajadoresMyma' && value !== 'yes') {
      setWorkers([]);
      setTargetWorkerCountMyma(0);
      setHorarios([]);
      setVehiculosMyma([]);
    }

    if (name === 'requiereAcreditarTrabajadoresContratista' && value !== 'yes') {
      setWorkersContratista([]);
      setTargetWorkerCountContratista(0);
      setVehiculosContratista([]);
    }

    // Si se cambia la cantidad de vehículos, actualizar el array de vehículos
    if (name === 'cantidadVehiculos') {
      const cantidad = parseInt(value) || 0;
      setVehiculosMyma(prev => {
        const newVehiculos = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newVehiculos.length) {
          // Agregar elementos vacíos con placa y conductor
          return [...newVehiculos, ...Array(cantidad - newVehiculos.length).fill(null).map(() => ({ placa: '', conductor: '' }))];
        } else {
          // Recortar el array
          return newVehiculos.slice(0, cantidad);
        }
      });
    }

    // Si se cambia la cantidad de vehículos del contratista, actualizar el array de vehículos
    if (name === 'cantidadVehiculosContratista') {
      const cantidad = parseInt(value) || 0;
      setVehiculosContratista(prev => {
        const newVehiculos = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newVehiculos.length) {
          // Agregar elementos vacíos con placa y conductor
          return [...newVehiculos, ...Array(cantidad - newVehiculos.length).fill(null).map(() => ({ placa: '', conductor: '' }))];
        } else {
          // Recortar el array
          return newVehiculos.slice(0, cantidad);
        }
      });
    }
  };

  const handleUseLocalPersona = (
    field: 'requesterName' | 'projectManager' | 'contractAdmin',
    rawValue: string
  ) => {
    const localValue = rawValue.trim();
    if (!localValue) return;

    if (field === 'requesterName') {
      setSelectedPersonaSolicitante(null);
      setIsManualSolicitante(true);
      setSearchQuerySolicitante(localValue);
      setShowDropdownSolicitante(false);
    } else if (field === 'projectManager') {
      setSelectedPersonaJefeProyecto(null);
      setIsManualJefeProyecto(true);
      setSearchQueryJefeProyecto(localValue);
      setShowDropdownJefeProyecto(false);
    } else {
      setSelectedPersonaAdminContrato(null);
      setIsManualAdminContrato(true);
      setSearchQueryAdminContrato(localValue);
      setShowDropdownAdminContrato(false);
    }

    setFormData(prev => ({ ...prev, [field]: localValue }));
  };

  const handleAddWorker = (worker: Worker) => {
    setWorkers(prev => [...prev, worker]);
  };

  const handleRemoveWorker = (id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
  };

  const handleAgregarHorario = () => {
    setHorarios(prev => [...prev, { dias: '', horario: '' }]);
  };

  const handleEliminarHorario = (index: number) => {
    setHorarios(prev => prev.filter((_, i) => i !== index));
  };

  const handleHorarioChange = (index: number, field: 'dias' | 'horario', value: string) => {
    setHorarios(prev => prev.map((horario, i) => 
      i === index ? { ...horario, [field]: value } : horario
    ));
  };

  const handleVehiculoMymaChange = (index: number, field: 'placa' | 'conductor', value: string) => {
    setVehiculosMyma(prev => prev.map((vehiculo, i) => 
      i === index ? { ...vehiculo, [field]: value } : vehiculo
    ));
  };

  const handleVehiculoContratistaChange = (index: number, field: 'placa' | 'conductor', value: string) => {
    setVehiculosContratista(prev => prev.map((vehiculo, i) => 
      i === index ? { ...vehiculo, [field]: value } : vehiculo
    ));
  };

  const handleAddWorkerContratista = (worker: Worker) => {
    setWorkersContratista(prev => [...prev, worker]);
  };

  const handleRemoveWorkerContratista = (id: string) => {
    setWorkersContratista(prev => prev.filter(w => w.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isViewMode) return;
    if (isSaving) return;

    try {
      setIsSaving(true);
      let emailUsuario: string | null = null;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user?.email) {
          emailUsuario = user.email;
        } else {
          console.warn('No se pudo obtener email del usuario autenticado:', error);
        }
      } catch (authError) {
        console.warn('Error obteniendo usuario autenticado:', authError);
      }

      if (!omitirCamposObligatorios) {
      if (!PROJECT_CODE_REGEX.test(formData.projectCode)) {
        alert('El codigo de proyecto debe tener formato MY-001-2026.');
        return;
      }

      if (!formData.requirement) {
        alert('Debes seleccionar un requisito.');
        return;
      }

      if (!formData.requestDate) {
        alert('La fecha de solicitud es obligatoria.');
        return;
      }

      if (!formData.requesterName) {
        alert('Debes completar el nombre de solicitante.');
        return;
      }

      if (!formData.fieldStartDate) {
        alert('La fecha de inicio de terreno es obligatoria.');
        return;
      }

      if (!formData.clientName) {
        alert('Debes seleccionar un nombre de cliente desde el buscador.');
        return;
      }

      if (!formData.projectManager) {
        alert('Debes completar el Jefe de Proyectos MYMA.');
        return;
      }

      if (!formData.contractAdmin) {
        alert('Debes completar el Admin. de Contrato MYMA.');
        return;
      }

      if (!formData.companyAccreditationRequired) {
        alert('Debes responder la pregunta "Se requiere acreditar a Myma?".');
        return;
      }

      if (!formData.requiereAcreditarTrabajadoresMyma) {
        alert('Debes responder la pregunta "Se requiere acreditar a trabajadores de Myma?".');
        return;
      }

      if (!formData.requiereAcreditarContratista) {
        alert('Debes responder la pregunta "Se requiere acreditar a contratista?".');
        return;
      }

      if (!formData.requiereAcreditarTrabajadoresContratista) {
        alert('Debes responder la pregunta "Se requiere acreditar a trabajadores de contratista?".');
        return;
      }

      if (
        formData.requiereAcreditarTrabajadoresContratista === 'yes' &&
        !formData.registroSstTerreo
      ) {
        alert('Debes responder la pregunta de Seguridad y Salud en el Trabajo (SST).');
        return;
      }

      if (formData.requiereAcreditarContratista === 'yes') {
        if (!formData.modalidadContrato.trim()) {
          alert('Debes seleccionar la Modalidad de contrato.');
          return;
        }

        if (!formData.razonSocialContratista.trim()) {
          alert('Debes seleccionar la Razón social de contratista.');
          return;
        }

        if (!formData.nombreResponsableContratista.trim()) {
          alert('Debes completar el Nombre de contacto del contratista.');
          return;
        }

        if (!formData.telefonoResponsableContratista.trim()) {
          alert('Debes completar el Teléfono del contratista.');
          return;
        }

        if (!formData.emailResponsableContratista.trim()) {
          alert('Debes completar el Email del contratista.');
          return;
        }
      }

      if (formData.requiereAcreditarTrabajadoresMyma === 'yes' && workers.length === 0) {
        alert('Debes agregar al menos un trabajador MYMA.');
        return;
      }

      if ((workers.length > 0 || workersContratista.length > 0) && !formData.jornadaTrabajo.trim()) {
        alert('Debes seleccionar una Condicion Laboral cuando agregas trabajadores.');
        return;
      }
      }

      const requiereAcreditarEmpresa = formData.companyAccreditationRequired === 'yes';
      const requiereAcreditarTrabajadoresMyma = formData.requiereAcreditarTrabajadoresMyma === 'yes';
      const requiereAcreditarContratista = formData.requiereAcreditarContratista === 'yes';
      const requiereAcreditarTrabajadoresContratista = formData.requiereAcreditarTrabajadoresContratista === 'yes';
      const debePersistirCondicionesLaborales =
        requiereAcreditarTrabajadoresMyma || requiereAcreditarTrabajadoresContratista;
      const categoriaHorariosCondiciones: 'MyMA' | 'Contratista' | null =
        requiereAcreditarTrabajadoresMyma
          ? 'MyMA'
          : requiereAcreditarTrabajadoresContratista
            ? 'Contratista'
            : null;
      const debePersistirRazonSocialContratista =
        requiereAcreditarContratista || requiereAcreditarTrabajadoresContratista;
      // Preparar los datos para enviar a Supabase - Nombres corregidos según esquema real
      const solicitudData: any = {
        fecha_solicitud: formData.requestDate || null,
        nombre_solicitante: formData.requesterName || null,
        fecha_reunion_arranque: formData.kickoffDate || null,
        codigo_proyecto: formData.projectCode,  // Requerido (NOT NULL)
        requisito: formData.requirement || null,
        nombre_cliente: formData.clientName || null,
        jefe_proyectos_myma: formData.projectManager || null,
        fecha_inicio_terreno: formData.fieldStartDate || null,
        aviso_prevencion_riesgo: formData.riskPreventionNotice === 'yes', // Convertir a boolean
        requiere_acreditar_empresa: requiereAcreditarEmpresa, // Convertir a boolean
        admin_contrato_myma: formData.contractAdmin || null,
        email_usuario: emailUsuario,
        solicitud_prueba: solicitudPrueba,
        estado_solicitud_acreditacion: 'Por asignar requerimientos', // Estado inicial del proyecto
      };

      // Agregar campos opcionales solo si tienen valor - Nombres corregidos
      if (formData.clientContactName) {
        solicitudData.nombre_contacto_cliente = formData.clientContactName; // Nombre corregido
      }
      if (formData.clientContactEmail) {
        solicitudData.email_contacto_cliente = formData.clientContactEmail; // Nombre corregido
      }

      // Cantidad de trabajadores
      solicitudData.cantidad_trabajadores_myma = requiereAcreditarTrabajadoresMyma ? (targetWorkerCountMyma || 0) : 0;
      solicitudData.cantidad_trabajadores_contratista = requiereAcreditarTrabajadoresContratista ? (targetWorkerCountContratista || 0) : 0;
      if (debePersistirCondicionesLaborales && formData.jornadaTrabajo) {
        solicitudData.condiciones_laborales = formData.jornadaTrabajo;
      }

      // Información del Contrato (solo si se requiere acreditar empresa)
      if (requiereAcreditarEmpresa) {
        if (formData.nombreContrato) solicitudData.nombre_contrato = formData.nombreContrato;
        if (formData.numeroContrato) solicitudData.numero_contrato = formData.numeroContrato;
        if (formData.administradorContrato) solicitudData.administrador_contrato = formData.administradorContrato;
        
        // Horarios de trabajo ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_horario_manual después de crear la solicitud
        // Vehículos ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_conductor_manual después de crear la solicitud
      }

      // Información de Contratista
      if (formData.requiereAcreditarContratista) {
        solicitudData.requiere_acreditar_contratista = formData.requiereAcreditarContratista === 'yes'; // Convertir a boolean
        
        if (requiereAcreditarContratista) {
          if (formData.modalidadContrato) solicitudData.modalidad_contrato_contratista = formData.modalidadContrato;
          if (formData.nombreResponsableContratista) solicitudData.nombre_responsable_contratista = formData.nombreResponsableContratista; // Nombre corregido
          if (formData.telefonoResponsableContratista) solicitudData.telefono_responsable_contratista = formData.telefonoResponsableContratista; // Nombre corregido
          if (formData.emailResponsableContratista) solicitudData.email_responsable_contratista = formData.emailResponsableContratista; // Nombre corregido
          
          // Vehículos Contratista ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_conductor_manual después de crear la solicitud
        }
      }

      if (debePersistirRazonSocialContratista && formData.razonSocialContratista) {
        solicitudData.razon_social_contratista = formData.razonSocialContratista;
      }

      if (requiereAcreditarTrabajadoresContratista) {
        solicitudData.registro_sst_terreno = formData.registroSstTerreo === 'yes';
      }

      console.log('📤 Enviando datos a Supabase:', solicitudData);
      
      // Guardar en Supabase
      const result = await createSolicitudAcreditacion(solicitudData);
      
      console.log('✅ Solicitud guardada exitosamente:', result);

      if (result.id) {
        try {
          await enviarIdProyectoN8n(result.id, {
            emailUsuario,
            solicitudPrueba,
          });
          console.log('✅ Payload enviado a Enviar_id_proyecto_n8n');
        } catch (edgeError) {
          console.error('ERROR al enviar payload a Enviar_id_proyecto_n8n:', edgeError);
          alert(
            'ADVERTENCIA: La solicitud se guardó, pero falló el envío del payload a la función de Supabase.'
          );
        }
      }
      
      // Guardar trabajadores en fct_acreditacion_solicitud_trabajador_manual
      if (result.id && result.codigo_proyecto) {
        try {
          console.log('👷 Guardando trabajadores del proyecto...');
          await createProyectoTrabajadores(
            result.id,
            result.codigo_proyecto,
            requiereAcreditarTrabajadoresMyma ? workers : [],
            requiereAcreditarTrabajadoresContratista ? workersContratista : []
          );
          console.log('✅ Trabajadores guardados exitosamente');
        } catch (trabajadorError) {
          console.error('ERROR al guardar trabajadores:', trabajadorError);
          alert('ADVERTENCIA: La solicitud se guard?, pero hubo un error al guardar los trabajadores.');
        }
      }
      
      // Guardar horarios en fct_acreditacion_solicitud_horario_manual
      if (result.id && result.codigo_proyecto && horarios.length > 0 && categoriaHorariosCondiciones) {
        try {
          console.log('⏰ Guardando horarios del proyecto...');
          await createProyectoHorarios(
            result.id,
            result.codigo_proyecto,
            horarios,
            categoriaHorariosCondiciones
          );
          console.log('✅ Horarios guardados exitosamente');
        } catch (horarioError) {
          console.error('ERROR al guardar horarios:', horarioError);
          alert('ADVERTENCIA: La solicitud se guard?, pero hubo un error al guardar los horarios.');
        }
      }
      
      // Guardar vehículos MYMA en fct_acreditacion_solicitud_conductor_manual
      if (result.id && result.codigo_proyecto && vehiculosMyma.length > 0 && requiereAcreditarTrabajadoresMyma) {
        try {
          console.log('🚗 Guardando vehículos MYMA del proyecto...');
          await createProyectoConductores(
            result.id,
            result.codigo_proyecto,
            vehiculosMyma,
            'MyMA'
          );
          console.log('✅ Vehículos MYMA guardados exitosamente');
        } catch (vehiculoMymaError) {
          console.error('ERROR al guardar veh?culos MYMA:', vehiculoMymaError);
          alert('ADVERTENCIA: La solicitud se guard?, pero hubo un error al guardar los veh?culos MYMA.');
        }
      }
      
      // Guardar patentes MYMA en fct_acreditacion_solicitud_vehiculos
      if (result.id && result.codigo_proyecto && vehiculosMyma.length > 0 && requiereAcreditarTrabajadoresMyma) {
        try {
          console.log('🚗 Guardando patentes MYMA del proyecto...');
          await createProyectoVehiculos(
            result.id,
            result.codigo_proyecto,
            vehiculosMyma,
            'MyMA'
          );
          console.log('✅ Patentes MYMA guardadas exitosamente');
        } catch (vehiculosTablaMymaError) {
          console.error('ERROR al guardar patentes MYMA:', vehiculosTablaMymaError);
          alert('ADVERTENCIA: La solicitud se guardó, pero hubo un error al guardar las patentes MYMA.');
        }
      }
      
      // Guardar vehículos Contratista en fct_acreditacion_solicitud_conductor_manual
      if (result.id && result.codigo_proyecto && vehiculosContratista.length > 0 && requiereAcreditarTrabajadoresContratista) {
        try {
          console.log('🚗 Guardando vehículos Contratista del proyecto...');
          await createProyectoConductores(
            result.id,
            result.codigo_proyecto,
            vehiculosContratista,
            'Contratista'
          );
          console.log('✅ Vehículos Contratista guardados exitosamente');
        } catch (vehiculoContratistaError) {
          console.error('ERROR al guardar veh?culos Contratista:', vehiculoContratistaError);
          alert('ADVERTENCIA: La solicitud se guard?, pero hubo un error al guardar los veh?culos Contratista.');
        }
      }

      // Guardar patentes Contratista en fct_acreditacion_solicitud_vehiculos
      if (result.id && result.codigo_proyecto && vehiculosContratista.length > 0 && requiereAcreditarTrabajadoresContratista) {
        try {
          console.log('🚗 Guardando patentes Contratista del proyecto...');
          await createProyectoVehiculos(
            result.id,
            result.codigo_proyecto,
            vehiculosContratista,
            'Contratista'
          );
          console.log('✅ Patentes Contratista guardadas exitosamente');
        } catch (vehiculosTablaContratistaError) {
          console.error('ERROR al guardar patentes Contratista:', vehiculosTablaContratistaError);
          alert('ADVERTENCIA: La solicitud se guardó, pero hubo un error al guardar las patentes del contratista.');
        }
      }
      
      // Construir JSON resumen de acreditación (especialistas, conductores y vehículos)
      if (result.id && result.codigo_proyecto) {
        try {
          const [trabajadoresProyecto, conductoresProyecto, vehiculosProyecto] = await Promise.all([
            fetchProyectoTrabajadoresByProyecto(result.id, result.codigo_proyecto),
            fetchProyectoConductoresByProyecto(result.id, result.codigo_proyecto),
            fetchProyectoVehiculosByProyecto(result.id, result.codigo_proyecto),
          ]);

          const normalizeCategoriaEmpresa = (value: any): string =>
            (value || '')
              .toString()
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');

          const isCategoriaMyma = (value: any): boolean =>
            normalizeCategoriaEmpresa(value) === 'myma';

          const isCategoriaContratista = (value: any): boolean =>
            normalizeCategoriaEmpresa(value) === 'contratista';

          const incluirDatosContratista = requiereAcreditarTrabajadoresContratista;

          // Especialistas y conductores internos (MyMA)
          const especialistasMyma = trabajadoresProyecto
            .filter((t: any) => isCategoriaMyma(t.categoria_empresa))
            .map((t: any) => ({
              id: t.id,
              nombre: t.nombre_trabajador,
            }));

          const especialistasExternos = incluirDatosContratista
            ? trabajadoresProyecto
                .filter((t: any) => isCategoriaContratista(t.categoria_empresa))
                .map((t: any) => ({
                  id: t.id,
                  nombre: t.nombre_trabajador,
                }))
            : [];

          const conductoresMyma = conductoresProyecto
            .filter((c: any) => isCategoriaMyma(c.categoria_empresa))
            .map((c: any) => ({
              id: c.id,
              nombre: c.nombre_conductor,
            }));

          const conductoresExternos = incluirDatosContratista
            ? conductoresProyecto
                .filter((c: any) => isCategoriaContratista(c.categoria_empresa))
                .map((c: any) => ({
                  id: c.id,
                  nombre: c.nombre_conductor,
                }))
            : [];

          const mapVehiculosPayload = (rows: any[], categoria: 'MyMA' | 'Contratista') => {
            const seen = new Set<string>();

            return rows
              .filter((v: any) => (
                categoria === 'MyMA'
                  ? isCategoriaMyma(v.categoria_empresa)
                  : isCategoriaContratista(v.categoria_empresa)
              ))
              .map((v: any) => {
                const patente = typeof v.patente === 'string' ? v.patente.trim() : '';
                const id = typeof v.id === 'number' ? v.id : Number(v.id);

                return { id, patente };
              })
              .filter((vehiculo: { id: number; patente: string }) => {
                if (!vehiculo.patente || !Number.isFinite(vehiculo.id)) return false;
                const key = vehiculo.patente.toUpperCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .map((vehiculo: { id: number; patente: string }) => ({
                id: vehiculo.id,
                patente: vehiculo.patente,
              }));
          };

          const vehiculosMyma = mapVehiculosPayload(vehiculosProyecto, 'MyMA');
          const vehiculosExternos = incluirDatosContratista
            ? mapVehiculosPayload(vehiculosProyecto, 'Contratista')
            : [];

          const resumenAcreditacion = {
            codigo_proyecto: result.codigo_proyecto,
            myma: {
              especialistas: especialistasMyma,
              conductores: conductoresMyma,
              vehiculos: vehiculosMyma,
            },
            externo: {
              empresa: formData.razonSocialContratista || null,
              especialistas: especialistasExternos,
              conductores: conductoresExternos,
              vehiculos: vehiculosExternos,
            },
          };

          // Consola del navegador
          console.log('📦 Resumen de acreditación generado:', resumenAcreditacion);

          // Logs backend / terminal a través de función edge
          await logResumenSolicitudAcreditacion(resumenAcreditacion);

          // Llamar a API local para crear carpetas del proyecto
          try {
            const respuestaCarpetas = await crearCarpetasProyecto(resumenAcreditacion);
            console.log('✅ Carpetas del proyecto creadas exitosamente:', respuestaCarpetas);
          } catch (errorCarpetas) {
            console.error('ERROR al crear carpetas del proyecto:', errorCarpetas);
            const syncError = errorCarpetas as any;
            if (syncError?.isExternalSyncError) {
              alert(
                'ADVERTENCIA: La solicitud se guardó, pero falló la sincronización de carpetas del proyecto. Reintentar desde soporte o revisar logs.'
              );
            }
            // No mostrar alert al usuario, solo loguear el error
            // La solicitud ya se guardó exitosamente, esto es un paso adicional
          }
        } catch (resumenError) {
          console.error('ERROR generando o enviando el resumen de acreditaci?n:', resumenError);
        }
      }
      
      alert('¡Solicitud guardada exitosamente! ID: ' + result.id);
      
      // Limpiar los datos guardados en sessionStorage después de enviar exitosamente
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('✅ Datos del formulario eliminados de sessionStorage');
      } catch (storageError) {
        console.error('Error limpiando sessionStorage:', storageError);
      }
      
      // Opcional: Resetear el formulario o redirigir
      // onBack(); // Descomentar si quieres volver atrás automáticamente
      
    } catch (error) {
      console.error('ERROR al guardar la solicitud:', error);
      alert('Error al guardar la solicitud. Por favor, revisa la consola para más detalles.');
    } finally {
      setIsSaving(false);
    }
  };

  // Función para limpiar los datos guardados cuando el usuario vuelve atrás
  const handleBack = () => {
    // Opcional: Preguntar al usuario si quiere guardar antes de salir
    // Por ahora, mantenemos los datos guardados para que pueda volver
    // Si quieres limpiar al volver, descomenta la siguiente línea:
    // sessionStorage.removeItem(STORAGE_KEY);
    onBack();
  };

  // Función para normalizar texto para correos electrónicos (eliminar tildes y caracteres especiales)
  const normalizeEmail = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD') // Normaliza caracteres con tildes
      .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes)
      .replace(/ñ/g, 'n') // Reemplaza ñ por n
      .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales excepto letras, números y espacios
      .replace(/\s+/g, '.') // Reemplaza espacios por puntos
      .trim();
  };

  // Función para rellenar el formulario con datos aleatorios
  const fillRandomData = () => {
    if (isViewMode) return;
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    // Generar fechas aleatorias
    const today = new Date();
    const randomDate = (daysOffset: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };

    // Nombres y datos aleatorios
    const nombres = ['Juan Pérez', 'María González', 'Carlos Ruiz', 'Ana Silva', 'Pedro Martínez', 'Laura Sánchez'];
    const empresas = ['CODELCO', 'BHP', 'Antofagasta Minerals', 'KINROSS', 'LAS CENIZAS', 'AGQ'];
    const requisitos = ['Acreditación', 'Carpeta de arranque', 'Acreditación y Carpeta de arranque', 'Pase de visita'];
    const modalidades = ['honorarios', 'contratista'];
    const diasSemana = ['Lunes a Viernes', 'Lunes a Jueves', 'Lunes a Sábado', 'Martes a Viernes'];
    const horarios = ['08:00 - 18:00', '07:00 - 17:00', '09:00 - 19:00', '06:00 - 16:00'];
    const placas = ['ABCD12', 'EFGH34', 'IJKL56', 'MNOP78', 'QRST90', 'UVWX12'];
    const nombresConductores = ['Roberto Silva', 'Patricia Muñoz', 'Fernando Torres', 'Carmen Díaz'];

    // Seleccionar una persona aleatoria para el solicitante
    const personaAleatoria = personas.length > 0 ? randomItem(personas) : null;

    // Generar correos sin tildes
    const nombreCliente = randomItem(nombres);
    const empresaCliente = randomItem(empresas);
    const nombreResponsable = randomItem(nombres);

    // Rellenar formData
      setFormData({
      requestDate: randomDate(0),
      requesterName: personaAleatoria?.nombre_completo || randomItem(nombres),
      kickoffDate: randomDate(randomInt(1, 7)),
      projectCode: `MY-${String(randomInt(1, 999)).padStart(3, '0')}-${new Date().getFullYear()}`,
      requirement: randomItem(requisitos),
      clientName: empresaCliente,
      clientContactName: nombreCliente,
      clientContactEmail: `${normalizeEmail(nombreCliente)}@${normalizeEmail(empresaCliente)}.cl`,
      projectManager: personas.length > 0 ? randomItem(personas).nombre_completo : randomItem(nombres),
      accreditationFollowUp: '',
      fieldStartDate: randomDate(randomInt(7, 30)),
      riskPreventionNotice: 'yes',
      companyAccreditationRequired: 'yes',
      requiereAcreditarTrabajadoresMyma: 'yes',
      contractAdmin: randomItem(nombres),
      nombreContrato: `Contrato ${randomItem(['Servicios', 'Obra', 'Suministro'])} ${new Date().getFullYear()}`,
      numeroContrato: `CON-${new Date().getFullYear()}-${String(randomInt(100, 999)).padStart(3, '0')}`,
      administradorContrato: randomItem(nombres),
      jornadaTrabajo: `${randomInt(8, 12)} horas`,
      horarioTrabajo: randomItem(horarios),
      cantidadVehiculos: String(randomInt(1, 5)),
      placaPatente: '',
      requiereAcreditarContratista: 'yes',
      requiereAcreditarTrabajadoresContratista: 'yes',
      modalidadContrato: randomItem(modalidades),
      razonSocialContratista: proveedores.length > 0 ? randomItem(proveedores) : randomItem(empresas),
      nombreResponsableContratista: nombreResponsable,
      telefonoResponsableContratista: `+56 9 ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
      emailResponsableContratista: `${normalizeEmail(nombreResponsable)}@contratista.cl`,
      cantidadVehiculosContratista: String(randomInt(1, 3)),
      placasVehiculosContratista: '',
      registroSstTerreo: 'yes',
    });

    // Rellenar solicitante si hay personas disponibles
    if (personaAleatoria) {
      setSelectedPersonaSolicitante(personaAleatoria);
      setSearchQuerySolicitante(`${personaAleatoria.nombre_completo} - ${personaAleatoria.rut}`);
    }

    // Rellenar horarios
    const numHorarios = randomInt(1, 3);
    setHorarios(Array.from({ length: numHorarios }, () => ({
      dias: randomItem(diasSemana),
      horario: randomItem(horarios),
    })));

    // Rellenar vehículos MYMA
    const numVehiculosMyma = randomInt(1, 5);
    setVehiculosMyma(Array.from({ length: numVehiculosMyma }, () => ({
      placa: randomItem(placas),
      conductor: randomItem(nombresConductores),
    })));
    setFormData(prev => ({ ...prev, cantidadVehiculos: String(numVehiculosMyma) }));

    // Rellenar vehículos Contratista
    const numVehiculosContratista = randomInt(1, 3);
    setVehiculosContratista(Array.from({ length: numVehiculosContratista }, () => ({
      placa: randomItem(placas),
      conductor: randomItem(nombresConductores),
    })));
    setFormData(prev => ({ ...prev, cantidadVehiculosContratista: String(numVehiculosContratista) }));

    // Agregar algunos trabajadores aleatorios
    if (personas.length > 0) {
      const trabajadoresAleatorios = personas.slice(0, randomInt(2, 4)).map((persona, index) => ({
        id: `worker-${Date.now()}-${index}`,
        name: persona.nombre_completo,
        phone: `+56 9 ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
        type: WorkerType.INTERNAL,
        personaId: persona.id,
      }));
      setWorkers(trabajadoresAleatorios);
      setTargetWorkerCountMyma(trabajadoresAleatorios.length);
    }
  };

  const renderCondicionesLaboralesSection = () => (
    <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
        <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">schedule</span>
          Condiciones Laborales
        </h3>
      </div>
      <div className="p-6 space-y-6">
        <label className="flex flex-col gap-2 max-w-md">
          <span className="text-[#111318] text-sm font-medium">
            Condiciones Laborales {hasAnyWorkerAdded && <span className="text-red-500">*</span>}
          </span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">tune</span>
            <select
              name="jornadaTrabajo"
              value={formData.jornadaTrabajo}
              onChange={handleInputChange}
              required={hasAnyWorkerAdded}
              className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none"
            >
              <option value="">Seleccionar condición laboral</option>
              <option value="4x3">4x3</option>
              <option value="5x2">5x2</option>
              <option value="6x1">6x1</option>
              <option value="Art. 22">Art. 22</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">expand_more</span>
          </div>
        </label>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#111318]">Horarios de trabajo</h4>
            <button
              type="button"
              onClick={handleAgregarHorario}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Agregar Horario
            </button>
          </div>

          {horarios.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <span className="material-symbols-outlined text-4xl mb-2 block text-gray-400 mx-auto">schedule</span>
              <p className="text-sm">No hay horarios agregados. Haz clic en "Agregar Horario" para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {horarios.map((horario, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-[#111318]">Horario {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleEliminarHorario(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Eliminar horario"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">Días</span>
                      <input
                        type="text"
                        placeholder="Ej: Lunes a Jueves"
                        className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        value={horario.dias}
                        onChange={(e) => handleHorarioChange(index, 'dias', e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[#111318] text-sm font-medium">Horario</span>
                      <input
                        type="text"
                        placeholder="Ej: 08:00 - 18:00"
                        className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        value={horario.horario}
                        onChange={(e) => handleHorarioChange(index, 'horario', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const hasAnsweredCompanyAccreditation =
    formData.companyAccreditationRequired === 'yes' || formData.companyAccreditationRequired === 'no';
  const hasAnsweredMymaWorkersAccreditation =
    formData.requiereAcreditarTrabajadoresMyma === 'yes' || formData.requiereAcreditarTrabajadoresMyma === 'no';
  const hasAnsweredContractorAccreditation =
    formData.requiereAcreditarContratista === 'yes' || formData.requiereAcreditarContratista === 'no';
  const hasAnsweredContractorWorkersAccreditation =
    formData.requiereAcreditarTrabajadoresContratista === 'yes' || formData.requiereAcreditarTrabajadoresContratista === 'no';
  const hasAnsweredSstTerreno =
    formData.requiereAcreditarTrabajadoresContratista !== 'yes' ||
    formData.registroSstTerreo === 'yes' ||
    formData.registroSstTerreo === 'no';
  const hasAtLeastOneMymaWorker = workers.length > 0;
  const hasAnyWorkerAdded = workers.length > 0 || workersContratista.length > 0;
  const hasCondicionLaboralWhenWorkers = !hasAnyWorkerAdded || formData.jornadaTrabajo.trim() !== '';
  const hasRequiredContractorFields =
    formData.requiereAcreditarContratista !== 'yes' ||
    (
      formData.modalidadContrato.trim() !== '' &&
      formData.razonSocialContratista.trim() !== '' &&
      formData.nombreResponsableContratista.trim() !== '' &&
      formData.telefonoResponsableContratista.trim() !== '' &&
      formData.emailResponsableContratista.trim() !== ''
    );

  const areAllRequiredFieldsCompleted =
    PROJECT_CODE_REGEX.test(formData.projectCode) &&
    formData.requirement.trim() !== '' &&
    formData.requestDate.trim() !== '' &&
    formData.requesterName.trim() !== '' &&
    formData.fieldStartDate.trim() !== '' &&
    formData.clientName.trim() !== '' &&
    formData.projectManager.trim() !== '' &&
    formData.contractAdmin.trim() !== '' &&
    hasAnsweredCompanyAccreditation &&
    hasAnsweredMymaWorkersAccreditation &&
    hasAnsweredContractorAccreditation &&
    hasAnsweredContractorWorkersAccreditation &&
    hasAnsweredSstTerreno &&
    hasRequiredContractorFields &&
    (formData.requiereAcreditarTrabajadoresMyma !== 'yes' || hasAtLeastOneMymaWorker) &&
    hasCondicionLaboralWhenWorkers;

  const isSubmitDisabled = isSaving || (!areAllRequiredFieldsCompleted && !omitirCamposObligatorios);

  return (
    <div className="layout-container flex h-full grow flex-col">
      {isSaving && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Guardando solicitud...</h3>
            <p className="text-sm text-[#616f89] text-center">
              Por favor espera mientras se guarda la solicitud y se procesan los datos relacionados.
            </p>
          </div>
        </div>
      )}
      {isViewMode && loadingSnapshot && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center">
            <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Cargando formulario enviado...</h3>
            <p className="text-sm text-[#616f89] text-center">
              Estamos reconstruyendo la solicitud desde la base de datos.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">
            Inicio
          </button>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <button onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">
            Proyectos
          </button>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">
            {isViewMode ? 'Solicitud Enviada (solo lectura)' : 'Nueva Solicitud'}
          </span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
              {isViewMode ? 'Solicitud de Acreditación enviada (solo lectura)' : 'Formulario de solicitud de Acreditación'}
            </h1>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              {isViewMode
                ? 'Visualización de la solicitud registrada. Los datos no se pueden editar desde esta vista.'
                : 'Ingrese los datos requeridos para la gestión de terreno y acreditación.'}
            </p>
            {isViewMode && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {snapshotMeta?.projectCode && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                    <span className="material-symbols-outlined text-[14px]">folder_open</span>
                    {snapshotMeta.projectCode}
                  </span>
                )}
                {snapshotMeta?.createdAt && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    Creada: {new Date(snapshotMeta.createdAt).toLocaleString('es-CL')}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-3">
            {!isViewMode && (
            <button 
              type="button"
              onClick={fillRandomData}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
              Rellenar Datos
            </button>
            )}
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#616f89] border border-gray-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              {isViewMode ? 'Volver' : 'Volver al Listado'}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate={omitirCamposObligatorios} className="flex flex-col gap-8 pb-12">
          <fieldset disabled={isViewMode} className="contents">
          
          {/* Section 1: Identificación de la Solicitud */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Identificación de la Solicitud
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Código de Proyecto <span className="text-red-500">*</span>
                </span>
                <input 
                  type="text" 
                  name="projectCode"
                  value={formData.projectCode}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: MY-001-2026"
                  maxLength={11}
                  pattern="MY-[0-9]{3}-[0-9]{4}"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
                <span className="text-xs text-[#616f89]">Ejemplo: MY-001-2026</span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Requisito <span className="text-red-500">*</span>
                </span>
                <select 
                  name="requirement"
                  value={formData.requirement}
                  onChange={handleInputChange}
                  required
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione un requisito...</option>
                  <option value="Acreditación">Acreditación</option>
                  <option value="Carpeta de arranque">Carpeta de arranque</option>
                  <option value="Acreditación y Carpeta de arranque">Acreditación y Carpeta de arranque</option>
                  <option value="Pase de visita">Pase de visita</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Fecha de Solicitud <span className="text-red-500">*</span>
                </span>
                <input 
                  type="date" 
                  name="requestDate"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                  required
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Fecha Reunión de Arranque</span>
                <input 
                  type="date" 
                  name="kickoffDate"
                  value={formData.kickoffDate}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-[#111318] text-sm font-medium">
                  Nombre de Solicitante <span className="text-red-500">*</span>
                  {isManualSolicitante && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Local
                    </span>
                  )}
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
                  <input 
                    id="solicitante_search"
                    type="text" 
                    value={selectedPersonaSolicitante ? `${selectedPersonaSolicitante.nombre_completo} - ${selectedPersonaSolicitante.rut}` : searchQuerySolicitante}
                    onChange={(e) => {
                      setSearchQuerySolicitante(e.target.value);
                      setSelectedPersonaSolicitante(null);
                      setIsManualSolicitante(false);
                      setShowDropdownSolicitante(true);
                      setFormData(prev => ({ ...prev, requesterName: '' }));
                    }}
                    onFocus={() => setShowDropdownSolicitante(true)}
                    placeholder="Buscar por nombre o RUT..."
                    autoComplete="off"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  />
                  {searchQuerySolicitante && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuerySolicitante('');
                        setSelectedPersonaSolicitante(null);
                        setIsManualSolicitante(false);
                        setShowDropdownSolicitante(true);
                        setFormData(prev => ({ ...prev, requesterName: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                  {/* Dropdown de resultados */}
                  {showDropdownSolicitante && (
                    <div className="dropdown-results-solicitante absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                      {filteredPersonasSolicitante.length > 0 ? (
                        filteredPersonasSolicitante.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => {
                              setSelectedPersonaSolicitante(persona);
                              setSearchQuerySolicitante(`${persona.nombre_completo} - ${persona.rut}`);
                              setIsManualSolicitante(false);
                              setShowDropdownSolicitante(false);
                              setFormData(prev => ({ ...prev, requesterName: persona.nombre_completo }));
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedPersonaSolicitante?.id === persona.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                          {searchQuerySolicitante.trim() !== '' && (
                            <button
                              type="button"
                              onClick={() => handleUseLocalPersona('requesterName', searchQuerySolicitante)}
                              className="mt-2 inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              + Agregar "{searchQuerySolicitante.trim()}" localmente
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Fecha de Inicio de Terreno <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">calendar_today</span>
                   <input 
                    type="date" 
                    name="fieldStartDate"
                    value={formData.fieldStartDate}
                    onChange={handleInputChange}
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Cliente y Contrato */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">business</span>
                Cliente y Contrato
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-[#111318] text-sm font-medium">
                  Nombre de Cliente <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
                  <input
                    id="cliente_search"
                    type="text"
                    value={selectedCliente ? selectedCliente.nombre : searchQueryCliente}
                    onChange={(e) => {
                      setSearchQueryCliente(e.target.value);
                      setSelectedCliente(null);
                      setShowDropdownCliente(true);
                      setFormData(prev => ({ ...prev, clientName: '' }));
                    }}
                    onFocus={() => setShowDropdownCliente(true)}
                    placeholder="Buscar por nombre o RUT..."
                    autoComplete="off"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                  {searchQueryCliente && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQueryCliente('');
                        setSelectedCliente(null);
                        setShowDropdownCliente(true);
                        setFormData(prev => ({ ...prev, clientName: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                  {showDropdownCliente && (
                    <div className="dropdown-results-cliente absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                      {filteredClientes.length > 0 ? (
                        filteredClientes.map(cliente => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setSearchQueryCliente(cliente.nombre);
                              setShowDropdownCliente(false);
                              setFormData(prev => ({ ...prev, clientName: cliente.nombre }));
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedCliente?.id === cliente.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                            {cliente.rut && (
                              <div className="text-xs text-gray-500">{cliente.rut}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron clientes
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
              
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="text-[#111318] text-sm font-medium">Contactos del Cliente</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                    <input 
                      type="text" 
                      name="clientContactName"
                      value={formData.clientContactName}
                      onChange={handleInputChange}
                      placeholder="Nombre del Contacto"
                      className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                    />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">mail</span>
                    <input 
                      type="email" 
                      name="clientContactEmail"
                      value={formData.clientContactEmail}
                      onChange={handleInputChange}
                      placeholder="Correo Electrónico"
                      className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Gestión Interna MYMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">work</span>
                Gestión Interna MYMA
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Jefe de Proyectos MYMA <span className="text-red-500">*</span>
                  {isManualJefeProyecto && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Local
                    </span>
                  )}
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
                  <input
                    id="jefe_proyecto_search"
                    type="text"
                    value={selectedPersonaJefeProyecto ? `${selectedPersonaJefeProyecto.nombre_completo} - ${selectedPersonaJefeProyecto.rut}` : searchQueryJefeProyecto}
                    onChange={(e) => {
                      setSearchQueryJefeProyecto(e.target.value);
                      setSelectedPersonaJefeProyecto(null);
                      setIsManualJefeProyecto(false);
                      setShowDropdownJefeProyecto(true);
                      setFormData(prev => ({ ...prev, projectManager: '' }));
                    }}
                    onFocus={() => setShowDropdownJefeProyecto(true)}
                    placeholder="Buscar por nombre o RUT..."
                    autoComplete="off"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                  {searchQueryJefeProyecto && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQueryJefeProyecto('');
                        setSelectedPersonaJefeProyecto(null);
                        setIsManualJefeProyecto(false);
                        setShowDropdownJefeProyecto(true);
                        setFormData(prev => ({ ...prev, projectManager: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                  {showDropdownJefeProyecto && (
                    <div className="dropdown-results-jefe-proyecto absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                      {filteredPersonasJefeProyecto.length > 0 ? (
                        filteredPersonasJefeProyecto.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => {
                              setSelectedPersonaJefeProyecto(persona);
                              setSearchQueryJefeProyecto(`${persona.nombre_completo} - ${persona.rut}`);
                              setIsManualJefeProyecto(false);
                              setShowDropdownJefeProyecto(false);
                              setFormData(prev => ({ ...prev, projectManager: persona.nombre_completo }));
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedPersonaJefeProyecto?.id === persona.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                          {searchQueryJefeProyecto.trim() !== '' && (
                            <button
                              type="button"
                              onClick={() => handleUseLocalPersona('projectManager', searchQueryJefeProyecto)}
                              className="mt-2 inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              + Agregar "{searchQueryJefeProyecto.trim()}" localmente
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Admin. de Contrato MYMA <span className="text-red-500">*</span>
                  {isManualAdminContrato && (
                    <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Local
                    </span>
                  )}
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
                  <input
                    id="admin_contrato_search"
                    type="text"
                    value={selectedPersonaAdminContrato ? `${selectedPersonaAdminContrato.nombre_completo} - ${selectedPersonaAdminContrato.rut}` : searchQueryAdminContrato}
                    onChange={(e) => {
                      setSearchQueryAdminContrato(e.target.value);
                      setSelectedPersonaAdminContrato(null);
                      setIsManualAdminContrato(false);
                      setShowDropdownAdminContrato(true);
                      setFormData(prev => ({ ...prev, contractAdmin: '' }));
                    }}
                    onFocus={() => setShowDropdownAdminContrato(true)}
                    placeholder="Buscar por nombre o RUT..."
                    autoComplete="off"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                  {searchQueryAdminContrato && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQueryAdminContrato('');
                        setSelectedPersonaAdminContrato(null);
                        setIsManualAdminContrato(false);
                        setShowDropdownAdminContrato(true);
                        setFormData(prev => ({ ...prev, contractAdmin: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                  {showDropdownAdminContrato && (
                    <div className="dropdown-results-admin-contrato absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                      {filteredPersonasAdminContrato.length > 0 ? (
                        filteredPersonasAdminContrato.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => {
                              setSelectedPersonaAdminContrato(persona);
                              setSearchQueryAdminContrato(`${persona.nombre_completo} - ${persona.rut}`);
                              setIsManualAdminContrato(false);
                              setShowDropdownAdminContrato(false);
                              setFormData(prev => ({ ...prev, contractAdmin: persona.nombre_completo }));
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedPersonaAdminContrato?.id === persona.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                          {searchQueryAdminContrato.trim() !== '' && (
                            <button
                              type="button"
                              onClick={() => handleUseLocalPersona('contractAdmin', searchQueryAdminContrato)}
                              className="mt-2 inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              + Agregar "{searchQueryAdminContrato.trim()}" localmente
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Acreditación MyMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Acreditación MyMA
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100 w-full">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a Myma? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="companyAccreditationRequired" 
                      value="yes"
                      checked={formData.companyAccreditationRequired === 'yes'}
                      onChange={handleInputChange}
                      required
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="companyAccreditationRequired" 
                      value="no"
                      checked={formData.companyAccreditationRequired === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mostrar secciones de empresa MyMA */}
          {formData.companyAccreditationRequired === 'yes' && (
            <>
              {/* Section 5: Información del Contrato */}
              <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Información del Contrato
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Nombre del contrato</span>
                <input 
                  type="text" 
                  name="nombreContrato"
                  value={formData.nombreContrato}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre del contrato"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Número de contrato</span>
                <input 
                  type="text" 
                  name="numeroContrato"
                  value={formData.numeroContrato}
                  onChange={handleInputChange}
                  placeholder=""
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-[#111318] text-sm font-medium">Nombre del administrador de contrato (MYMA)</span>
                <input 
                  type="text" 
                  name="administradorContrato"
                  value={formData.administradorContrato}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre del administrador"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
            </div>
          </div>

            </>
          )}
          {/* Section 4.1: Acreditación MyMA Trabajadores */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">groups</span>
                Acreditación MyMA Trabajadores
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100 w-full">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a trabajadores de Myma? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requiereAcreditarTrabajadoresMyma"
                      value="yes"
                      checked={formData.requiereAcreditarTrabajadoresMyma === 'yes'}
                      onChange={handleInputChange}
                      required
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requiereAcreditarTrabajadoresMyma"
                      value="no"
                      checked={formData.requiereAcreditarTrabajadoresMyma === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mostrar secciones de trabajadores MyMA */}
          {formData.requiereAcreditarTrabajadoresMyma === 'yes' && (
            <>
          {/* Section 6: Información de Trabajadores MYMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">engineering</span>
                Información de Trabajadores MYMA
              </h3>
            </div>
            <div className="p-6">
              <WorkerList 
                workers={workers} 
                onAddWorker={handleAddWorker} 
                onRemoveWorker={handleRemoveWorker}
                readOnly={isViewMode}
                targetWorkerCount={targetWorkerCountMyma}
                onTargetWorkerCountChange={isViewMode ? undefined : setTargetWorkerCountMyma}
              />
            </div>
          </div>

          {/* Section 7: Condiciones Laborales */}
          {renderCondicionesLaboralesSection()}

          {/* Section 8: Información de Vehículos */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                Información de Vehículos
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Cantidad de vehículos a acreditar</span>
                <input 
                  type="number" 
                  name="cantidadVehiculos"
                  value={formData.cantidadVehiculos}
                  onChange={handleInputChange}
                  placeholder="Ej: 3"
                  min="0"
                  className="form-input w-full md:w-64 rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              {vehiculosMyma.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente y conductores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiculosMyma.map((vehiculo, index) => (
                      <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.placa}
                            onChange={(e) => handleVehiculoMymaChange(index, 'placa', e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                          <input 
                            type="text" 
                            placeholder="Nombre del conductor"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.conductor}
                            onChange={(e) => handleVehiculoMymaChange(index, 'conductor', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* Section: Acreditación Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Acreditación Contratista
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a contratista? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarContratista" 
                      value="yes"
                      checked={formData.requiereAcreditarContratista === 'yes'}
                      onChange={handleInputChange}
                      required
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarContratista" 
                      value="no"
                      checked={formData.requiereAcreditarContratista === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mostrar secciones base de contratista */}
          {formData.requiereAcreditarContratista === 'yes' && (
            <>
          {/* Section 9: Información del Contrato */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Información del Contrato Contratista
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Modalidad de contrato <span className="text-red-500">*</span>
                </span>
                <select 
                  name="modalidadContrato"
                  value={formData.modalidadContrato}
                  onChange={handleInputChange}
                  required
                  className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione...</option>
                  <option value="honorarios">Honorarios</option>
                  <option value="contratista">Contratista</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Razón social de contratista <span className="text-red-500">*</span>
                </span>
                <select 
                  name="razonSocialContratista"
                  value={formData.razonSocialContratista}
                  onChange={handleInputChange}
                  required
                  className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione...</option>
                  {proveedores.map((proveedor, index) => (
                    <option key={index} value={proveedor}>
                      {proveedor}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Section 10: Responsable de la Solicitud */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Responsable de la Solicitud Contratista
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Nombre de contacto <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                  <input 
                    type="text" 
                    name="nombreResponsableContratista"
                    value={formData.nombreResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="Nombre completo"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Teléfono <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">phone</span>
                  <input 
                    type="tel" 
                    name="telefonoResponsableContratista"
                    value={formData.telefonoResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="+569 1234 5678"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">mail</span>
                  <input 
                    type="email" 
                    name="emailResponsableContratista"
                    value={formData.emailResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="correo@ejemplo.com"
                    required
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>
            </div>
            <div className="px-6 pb-6">
              <p className="text-xs text-gray-500">
                Persona responsable para la solicitud de documentación de trabajadores contratista
              </p>
            </div>
          </div>

            </>
          )}
          {/* Section: Acreditación Contratista Trabajadores */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">groups</span>
                Acreditación Contratista Trabajadores
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a trabajadores de contratista? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarTrabajadoresContratista" 
                      value="yes"
                      checked={formData.requiereAcreditarTrabajadoresContratista === 'yes'}
                      onChange={handleInputChange}
                      required
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarTrabajadoresContratista" 
                      value="no"
                      checked={formData.requiereAcreditarTrabajadoresContratista === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          {/* Mostrar secciones de trabajadores Contratista */}
          {formData.requiereAcreditarTrabajadoresContratista === 'yes' && (
            <>
          {/* Section 11: Información de Trabajadores Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">group</span>
                Información de Trabajadores Contratista
              </h3>
            </div>
            <div className="p-6">
              {formData.requiereAcreditarContratista !== 'yes' && (
                <div className="mb-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-[#111318] text-sm font-medium">Razon social de contratista</span>
                    <select
                      name="razonSocialContratista"
                      value={formData.razonSocialContratista}
                      onChange={handleInputChange}
                      className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="">Seleccione...</option>
                      {proveedores.map((proveedor, index) => (
                        <option key={index} value={proveedor}>
                          {proveedor}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <WorkerList 
                workers={workersContratista} 
                onAddWorker={handleAddWorkerContratista} 
                onRemoveWorker={handleRemoveWorkerContratista}
                readOnly={isViewMode}
                requireCompanySelection={true}
                companies={proveedores.length > 0 ? proveedores : MOCK_COMPANIES.map(c => c.name)}
                selectedCompany={formData.razonSocialContratista}
                targetWorkerCount={targetWorkerCountContratista}
                onTargetWorkerCountChange={isViewMode ? undefined : setTargetWorkerCountContratista}
              />
            </div>
          </div>


          {formData.requiereAcreditarTrabajadoresMyma !== 'yes' && renderCondicionesLaboralesSection()}
          {/* Section 12: Información de Vehículos Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Información de Vehículos Contratista
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Cantidad de vehículos a acreditar del contratista</span>
                <input 
                  type="number" 
                  name="cantidadVehiculosContratista"
                  value={formData.cantidadVehiculosContratista}
                  onChange={handleInputChange}
                  placeholder="Ej: 3"
                  min="0"
                  className="form-input w-full md:w-64 rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              {vehiculosContratista.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente y conductores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiculosContratista.map((vehiculo, index) => (
                      <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.placa}
                            onChange={(e) => handleVehiculoContratistaChange(index, 'placa', e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                          <input 
                            type="text" 
                            placeholder="Nombre del conductor"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.conductor}
                            onChange={(e) => handleVehiculoContratistaChange(index, 'conductor', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 13: Seguridad y Salud en el Trabajo (SST) */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">health_and_safety</span>
                Seguridad y Salud en el Trabajo (SST)
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-base">assignment</span>
                  ¿Se registró actividad en la planilla SST terreno? <span className="text-red-500">*</span>
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="registroSstTerreo" 
                      value="yes"
                      checked={formData.registroSstTerreo === 'yes'}
                      onChange={handleInputChange}
                      required
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="registroSstTerreo" 
                      value="no"
                      checked={formData.registroSstTerreo === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          </fieldset>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
            {isViewMode ? (
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Volver
              </button>
            ) : (
              <>
                <div className="w-full sm:mr-auto sm:w-auto flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <span className="text-xs font-medium text-gray-600">solicitud_prueba</span>
                    <button
                      type="button"
                      onClick={() => setSolicitudPrueba(true)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        solicitudPrueba
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      true
                    </button>
                    <button
                      type="button"
                      onClick={() => setSolicitudPrueba(false)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        !solicitudPrueba
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      false
                    </button>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <span className="text-xs font-medium text-gray-600">omitir_obligatorios</span>
                    <button
                      type="button"
                      onClick={() => setOmitirCamposObligatorios(true)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        omitirCamposObligatorios
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      true
                    </button>
                    <button
                      type="button"
                      onClick={() => setOmitirCamposObligatorios(false)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                        !omitirCamposObligatorios
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      false
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Cancelar
                </button>
                <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-1">
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        Guardar Solicitud
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default FieldRequestForm;

