const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// DATABASE_URL comes from your Neon/Supabase project, e.g.:
// postgresql://user:password@host/dbname?sslmode=require
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required by Neon/Supabase
});

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);

  // Safe no-op if the column already exists (kept in case of an older DB).
  try {
    await pool.query('ALTER TABLE applications ADD COLUMN IF NOT EXISTS generated_pdf_path TEXT');
  } catch (err) {
    console.error('Migration warning:', err.message);
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