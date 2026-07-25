const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpay');

const router = express.Router();

// --- Get wallet balance + recent transactions ---
router.get('/', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const retailerResult = await db.query('SELECT wallet_balance FROM retailers WHERE id = $1', [req.user.id]);
    const transactionsResult = await db.query(
      'SELECT * FROM wallet_transactions WHERE retailer_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ balance: retailerResult.rows[0].wallet_balance, transactions: transactionsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load wallet' });
  }
});

// --- Create a Razorpay order for wallet top-up ---
router.post('/topup/order', requireAuth, requireRole('retailer'), async (req, res) => {
  const { amount_rupees } = req.body;
  if (!amount_rupees || amount_rupees < 1) {
    return res.status(400).json({ error: 'Enter a valid top-up amount' });
  }

  try {
    const order = await createOrder(amount_rupees, `topup_${req.user.id}_${Date.now()}`);
    await db.query(
      'INSERT INTO razorpay_orders (id, retailer_id, amount, status) VALUES ($1, $2, $3, $4)',
      [order.id, req.user.id, order.amount, 'created']
    );

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment order' });
  }
});

// --- Verify payment after Razorpay Checkout completes on the frontend ---
router.post('/topup/verify', requireAuth, requireRole('retailer'), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const valid = verifyPaymentSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) return res.status(400).json({ error: 'Payment verification failed' });

  const client = await db.connect();
  try {
    const orderResult = await client.query('SELECT * FROM razorpay_orders WHERE id = $1', [razorpay_order_id]);
    const order = orderResult.rows[0];
    if (!order || order.retailer_id !== req.user.id) {
      return res.status(400).json({ error: 'Order mismatch' });
    }
    if (order.status === 'paid') {
      return res.json({ message: 'Already credited' }); // idempotent
    }

    const retailerResult = await client.query('SELECT wallet_balance FROM retailers WHERE id = $1', [req.user.id]);
    const newBalance = retailerResult.rows[0].wallet_balance + order.amount;

    await client.query('BEGIN');
    await client.query('UPDATE retailers SET wallet_balance = $1 WHERE id = $2', [newBalance, req.user.id]);
    await client.query('UPDATE razorpay_orders SET status = $1 WHERE id = $2', ['paid', order.id]);
    await client.query(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES ($1, $2, 'credit', $3, 'topup', $4, $5)`,
      [uuidv4(), req.user.id, order.amount, razorpay_payment_id, newBalance]
    );
    await client.query('COMMIT');

    res.json({ message: 'Wallet credited', balance: newBalance });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    res.status(500).json({ error: 'Could not verify payment' });
  } finally {
    client.release();
  }
});

// --- Razorpay webhook (durable fallback) ---
router.post('/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const valid = verifyWebhookSignature(req.body, signature);
  if (!valid) return res.status(400).send('Invalid signature');

  const event = JSON.parse(req.body.toString());
  // TODO: handle event.event === 'payment.captured' as a fallback credit path,
  // mirroring the logic in /topup/verify, keyed off event.payload.payment.entity.order_id.

  res.json({ received: true });
});

module.exports = router;