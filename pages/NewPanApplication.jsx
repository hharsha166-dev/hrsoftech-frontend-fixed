import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const GENDER_OPTIONS = ['Male', 'Female', 'Transgender'];
const PAN_CATEGORY_OPTIONS = [
  'Individual', 'Association of Persons', 'Body of Individuals', 'Firm',
  'Limited Liability Partnership', 'Government', 'Hindu Undivided Family',
  'Artificial Juridical Person', 'Local Authority', 'Trust',
];
const RESIDENTIAL_STATUS_OPTIONS = [
  { value: 'resident', label: 'Resident' },
  { value: 'non_resident', label: 'Non Resident' },
  { value: 'rnor', label: 'Resident but Not Ordinarily Resident' },
];
const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS', 'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR',
  'CHANDIGARH', 'CHHATTISGARH', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DELHI', 'GOA',
  'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR', 'JHARKHAND', 'KARNATAKA',
  'KERALA', 'LADAKH', 'LAKSHADWEEP', 'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA',
  'MIZORAM', 'NAGALAND', 'ODISHA', 'PONDICHERRY', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU',
  'TELANGANA', 'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
];
const SOURCE_OF_INCOME_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'business', label: 'Income from Business/Profession' },
  { value: 'house_property', label: 'Income from House Property' },
  { value: 'capital_gains', label: 'Capital Gains' },
  { value: 'other', label: 'Income from Other Sources' },
  { value: 'none', label: 'No Income' },
];
const DOCUMENT_OPTIONS = [
  'AADHAAR Card', 'Voter ID Card', 'Driving License', 'Passport',
  'Ration Card with photo', 'Photo ID issued by Government',
  'Pensioner Card with photo', 'Central Government Health Scheme Card',
  'Property Registration Document', 'Electricity Bill (not more than 3 months old)',
  'Bank Account Statement (not more than 3 months old)', 'Bank Pass Book with photo',
  'Post Office Pass Book with address', 'Employer Certificate in original',
];

const emptyForm = {
  category_of_applicant: 'Individual',
  first_name: '', middle_name: '', last_name: '',
  name_as_per_aadhaar: '', gender: '', dob: '', aadhaar_number: '',
  communication_address: 'residence',
  address_line1: '', address_line2: '', post_office: '', city: '', district: '', state: '', pincode: '',
  office_address_line1: '', office_address_line2: '', office_post_office: '', office_city: '',
  office_district: '', office_state: '', office_pincode: '',
  residential_status: 'resident',
  mobile: '', email: '',
  source_of_income: [],
  parent_on_card: 'father',
  father_first: '', father_middle: '', father_last: '',
  mother_first: '', mother_middle: '', mother_last: '',
  ao_area_code: '', ao_type: '', ao_range_code: '', ao_no: '',
  proof_of_identity: '', proof_of_address: '', proof_of_dob: '', verifier_name: '',
};

