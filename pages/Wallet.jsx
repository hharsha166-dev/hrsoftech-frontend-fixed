import React, { useEffect, useState } from 'react';
import api from '../api';

// Loads the Razorpay Checkout script once.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  function refresh() {
    api.get('/wallet').then((res) => setWallet(res.data));
  }

  useEffect(refresh, []);

  async function handleTopup() {
    setError('');
    if (!amount || Number(amount) < 1) {
      setError('Enter a valid amount');
      return;
    }
    setProcessing(true);

    const scriptOk = await loadRazorpayScript();
    if (!scriptOk) {
      setError('Could not load payment gateway. Check your internet connection.');
      setProcessing(false);
      return;
    }

    try {
      const { data: order } = await api.post('/wallet/topup/order', { amount_rupees: Number(amount) });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'HRSOFTECH SOLUTION',
        description: 'Wallet Top-up',
        order_id: order.order_id,
        // Supports UPI (GPay/PhonePe), cards, netbanking, and QR — Razorpay Checkout
        // handles the method selection UI automatically.
        handler: async (response) => {
          try {
            await api.post('/wallet/topup/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setAmount('');
            refresh();
          } catch (err) {
            setError('Payment received but verification failed. Contact support with your payment ID.');
          } finally {
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
        theme: { color: '#0e7c7b' },
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start payment');
      setProcessing(false);
    }
  }

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>Wallet</h2>

      <div className="card">
        <div className="stat-card" style={{ border: 'none', padding: 0 }}>
          <div className="value">₹{wallet ? (wallet.balance / 100).toFixed(2) : '—'}</div>
          <div className="label">Current Balance</div>
        </div>
      </div>

      <div className="card">
        <h3>Add Money</h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="field" style={{ maxWidth: 240 }}>
          <label>Amount (₹)</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleTopup} disabled={processing}>
          {processing ? 'Processing...' : 'Add Money via Razorpay'}
        </button>
        <p className="helper-text">
          Supports UPI (GPay, PhonePe), QR code, cards, and netbanking through Razorpay Checkout.
        </p>
      </div>

      <div className="card">
        <h3>Transaction History</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Reason</th><th>Amount</th><th>Balance After</th></tr>
          </thead>
          <tbody>
            {wallet?.transactions.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td style={{ color: t.type === 'credit' ? 'var(--success)' : 'var(--danger)' }}>
                  {t.type}
                </td>
                <td>{t.reason.replace('_', ' ')}</td>
                <td>₹{(t.amount / 100).toFixed(2)}</td>
                <td>₹{(t.balance_after / 100).toFixed(2)}</td>
              </tr>
            ))}
            {(!wallet || wallet.transactions.length === 0) && (
              <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
