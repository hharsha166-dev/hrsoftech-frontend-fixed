const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const PDF_ENGINE_DIR = path.join(__dirname, '..', 'pdf_engine');
const TEMPLATES_DIR = path.join(__dirname, '..', 'pdf_templates');
const GENERATED_DIR = path.join(__dirname, '..', 'generated_pdfs');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

const TEMPLATE_BY_TYPE = {
  new_pan: path.join(TEMPLATES_DIR, 'form93.pdf'),
  correction: path.join(TEMPLATES_DIR, 'correction.pdf'),
};

/**
 * Fills the official NSDL-style PDF (Form 93 or the correction form) with
 * this application's data by shelling out to the Python field-mapping
 * engine in pdf_engine/. Resolves with the output file path, or rejects
 * with a message safe to show the retailer.
 */
function generateFilledPdf(application) {
  return new Promise((resolve, reject) => {
    const template = TEMPLATE_BY_TYPE[application.application_type];
    if (!template) return reject(new Error('Unknown application type'));

    const outputPath = path.join(GENERATED_DIR, `${application.id}.pdf`);
    const child = execFile(
      'python3',
      [path.join(PDF_ENGINE_DIR, 'generate_pdf.py'), application.application_type, template, outputPath],
      { timeout: 20000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error('PDF generation failed:', stderr || error.message);
          return reject(new Error('Could not generate the sample PDF. Please try again or contact support.'));
        }
        resolve(outputPath);
      }
    );
    child.stdin.write(JSON.stringify(application));
    child.stdin.end();
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only JPG, PNG, or PDF files are allowed'));
  },
});

const uploadFields = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'id_proof', maxCount: 1 },
  { name: 'address_proof', maxCount: 1 },
]);

/**
 * Placeholder for your real NSDL submission integration.
 * Wire in your API call or hand-off-to-staff-queue logic here.
 */
async function submitToNsdl(application) {
  // TODO: replace with real integration. For now this just marks it as
  // "under_process" so the workflow is testable end-to-end.
  return { ack_number: null, status: 'under_process' };
}

// --- Create application (draft, before documents) ---
router.post('/', requireAuth, requireRole('retailer'), (req, res) => {
  const {
    application_type, full_name, father_name, mother_name, dob, gender,
    aadhaar_number, existing_pan, correction_fields,
    address_line1, address_line2, city, state, pincode, mobile, email,
  } = req.body;

  if (!['new_pan', 'correction'].includes(application_type)) {
    return res.status(400).json({ error: 'application_type must be new_pan or correction' });
  }
  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  if (application_type === 'correction' && !existing_pan) {
    return res.status(400).json({ error: 'existing_pan is required for correction applications' });
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO applications
      (id, retailer_id, application_type, full_name, father_name, mother_name, dob, gender,
       aadhaar_number, existing_pan, correction_fields, address_line1, address_line2, city,
       state, pincode, mobile, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, req.user.id, application_type, full_name, father_name, mother_name, dob, gender,
    aadhaar_number, existing_pan || null, correction_fields ? JSON.stringify(correction_fields) : null,
    address_line1, address_line2, city, state, pincode, mobile, email
  );

  res.json({ application_id: id, status: 'draft' });
});

// --- Upload documents for an application ---
router.post('/:id/documents', requireAuth, requireRole('retailer'), uploadFields, (req, res) => {
  const application = db
    .prepare('SELECT * FROM applications WHERE id = ? AND retailer_id = ?')
    .get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const files = req.files || {};
  const updates = {};
  if (files.photo) updates.photo_path = files.photo[0].filename;
  if (files.signature) updates.signature_path = files.signature[0].filename;
  if (files.id_proof) updates.id_proof_path = files.id_proof[0].filename;
  if (files.address_proof) updates.address_proof_path = files.address_proof[0].filename;

  const fields = Object.keys(updates);
  if (fields.length === 0) return res.status(400).json({ error: 'No files received' });

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  db.prepare(`UPDATE applications SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(
    ...fields.map((f) => updates[f]),
    req.params.id
  );

  res.json({ message: 'Documents uploaded', uploaded: fields });
});

// --- Submit application (deduct wallet fee, hand off to NSDL step) ---
router.post('/:id/submit', requireAuth, requireRole('retailer'), async (req, res) => {
  const application = db
    .prepare('SELECT * FROM applications WHERE id = ? AND retailer_id = ?')
    .get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });
  if (application.status !== 'draft') {
    return res.status(400).json({ error: 'Application already submitted' });
  }
  if (!application.photo_path || !application.signature_path || !application.id_proof_path) {
    return res.status(400).json({ error: 'Upload all required documents before submitting' });
  }

  const feeRow = db
    .prepare('SELECT retailer_fee FROM fee_config WHERE application_type = ?')
    .get(application.application_type);
  const fee = feeRow.retailer_fee;

  const retailer = db.prepare('SELECT wallet_balance FROM retailers WHERE id = ?').get(req.user.id);
  if (retailer.wallet_balance < fee) {
    return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
  }

  const nsdlResult = await submitToNsdl(application);
  const newBalance = retailer.wallet_balance - fee;

  const tx = db.transaction(() => {
    db.prepare('UPDATE retailers SET wallet_balance = ? WHERE id = ?').run(newBalance, req.user.id);
    db.prepare(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES (?, ?, 'debit', ?, 'application_fee', ?, ?)`
    ).run(uuidv4(), req.user.id, fee, application.id, newBalance);
    db.prepare(
      `UPDATE applications SET status = ?, fee_charged = ?, nsdl_ack_number = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(nsdlResult.status, fee, nsdlResult.ack_number, application.id);
  });
  tx();

  res.json({ message: 'Application submitted', status: nsdlResult.status, wallet_balance: newBalance });
});

// --- List retailer's own applications ---
router.get('/', requireAuth, requireRole('retailer'), (req, res) => {
  const applications = db
    .prepare('SELECT * FROM applications WHERE retailer_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ applications });
});

// --- Get single application ---
router.get('/:id', requireAuth, requireRole('retailer'), (req, res) => {
  const application = db
    .prepare('SELECT * FROM applications WHERE id = ? AND retailer_id = ?')
    .get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ error: 'Not found' });
  res.json({ application });
});

// --- Generate auto-filled sample PDF from entered data (before signing) ---
router.get('/:id/generate-pdf', requireAuth, requireRole('retailer'), async (req, res) => {
  const application = db
    .prepare('SELECT * FROM applications WHERE id = ? AND retailer_id = ?')
    .get(req.params.id, req.user.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  try {
    const pdfPath = await generateFilledPdf(application);
    db.prepare(
      `UPDATE applications SET generated_pdf_path = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(path.basename(pdfPath), application.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${application.id}-sample.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;