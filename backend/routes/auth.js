const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');
const { issueOtp, verifyOtp } = require('../utils/otp');

const router = express.Router();

// --- Retailer registration ---
router.post('/register', async (req, res) => {
  try {
    const { business_name, owner_name, email, mobile, password, two_fa_method } = req.body;

    if (!business_name || !owner_name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await db.query(
      'SELECT id FROM retailers WHERE email = $1 OR mobile = $2',
      [email, mobile]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or mobile already registered' });
    }

    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    await db.query(
      `INSERT INTO retailers (id, business_name, owner_name, email, mobile, password_hash, two_fa_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, business_name, owner_name, email, mobile, hash, two_fa_method || 'mobile']
    );

    res.json({
      message: 'Registration received. Your account is pending admin approval.',
      retailer_id: id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Step 1 of login: password check, then issue OTP ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM retailers WHERE email = $1', [email]);
    const retailer = result.rows[0];

    if (!retailer) return res.status(401).json({ error: 'Invalid credentials' });
    if (retailer.status !== 'active') {
      return res.status(403).json({ error: `Account is ${retailer.status}. Contact admin.` });
    }
    if (!bcrypt.compareSync(password, retailer.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const deliverTo = retailer.two_fa_method === 'mobile' ? retailer.mobile : retailer.email;
    await issueOtp(retailer.id, 'login', deliverTo, retailer.two_fa_method);

    res.json({
      message: `OTP sent via ${retailer.two_fa_method}`,
      retailer_id: retailer.id,
      two_fa_method: retailer.two_fa_method,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Step 2 of login: verify OTP, issue JWT ---
router.post('/verify-otp', async (req, res) => {
  try {
    const { retailer_id, code } = req.body;
    const result = await verifyOtp(retailer_id, 'login', code);
    if (!result.ok) return res.status(401).json({ error: result.reason });

    const retailerResult = await db.query('SELECT * FROM retailers WHERE id = $1', [retailer_id]);
    const retailer = retailerResult.rows[0];
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// --- Resend OTP ---
router.post('/resend-otp', async (req, res) => {
  try {
    const { retailer_id } = req.body;
    const result = await db.query('SELECT * FROM retailers WHERE id = $1', [retailer_id]);
    const retailer = result.rows[0];
    if (!retailer) return res.status(404).json({ error: 'Not found' });

    const deliverTo = retailer.two_fa_method === 'mobile' ? retailer.mobile : retailer.email;
    await issueOtp(retailer.id, 'login', deliverTo, retailer.two_fa_method);
    res.json({ message: 'OTP resent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not resend OTP' });
  }
});

// --- Admin login ---
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ id: admin.id, role: 'admin' });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

module.exports = router;