import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdendasView from './pages/AdendasView';
import AdendaForm from './pages/AdendaForm';
import AdendaDetailView from './pages/AdendaDetailView';
import GestionAdendaView from './pages/GestionAdendaView';
import PreguntaDetailView from './pages/PreguntaDetailView';
import ReporteView from './pages/ReporteView';

/**
 * Componente que maneja las rutas del área de Adendas
 */
const AdendasRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="" element={<AdendasView />} />
      <Route path="create" element={<AdendaForm />} />
      <Route path="edit/:id" element={<AdendaForm />} />
      <Route path="detail/:codigoMyma" element={<AdendaDetailView />} />
      <Route path="gestion/:codigoMyma" element={<GestionAdendaView />} />
      <Route path="gestion/:codigoMyma/pregunta/:preguntaId" element={<PreguntaDetailView />} />
      <Route path="reporte" element={<ReporteView />} />
      <Route path="/" element={<Navigate to="" replace />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default AdendasRoutes;

