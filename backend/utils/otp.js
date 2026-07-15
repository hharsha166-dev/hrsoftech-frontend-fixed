const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const OTP_TTL_MINUTES = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/**
 * Create and "send" an OTP for a retailer.
 *
 * TODO (you): replace the console.log calls below with a real SMS provider
 * (MSG91 / Twilio / Fast2SMS etc.) and/or SMTP email send. Until then, OTPs
 * are printed to the server console so you can test the flow end-to-end.
 */
function issueOtp(retailerId, purpose, deliverTo, method) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO otp_codes (id, retailer_id, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), retailerId, code, purpose, expiresAt);

  if (method === 'mobile') {
    // TODO: call your SMS provider API here, e.g.:
    // await smsProvider.send(deliverTo, `Your HRSOFTECH SOLUTION OTP is ${code}`);
    console.log(`[OTP] SMS to ${deliverTo}: ${code} (purpose: ${purpose})`);
  } else {
    // TODO: send via SMTP here.
    console.log(`[OTP] Email to ${deliverTo}: ${code} (purpose: ${purpose})`);
  }

  return { expiresAt };
}

function verifyOtp(retailerId, purpose, code) {
  const row = db
    .prepare(
      `SELECT * FROM otp_codes
       WHERE retailer_id = ? AND purpose = ? AND consumed = 0
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(retailerId, purpose);

  if (!row) return { ok: false, reason: 'No OTP found. Request a new one.' };
  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: 'OTP expired. Request a new one.' };
  }
  if (row.code !== code) return { ok: false, reason: 'Incorrect OTP.' };

  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(row.id);
  return { ok: true };
}

module.exports = { issueOtp, verifyOtp };