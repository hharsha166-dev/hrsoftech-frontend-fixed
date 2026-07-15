import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/admin/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Admin Login</h1>
        <p className="subtitle">HRSOFTECH SOLUTION — Control Panel</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary">Login</button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          <Link to="/login">Retailer login</Link>
        </p>
      </div>
    </div>
  );
}
