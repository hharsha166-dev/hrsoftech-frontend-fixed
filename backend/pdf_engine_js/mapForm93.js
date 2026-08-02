const PDF_W = 595.276;
const PDF_H = 841.89001;

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return [first, middle, last];
}

// Verified against the actual template's vector gridlines (pdfplumber),
// not guessed — every start_x/box_width below was measured directly from
// Form93-BHZ4PC5b.pdf.
function charGrid(page, key, top, bottom, boxStartX, boxWidth, numBoxes, text, fontSize = 7) {
  if (!text) return null;
  return { kind: 'char_grid', page_number: page, top, bottom, box_start_x: boxStartX, box_width: boxWidth, num_boxes: numBoxes, text, font_size: fontSize };
}

function plainBox(page, left, top, bottom, text, right = 560, fontSize = 8) {
  if (!text) return null;
  return {
    page_number: page,
    entry_bounding_box: [left + 4, top - 0.5, right, bottom + 0.5],
    entry_text: { text: String(text), font_size: fontSize },
  };
}

function tick(page, cx, top, bottom, halfW = 6) {
  return {
    page_number: page,
    entry_bounding_box: [cx - halfW, top - 0.3, cx + halfW, bottom + 0.3],
    entry_text: { text: 'X', font_size: Math.min(6, bottom - top - 0.6) },
  };
}

function buildFields(app) {
  const fields = [];
  const add = (f) => { if (f) fields.push(f); };
  const res = app.residence_address || {};
  const off = app.office_address || {};

const comm = (app.communication_address || '').toLowerCase();

  const [first, middle, last] = splitName(app.full_name);
  add(charGrid(1, 'first_name', 198.6, 205.6, 180.61, 15.35, 25, first));
  add(charGrid(1, 'middle_name', 212.0, 219.0, 180.73, 15.35, 25, middle));
  add(charGrid(1, 'last_name', 225.7, 232.7, 180.73, 15.35, 25, last));

const aadhaarFull = app.name_as_per_aadhaar || "";

add(charGrid(
  1,
  "aadhaar_name",
  255.4,
  262.4,
  180.61,
  15.35,
  75,
  aadhaarFull
));

  const gender = (app.gender || '').toLowerCase();
  const genderTickX = { male: 188.5, female: 234.7, transgender: 295.8 };
  if (genderTickX[gender] !== undefined) add(tick(1, genderTickX[gender], 297.0, 304.0));

  if (app.dob) {
  const parts = app.dob.split('-');

  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;

    add(charGrid(
      1,
      "dob_dd",
      309.6,
      318.0,
      178.0,
      15.35,
      2,
      dd,
      7
    ));

    add(charGrid(
      1,
      "dob_mm",
      309.6,
      318.0,
      225.0,
      15.35,
      2,
      mm,
      7
    ));

    add(charGrid(
      1,
      "dob_yyyy",
      309.6,
      318.0,
      272.0,
      15.35,
      4,
      yyyy,
      7
    ));
  }
}

  add(charGrid(1, 'aadhaar', 323.9, 330.9, 180.59, 14.9, 12, app.aadhaar_number));

if (comm === "residence") {

  add(charGrid(1, 'res_l1', 354.0, 361.0, 180.59, 15.34, 25, res.line1));
  add(charGrid(1, 'res_l2', 367.4, 374.4, 180.74, 15.34, 25, res.line2));
  add(charGrid(1, 'res_post', 380.8, 387.8, 180.81, 15.34, 25, res.post_office));
  add(charGrid(1, 'res_city', 394.2, 401.2, 180.95, 15.35, 25, res.city));
  add(charGrid(1, 'res_district', 407.7, 414.7, 181.02, 15.35, 25, res.district));
  add(plainBox(1, 135.0, 421.1, 428.1, res.state, 240));
  add(plainBox(1, 292.0, 421.1, 428.1, res.country, 410));
  add(charGrid(
  1,
  "res_pin",
  421.1,
  428.1,
  458.0,
  15.34,
  8,
  res.pincode,
  8
));
}

