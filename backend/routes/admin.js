const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// --- List retailers ---
router.get('/retailers', (req, res) => {
  const retailers = db
    .prepare('SELECT id, business_name, owner_name, email, mobile, status, wallet_balance, created_at FROM retailers ORDER BY created_at DESC')
    .all();
  res.json({ retailers });
});

// --- Approve / suspend a retailer ---
router.patch('/retailers/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE retailers SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: `Retailer status set to ${status}` });
});

// --- Manual wallet adjustment (e.g. cash settlement, refund) ---
router.post('/retailers/:id/wallet-adjust', (req, res) => {
  const { amount_rupees, type, reason } = req.body; // type: credit | debit
  if (!amount_rupees || amount_rupees <= 0 || !['credit', 'debit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid adjustment' });
  }
  const amountPaise = Math.round(amount_rupees * 100);
  const retailer = db.prepare('SELECT wallet_balance FROM retailers WHERE id = ?').get(req.params.id);
  if (!retailer) return res.status(404).json({ error: 'Retailer not found' });

  const newBalance = type === 'credit'
    ? retailer.wallet_balance + amountPaise
    : retailer.wallet_balance - amountPaise;
  if (newBalance < 0) return res.status(400).json({ error: 'Balance cannot go negative' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE retailers SET wallet_balance = ? WHERE id = ?').run(newBalance, req.params.id);
    db.prepare(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES (?, ?, ?, ?, 'adjustment', ?, ?)`
    ).run(uuidv4(), req.params.id, type, amountPaise, reason || 'manual adjustment', newBalance);
  });
  tx();

  res.json({ message: 'Wallet adjusted', balance: newBalance });
});

// --- Fee configuration ---
router.get('/fees', (req, res) => {
  res.json({ fees: db.prepare('SELECT * FROM fee_config').all() });
});

router.patch('/fees/:application_type', (req, res) => {
  const { retailer_fee_rupees } = req.body;
  if (!retailer_fee_rupees || retailer_fee_rupees <= 0) {
    return res.status(400).json({ error: 'Invalid fee' });
  }
  db.prepare('UPDATE fee_config SET retailer_fee = ? WHERE application_type = ?').run(
    Math.round(retailer_fee_rupees * 100),
    req.params.application_type
  );
  res.json({ message: 'Fee updated' });
});

// --- All applications across retailers, with filters ---
router.get('/applications', (req, res) => {
  const { status, application_type } = req.query;
  let query = `
    SELECT a.*, r.business_name, r.owner_name
    FROM applications a JOIN retailers r ON a.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND a.status = ?'; params.push(status); }
  if (application_type) { query += ' AND a.application_type = ?'; params.push(application_type); }
  query += ' ORDER BY a.created_at DESC';

  res.json({ applications: db.prepare(query).all(...params) });
});

// --- Update application status (e.g. after manual NSDL processing) ---
router.patch('/applications/:id/status', (req, res) => {
  const { status, nsdl_ack_number, remarks } = req.body;
  if (!['submitted', 'under_process', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare(
    `UPDATE applications SET status = ?, nsdl_ack_number = COALESCE(?, nsdl_ack_number),
     remarks = COALESCE(?, remarks), updated_at = datetime('now') WHERE id = ?`
  ).run(status, nsdl_ack_number, remarks, req.params.id);
  res.json({ message: 'Application status updated' });
});

// --- Dashboard summary ---
router.get('/summary', (req, res) => {
  const retailerCount = db.prepare("SELECT COUNT(*) c FROM retailers WHERE status = 'active'").get().c;
  const pendingRetailers = db.prepare("SELECT COUNT(*) c FROM retailers WHERE status = 'pending'").get().c;
  const applicationsByStatus = db
    .prepare('SELECT status, COUNT(*) c FROM applications GROUP BY status')
    .all();
  const totalWalletBalance = db.prepare('SELECT SUM(wallet_balance) s FROM retailers').get().s || 0;

  res.json({ retailerCount, pendingRetailers, applicationsByStatus, totalWalletBalance });
});

module.exports = router;