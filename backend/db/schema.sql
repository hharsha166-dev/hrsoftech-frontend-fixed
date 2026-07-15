-- HRSOFTECH SOLUTION PAN Retailer Portal — schema

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retailers (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | active | suspended
  wallet_balance INTEGER NOT NULL DEFAULT 0, -- stored in paise to avoid float issues
  two_fa_method TEXT NOT NULL DEFAULT 'mobile', -- mobile | email
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,        -- login | registration | password_reset
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)
);

CREATE TABLE IF NOT EXISTS fee_config (
  application_type TEXT PRIMARY KEY, -- new_pan | correction
  retailer_fee INTEGER NOT NULL       -- amount deducted from retailer wallet, in paise
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL,
  application_type TEXT NOT NULL,     -- new_pan | correction
  status TEXT NOT NULL DEFAULT 'draft', -- draft | submitted | under_process | approved | rejected
  fee_charged INTEGER NOT NULL DEFAULT 0,

  -- Applicant details (Form 49A / 49AA style fields)
  full_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  dob TEXT,
  gender TEXT,
  aadhaar_number TEXT,
  existing_pan TEXT,              -- required for correction
  correction_fields TEXT,         -- JSON: which fields are being corrected (for correction type)
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  mobile TEXT,
  email TEXT,
  photo_path TEXT,
  signature_path TEXT,
  id_proof_path TEXT,
  address_proof_path TEXT,
  nsdl_ack_number TEXT,           -- filled once submitted to NSDL
  generated_pdf_path TEXT,        -- filename of the auto-filled sample PDF (in backend/generated_pdfs/)
  remarks TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL,
  type TEXT NOT NULL,             -- credit | debit
  amount INTEGER NOT NULL,        -- paise
  reason TEXT NOT NULL,           -- topup | application_fee | refund | adjustment
  reference_id TEXT,              -- razorpay payment id or application id
  balance_after INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)
);

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id TEXT PRIMARY KEY,             -- razorpay order id
  retailer_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created | paid | failed
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (retailer_id) REFERENCES retailers(id)
);

INSERT OR IGNORE INTO fee_config (application_type, retailer_fee) VALUES ('new_pan', 10700);
INSERT OR IGNORE INTO fee_config (application_type, retailer_fee) VALUES ('correction', 10700);