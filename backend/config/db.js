const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  db.exec(schema);

  // CREATE TABLE IF NOT EXISTS won't add new columns to an already-existing
  // table, so patch older databases created before generated_pdf_path existed.
  try {
    db.exec('ALTER TABLE applications ADD COLUMN generated_pdf_path TEXT');
  } catch (err) {
    if (!/duplicate column name/i.test(err.message)) throw err;
  }

  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  if (adminCount === 0) {
    const tempPassword = uuidv4().slice(0, 10);
    const hash = bcrypt.hashSync(tempPassword, 10);
    db.prepare(
      'INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), 'Super Admin', 'admin@hrsoftech.local', hash);

    console.log('====================================================');
    console.log('First-run admin account created:');
    console.log('  email:    admin@hrsoftech.local');
    console.log('  password: ' + tempPassword);
    console.log('Log in and change this immediately.');
    console.log('====================================================');
  }
}

migrate();

module.exports = db;