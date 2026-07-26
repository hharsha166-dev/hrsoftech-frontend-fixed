-- HRSOFTECH SOLUTION PAN Retailer Portal — schema (PostgreSQL / Neon)
-- Extended to hold every field the official Form 93 / Correction form needs,
-- so the auto-filled PDF can carry every entry the retailer types in.

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
  status TEXT NOT NULL DEFAULT 'pending',
  wallet_balance INTEGER NOT NULL DEFAULT 0,
  two_fa_method TEXT NOT NULL DEFAULT 'mobile',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_config (
  application_type TEXT PRIMARY KEY,
  retailer_fee INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  application_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  fee_charged INTEGER NOT NULL DEFAULT 0,

  -- Personal information
  full_name TEXT NOT NULL,
  name_as_per_aadhaar TEXT,
  father_name TEXT,
  mother_name TEXT,
  parent_on_card TEXT,          -- father | mother
  single_parent TEXT,           -- yes | no
  dob TEXT,
  gender TEXT,                  -- male | female | transgender
  aadhaar_number TEXT,
  existing_pan TEXT,            -- required for correction
  correction_fields TEXT,       -- JSON array of which rows are being changed

  -- Residence address
  address_line1 TEXT,
  address_line2 TEXT,
  post_office TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  pincode TEXT,

  -- Office address (optional, new-PAN form only)
  office_address_line1 TEXT,
  office_address_line2 TEXT,
  office_post_office TEXT,
  office_city TEXT,
  office_district TEXT,
  office_state TEXT,
  office_pincode TEXT,

  communication_address TEXT,   -- residence | office
  residential_status TEXT,      -- resident | non_resident | rnor
  passport_number TEXT,
  tin TEXT,

  mobile_country_code TEXT,
  mobile TEXT,
  email TEXT,
  landline_isd_code TEXT,
  landline_std_code TEXT,
  landline_number TEXT,

  source_of_income TEXT,        -- JSON array: salary, business, house_property, capital_gains, other, none

  -- AO (Assessing Officer) code — new-PAN form only
  ao_area_code TEXT,
  ao_type TEXT,
  ao_range_code TEXT,
  ao_no TEXT,

  -- Document proof selections (dropdown choice of document type)
  proof_of_identity TEXT,
  proof_of_address TEXT,
  proof_of_dob TEXT,
  verifier_name TEXT,

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
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS razorpay_orders (
  id TEXT PRIMARY KEY,
  retailer_id TEXT NOT NULL REFERENCES retailers(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fee_config (application_type, retailer_fee) VALUES ('new_pan', 10700)
  ON CONFLICT (application_type) DO NOTHING;
INSERT INTO fee_config (application_type, retailer_fee) VALUES ('correction', 10700)
  ON CONFLICT (application_type) DO NOTHING;