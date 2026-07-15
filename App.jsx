import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login.jsx';
import OtpVerify from './pages/OtpVerify.jsx';
import Register from './pages/Register.jsx';
import RetailerLayout from './pages/RetailerLayout.jsx';
import RetailerDashboard from './pages/RetailerDashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import NewPanApplication from './pages/NewPanApplication.jsx';
import CorrectionApplication from './pages/CorrectionApplication.jsx';
import ApplicationList from './pages/ApplicationList.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRetailers from './pages/AdminRetailers.jsx';
import AdminApplications from './pages/AdminApplications.jsx';

function RequireAuth({ role, children }) {
  const token = localStorage.getItem('token');
  const storedRole = localStorage.getItem('role');
  if (!token || storedRole !== role) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Retailer auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<OtpVerify />} />
        <Route path="/register" element={<Register />} />

        {/* Retailer app */}
        <Route
          path="/app"
          element={
            <RequireAuth role="retailer">
              <RetailerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<RetailerDashboard />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="applications" element={<ApplicationList />} />
          <Route path="applications/new-pan" element={<NewPanApplication />} />
          <Route path="applications/correction" element={<CorrectionApplication />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="retailers" element={<AdminRetailers />} />
          <Route path="applications" element={<AdminApplications />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
