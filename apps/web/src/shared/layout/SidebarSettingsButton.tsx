import React from 'react';

interface SidebarSettingsButtonProps {
  onClick: () => void;
}

const SidebarSettingsButton: React.FC<SidebarSettingsButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors relative"
      title="Configuracion"
    >
      <span className="material-symbols-outlined text-2xl pointer-events-none">settings</span>
      <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
        Configuracion
      </span>
    </button>
  );
};

export default SidebarSettingsButton;
