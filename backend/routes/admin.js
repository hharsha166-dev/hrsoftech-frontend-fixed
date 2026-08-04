const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// --- List retailers ---
router.get('/retailers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, business_name, owner_name, email, mobile, status, wallet_balance, created_at FROM retailers ORDER BY created_at DESC'
    );
    res.json({ retailers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load retailers' });
  }
});

// --- Approve / suspend a retailer ---
router.patch('/retailers/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await db.query('UPDATE retailers SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: `Retailer status set to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update status' });
  }
});

// --- Manual wallet adjustment ---
router.post('/retailers/:id/wallet-adjust', async (req, res) => {
  const { amount_rupees, type, reason } = req.body;
  if (!amount_rupees || amount_rupees <= 0 || !['credit', 'debit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid adjustment' });
  }
  const amountPaise = Math.round(amount_rupees * 100);

  const client = await db.connect();
  try {
    const retailerResult = await client.query('SELECT wallet_balance FROM retailers WHERE id = $1', [req.params.id]);
    const retailer = retailerResult.rows[0];
    if (!retailer) {
      return res.status(404).json({ error: 'Retailer not found' });
    }

    const newBalance = type === 'credit'
      ? retailer.wallet_balance + amountPaise
      : retailer.wallet_balance - amountPaise;
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Balance cannot go negative' });
    }

    await client.query('BEGIN');
    await client.query('UPDATE retailers SET wallet_balance = $1 WHERE id = $2', [newBalance, req.params.id]);
    await client.query(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES ($1, $2, $3, $4, 'adjustment', $5, $6)`,
      [uuidv4(), req.params.id, type, amountPaise, reason || 'manual adjustment', newBalance]
    );
    await client.query('COMMIT');

    res.json({ message: 'Wallet adjusted', balance: newBalance });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    res.status(500).json({ error: 'Could not adjust wallet' });
  } finally {
    client.release();
  }
});

// --- Fee configuration ---
router.get('/fees', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM fee_config');
    res.json({ fees: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load fees' });
  }
});

router.patch('/fees/:application_type', async (req, res) => {
  const { retailer_fee_rupees } = req.body;
  if (!retailer_fee_rupees || retailer_fee_rupees <= 0) {
    return res.status(400).json({ error: 'Invalid fee' });
  }
  try {
    await db.query('UPDATE fee_config SET retailer_fee = $1 WHERE application_type = $2', [
      Math.round(retailer_fee_rupees * 100),
      req.params.application_type,
    ]);
    res.json({ message: 'Fee updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update fee' });
  }
});

// --- All applications across retailers, with filters ---
router.get('/applications', async (req, res) => {
  const { status, application_type } = req.query;
  let query = `
    SELECT a.*, r.business_name, r.owner_name
    FROM applications a JOIN retailers r ON a.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
  if (application_type) { params.push(application_type); query += ` AND a.application_type = $${params.length}`; }
  query += ' ORDER BY a.created_at DESC';

  try {
    const result = await db.query(query, params);
    res.json({ applications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load applications' });
  }

});

// 👇👇 ಇಲ್ಲೇ paste ಮಾಡಿ

// --- Get single application details ---
router.get('/applications/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, r.business_name, r.owner_name
       FROM applications a
       JOIN retailers r ON a.retailer_id = r.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load application' });
  }
});

// --- Update application status ---
router.patch('/applications/:id/status', async (req, res) => {
  const { status, nsdl_ack_number, remarks } = req.body;
  if (!['submitted', 'under_process', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await db.query(
      `UPDATE applications SET status = $1, nsdl_ack_number = COALESCE($2, nsdl_ack_number),
       remarks = COALESCE($3, remarks), updated_at = NOW() WHERE id = $4`,
      [status, nsdl_ack_number, remarks, req.params.id]
    );
    res.json({ message: 'Application status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update application' });
  }
});

// --- Dashboard summary ---
router.get('/summary', async (req, res) => {
  try {
    const retailerCountResult = await db.query("SELECT COUNT(*)::int c FROM retailers WHERE status = 'active'");
    const pendingRetailersResult = await db.query("SELECT COUNT(*)::int c FROM retailers WHERE status = 'pending'");
    const applicationsByStatusResult = await db.query('SELECT status, COUNT(*)::int c FROM applications GROUP BY status');
    const totalWalletBalanceResult = await db.query('SELECT COALESCE(SUM(wallet_balance), 0)::int s FROM retailers');

    res.json({
      retailerCount: retailerCountResult.rows[0].c,
      pendingRetailers: pendingRetailersResult.rows[0].c,
      applicationsByStatus: applicationsByStatusResult.rows,
      totalWalletBalance: totalWalletBalanceResult.rows[0].s,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load summary' });
  }
});

module.exports = router;