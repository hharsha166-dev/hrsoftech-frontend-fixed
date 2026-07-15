import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function RetailerDashboard() {
  const [wallet, setWallet] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/wallet').then((res) => setWallet(res.data));
    api.get('/applications').then((res) => setApplications(res.data.applications.slice(0, 5)));
  }, []);

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>Dashboard</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="value">₹{wallet ? (wallet.balance / 100).toFixed(2) : '—'}</div>
          <div className="label">Wallet Balance</div>
        </div>
        <div className="stat-card">
          <div className="value">{applications.length}</div>
          <div className="label">Recent Applications</div>
        </div>
        <div className="stat-card">
          <div className="value">{counts.approved || 0}</div>
          <div className="label">Approved</div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Actions</h3>
        <Link to="/app/applications/new-pan" className="btn btn-primary" style={{ marginRight: 12, width: 'auto' }}>
          + New PAN Application
        </Link>
        <Link to="/app/applications/correction" className="btn btn-secondary">
          + Correction Application
        </Link>
      </div>

      <div className="card">
        <h3>Recent Applications</h3>
        <table>
          <thead>
            <tr><th>Applicant</th><th>Type</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>{a.application_type === 'new_pan' ? 'New PAN' : 'Correction'}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                <td>{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
