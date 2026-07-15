import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/admin/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>HRSOFTECH SOLUTION<br /><span style={{ fontSize: 11, opacity: 0.7 }}>Admin Panel</span></h2>
        <nav>
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/retailers">Retailers</NavLink>
          <NavLink to="/admin/applications">Applications</NavLink>
          <a href="#" onClick={logout}>Logout</a>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
