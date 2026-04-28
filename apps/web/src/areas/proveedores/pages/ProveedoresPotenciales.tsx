import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProveedorPotencial, Especialidad, EstadoInteres, EstadoContacto, Origen } from '../types';
import { AreaId } from '@contracts/areas';
import { normalizeSearchText } from '../utils/search';

// Datos de ejemplo (luego se conectarán con Supabase)
const MOCK_PROVEEDORES_POTENCIALES: ProveedorPotencial[] = [
  {
    id: 1,
    nombre: 'TechSolutions Latam',
    web: 'techlatam.cl',
    contactoPrincipal: {
      nombre: 'Roberto Mendez',
      email: 'r.mendez@techlatam.cl',
    },
    especialidad: Especialidad.SUMINISTROS_TI,
    interes: EstadoInteres.MEDIO,
    estado: EstadoContacto.EN_CONTACTO,
    origen: Origen.WEB,
  },
  {
    id: 2,
    nombre: 'EcoAmbiental Consultores',
    referencia: 'Referido por: J. Pérez',
    contactoPrincipal: {
      nombre: 'Ana María Lopez',
      telefono: '+56 9 8765 4321',
    },
    especialidad: Especialidad.CONSULTORIA_AMBIENTAL,
    interes: EstadoInteres.MUY_ALTO,
    estado: EstadoContacto.SIN_CONTACTAR,
    origen: Origen.REFERIDO,
  },
  {
    id: 3,
    nombre: 'Construcciones Modernas SA',
    web: 'constmodernas.cl',
    contactoPrincipal: {
      nombre: 'Carlos Ramírez',
      email: 'c.ramirez@constmodernas.cl',
      telefono: '+56 9 1234 5678',
    },
    especialidad: Especialidad.CONSTRUCCION,
    interes: EstadoInteres.ALTO,
    estado: EstadoContacto.EN_NEGOCIACION,
    origen: Origen.WEB,
  },
  {
    id: 4,
    nombre: 'Ingeniería Avanzada Ltda',
    referencia: 'Referido por: M. González',
    contactoPrincipal: {
      nombre: 'Patricia Silva',
      email: 'p.silva@ingavanzada.cl',
    },
    especialidad: Especialidad.INGENIERIA,
    interes: EstadoInteres.MEDIO,
    estado: EstadoContacto.EN_CONTACTO,
    origen: Origen.REFERIDO,
  },
  {
    id: 5,
    nombre: 'Arquitectura Sustentable',
    web: 'arqsustentable.cl',
    contactoPrincipal: {
      nombre: 'Luis Martínez',
      email: 'l.martinez@arqsustentable.cl',
    },
    especialidad: Especialidad.ARQUITECTURA,
    interes: EstadoInteres.BAJO,
    estado: EstadoContacto.SIN_CONTACTAR,
    origen: Origen.REDES_SOCIALES,
  },
  {
    id: 6,
    nombre: 'LabTech Solutions',
    web: 'labtech.cl',
    contactoPrincipal: {
      nombre: 'María Fernández',
      email: 'm.fernandez@labtech.cl',
      telefono: '+56 9 9876 5432',
    },
    especialidad: Especialidad.LABORATORIO,
    interes: EstadoInteres.MUY_ALTO,
    estado: EstadoContacto.EN_CONTACTO,
    origen: Origen.WEB,
  },
  {
    id: 7,
    nombre: 'Consultores Hídricos del Sur',
    referencia: 'Referido por: A. Torres',
    contactoPrincipal: {
      nombre: 'Jorge Vargas',
      telefono: '+56 9 5555 1234',
    },
    especialidad: Especialidad.RECURSOS_HIDRICOS,
    interes: EstadoInteres.ALTO,
    estado: EstadoContacto.SIN_CONTACTAR,
    origen: Origen.REFERIDO,
  },
  {
    id: 8,
    nombre: 'Construcciones Premium',
    web: 'constpremium.cl',
    contactoPrincipal: {
      nombre: 'Sandra Morales',
      email: 's.morales@constpremium.cl',
    },
    especialidad: Especialidad.CONSTRUCCION,
    interes: EstadoInteres.MEDIO,
    estado: EstadoContacto.EN_CONTACTO,
    origen: Origen.FERIA,
  },
  {
    id: 9,
    nombre: 'Ingeniería Estructural Pro',
    referencia: 'Referido por: R. Sánchez',
    contactoPrincipal: {
      nombre: 'Diego Herrera',
      email: 'd.herrera@ingestructural.cl',
      telefono: '+56 9 7777 8888',
    },
    especialidad: Especialidad.INGENIERIA,
    interes: EstadoInteres.ALTO,
    estado: EstadoContacto.EN_NEGOCIACION,
    origen: Origen.REFERIDO,
  },
  {
    id: 10,
    nombre: 'Arquitectos Asociados',
    web: 'arqasociados.cl',
    contactoPrincipal: {
      nombre: 'Carmen Ruiz',
      email: 'c.ruiz@arqasociados.cl',
    },
    especialidad: Especialidad.ARQUITECTURA,
    interes: EstadoInteres.MUY_ALTO,
    estado: EstadoContacto.EN_CONTACTO,
    origen: Origen.WEB,
  },
  {
    id: 11,
    nombre: 'Análisis Lab Express',
    web: 'analisislab.cl',
    contactoPrincipal: {
      nombre: 'Fernando Castro',
      email: 'f.castro@analisislab.cl',
    },
    especialidad: Especialidad.LABORATORIO,
    interes: EstadoInteres.MEDIO,
    estado: EstadoContacto.SIN_CONTACTAR,
    origen: Origen.REDES_SOCIALES,
  },
  {
    id: 12,
    nombre: 'Servicios Hídricos Integrales',
    referencia: 'Referido por: L. Muñoz',
    contactoPrincipal: {
      nombre: 'Andrea Jiménez',
      telefono: '+56 9 3333 4444',
    },
    especialidad: Especialidad.RECURSOS_HIDRICOS,
    interes: EstadoInteres.BAJO,
    estado: EstadoContacto.SIN_CONTACTAR,
    origen: Origen.REFERIDO,
  },
];

