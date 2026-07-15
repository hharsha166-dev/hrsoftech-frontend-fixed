import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const CORRECTABLE_FIELDS = [
  'Name', 'Father\'s Name', 'Date of Birth', 'Gender', 'Address', 'Mobile Number', 'Email', 'Photo', 'Signature',
];

// Maps the display labels above to the change_fields keys map_correction.py
// checks (see backend/pdf_engine/map_correction.py) so the right row-tick
// marks appear on the generated sample PDF.
const FIELD_KEY_MAP = {
  'Name': 'name',
  "Father's Name": 'father_name',
  'Date of Birth': 'dob',
  'Gender': 'gender',
  'Address': 'address',
  'Mobile Number': 'contact',
  'Email': 'contact',
};

const initialForm = {
  full_name: '', existing_pan: '', father_name: '', dob: '', gender: 'male',
  address_line1: '', address_line2: '', city: '', state: '', pincode: '', mobile: '', email: '',
};

export default function CorrectionApplication() {
  const [form, setForm] = useState(initialForm);
  const [fieldsToCorrect, setFieldsToCorrect] = useState([]);
  const [files, setFiles] = useState({});
  const [applicationId, setApplicationId] = useState(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleField(fieldName) {
    setFieldsToCorrect((f) =>
      f.includes(fieldName) ? f.filter((x) => x !== fieldName) : [...f, fieldName]
    );
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    setError('');
    if (fieldsToCorrect.length === 0) {
      setError('Select at least one field to correct.');
      return;
    }
    setLoading(true);
    try {
      const mappedKeys = [...new Set(fieldsToCorrect.map((f) => FIELD_KEY_MAP[f]).filter(Boolean))];
      const { data } = await api.post('/applications', {
        application_type: 'correction',
        correction_fields: mappedKeys,
        ...form,
      });
      setApplicationId(data.application_id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save application details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDocumentsSubmit(e) {
    e.preventDefault();
    setError('');
    if (!files.photo || !files.signature || !files.id_proof) {
      setError('Photo, signature, and ID proof are required.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([key, file]) => formData.append(key, file));
      await api.post(`/applications/${applicationId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/applications/${applicationId}/submit`);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleGeneratePdf() {
    setPdfError('');
    setPdfLoading(true);
    try {
      const { data } = await api.get(`/applications/${applicationId}/generate-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      setPdfUrl(url);
    } catch (err) {
      setPdfError('Could not generate the sample PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  if (step === 3) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <h2 style={{ color: 'var(--success)' }}>Correction Application Submitted</h2>
        <p>Application ID: <strong>{applicationId}</strong></p>
        <button className="btn btn-primary" style={{ width: 'auto', marginTop: 16 }} onClick={() => navigate('/app/applications')}>
          View My Applications
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: 'var(--navy)' }}>PAN Correction Application</h2>
      <p className="helper-text">For updating details on an existing PAN card.</p>

      {error && <div className="error-banner">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleDetailsSubmit} className="card">
          <div className="section-title">Existing PAN</div>
          <div className="form-grid">
            <div className="field">
              <label>Existing PAN Number</label>
              <input value={form.existing_pan} onChange={(e) => update('existing_pan', e.target.value)} maxLength={10} required />
            </div>
            <div className="field">
              <label>Full Name (as it should appear)</label>
              <input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
            </div>
          </div>

          <div className="section-title">Fields to Correct</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CORRECTABLE_FIELDS.map((field) => (
              <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 20 }}>
                <input type="checkbox" checked={fieldsToCorrect.includes(field)} onChange={() => toggleField(field)} />
                {field}
              </label>
            ))}
          </div>

          <div className="section-title">Updated Details</div>
          <div className="form-grid">
            <div className="field">
              <label>Father's Name</label>
              <input value={form.father_name} onChange={(e) => update('father_name', e.target.value)} />
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
            </div>
            <div className="field">
              <label>Address Line 1</label>
              <input value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} />
            </div>
            <div className="field">
              <label>Address Line 2</label>
              <input value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div className="field">
              <label>State</label>
              <input value={form.state} onChange={(e) => update('state', e.target.value)} />
            </div>
            <div className="field">
              <label>Pincode</label>
              <input value={form.pincode} onChange={(e) => update('pincode', e.target.value)} maxLength={6} />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
            {loading ? 'Saving...' : 'Save & Continue to Documents'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Sample Form (auto-filled from your entered data)</div>
          <p className="helper-text">
            Generate the correction form sample with the details and tick marks matching what you
            selected. Print it, get it signed, and upload the signed photo below before submitting.
          </p>
          {pdfError && <div className="error-banner">{pdfError}</div>}
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleGeneratePdf} disabled={pdfLoading}>
            {pdfLoading ? 'Generating...' : 'Generate Sample PDF'}
          </button>
          {pdfUrl && (
            <div style={{ marginTop: 12 }}>
              <a href={pdfUrl} target="_blank" rel="noreferrer" download={`${applicationId}-correction-sample.pdf`} className="btn btn-primary" style={{ width: 'auto' }}>
                View / Download Sample PDF
              </a>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleDocumentsSubmit} className="card">
          <div className="section-title">Upload Documents</div>
          <p className="helper-text">Include proof supporting the fields being corrected.</p>
          <div className="form-grid">
            <div className="field">
              <label>Photo</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFiles((f) => ({ ...f, photo: e.target.files[0] }))} required />
            </div>
            <div className="field">
              <label>Signature</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFiles((f) => ({ ...f, signature: e.target.files[0] }))} required />
            </div>
            <div className="field">
              <label>ID Proof</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFiles((f) => ({ ...f, id_proof: e.target.files[0] }))} required />
            </div>
            <div className="field">
              <label>Address Proof (if correcting address)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFiles((f) => ({ ...f, address_proof: e.target.files[0] }))} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: 'auto' }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application (deducts wallet fee)'}
          </button>
        </form>
      )}
    </div>
  );
}
