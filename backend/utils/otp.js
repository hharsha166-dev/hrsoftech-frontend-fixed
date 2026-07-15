const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const OTP_TTL_MINUTES = 5;

function generateOtp() {
  return "123456";
}

/**
 * Create and "send" an OTP for a retailer.
 */
function issueOtp(retailerId, purpose, deliverTo, method) {

  const code = generateOtp();

  console.log("=================================");
  console.log("OTP:", code);
  console.log("Purpose:", purpose);
  console.log("Send To:", deliverTo);
  console.log("=================================");

  const expiresAt = new Date(
    Date.now() + OTP_TTL_MINUTES * 60 * 1000
  ).toISOString();

  db.prepare(
    'INSERT INTO otp_codes (id, retailer_id, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), retailerId, code, purpose, expiresAt);

  if (method === 'mobile') {
    console.log(`[OTP] SMS to ${deliverTo}: ${code}`);
  } else {
    console.log(`[OTP] Email to ${deliverTo}: ${code}`);
  }

  return { expiresAt };
}

function verifyOtp(retailerId, purpose, code) {
  const row = db
    .prepare(
      `SELECT * FROM otp_codes
       WHERE retailer_id = ? AND purpose = ? AND consumed = 0
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(retailerId, purpose);

  if (!row)
    return { ok: false, reason: 'No OTP found. Request a new one.' };

  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, reason: 'OTP expired. Request a new one.' };
  }

  if (row.code !== code) {
    return { ok: false, reason: 'Incorrect OTP.' };
  }

  db.prepare(
    'UPDATE otp_codes SET consumed = 1 WHERE id = ?'
  ).run(row.id);

  return { ok: true };
}

module.exports = {
  issueOtp,
  verifyOtp
};