export default function NewPanApplication() {
  const navigate = useNavigate();
const { id } = useParams();
const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [applicationId, setApplicationId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

useEffect(() => {
  if (!isEdit) return;

  api.get(`/applications/${id}`)
    .then((res) => {
      const a = res.data.application;

      setForm((f) => ({
        ...f,
        ...a,
        source_of_income: a.source_of_income
          ? JSON.parse(a.source_of_income)
          : [],
      }));

      setApplicationId(a.id);
    })
    .catch(console.error);
}, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleIncome(value) {
    setForm((f) => {
      let next;
      if (value === 'none') {
        next = f.source_of_income.includes('none') ? [] : ['none'];
      } else {
        const withoutNone = f.source_of_income.filter((v) => v !== 'none');
        next = withoutNone.includes(value)
          ? withoutNone.filter((v) => v !== value)
          : [...withoutNone, value];
      }
      return { ...f, source_of_income: next };
    });
  }

  async function handleSubmitDetails(e) {
    e.preventDefault();
    setError('');
    if (!form.last_name) return setError('Last Name is required');
    if (!form.gender) return setError('Gender is required');
    if (!form.dob) return setError('Date of Birth is required');

    setLoading(true);
    try {
      const full_name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');
      const father_name = [form.father_first, form.father_middle, form.father_last].filter(Boolean).join(' ');
      const mother_name = [form.mother_first, form.mother_middle, form.mother_last].filter(Boolean).join(' ');

      const { data } = await api.post('/applications', {
        application_type: 'new_pan',
        category_of_applicant: form.category_of_applicant,
        full_name,
        name_as_per_aadhaar: form.name_as_per_aadhaar,
        gender: form.gender.toLowerCase(),
        dob: form.dob,
        aadhaar_number: form.aadhaar_number,
        communication_address: form.communication_address,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        post_office: form.post_office,
        city: form.city,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        office_address_line1: form.office_address_line1,
        office_address_line2: form.office_address_line2,
        office_post_office: form.office_post_office,
        office_city: form.office_city,
        office_district: form.office_district,
        office_state: form.office_state,
        office_pincode: form.office_pincode,
        residential_status: form.residential_status,
        mobile: form.mobile,
        email: form.email,
        source_of_income: form.source_of_income,
        parent_on_card: form.parent_on_card,
        father_name,
        mother_name,
        ao_area_code: form.ao_area_code,
        ao_type: form.ao_type,
        ao_range_code: form.ao_range_code,
        ao_no: form.ao_no,
        proof_of_identity: form.proof_of_identity,
        proof_of_address: form.proof_of_address,
        proof_of_dob: form.proof_of_dob,
        verifier_name: form.verifier_name,
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
        <div className="section-title">Application For New PAN</div>

        <label>Category Of Applicant *</label>
        <select value={form.category_of_applicant} onChange={(e) => update('category_of_applicant', e.target.value)} required>
          {PAN_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="helper-text">
          Note: only "Individual" applications auto-fill Form 93 correctly right now.
          Other categories use a different official form — support for those is coming soon.
        </p>

        <div className="section-title">Personal Information</div>
        <label>First Name</label>
        <input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
        <label>Middle Name</label>
        <input value={form.middle_name} onChange={(e) => update('middle_name', e.target.value)} />
        <label>Last Name/Surname *</label>
        <input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} required />
        <label>Name In Aadhaar *</label>
        <input value={form.name_as_per_aadhaar} onChange={(e) => update('name_as_per_aadhaar', e.target.value)} required />
        <label>Gender *</label>
        <select value={form.gender} onChange={(e) => update('gender', e.target.value)} required>
          <option value="">--Select--</option>
          {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label>Date Of Birth *</label>
        <input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} required />
        <label>Aadhaar Number *</label>
        <input value={form.aadhaar_number} onChange={(e) => update('aadhaar_number', e.target.value)} required />

        <label>Address For Communication *</label>
        <select value={form.communication_address} onChange={(e) => update('communication_address', e.target.value)}>
          <option value="residence">Residence</option>
          <option value="office">Office</option>
        </select>

        <div className="section-title">Residence Address</div>
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

        <div className="section-title">Office Address (optional)</div>
        <input placeholder="Flat/Door/Building" value={form.office_address_line1} onChange={(e) => update('office_address_line1', e.target.value)} />
        <input placeholder="Road/Street" value={form.office_address_line2} onChange={(e) => update('office_address_line2', e.target.value)} />
        <input placeholder="Post Office" value={form.office_post_office} onChange={(e) => update('office_post_office', e.target.value)} />
        <input placeholder="City" value={form.office_city} onChange={(e) => update('office_city', e.target.value)} />
        <input placeholder="District" value={form.office_district} onChange={(e) => update('office_district', e.target.value)} />
        <input placeholder="State" value={form.office_state} onChange={(e) => update('office_state', e.target.value)} />
        <input placeholder="Pincode" value={form.office_pincode} onChange={(e) => update('office_pincode', e.target.value)} />

        <label>Residential Status</label>
        <select value={form.residential_status} onChange={(e) => update('residential_status', e.target.value)}>
          {RESIDENTIAL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label>Mobile No. *</label>
        <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} required />
        <label>Email ID *</label>
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />

        <div className="section-title">Source of Income</div>
        {SOURCE_OF_INCOME_OPTIONS.map((o) => (
          <label key={o.value} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={form.source_of_income.includes(o.value)}
              onChange={() => toggleIncome(o.value)}
            /> {o.label}
          </label>
        ))}

        <p className="helper-text">Select either father's or mother's name to be printed on the PAN card.</p>
        <label>Guardian Name Print On Card</label>
        <select value={form.parent_on_card} onChange={(e) => update('parent_on_card', e.target.value)}>
          <option value="father">Father's Name</option>
          <option value="mother">Mother's Name</option>
        </select>

        <div className="section-title">Father's Name</div>
        <input placeholder="First Name" value={form.father_first} onChange={(e) => update('father_first', e.target.value)} />
        <input placeholder="Middle Name" value={form.father_middle} onChange={(e) => update('father_middle', e.target.value)} />
        <input placeholder="Last Name/Surname" value={form.father_last} onChange={(e) => update('father_last', e.target.value)} />

        <div className="section-title">Mother's Name</div>
        <input placeholder="First Name" value={form.mother_first} onChange={(e) => update('mother_first', e.target.value)} />
        <input placeholder="Middle Name" value={form.mother_middle} onChange={(e) => update('mother_middle', e.target.value)} />
        <input placeholder="Last Name/Surname" value={form.mother_last} onChange={(e) => update('mother_last', e.target.value)} />

        <div className="section-title">Assessing Officer (AO) Code *</div>
        <p className="helper-text">
          Find your AO Code at{' '}
          <a href="https://www.tin-nsdl.com/services/pan/pan-aocode.html" target="_blank" rel="noreferrer">
            tin-nsdl.com/services/pan/pan-aocode.html
          </a>
        </p>
        <input placeholder="Area Code *" value={form.ao_area_code} onChange={(e) => update('ao_area_code', e.target.value)} required />
        <input placeholder="AO Type *" value={form.ao_type} onChange={(e) => update('ao_type', e.target.value)} required />
        <input placeholder="Range Code *" value={form.ao_range_code} onChange={(e) => update('ao_range_code', e.target.value)} required />
        <input placeholder="AO No. *" value={form.ao_no} onChange={(e) => update('ao_no', e.target.value)} required />

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
        <label>Proof Of DOB</label>
        <select value={form.proof_of_dob} onChange={(e) => update('proof_of_dob', e.target.value)}>
          <option value="">--Select--</option>
          {DOCUMENT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <label>Verifier Name (optional)</label>
        <input value={form.verifier_name} onChange={(e) => update('verifier_name', e.target.value)} />

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
          Generate the Form 93 sample with the details you just entered. Print it, get it
          signed/thumb-impressed by the applicant, and upload the signed photo below before submitting.
        </p>
        {pdfError && <div className="error-banner">{pdfError}</div>}
        <button type="button" className="btn btn-secondary" onClick={handleGeneratePdf} disabled={pdfLoading}>
          {pdfLoading ? 'Generating...' : 'Generate Sample PDF'}
        </button>
        {pdfUrl && (
          <div style={{ marginTop: 12 }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" download={`${applicationId}-form93-sample.pdf`} className="btn btn-primary">
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
