/**
 * Adapts a flat `applications` DB row into the shape mapForm93/mapCorrection
 * expect. Every field below now comes from an actual DB column (added in
 * db.js) instead of being hardcoded, so whatever the retailer enters in
 * the form ends up in the PDF.
 */
function safeJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function adaptRow(row) {
  const residenceAddress = {
    line1: row.address_line1 || '',
    line2: row.address_line2 || '',
    post_office: row.post_office || '',
    city: row.city || '',
    district: row.district || '',
    state: row.state || '',
    country: 'India',
    pincode: row.pincode || '',
  };

  const officeAddress = {
    line1: row.office_address_line1 || '',
    line2: row.office_address_line2 || '',
    post_office: row.office_post_office || '',
    city: row.office_city || '',
    district: row.office_district || '',
    state: row.office_state || '',
    country: 'India',
    pincode: row.office_pincode || '',
  };

  return {
    full_name: row.full_name || '',
    name_as_per_aadhaar: row.name_as_per_aadhaar || '',
    gender: (row.gender || '').toLowerCase(),
    dob: row.dob || '',
    aadhaar_number: row.aadhaar_number || '',
    residence_address: residenceAddress,
    office_address: officeAddress,
    residential_status: (row.residential_status || 'resident').toLowerCase(),
    passport_number: row.passport_number || '',
    tin: row.tin || '',
    mobile_country_code: row.mobile_country_code || (row.mobile ? '91' : ''),
    mobile: row.mobile || '',
    email: row.email || '',
    landline_isd_code: row.landline_isd_code || '',
    landline_std_code: row.landline_std_code || '',
    landline_number: row.landline_number || '',
    source_of_income: safeJsonArray(row.source_of_income),
    single_parent: (row.single_parent || '').toLowerCase(),
    father_name: row.father_name || '',
    mother_name: row.mother_name || '',
    parent_on_card: (row.parent_on_card || (row.father_name ? 'father' : (row.mother_name ? 'mother' : ''))).toLowerCase(),
    communication_address: (row.communication_address || 'residence').toLowerCase(),
    ao_area_code: row.ao_area_code || '',
    ao_type: row.ao_type || '',
    ao_range_code: row.ao_range_code || '',
    ao_no: row.ao_no || '',
    documents_applicant: [
      row.proof_of_identity ? 'identity' : null,
      row.proof_of_address ? 'address' : null,
      row.proof_of_dob ? 'dob' : null,
    ].filter(Boolean),
    documents_ra: [],

    // correction-form-specific
    pan_number: row.existing_pan || '',
    address_type: (row.communication_address || 'residence').toLowerCase(),
    change_fields: safeJsonArray(row.correction_fields),
    documents: [
      row.proof_of_identity ? 'identity' : null,
      row.proof_of_address ? 'address' : null,
      row.existing_pan ? 'pan_copy' : null,
    ].filter(Boolean),
  };
}

module.exports = { adaptRow };