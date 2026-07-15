const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const { issueOtp, verifyOtp } = require('../utils/otp');

const router = express.Router();

// --- Retailer registration ---
// Creates a retailer with status 'pending' — an admin must approve before login works.
router.post('/register', (req, res) => {
  const { business_name, owner_name, email, mobile, password, two_fa_method } = req.body;

  if (!business_name || !owner_name || !email || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = db
    .prepare('SELECT id FROM retailers WHERE email = ? OR mobile = ?')
    .get(email, mobile);
  if (existing) {
    return res.status(409).json({ error: 'Email or mobile already registered' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO retailers (id, business_name, owner_name, email, mobile, password_hash, two_fa_method)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, business_name, owner_name, email, mobile, hash, two_fa_method || 'mobile');

  res.json({
    message: 'Registration received. Your account is pending admin approval.',
    retailer_id: id,
  });
});

// --- Step 1 of login: password check, then issue OTP ---
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const retailer = db.prepare('SELECT * FROM retailers WHERE email = ?').get(email);

  if (!retailer) return res.status(401).json({ error: 'Invalid credentials' });
  if (retailer.status !== 'active') {
    return res.status(403).json({ error: `Account is ${retailer.status}. Contact admin.` });
  }
  if (!bcrypt.compareSync(password, retailer.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const deliverTo = retailer.two_fa_method === 'mobile' ? retailer.mobile : retailer.email;
  issueOtp(retailer.id, 'login', deliverTo, retailer.two_fa_method);

  res.json({
    message: `OTP sent via ${retailer.two_fa_method}`,
    retailer_id: retailer.id,
    two_fa_method: retailer.two_fa_method,
  });
});

// --- Step 2 of login: verify OTP, issue JWT ---
router.post('/verify-otp', (req, res) => {
  const { retailer_id, code } = req.body;
  const result = verifyOtp(retailer_id, 'login', code);
  if (!result.ok) return res.status(401).json({ error: result.reason });

  const retailer = db.prepare('SELECT * FROM retailers WHERE id = ?').get(retailer_id);
  const token = signToken({ id: retailer.id, role: 'retailer' });

  res.json({
    token,
    retailer: {
      id: retailer.id,
      business_name: retailer.business_name,
      owner_name: retailer.owner_name,
      email: retailer.email,
      wallet_balance: retailer.wallet_balance,
    },
  });
});

// --- Resend OTP ---
router.post('/resend-otp', (req, res) => {
  const { retailer_id } = req.body;
  const retailer = db.prepare('SELECT * FROM retailers WHERE id = ?').get(retailer_id);
  if (!retailer) return res.status(404).json({ error: 'Not found' });

  const deliverTo = retailer.two_fa_method === 'mobile' ? retailer.mobile : retailer.email;
  issueOtp(retailer.id, 'login', deliverTo, retailer.two_fa_method);
  res.json({ message: 'OTP resent' });
});

// --- Admin login (simple password login, no 2FA — add if you want it) ---
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ id: admin.id, role: 'admin' });
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
});

module.exports = router;