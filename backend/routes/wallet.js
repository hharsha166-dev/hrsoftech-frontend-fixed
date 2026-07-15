const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpay');

const router = express.Router();

// --- Get wallet balance + recent transactions ---
router.get('/', requireAuth, requireRole('retailer'), (req, res) => {
  const retailer = db.prepare('SELECT wallet_balance FROM retailers WHERE id = ?').get(req.user.id);
  const transactions = db
    .prepare('SELECT * FROM wallet_transactions WHERE retailer_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);

  res.json({ balance: retailer.wallet_balance, transactions });
});

// --- Create a Razorpay order for wallet top-up ---
router.post('/topup/order', requireAuth, requireRole('retailer'), async (req, res) => {
  const { amount_rupees } = req.body;
  if (!amount_rupees || amount_rupees < 1) {
    return res.status(400).json({ error: 'Enter a valid top-up amount' });
  }

  try {
    const order = await createOrder(amount_rupees, `topup_${req.user.id}_${Date.now()}`);
    db.prepare(
      'INSERT INTO razorpay_orders (id, retailer_id, amount, status) VALUES (?, ?, ?, ?)'
    ).run(order.id, req.user.id, order.amount, 'created');

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID, // frontend needs this to open Checkout
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment order' });
  }
});

// --- Verify payment after Razorpay Checkout completes on the frontend ---
router.post('/topup/verify', requireAuth, requireRole('retailer'), (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const valid = verifyPaymentSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

  const order = db.prepare('SELECT * FROM razorpay_orders WHERE id = ?').get(razorpay_order_id);
  if (!order || order.retailer_id !== req.user.id) {
    return res.status(400).json({ error: 'Order mismatch' });
  }
  if (order.status === 'paid') {
    return res.json({ message: 'Already credited' }); // idempotent
  }

  const retailer = db.prepare('SELECT wallet_balance FROM retailers WHERE id = ?').get(req.user.id);
  const newBalance = retailer.wallet_balance + order.amount;

  const tx = db.transaction(() => {
    db.prepare('UPDATE retailers SET wallet_balance = ? WHERE id = ?').run(newBalance, req.user.id);
    db.prepare('UPDATE razorpay_orders SET status = ? WHERE id = ?').run('paid', order.id);
    db.prepare(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES (?, ?, 'credit', ?, 'topup', ?, ?)`
    ).run(uuidv4(), req.user.id, order.amount, razorpay_payment_id, newBalance);
  });
  tx();

  res.json({ message: 'Wallet credited', balance: newBalance });
});

// --- Razorpay webhook (durable fallback — configure this URL in your Razorpay dashboard) ---
// Mounted with express.raw() in server.js so we can verify the raw body signature.
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const valid = verifyWebhookSignature(req.body, signature);
  if (!valid) return res.status(400).send('Invalid signature');

  const event = JSON.parse(req.body.toString());
  // TODO: handle event.event === 'payment.captured' as a fallback credit path,
  // mirroring the logic in /topup/verify, keyed off event.payload.payment.entity.order_id.
  // Left as a stub since the exact handling depends on your reconciliation preferences.

  res.json({ received: true });
});

module.exports = router;