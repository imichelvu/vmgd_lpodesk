import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_IDS } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import Overtime from './pages/Overtime';
import Faq from './pages/Faq';
import SupervisorView from './pages/SupervisorView';
import DirectorView from './pages/DirectorView';
import AdminView from './pages/AdminView';
import ApplicationDetail from './pages/ApplicationDetail';
import ApplicationPrint from './pages/ApplicationPrint';
import Profile from './pages/Profile';
import AppLoader from './components/AppLoader';

function PrivateRoute({ children, allowedRoleIds }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader message="Loading VMGD LeaveDesk..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoleIds && !allowedRoleIds.some((rid) => (user.role_ids || []).includes(rid))) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="apply" element={<NewApplication />} />
        <Route path="overtime" element={<Overtime />} />
        <Route path="faq" element={<Faq />} />
        <Route path="application/:id" element={<ApplicationDetail />} />
        <Route path="application/:id/print" element={<ApplicationPrint />} />
        <Route
          path="supervisor"
          element={
            <PrivateRoute allowedRoleIds={[ROLE_IDS.PSO, ROLE_IDS.Manager]}>
              <SupervisorView />
            </PrivateRoute>
          }
        />
        <Route
          path="director"
          element={
            <PrivateRoute allowedRoleIds={[ROLE_IDS.Director]}>
              <DirectorView />
            </PrivateRoute>
          }
        />
        <Route
          path="settings"
          element={
            <PrivateRoute allowedRoleIds={[ROLE_IDS.Admin]}>
              <AdminView />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
