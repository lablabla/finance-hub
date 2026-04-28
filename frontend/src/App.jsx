import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Checklist from './pages/Checklist.jsx';
import Upload from './pages/Upload.jsx';
import Insights from './pages/Insights.jsx';
import './App.css';

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
