import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import api from '../api';

export default function OtpVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { retailer_id, two_fa_method } = location.state || {};

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!retailer_id) return <Navigate to="/login" replace />;

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { retailer_id, code });
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', 'retailer');
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');
    try {
      await api.post('/auth/resend-otp', { retailer_id });
      setInfo('A new OTP has been sent.');
    } catch (err) {
      setError('Could not resend OTP');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify OTP</h1>
        <p className="subtitle">
          A 6-digit code was sent via {two_fa_method === 'mobile' ? 'SMS' : 'email'}.
        </p>

        {error && <div className="error-banner">{error}</div>}
        {info && <p style={{ color: '#16a34a', fontSize: 13 }}>{info}</p>}

        <form onSubmit={handleVerify}>
          <div className="field">
            <label>One-Time Password</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          <button onClick={handleResend} className="btn btn-secondary" type="button">
            Resend OTP
          </button>
        </p>
      </div>
    </div>
  );
}
