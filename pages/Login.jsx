import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      navigate('/verify-otp', {
        state: { retailer_id: data.retailer_id, two_fa_method: data.two_fa_method },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>HRSOFTECH SOLUTION</h1>
        <p className="subtitle">Retailer Login — PAN Application Portal</p>

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
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          New retailer? <Link to="/register">Register here</Link>
        </p>
        <p style={{ marginTop: 8, fontSize: 12, textAlign: 'center' }}>
          <Link to="/admin/login">Admin login</Link>
        </p>
      </div>
    </div>
  );
}