const ProveedoresPotenciales: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('Todas');
  const [filterInteres, setFilterInteres] = useState<string>('Todos');
  const [filterOrigen, setFilterOrigen] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Filtrar proveedores potenciales
  const normalizedSearchTerm = normalizeSearchText(searchTerm);
  const filteredProveedores = MOCK_PROVEEDORES_POTENCIALES.filter((proveedor) => {
    const matchesSearch =
      !normalizedSearchTerm ||
      normalizeSearchText(proveedor.nombre).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.contactoPrincipal.nombre).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.contactoPrincipal.email).includes(normalizedSearchTerm) ||
      normalizeSearchText(proveedor.contactoPrincipal.telefono).includes(normalizedSearchTerm);

    const matchesEspecialidad = filterEspecialidad === 'Todas' || proveedor.especialidad === filterEspecialidad;
    const matchesInteres = filterInteres === 'Todos' || proveedor.interes === filterInteres;
    const matchesOrigen = filterOrigen === 'Todos' || proveedor.origen === filterOrigen;

    return matchesSearch && matchesEspecialidad && matchesInteres && matchesOrigen;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProveedores = filteredProveedores.slice(startIndex, endIndex);

  const getEspecialidadColor = (especialidad: Especialidad) => {
    const colors: Record<Especialidad, string> = {
      [Especialidad.LABORATORIO]: 'bg-blue-100 text-blue-700 border-blue-200',
      [Especialidad.ARQUITECTURA]: 'bg-purple-100 text-purple-700 border-purple-200',
      [Especialidad.RECURSOS_HIDRICOS]: 'bg-teal-100 text-teal-700 border-teal-200',
      [Especialidad.INGENIERIA]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      [Especialidad.CONSTRUCCION]: 'bg-orange-100 text-orange-700 border-orange-200',
      [Especialidad.SUMINISTROS_TI]: 'bg-blue-100 text-blue-700 border-blue-200',
      [Especialidad.CONSULTORIA_AMBIENTAL]: 'bg-green-100 text-green-700 border-green-200',
      [Especialidad.OTROS]: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[especialidad] || colors[Especialidad.OTROS];
  };

  const getInteresStars = (interes: EstadoInteres) => {
    const starMap: Record<EstadoInteres, { filled: number; label: string }> = {
      [EstadoInteres.MUY_ALTO]: { filled: 5, label: 'Muy Alto' },
      [EstadoInteres.ALTO]: { filled: 4, label: 'Alto' },
      [EstadoInteres.MEDIO]: { filled: 3, label: 'Medio' },
      [EstadoInteres.BAJO]: { filled: 2, label: 'Bajo' },
      [EstadoInteres.MUY_BAJO]: { filled: 1, label: 'Muy Bajo' },
    };
    return starMap[interes] || { filled: 0, label: 'Sin interés' };
  };

  const getEstadoColor = (estado: EstadoContacto) => {
    const colors: Record<EstadoContacto, string> = {
      [EstadoContacto.EN_CONTACTO]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      [EstadoContacto.SIN_CONTACTAR]: 'bg-gray-100 text-gray-700 border-gray-200',
      [EstadoContacto.EN_NEGOCIACION]: 'bg-blue-100 text-blue-700 border-blue-200',
      [EstadoContacto.RECHAZADO]: 'bg-red-100 text-red-700 border-red-200',
      [EstadoContacto.ACEPTADO]: 'bg-green-100 text-green-700 border-green-200',
    };
    return colors[estado] || colors[EstadoContacto.SIN_CONTACTAR];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Proveedores Potenciales
              </h1>
              <p className="text-sm text-gray-500">
                Gestión de oportunidades y prospección de nuevos proveedores para MyMALAB.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">upload_file</span>
                <span className="hidden sm:inline">Importar Lista</span>
              </button>
              <button
                onClick={() => navigate(getAreaPath('potenciales/nuevo'))}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span>+ Añadir Potencial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-1">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Nombre o Contacto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Especialidad */}
            <div>
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas</option>
                {Object.values(Especialidad).map((esp) => (
                  <option key={esp} value={esp}>
                    {esp}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado de Interés */}
            <div>
              <select
                value={filterInteres}
                onChange={(e) => setFilterInteres(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todos">Todos</option>
                {Object.values(EstadoInteres).map((interes) => (
                  <option key={interes} value={interes}>
                    {interes}
                  </option>
                ))}
              </select>
            </div>

            {/* Origen */}
            <div>
              <select
                value={filterOrigen}
                onChange={(e) => setFilterOrigen(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todos">Todos</option>
                {Object.values(Origen).map((origen) => (
                  <option key={origen} value={origen}>
                    {origen}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">PROVEEDOR POTENCIAL</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CONTACTO PRINCIPAL</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">INTERÉS</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESTADO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedProveedores.map((proveedor) => {
                  const { filled, label } = getInteresStars(proveedor.interes);
                  return (
                    <tr
                      key={proveedor.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${getAvatarColor(proveedor.nombre)} flex items-center justify-center text-white font-semibold text-sm`}
                          >
                            {getInitials(proveedor.nombre)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-[#111318]">{proveedor.nombre}</span>
                            {proveedor.web && (
                              <span className="text-sm text-gray-500">Web: {proveedor.web}</span>
                            )}
                            {proveedor.referencia && (
                              <span className="text-sm text-gray-500">{proveedor.referencia}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111318]">{proveedor.contactoPrincipal.nombre}</span>
                          {proveedor.contactoPrincipal.email && (
                            <span className="text-sm text-gray-500">{proveedor.contactoPrincipal.email}</span>
                          )}
                          {proveedor.contactoPrincipal.telefono && (
                            <span className="text-sm text-gray-500">{proveedor.contactoPrincipal.telefono}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEspecialidadColor(
                            proveedor.especialidad
                          )}`}
                        >
                          {proveedor.especialidad}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${
                                  i < filled ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">{label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(
                            proveedor.estado
                          )}`}
                        >
                          {proveedor.estado}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Iniciar contacto"
                          >
                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                          </button>
                          <button
                            onClick={() => navigate(getAreaPath(`potenciales/${proveedor.id}/editar`))}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProveedores.length)} de{' '}
              {filteredProveedores.length} potenciales
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                const page = i + 1;
                if (totalPages > 8 && page === 8) {
                  return (
                    <span key="ellipsis" className="px-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ProveedoresPotenciales;