if (comm === "office") {
  add(charGrid(1, 'off_l1', 451.6, 458.6, 180.78, 15.35, 25, off.line1));
  add(charGrid(1, 'off_l2', 465.0, 472.0, 180.9, 15.34, 25, off.line2));
  add(charGrid(1, 'off_post', 478.4, 485.4, 180.9, 15.34, 25, off.post_office));
  add(charGrid(1, 'off_city', 491.8, 498.8, 180.73, 15.34, 25, off.city));
  add(charGrid(1, 'off_district', 505.2, 512.2, 180.61, 15.36, 25, off.district));
  add(plainBox(1, 135.0, 518.6, 525.6, off.state, 240));
add(plainBox(1, 292.0, 518.6, 525.6, off.country, 410));

add(charGrid(
  1,
  "off_pin",
  518.6,
  525.6,
  458.0,
  15.34,
  8,
  off.pincode,
  8
));
}
  const resStatus = (app.residential_status || '').toLowerCase();
  const resStatusX = { resident: 218.3, non_resident: 280.4, rnor: 357.6 };
  if (resStatusX[resStatus] !== undefined) add(tick(1, resStatusX[resStatus], 535.8, 541.8));

  add(charGrid(1, 'passport', 555.7, 562.7, 328.82, 14.74, 12, app.passport_number));
  add(charGrid(1, 'tin', 575.8, 582.8, 270.02, 14.74, 19, app.tin));

  add(charGrid(1, 'mobile_cc', 605.9, 612.9, 240.31, 14.74, 3, app.mobile_country_code));
  add(charGrid(1, 'mobile', 605.9, 612.9, 381.3, 14.74, 10, app.mobile));
  add({
  page_number: 1,
  entry_bounding_box: [280, 620.0, 535, 627.0]
  entry_text: {
    text: String(app.email || ''),
    font_size: 8
  }
});
  add(charGrid(1, 'landline_std', 632.7, 639.7, 214.8, 14.74, 6, app.landline_std_code));
  add(charGrid(1, 'landline_no', 632.7, 639.7, 396.0, 14.74, 8, app.landline_number));

  const incomeX = { salary: 186.8, business: 263.7, house_property: 402.1, capital_gains: 186.8, other: 263.8, none: 402.65 };
  const incomeY = { salary: [672.8, 678.8], business: [672.8, 678.8], house_property: [672.8, 678.8], capital_gains: [689.1, 695.1], other: [689.1, 695.1], none: [689.1, 695.1] };
  for (const src of (app.source_of_income || [])) {
    const key = src.toLowerCase();
    if (incomeX[key] !== undefined) { const [t, b] = incomeY[key]; add(tick(1, incomeX[key], t, b)); }
  }

  const singleParent = (app.single_parent || '').toLowerCase();
  const spX = { yes: 248.1, no: 309.6 };
  if (spX[singleParent] !== undefined) add(tick(1, spX[singleParent], 728.0, 734.0));

  const [fFirst, fMiddle, fLast] = splitName(app.father_name);
  add(charGrid(1, 'father_first', 742.9, 749.9, 179.67, 15.34, 25, fFirst));
  add(charGrid(1, 'father_middle', 756.0, 763.0, 179.81, 15.34, 25, fMiddle));
  add(charGrid(1, 'father_last', 769.4, 776.4, 179.67, 15.34, 25, fLast));

  const [mFirst, mMiddle, mLast] = splitName(app.mother_name);
  add(charGrid(2, 'mother_first', 25.8, 33.3, 179.67, 15.34, 25, mFirst));
  add(charGrid(2, 'mother_middle', 38.8, 45.8, 179.95, 15.35, 25, mMiddle));
  add(charGrid(2, 'mother_last', 52.2, 59.2, 179.53, 15.34, 25, mLast));

  const parentOnCard = (app.parent_on_card || '').toLowerCase();
  const pocX = { father: 341.0, mother: 402.4 };
  if (pocX[parentOnCard] !== undefined) add(tick(2, pocX[parentOnCard], 69.4, 75.4));

  add(charGrid(2, 'ao_area', 109.8, 116.8, 237.58, 15.34, 3, app.ao_area_code));
  add(charGrid(2, 'ao_type', 109.8, 116.8, 397.45, 15.35, 2, app.ao_type));
  add(charGrid(2, 'ao_range', 123.2, 130.2, 238.0, 15.35, 3, app.ao_range_code));
  add(charGrid(2, 'ao_no', 123.2, 130.2, 397.42, 15.34, 2, app.ao_no));

  const commX = { residence: 221.25, ra: 307.3, office: 453.2 };
  if (commX[comm] !== undefined) add(tick(2, commX[comm], 419.4, 425.4));

  const docAppX = { identity: 75.9, address: 174.5, dob: 275.4 };
  for (const d of (app.documents_applicant || [])) {
    if (docAppX[d] !== undefined) add(tick(2, docAppX[d], 476.5, 482.5));
  }

  return fields;
}

module.exports = { buildFields, PDF_W, PDF_H };
