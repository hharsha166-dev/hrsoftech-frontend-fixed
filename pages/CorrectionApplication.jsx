import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const GENDER_OPTIONS = ['Male', 'Female', 'Transgender'];
const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS', 'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR',
  'CHANDIGARH', 'CHHATTISGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DELHI', 'GOA',
  'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR', 'JHARKHAND', 'KARNATAKA',
  'KERALA', 'LADAKH', 'LAKSHADWEEP', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA',
  'MIZORAM', 'NAGALAND', 'ODISHA', 'PONDICHERRY', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU',
  'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
];
const DOCUMENT_OPTIONS = [
  'AADHAAR Card', 'Voter ID Card', 'Driving License', 'Passport',
  'Ration Card with photo', 'Photo ID issued by Government',
  'Pensioner Card with photo', 'Central Government Health Scheme Card',
  'Property Registration Document', 'Electricity Bill (not more than 3 months old)',
  'Bank Account Statement (not more than 3 months old)', 'Bank Pass Book with photo',
  'Post Office Pass Book with address', 'Employer Certificate in original',
];

const CORRECTABLE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'name_aadhaar', label: 'Name as per Aadhaar' },
  { key: 'gender', label: 'Gender' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'passport', label: 'Passport Number' },
  { key: 'tin', label: 'Taxpayer ID (TIN)' },
  { key: 'contact', label: 'Contact Details' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'mother_name', label: "Mother's Name" },
];

const emptyForm = {
  existing_pan: '', existing_pan_confirm: '', aadhaar_number: '',
  correction_fields: [],
  first_name: '', middle_name: '', last_name: '',
  name_as_per_aadhaar: '', gender: '', dob: '',
  address_type: 'residence',
  address_line1: '', address_line2: '', post_office: '', city: '', district: '', state: '', pincode: '',
  passport_number: '', tin: '',
  mobile: '', email: '', landline_isd_code: '', landline_std_code: '', landline_number: '',
  parent_on_card: 'father',
  father_first: '', father_middle: '', father_last: '',
  mother_first: '', mother_middle: '', mother_last: '',
  proof_of_identity: '', proof_of_address: '',
};

