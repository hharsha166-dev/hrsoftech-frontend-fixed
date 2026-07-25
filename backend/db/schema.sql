-- HRSOFTECH SOLUTION PAN Retailer Portal — schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retailers (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending | active | suspended
  wallet_balance INTEGER NOT NULL DEFAULT 0, -- stored in paise to avoid float issues
  two_fa_method TEXT NOT NULL DEFAULT 'mobile', -- mobile | email
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,        -- login | registration | password_reset
  expires_at TIMESTAMPTZ NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_config (
  application_type TEXT PRIMARY KEY, -- new_pan | correction
  retailer_fee INTEGER NOT NULL       -- amount deducted from retailer wallet, in paise
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  application_type TEXT NOT NULL,     -- new_pan | correction
  status TEXT NOT NULL DEFAULT 'draft', -- draft | submitted | under_process | approved | rejected
  fee_charged INTEGER NOT NULL DEFAULT 0,

  full_name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  dob TEXT,
  gender TEXT,
  aadhaar_number TEXT,
  existing_pan TEXT,
  correction_fields TEXT,
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
  nsdl_ack_number TEXT,
  generated_pdf_path TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  type TEXT NOT NULL,             -- credit | debit
  amount INTEGER NOT NULL,        -- paise
  reason TEXT NOT NULL,           -- topup | application_fee | refund | adjustment
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created | paid | failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fee_config (application_type, retailer_fee) VALUES ('new_pan', 10700)
  ON CONFLICT (application_type) DO NOTHING;
INSERT INTO fee_config (application_type, retailer_fee) VALUES ('correction', 10700)
  ON CONFLICT (application_type) DO NOTHING;