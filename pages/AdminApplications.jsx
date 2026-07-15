import React, { useEffect, useState } from 'react';
import api from '../api';

const STATUSES = ['submitted', 'under_process', 'approved', 'rejected'];

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [ackNumber, setAckNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  function refresh() {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/admin/applications', { params }).then((res) => setApplications(res.data.applications));
  }

  useEffect(refresh, [statusFilter]);

  async function submitStatusUpdate(id) {
    await api.patch(`/admin/applications/${id}/status`, {
      status: newStatus,
      nsdl_ack_number: ackNumber || undefined,
      remarks: remarks || undefined,
    });
    setEditing(null);
    setAckNumber('');
    setRemarks('');
    refresh();
  }

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>Applications</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>Filter by status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: 6 }}>
          <option value="">All</option>
          {['draft', ...STATUSES].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Applicant</th><th>Retailer</th><th>Type</th><th>Status</th>
              <th>NSDL Ack</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>{a.business_name}</td>
                <td>{a.application_type === 'new_pan' ? 'New PAN' : 'Correction'}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span></td>
                <td>{a.nsdl_ack_number || '—'}</td>
                <td>{new Date(a.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setEditing(a.id); setNewStatus(a.status); }}>
                    Update
                  </button>
                  {editing === a.id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 220 }}>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ fontSize: 12, padding: 4 }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                      <input placeholder="NSDL ack number" value={ackNumber} onChange={(e) => setAckNumber(e.target.value)} style={{ fontSize: 12, padding: 4 }} />
                      <input placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ fontSize: 12, padding: 4 }} />
                      <button className="btn btn-primary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => submitStatusUpdate(a.id)}>
                        Save
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr><td colSpan={7} style={{ color: 'var(--text-muted)' }}>No applications found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
