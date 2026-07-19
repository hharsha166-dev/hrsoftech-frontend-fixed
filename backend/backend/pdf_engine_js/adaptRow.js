/**
 * Adapts a flat `applications` DB row into the shape mapForm93/mapCorrection
 * expect. Direct port of adapt_row.py.
 */
function adaptRow(row) {
  const address = {
    line1: row.address_line1 || '',
    line2: row.address_line2 || '',
    post_office: '',
    city: row.city || '',
    district: '',
    state: row.state || '',
    country: 'India',
    pincode: row.pincode || '',
  };

  let changeFields = [];
  if (row.correction_fields) {
    try {
      changeFields = JSON.parse(row.correction_fields);
    } catch (_) {
      changeFields = [];
    }
  }

  return {
    full_name: row.full_name || '',
    gender: (row.gender || '').toLowerCase(),
    dob: row.dob || '',
    aadhaar_number: row.aadhaar_number || '',
    residence_address: address,
    office_address: {},
    residential_status: 'resident',
    passport_number: '',
    tin: '',
    mobile_country_code: row.mobile ? '91' : '',
    mobile: row.mobile || '',
    email: row.email || '',
    landline_std_code: '',
    landline_number: '',
    source_of_income: [],
    single_parent: '',
    father_name: row.father_name || '',
    mother_name: row.mother_name || '',
    parent_on_card: row.father_name ? 'father' : (row.mother_name ? 'mother' : ''),
    communication_address: 'residence',
    documents_applicant: ['identity', 'address', 'dob'],
    documents_ra: [],

    pan_number: row.existing_pan || '',
    name_as_per_aadhaar: {},
    address_type: 'residence',
    change_fields: changeFields,
    documents: ['identity', 'address', 'pan_copy'],
  };
}

module.exports = { adaptRow };