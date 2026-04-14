import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NotebookLMExpertChatView from './pages/NotebookLMExpertChatView';
import NotebookLMView from './pages/NotebookLMView';

const NotebookLMRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="" element={<NotebookLMView />} />
      <Route path="create" element={<NotebookLMView />} />
      <Route path="chat" element={<NotebookLMExpertChatView />} />
      <Route path="/" element={<Navigate to="" replace />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default NotebookLMRoutes;
