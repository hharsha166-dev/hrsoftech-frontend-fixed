import React, { useEffect, useState } from 'react';
import api from '../api';

export default function AdminRetailers() {
  const [retailers, setRetailers] = useState([]);
  const [adjusting, setAdjusting] = useState(null); // retailer id
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('credit');

  function refresh() {
    api.get('/admin/retailers').then((res) => setRetailers(res.data.retailers));
  }

  useEffect(refresh, []);

  async function setStatus(id, status) {
    await api.patch(`/admin/retailers/${id}/status`, { status });
    refresh();
  }

  async function submitAdjustment(id) {
    if (!adjustAmount || Number(adjustAmount) <= 0) return;
    await api.post(`/admin/retailers/${id}/wallet-adjust`, {
      amount_rupees: Number(adjustAmount),
      type: adjustType,
      reason: 'Manual admin adjustment',
    });
    setAdjusting(null);
    setAdjustAmount('');
    refresh();
  }

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>Retailers</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Business</th><th>Owner</th><th>Contact</th><th>Status</th>
              <th>Wallet</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {retailers.map((r) => (
              <tr key={r.id}>
                <td>{r.business_name}</td>
                <td>{r.owner_name}</td>
                <td>{r.email}<br />{r.mobile}</td>
                <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                <td>₹{(r.wallet_balance / 100).toFixed(2)}</td>
                <td>
                  {r.status !== 'active' && (
                    <button className="btn btn-secondary" style={{ marginRight: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => setStatus(r.id, 'active')}>
                      Activate
                    </button>
                  )}
                  {r.status === 'active' && (
                    <button className="btn btn-secondary" style={{ marginRight: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => setStatus(r.id, 'suspended')}>
                      Suspend
                    </button>
                  )}
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setAdjusting(r.id)}>
                    Adjust Wallet
                  </button>

                  {adjusting === r.id && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} style={{ fontSize: 12 }}>
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                      <input
                        type="number"
                        placeholder="₹ amount"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        style={{ width: 90, fontSize: 12, padding: 4 }}
                      />
                      <button className="btn btn-primary" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => submitAdjustment(r.id)}>
                        Apply
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {retailers.length === 0 && (
              <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>No retailers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
