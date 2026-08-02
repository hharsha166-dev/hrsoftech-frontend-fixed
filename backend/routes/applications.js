const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generatePdf } = require('../pdf_engine_js/generatePdf');

const router = express.Router();

const TEMPLATES_DIR = path.join(__dirname, '..', 'pdf_templates');
const GENERATED_DIR = path.join(__dirname, '..', 'generated_pdfs');
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

const TEMPLATE_BY_TYPE = {
  new_pan: path.join(TEMPLATES_DIR, 'form93.pdf'),
  correction: path.join(TEMPLATES_DIR, 'correction.pdf'),
};

async function generateFilledPdf(application) {
  const template = TEMPLATE_BY_TYPE[application.application_type];
  if (!template) throw new Error('Unknown application type');

  const outputPath = path.join(GENERATED_DIR, `${application.id}.pdf`);
  try {
    await generatePdf(application, template, outputPath);
    return outputPath;
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw new Error('Could not generate the sample PDF. Please try again or contact support.');
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
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

async function submitToNsdl(application) {
  return { ack_number: null, status: 'under_process' };
}

// --- Create application (draft, before documents) ---
router.post('/', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const {
      application_type,
      full_name, name_as_per_aadhaar, father_name, mother_name, parent_on_card, single_parent,
      dob, gender, aadhaar_number, existing_pan, correction_fields,
      address_line1, address_line2, post_office, city, district, state, pincode,
      office_address_line1, office_address_line2, office_post_office, office_city,
      office_district, office_state, office_pincode,
      communication_address, residential_status, passport_number, tin,
      mobile_country_code, mobile, email, landline_isd_code, landline_std_code, landline_number,
      source_of_income,
      ao_area_code, ao_type, ao_range_code, ao_no,
      proof_of_identity, proof_of_address, proof_of_dob, verifier_name,
    } = req.body;

    if (!['new_pan', 'correction'].includes(application_type)) {
      return res.status(400).json({ error: 'application_type must be new_pan or correction' });
    }
    if (!full_name) return res.status(400).json({ error: 'full_name is required' });
    if (application_type === 'correction' && !existing_pan) {
      return res.status(400).json({ error: 'existing_pan is required for correction applications' });
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO applications
        (id, retailer_id, application_type,
         full_name, name_as_per_aadhaar, father_name, mother_name, parent_on_card, single_parent,
         dob, gender, aadhaar_number, existing_pan, correction_fields,
         address_line1, address_line2, post_office, city, district, state, pincode,
         office_address_line1, office_address_line2, office_post_office, office_city,
         office_district, office_state, office_pincode,
         communication_address, residential_status, passport_number, tin,
         mobile_country_code, mobile, email, landline_isd_code, landline_std_code, landline_number,
         source_of_income,
         ao_area_code, ao_type, ao_range_code, ao_no,
         proof_of_identity, proof_of_address, proof_of_dob, verifier_name)
       VALUES
        ($1, $2, $3,
         $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19, $20, $21,
         $22, $23, $24, $25,
         $26, $27, $28,
         $29, $30, $31, $32,
         $33, $34, $35, $36, $37, $38,
         $39,
         $40, $41, $42, $43,
         $44, $45, $46, $47)`,
      [
        id, req.user.id, application_type,
        full_name, name_as_per_aadhaar || null, father_name || null, mother_name || null,
        parent_on_card || null, single_parent || null,
        dob || null, gender || null, aadhaar_number || null, existing_pan || null,
        correction_fields ? JSON.stringify(correction_fields) : null,
        address_line1 || null, address_line2 || null, post_office || null, city || null,
        district || null, state || null, pincode || null,
        office_address_line1 || null, office_address_line2 || null, office_post_office || null,
        office_city || null, office_district || null, office_state || null, office_pincode || null,
        communication_address || null, residential_status || null, passport_number || null, tin || null,
        mobile_country_code || null, mobile || null, email || null,
        landline_isd_code || null, landline_std_code || null, landline_number || null,
        source_of_income ? JSON.stringify(source_of_income) : null,
        ao_area_code || null, ao_type || null, ao_range_code || null, ao_no || null,
        proof_of_identity || null, proof_of_address || null, proof_of_dob || null, verifier_name || null,
      ]
    );

    res.json({ application_id: id, status: 'draft' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create application' });
  }
});

// --- Update draft application ---
router.put('/:id', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM applications WHERE id = $1 AND retailer_id = $2',
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = result.rows[0];

    if (app.status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft applications can be edited'
      });
    }

    const {
      full_name,
      name_as_per_aadhaar,
      father_name,
      mother_name,
      parent_on_card,
      dob,
      gender,
      aadhaar_number,
      address_line1,
      address_line2,
      post_office,
      city,
      district,
      state,
      pincode,
      office_address_line1,
      office_address_line2,
      office_post_office,
      office_city,
      office_district,
      office_state,
      office_pincode,
      communication_address,
      residential_status,
      mobile,
      email,
      source_of_income,
      ao_area_code,
      ao_type,
      ao_range_code,
      ao_no,
      proof_of_identity,
      proof_of_address,
      proof_of_dob,
      verifier_name
    } = req.body;

    await db.query(
      `UPDATE applications SET
      full_name=$1,
      name_as_per_aadhaar=$2,
      father_name=$3,
      mother_name=$4,
      parent_on_card=$5,
      dob=$6,
      gender=$7,
      aadhaar_number=$8,
      address_line1=$9,
      address_line2=$10,
      post_office=$11,
      city=$12,
      district=$13,
      state=$14,
      pincode=$15,
      office_address_line1=$16,
      office_address_line2=$17,
      office_post_office=$18,
      office_city=$19,
      office_district=$20,
      office_state=$21,
      office_pincode=$22,
      communication_address=$23,
      residential_status=$24,
      mobile=$25,
      email=$26,
      source_of_income=$27,
      ao_area_code=$28,
      ao_type=$29,
      ao_range_code=$30,
      ao_no=$31,
      proof_of_identity=$32,
      proof_of_address=$33,
      proof_of_dob=$34,
      verifier_name=$35,
      updated_at=NOW()
      WHERE id=$36`,
      [
        full_name,
        name_as_per_aadhaar,
        father_name,
        mother_name,
        parent_on_card,
        dob,
        gender,
        aadhaar_number,
        address_line1,
        address_line2,
        post_office,
        city,
        district,
        state,
        pincode,
        office_address_line1,
        office_address_line2,
        office_post_office,
        office_city,
        office_district,
        office_state,
        office_pincode,
        communication_address,
        residential_status,
        mobile,
        email,
        JSON.stringify(source_of_income || []),
        ao_area_code,
        ao_type,
        ao_range_code,
        ao_no,
        proof_of_identity,
        proof_of_address,
        proof_of_dob,
        verifier_name,
        req.params.id
      ]
    );

    res.json({ message: 'Application updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update application' });
  }
});

// --- Upload documents for an application ---
router.post('/:id/documents', requireAuth, requireRole('retailer'), uploadFields, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM applications WHERE id = $1 AND retailer_id = $2',
      [req.params.id, req.user.id]
    );
    const application = result.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const files = req.files || {};
    const updates = {};
    if (files.photo) updates.photo_path = files.photo[0].filename;
    if (files.signature) updates.signature_path = files.signature[0].filename;
    if (files.id_proof) updates.id_proof_path = files.id_proof[0].filename;
    if (files.address_proof) updates.address_proof_path = files.address_proof[0].filename;

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No files received' });

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => updates[f]);
    await db.query(
      `UPDATE applications SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}`,
      [...values, req.params.id]
    );

    res.json({ message: 'Documents uploaded', uploaded: fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not upload documents' });
  }
});

// --- Submit application (deduct wallet fee, hand off to NSDL step) ---
router.post('/:id/submit', requireAuth, requireRole('retailer'), async (req, res) => {
  const client = await db.connect();
  try {
    const appResult = await client.query(
      'SELECT * FROM applications WHERE id = $1 AND retailer_id = $2',
      [req.params.id, req.user.id]
    );
    const application = appResult.rows[0];
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (application.status !== 'draft') {
      return res.status(400).json({ error: 'Application already submitted' });
    }
    if (!application.photo_path || !application.signature_path || !application.id_proof_path) {
      return res.status(400).json({ error: 'Upload all required documents before submitting' });
    }

    const feeResult = await client.query(
      'SELECT retailer_fee FROM fee_config WHERE application_type = $1',
      [application.application_type]
    );
    const fee = feeResult.rows[0].retailer_fee;

    const retailerResult = await client.query('SELECT wallet_balance FROM retailers WHERE id = $1', [req.user.id]);
    const retailer = retailerResult.rows[0];
    if (retailer.wallet_balance < fee) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
    }

    const nsdlResult = await submitToNsdl(application);
    const newBalance = retailer.wallet_balance - fee;

    await client.query('BEGIN');
    await client.query('UPDATE retailers SET wallet_balance = $1 WHERE id = $2', [newBalance, req.user.id]);
    await client.query(
      `INSERT INTO wallet_transactions (id, retailer_id, type, amount, reason, reference_id, balance_after)
       VALUES ($1, $2, 'debit', $3, 'application_fee', $4, $5)`,
      [uuidv4(), req.user.id, fee, application.id, newBalance]
    );
    await client.query(
      `UPDATE applications SET status = $1, fee_charged = $2, nsdl_ack_number = $3, updated_at = NOW()
       WHERE id = $4`,
      [nsdlResult.status, fee, nsdlResult.ack_number, application.id]
    );
    await client.query('COMMIT');

    res.json({ message: 'Application submitted', status: nsdlResult.status, wallet_balance: newBalance });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error(err);
    res.status(500).json({ error: 'Could not submit application' });
  } finally {
    client.release();
  }
});

// --- List retailer's own applications ---
router.get('/', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM applications WHERE retailer_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load applications' });
  }
});

// --- Get single application ---
router.get('/:id', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM applications WHERE id = $1 AND retailer_id = $2',
      [req.params.id, req.user.id]
    );
    const application = result.rows[0];
    if (!application) return res.status(404).json({ error: 'Not found' });
    res.json({ application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load application' });
  }
});

// --- Generate auto-filled sample PDF from entered data (before signing) ---
router.get('/:id/generate-pdf', requireAuth, requireRole('retailer'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM applications WHERE id = $1 AND retailer_id = $2',
      [req.params.id, req.user.id]
    );
    const application = result.rows[0];
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const pdfPath = await generateFilledPdf(application);
    await db.query(
      `UPDATE applications SET generated_pdf_path = $1, updated_at = NOW() WHERE id = $2`,
      [path.basename(pdfPath), application.id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${application.id}-sample.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;