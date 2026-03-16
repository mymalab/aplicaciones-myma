import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAreas } from './useAreas';
import { AreaId, AREAS } from '@contracts/areas';

interface AreaSelectorProps {
  className?: string;
}

const AreaSelector: React.FC<AreaSelectorProps> = ({ className = '' }) => {
  const { areas, loading, getAreaInfo } = useAreas();
  const { areaId: currentAreaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Si solo hay una área, no mostrar selector
  if (areas.length <= 1) {
    return null;
  }

  const currentArea = currentAreaId ? getAreaInfo(currentAreaId as AreaId) : null;

  const handleAreaSelect = (areaId: AreaId) => {
    setIsOpen(false);
    // Navegar a la primera ruta del área (se puede personalizar)
    navigate(`/app/area/${areaId}`);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
      >
        {currentArea ? (
          <>
            <span className="material-symbols-outlined text-lg">{currentArea.icon}</span>
            <span className="font-medium text-[#111318]">{currentArea.displayName}</span>
          </>
        ) : (
          <span className="text-gray-500">Seleccionar área</span>
        )}
        <span className="material-symbols-outlined text-sm text-gray-400">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="p-2">
            {areas.map((areaId) => {
              const area = getAreaInfo(areaId);
              const isActive = currentAreaId === areaId;
              
              return (
                <button
                  key={areaId}
                  onClick={() => handleAreaSelect(areaId)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-50 text-[#111318]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{area.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{area.displayName}</p>
                    {area.description && (
                      <p className="text-xs text-gray-500">{area.description}</p>
                    )}
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-primary text-sm">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaSelector;











