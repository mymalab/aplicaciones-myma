import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import AppContent from './components/AppContent';
import './utils/testSupabase'; // Script de diagnóstico disponible en consola

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: /login */}
        <Route path="/login" element={<Login />} />
        
        {/* Ruta callback: /auth/callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Rutas privadas: /app/* */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />
        
        {/* Redirigir la ruta raíz a /app (que luego redirige a /app/requests) */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        
        {/* Cualquier otra ruta redirige a /app */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
