import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function RetailerLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>HRSOFTECH SOLUTION</h2>
        <nav>
          <NavLink to="/app" end>Dashboard</NavLink>
          <NavLink to="/app/wallet">Wallet</NavLink>
          <NavLink to="/app/applications">My Applications</NavLink>
          <NavLink to="/app/applications/new-pan">New PAN Application</NavLink>
          <NavLink to="/app/applications/correction">Correction Application</NavLink>
          <a href="#" onClick={logout}>Logout</a>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
