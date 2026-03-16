import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProveedoresActuales from './pages/ProveedoresActuales';
import NuevoProveedor from './pages/NuevoProveedor';
import ProveedorDetalle from './pages/ProveedorDetalle';
import NuevoServicio from './pages/NuevoServicio';
import EvaluacionServicios from './pages/EvaluacionServicios';
import EvaluacionServicios2025 from './pages/EvaluacionServicios2025';
import Dashboard from './pages/Dashboard';
import ServiciosEvaluados from './pages/ServiciosEvaluados';
import EvaluacionesTabla from './pages/EvaluacionesTabla';
import ServiciosCatalogoGestion from './pages/ServiciosCatalogoGestion';
import EspecialidadesCatalogoGestion from './pages/EspecialidadesCatalogoGestion';

/**
 * Componente que maneja las rutas del área de Proveedores
 */
const ProveedoresRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="actuales" element={<ProveedoresActuales />} />
      <Route path="actuales/nuevo" element={<NuevoProveedor />} />
      <Route path="actuales/:id" element={<ProveedorDetalle />} />
      <Route path="actuales/:id/editar" element={<NuevoProveedor />} />
      <Route path="actuales/:id/servicios/nuevo" element={<NuevoServicio />} />
      <Route path="evaluacion" element={<EvaluacionServicios />} />
      <Route path="evaluacion-2025" element={<EvaluacionServicios2025 />} />
      <Route path="servicios-evaluados" element={<ServiciosEvaluados />} />
      <Route path="evaluaciones-tabla" element={<EvaluacionesTabla />} />
      <Route path="catalogo-servicios" element={<ServiciosCatalogoGestion />} />
      <Route path="catalogo-especialidades" element={<EspecialidadesCatalogoGestion />} />
      <Route path="reportes" element={<div className="p-8">Reportes (por implementar)</div>} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default ProveedoresRoutes;
