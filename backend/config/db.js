const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Every column the applications table needs beyond what CREATE TABLE
// IF NOT EXISTS covers on a database that already existed before this
// change. Safe to run every time — IF NOT EXISTS makes each a no-op
// once applied.
const NEW_APPLICATION_COLUMNS = [
  'name_as_per_aadhaar TEXT',
  'parent_on_card TEXT',
  'single_parent TEXT',
  'post_office TEXT',
  'district TEXT',
  'office_address_line1 TEXT',
  'office_address_line2 TEXT',
  'office_post_office TEXT',
  'office_city TEXT',
  'office_district TEXT',
  'office_state TEXT',
  'office_pincode TEXT',
  'communication_address TEXT',
  'residential_status TEXT',
  'passport_number TEXT',
  'tin TEXT',
  'mobile_country_code TEXT',
  'landline_isd_code TEXT',
  'landline_std_code TEXT',
  'landline_number TEXT',
  'source_of_income TEXT',
  'ao_area_code TEXT',
  'ao_type TEXT',
  'ao_range_code TEXT',
  'ao_no TEXT',
  'proof_of_identity TEXT',
  'proof_of_address TEXT',
  'proof_of_dob TEXT',
  'verifier_name TEXT',
  'generated_pdf_path TEXT',
];

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);

  for (const columnDef of NEW_APPLICATION_COLUMNS) {
    try {
      await pool.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${columnDef}`);
    } catch (err) {
      console.error(`Migration warning (${columnDef}):`, err.message);
    }
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM admins');
  if (rows[0].c === 0) {
    const tempPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'HrSoftech@2026';
    const hash = bcrypt.hashSync(tempPassword, 10);
    await pool.query(
      'INSERT INTO admins (id, name, email, password_hash) VALUES ($1, $2, $3, $4)',
      [uuidv4(), 'Super Admin', 'admin@hrsoftech.local', hash]
    );

    console.log('====================================================');
    console.log('First-run admin account created:');
    console.log('  email:    admin@hrsoftech.local');
    console.log('  password: ' + tempPassword);
    console.log('Log in and change this immediately.');
    console.log('====================================================');
  }
}

migrate().catch((err) => {
  console.error('Database migration failed:', err);
  process.exit(1);
});

module.exports = pool;