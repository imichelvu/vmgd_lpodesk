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
import SupervisorView from './pages/SupervisorView';
import DirectorView from './pages/DirectorView';
import AdminView from './pages/AdminView';
import ApplicationDetail from './pages/ApplicationDetail';

function PrivateRoute({ children, allowedRoleIds }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-main">Loading...</div>;
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
        <Route path="apply" element={<NewApplication />} />
        <Route path="application/:id" element={<ApplicationDetail />} />
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
          path="admin"
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
