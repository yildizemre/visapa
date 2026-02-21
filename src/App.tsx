import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CustomerAnalytics from './components/CustomerAnalytics';
import StaffManagement from './components/StaffManagement';
import Heatmaps from './components/Heatmaps';
import QueueAnalysis from './components/QueueAnalysis';

import ReportAnalytics from './components/ReportAnalytics';
import Settings from './components/Settings';
import AdminGuard from './components/AdminGuard';
import ActivityLogs from './components/ActivityLogs';
import Chat from './components/Chat';
import Ticket from './components/Ticket';
import AdminTickets from './components/AdminTickets';
import AdminHealthOverview from './components/AdminHealthOverview';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sayfa yüklendiğinde token varsa giriş yapılmış say
  useEffect(() => {
    const token = localStorage.getItem('token')?.trim();
    if (token) setIsAuthenticated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <LanguageProvider>
      <Router>
        <div className="h-screen min-h-0 flex flex-col bg-slate-900 overflow-hidden">
          <AnimatePresence mode="wait">
            {!isAuthenticated ? (
              <LoginPage onLogin={() => setIsAuthenticated(true)} />
            ) : (
              <Layout onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/customer-analytics" element={<CustomerAnalytics />} />
                  <Route path="/staff-management" element={<StaffManagement />} />
                  <Route path="/heatmaps" element={<Heatmaps />} />
                  <Route path="/queue-analysis" element={<QueueAnalysis />} />

                  <Route path="/report-analytics" element={<ReportAnalytics />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/tickets" element={<Ticket />} />
                  <Route path="/admin/users" element={<AdminGuard />} />
                  <Route path="/admin/tickets" element={<AdminTickets />} />
                  <Route path="/admin/activity-logs" element={<ActivityLogs />} />
                  <Route path="/admin/health" element={<AdminHealthOverview />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            )}
          </AnimatePresence>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;