export default function CorrectionApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [applicationId, setApplicationId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCorrectionField(key) {
    setForm((f) => {
      const has = f.correction_fields.includes(key);
      return {
        ...f,
        correction_fields: has
          ? f.correction_fields.filter((k) => k !== key)
          : [...f.correction_fields, key],
      };
    });
  }

  async function handleSubmitDetails(e) {
    e.preventDefault();
    setError('');
    if (!form.existing_pan) return setError('Existing PAN number is required');
    if (form.existing_pan !== form.existing_pan_confirm) return setError('PAN numbers do not match');
    if (form.correction_fields.length === 0) return setError('Select at least one field to correct');

    setLoading(true);
    try {
      const full_name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');
      const father_name = [form.father_first, form.father_middle, form.father_last].filter(Boolean).join(' ');
      const mother_name = [form.mother_first, form.mother_middle, form.mother_last].filter(Boolean).join(' ');

      const { data } = await api.post('/applications', {
        application_type: 'correction',
        existing_pan: form.existing_pan,
        aadhaar_number: form.aadhaar_number,
        correction_fields: form.correction_fields,
        full_name,
        name_as_per_aadhaar: form.name_as_per_aadhaar,
        gender: form.gender.toLowerCase(),
        dob: form.dob,
        communication_address: form.address_type,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        post_office: form.post_office,
        city: form.city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        passport_number: form.passport_number,
        tin: form.tin,
        mobile: form.mobile,
        email: form.email,
        landline_isd_code: form.landline_isd_code,
        landline_std_code: form.landline_std_code,
        landline_number: form.landline_number,
        parent_on_card: form.parent_on_card,
        father_name,
        mother_name,
        proof_of_identity: form.proof_of_identity,
        proof_of_address: form.proof_of_address,
      });
      setApplicationId(data.application_id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save application details');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePdf() {
    setPdfError('');
    setPdfLoading(true);
    try {
      const { data } = await api.get(`/applications/${applicationId}/generate-pdf`, { responseType: 'blob' });
      setPdfUrl(URL.createObjectURL(data));
    } catch (err) {
      setPdfError('Could not generate the sample PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDocumentsSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    setLoading(true);
    setError('');
    try {
      await api.post(`/applications/${applicationId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/applications/${applicationId}/submit`);
      navigate('/retailer/applications');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit application');
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <form onSubmit={handleSubmitDetails} className="card">
        <div className="section-title">Application For PAN Correction</div>

        <label>Category Of Applicant</label>
        <input value="Individual" disabled />

        <label>PAN No. *</label>
        <input value={form.existing_pan} onChange={(e) => update('existing_pan', e.target.value.toUpperCase())} required />
        <label>Re-Enter PAN No. *</label>
        <input value={form.existing_pan_confirm} onChange={(e) => update('existing_pan_confirm', e.target.value.toUpperCase())} required />
        <label>Aadhaar Number</label>
        <input value={form.aadhaar_number} onChange={(e) => update('aadhaar_number', e.target.value)} />

        <div className="section-title">Fields Need To Change</div>
        {CORRECTABLE_FIELDS.map((f) => (
          <label key={f.key} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={form.correction_fields.includes(f.key)}
              onChange={() => toggleCorrectionField(f.key)}
            /> {f.label}
          </label>
        ))}

        <div className="section-title">Personal Information</div>
        <label>First Name</label>
        <input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
        <label>Middle Name</label>
        <input value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} />
        <label>Last Name/Surname *</label>
        <input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} required />
        <label>Name As Per Aadhaar *</label>
        <input value={form.name_as_per_aadhaar} onChange={(e) => update('name_as_per_aadhaar', e.target.value)} required />
        <label>Gender *</label>
        <select value={form.gender} onChange={(e) => update('gender', e.target.value)} required>
          <option value="">--Select--</option>
          {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label>Date Of Birth *</label>
        <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} required />

        <label>Address For Communication *</label>
        <select value={form.address_type} onChange={(e) => update('address_type', e.target.value)}>
          <option value="residence">Residence</option>
          <option value="office">Office</option>
        </select>

        <div className="section-title">Address</div>
        <label>Flat/Room/Door/Block No. *</label>
        <input value={form.address_line1} onChange={(e) => update('address_line1', e.target.value)} required />
        <label>Name Of Premises/Building/Village</label>
        <input value={form.address_line2} onChange={(e) => update('address_line2', e.target.value)} />
        <label>Road/Street/Lane/Post Office</label>
        <input value={form.post_office} onChange={(e) => update('post_office', e.target.value)} />
        <label>Town/City/District *</label>
        <input value={form.city} onChange={(e) => update('city', e.target.value)} required />
        <input placeholder="District" value={form.district} onChange={(e) => update('district', e.target.value)} />
        <label>State *</label>
        <select value={form.state} onChange={(e) => update('state', e.target.value)} required>
          <option value="">--Select--</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label>Pincode *</label>
        <input value={form.pincode} onChange={(e) => update('pincode', e.target.value)} required />

        <label>Passport Number</label>
        <input value={form.passport_number} onChange={(e) => update('passport_number', e.target.value)} />
        <label>Taxpayer ID (TIN)</label>
        <input value={form.tin} onChange={(e) => update('tin', e.target.value)} />

        <label>Mobile No. *</label>
        <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} required />
        <label>Email ID *</label>
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <label>Landline Country/ISD Code</label>
        <input value={form.landline_isd_code} onChange={(e) => update('landline_isd_code', e.target.value)} />
        <label>Landline Area/STD Code</label>
        <input value={form.landline_std_code} onChange={(e) => update('landline_std_code', e.target.value)} />
        <label>Landline Number</label>
        <input value={form.landline_number} onChange={(e) => update('landline_number', e.target.value)} />

        <p className="helper-text">Select either father's or mother's name to be printed on the PAN card.</p>
        <label>Guardian Name Print On Card</label>
        <select value={form.parent_on_card} onChange={(e) => update('parent_on_card', e.target.value)}>
          <option value="father">Father's Name</option>
          <option value="mother">Mother's Name</option>
        </select>

        <div className="section-title">Father's Name</div>
        <input placeholder="First Name" value={form.father_first} onChange={(e) => update('father_first', e.target.value)} />
        <input placeholder="Middle Name" value={form.father_middle} onChange={(e) => update('father_middle', e.target.value)} />
        <input placeholder="Last Name/Surname" value={form.father_last} onChange={(e) => update('father_last', e.target.value)} required />

        <div className="section-title">Mother's Name</div>
        <input placeholder="First Name" value={form.mother_first} onChange={(e) => update('mother_first', e.target.value)} />
        <input placeholder="Middle Name" value={form.mother_middle} onChange={(e) => update('mother_middle', e.target.value)} />
        <input placeholder="Last Name/Surname" value={form.mother_last} onChange={(e) => update('mother_last', e.target.value)} />

        <div className="section-title">Document Proof</div>
        <label>Proof Of Identity</label>
        <select value={form.proof_of_identity} onChange={(e) => update('proof_of_identity', e.target.value)}>
          <option value="">--Select--</option>
          {DOCUMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <label>Proof Of Address</label>
        <select value={form.proof_of_address} onChange={(e) => update('proof_of_address', e.target.value)}>
          <option value="">--Select--</option>
          {DOCUMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {error && <div className="error-banner">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Next'}
        </button>
      </form>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Sample Form (auto-filled from your entered data)</div>
        <p className="helper-text">
          Generate the correction form sample with the details and tick marks matching what you
          selected. Print it, get it signed, and upload the signed photo below before submitting.
        </p>
        {pdfError && <div className="error-banner">{pdfError}</div>}
        <button type="button" className="btn btn-secondary" onClick={handleGeneratePdf} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Generate Sample PDF'}
        </button>
        {pdfUrl && (
          <div style={{ marginTop: 12 }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" download={`${applicationId}-correction-sample.pdf`} className="btn btn-primary">
              View / Download Sample PDF
            </a>
          </div>
        )}
      </div>

      <form onSubmit={handleDocumentsSubmit} className="card">
        <div className="section-title">Upload Documents</div>
        <p className="helper-text">JPG, PNG, or PDF. Max 5MB each.</p>
        <label>Photo</label>
        <input type="file" name="photo" accept=".jpg,.jpeg,.png,.pdf" required />
        <label>Signature</label>
        <input type="file" name="signature" accept=".jpg,.jpeg,.png,.pdf" required />
        <label>ID Proof</label>
        <input type="file" name="id_proof" accept=".jpg,.jpeg,.png,.pdf" required />
        <label>Address Proof</label>
        <input type="file" name="address_proof" accept=".jpg,.jpeg,.png,.pdf" />

        {error && <div className="error-banner">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}