import React, { useState, useRef, useEffect } from 'react';
import { TipoAdenda, TIPOS_ADENDA, getTipoAdendaById } from '../constants';

interface TipoAdendaSelectorProps {
  value?: TipoAdenda;
  onChange?: (tipo: TipoAdenda) => void;
  className?: string;
  disabled?: boolean;
}

const TipoAdendaSelector: React.FC<TipoAdendaSelectorProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
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

  const currentTipo = value ? getTipoAdendaById(value) : null;

  const handleTipoSelect = (tipo: TipoAdenda) => {
    setIsOpen(false);
    if (onChange) {
      onChange(tipo);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentTipo ? (
          <>
            <span className="material-symbols-outlined text-lg" style={{ color: currentTipo.color }}>
              {currentTipo.icon}
            </span>
            <span className="font-medium text-[#111318]">{currentTipo.displayName}</span>
          </>
        ) : (
          <span className="text-gray-500">Seleccionar tipo de adenda</span>
        )}
        <span className="material-symbols-outlined text-sm text-gray-400">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="p-2">
            {Object.values(TIPOS_ADENDA).map((tipo) => {
              const isActive = value === tipo.id;

              return (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => handleTipoSelect(tipo.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-50 text-[#111318]'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ color: tipo.color }}
                  >
                    {tipo.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{tipo.displayName}</p>
                    {tipo.description && (
                      <p className="text-xs text-gray-500">{tipo.description}</p>
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

export default TipoAdendaSelector;

