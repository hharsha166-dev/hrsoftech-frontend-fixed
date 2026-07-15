import React, { useEffect, useState } from 'react';
import api from '../api';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/admin/summary').then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <p>Loading...</p>;

  const statusMap = Object.fromEntries(summary.applicationsByStatus.map((s) => [s.status, s.c]));

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>Overview</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="value">{summary.retailerCount}</div>
          <div className="label">Active Retailers</div>
        </div>
        <div className="stat-card">
          <div className="value">{summary.pendingRetailers}</div>
          <div className="label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="value">₹{(summary.totalWalletBalance / 100).toFixed(2)}</div>
          <div className="label">Total Wallet Float</div>
        </div>
        <div className="stat-card">
          <div className="value">{statusMap.submitted || 0}</div>
          <div className="label">Awaiting Processing</div>
        </div>
      </div>

      <div className="card">
        <h3>Applications by Status</h3>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            {summary.applicationsByStatus.map((s) => (
              <tr key={s.status}>
                <td><span className={`badge badge-${s.status}`}>{s.status.replace('_', ' ')}</span></td>
                <td>{s.c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
