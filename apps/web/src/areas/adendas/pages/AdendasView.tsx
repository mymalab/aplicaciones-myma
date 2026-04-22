import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdendaListItem } from '../types';
import { TIPOS_ADENDA } from '../constants';
import { fetchAdendas } from '../services/adendasService';
import {
  adendasCreate,
  adendasDetail,
  adendasEdit,
  adendasGestion,
} from '../utils/routes';

const AdendasView: React.FC = () => {
  const navigate = useNavigate();
  const [adendas, setAdendas] = useState<AdendaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAdendas();
  }, []);

  const loadAdendas = async () => {
    try {
      setLoading(true);
      const data = await fetchAdendas();
      setAdendas(data);
    } catch (error) {
      console.error('Error loading adendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate(adendasCreate());
  };

  const handleEdit = (id: number) => {
    navigate(adendasEdit(id));
  };

  const handleCodigoMymaClick = (codigoMyma: string) => {
    if (codigoMyma) {
      navigate(adendasDetail(codigoMyma));
    }
  };

  const handleRowClick = (adenda: AdendaListItem) => {
    // Navegar a la gestión de adenda usando el código MyMA o el ID
    navigate(adendasGestion(adenda.id));
  };

  const filteredAdendas = adendas.filter((adenda) => {
    const tipo = TIPOS_ADENDA[adenda.tipo];
    const searchLower = searchTerm.toLowerCase();
    return (
      tipo.displayName.toLowerCase().includes(searchLower) ||
      adenda.codigo_myma?.toLowerCase().includes(searchLower) ||
      adenda.nombre?.toLowerCase().includes(searchLower) ||
      adenda.estado?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (value?: string) => {
    if (!value) return '-';
    // Si viene como YYYY-MM-DD (input type="date"), evitar desfase por zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}-${month}-${year}`;
    }
    return new Date(value).toLocaleDateString('es-CL');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando adendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#111318] mb-6">Adendas</h1>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar adendas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Nueva Adenda</span>
          </button>
        </div>
      </div>

      {/* Adendas List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredAdendas.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
              description
            </span>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No se encontraron adendas' : 'No hay adendas registradas'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreateNew}
                className="mt-4 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
              >
                Crear primera adenda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <span>Código MyMA</span>
                      <span className="material-symbols-outlined text-xs">filter_list</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de entrega
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdendas.map((adenda) => {
                  const tipo = TIPOS_ADENDA[adenda.tipo];
                  return (
                    <tr 
                      key={adenda.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(adenda)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#111318]">{adenda.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="material-symbols-outlined text-lg"
                            style={{ color: tipo.color }}
                          >
                            {tipo.icon}
                          </span>
                          <span className="text-sm font-medium text-[#111318]">
                            {tipo.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {adenda.codigo_myma ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCodigoMymaClick(adenda.codigo_myma!);
                            }}
                            className="text-sm font-medium text-primary hover:text-primary-hover hover:underline transition-colors cursor-pointer"
                          >
                            {adenda.codigo_myma}
                          </button>
                        ) : (
                          <div className="text-sm font-medium text-[#111318]">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-sm">description</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(adenda);
                            }}
                            className="text-left text-sm text-[#111318] hover:text-primary transition-colors"
                          >
                            {adenda.nombre || '-'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {adenda.estado || 'Sin estado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(adenda.fecha_entrega)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(adenda.id);
                          }}
                          className="text-primary hover:text-primary-hover mr-4"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdendasView;

