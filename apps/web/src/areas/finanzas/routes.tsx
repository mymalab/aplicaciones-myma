import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

/**
 * Componente que maneja las rutas del área de Finanzas
 * 
 * Este es un ejemplo mínimo. Reemplaza con tus propias páginas.
 */
const FinanzasRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <div className="p-8">
            <h1 className="text-2xl font-bold text-[#111318] mb-4">Finanzas</h1>
            <p className="text-gray-600">Esta es el área de Finanzas. Agrega tus páginas aquí.</p>
          </div>
        }
      />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default FinanzasRoutes;











