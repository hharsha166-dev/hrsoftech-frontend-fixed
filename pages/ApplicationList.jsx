import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ApplicationList() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/applications').then((res) => setApplications(res.data.applications));
  }, []);

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>My Applications</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Applicant</th><th>Type</th><th>Status</th><th>Fee Charged</th>
              <th>NSDL Ack No.</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>{a.application_type === 'new_pan' ? 'New PAN' : 'Correction'}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                <td>{a.fee_charged ? `₹${(a.fee_charged / 100).toFixed(2)}` : '—'}</td>
                <td>{a.nsdl_ack_number || '—'}</td>
                <td>{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
