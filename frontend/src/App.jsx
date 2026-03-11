/**
 * Author: Igor Michel
 * Purpose: Define application routes and role-based access control for LPODesk.
 * Last updated: 2026-03-11
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_IDS } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import CreateRequest from './pages/CreateRequest';
import MyRequests from './pages/MyRequests';
import RequestDetails from './pages/RequestDetails';
import PendingApprovals from './pages/PendingApprovals';
import AdminView from './pages/AdminView';
import Profile from './pages/Profile';
import Faq from './pages/Faq';
import AppLoader from './components/AppLoader';

function PrivateRoute({ children, allowedRoleIds }) {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader message="Loading LPODesk..." />;
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
        <Route path="requests/new" element={<CreateRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="faq" element={<Faq />} />
        <Route
          path="approvals"
          element={
            <PrivateRoute allowedRoleIds={[ROLE_IDS.Manager, ROLE_IDS.ICTManager, ROLE_IDS.Procurement, ROLE_IDS.Director]}>
              <PendingApprovals />
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
