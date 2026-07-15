import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({
    business_name: '', owner_name: '', email: '', mobile: '', password: '', two_fa_method: 'mobile',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      setSuccess('Registration received. An admin will review and activate your account.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ width: 440 }}>
        <h1>Retailer Registration</h1>
        <p className="subtitle">HRSOFTECH SOLUTION — PAN Application Portal</p>

        {error && <div className="error-banner">{error}</div>}
        {success && <p style={{ color: '#16a34a', fontSize: 13 }}>{success}</p>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Business Name</label>
              <input value={form.business_name} onChange={(e) => update('business_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Owner Name</label>
              <input value={form.owner_name} onChange={(e) => update('owner_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
            </div>
            <div className="field">
              <label>2FA Delivery Method</label>
              <select value={form.two_fa_method} onChange={(e) => update('two_fa_method', e.target.value)}>
                <option value="mobile">SMS to mobile</option>
                <option value="email">Email</option>
              </select>
            </div>
            <button className="btn btn-primary">Register</button>
          </form>
        )}

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
