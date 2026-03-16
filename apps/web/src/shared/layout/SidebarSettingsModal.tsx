import React, { useEffect, useState } from 'react';
import PermissionsDebug from '@shared/rbac/PermissionsDebug';
import AccessRequestPanel from '@shared/rbac/AccessRequestPanel';

interface SidebarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarSettingsModal: React.FC<SidebarSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'debug' | 'request'>('debug');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('debug');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />

      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-[#111318]">Configuracion</h2>
              <p className="text-sm text-[#616f89] mt-1">
                {activeTab === 'debug'
                  ? 'Revisa los permisos del usuario sin tener el panel debug visible en toda la pantalla.'
                  : 'Solicita acceso a otros modulos y revisa el estado de tus solicitudes.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="px-6 pt-4 border-b border-gray-100">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('debug')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'debug'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[#616f89] hover:text-[#111318]'
                }`}
              >
                Debug
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'request'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[#616f89] hover:text-[#111318]'
                }`}
              >
                Solicitar permisos
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-162px)]">
            {activeTab === 'debug' ? (
              <PermissionsDebug variant="inline" defaultExpanded />
            ) : (
              <AccessRequestPanel />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarSettingsModal;
