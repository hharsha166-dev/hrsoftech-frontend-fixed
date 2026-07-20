/**
 * Maps application data -> form_fields array for Form 93 (Application for
 * Allotment of PAN). This is a direct port of the original Python
 * map_form93.py — same coordinates, same logic — so no field position
 * needs re-verifying. Only the language changed (Python -> JS) so the
 * whole PDF engine can run without a python3 runtime.
 */

const PDF_W = 595.276;
const PDF_H = 841.89001;

function splitName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  return [first, middle, last];
}

function textField(page, left, top, bottom, text, right = 560, fontSize = 8) {
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

  // ---------------- PAGE 1 ----------------
  const [first, middle, last] = splitName(app.full_name);
  add(textField(1, 87.2, 198.6, 205.6, first));
  add(textField(1, 93.5, 212.0, 219.0, middle));
  add(textField(1, 86.8, 225.7, 232.7, last));

  const gender = (app.gender || '').toLowerCase();
  const genderTickX = { male: 188.5, female: 234.7, transgender: 295.8 };
  if (genderTickX[gender] !== undefined) {
    add(tick(1, genderTickX[gender], 297.0, 304.0));
  }

  if (app.dob) {
    const parts = app.dob.split('-');
    if (parts.length === 3) {
      const [y, m, dd] = parts;
      add({ page_number: 1, entry_bounding_box: [193, 309.6, 224, 318.0], entry_text: { text: dd, font_size: 7 } });
      add({ page_number: 1, entry_bounding_box: [240, 309.6, 271, 318.0], entry_text: { text: m, font_size: 7 } });
      add({ page_number: 1, entry_bounding_box: [287, 309.6, 335, 318.0], entry_text: { text: y, font_size: 7 } });
    }
  }

  add(textField(1, 114.6, 323.9, 330.9, app.aadhaar_number));

  add(textField(1, 112.0, 354.0, 361.0, res.line1));
  add(textField(1, 127.1, 367.4, 374.4, res.line2));
  add(textField(1, 90.4, 380.8, 387.8, res.post_office));
  add(textField(1, 129.1, 394.2, 401.2, res.city));
  add(textField(1, 75.6, 407.7, 414.7, res.district));
  add(textField(1, 120.0, 421.1, 428.1, res.state, 225));
  add(textField(1, 276.7, 421.1, 428.1, res.country, 396));
  add(textField(1, 449.2, 421.1, 428.1, res.pincode, 560));

  add(textField(1, 112.0, 451.6, 458.6, off.line1));
  add(textField(1, 127.1, 465.0, 472.0, off.line2));
  add(textField(1, 90.4, 478.4, 485.4, off.post_office));
  add(textField(1, 129.1, 491.8, 498.8, off.city));
  add(textField(1, 75.6, 505.2, 512.2, off.district));
  add(textField(1, 120.0, 518.6, 525.6, off.state, 225));
  add(textField(1, 276.7, 518.6, 525.6, off.country, 396));
  add(textField(1, 449.2, 518.6, 525.6, off.pincode, 560));

  const resStatus = (app.residential_status || '').toLowerCase();
  const resStatusX = { resident: 218.3, non_resident: 280.4, rnor: 357.6 };
  if (resStatusX[resStatus] !== undefined) {
    add(tick(1, resStatusX[resStatus], 535.8, 541.8));
  }

  add(textField(1, 117.1, 555.7, 562.7, app.passport_number));
  add(textField(1, 265.1, 575.8, 582.8, app.tin));

  add(textField(1, 225.6, 605.9, 612.9, app.mobile_country_code, 310));
  add(textField(1, 359.4, 605.9, 612.9, app.mobile));
  add(textField(1, 92.4, 619.3, 626.3, app.email));
  add(textField(1, 214.8, 632.7, 639.7, app.landline_std_code, 310));
  add(textField(1, 365.2, 632.7, 639.7, app.landline_number));

  const incomeX = {
    salary: 186.8, business: 263.7, house_property: 402.1,
    capital_gains: 186.8, other: 263.8, none: 402.65,
  };
  const incomeY = {
    salary: [672.8, 678.8], business: [672.8, 678.8], house_property: [672.8, 678.8],
    capital_gains: [689.1, 695.1], other: [689.1, 695.1], none: [689.1, 695.1],
  };
  for (const src of (app.source_of_income || [])) {
    const key = src.toLowerCase();
    if (incomeX[key] !== undefined) {
      const [t, b] = incomeY[key];
      add(tick(1, incomeX[key], t, b));
    }
  }

  const singleParent = (app.single_parent || '').toLowerCase();
  const spX = { yes: 248.1, no: 309.6 };
  if (spX[singleParent] !== undefined) {
    add(tick(1, spX[singleParent], 728.0, 734.0));
  }

  const [fFirst, fMiddle, fLast] = splitName(app.father_name);
  add(textField(1, 120.7, 742.9, 749.9, fFirst));
  add(textField(1, 120.0, 756.0, 763.0, fMiddle));
  add(textField(1, 116.8, 769.4, 776.4, fLast));

  // ---------------- PAGE 2 ----------------
  const [mFirst, mMiddle, mLast] = splitName(app.mother_name);
  add(textField(2, 119.0, 25.8, 33.3, mFirst));
  add(textField(2, 117.9, 38.8, 45.8, mMiddle));
  add(textField(2, 114.7, 52.2, 59.2, mLast));

  const parentOnCard = (app.parent_on_card || '').toLowerCase();
  const pocX = { father: 341.0, mother: 402.4 };
  if (pocX[parentOnCard] !== undefined) {
    add(tick(2, pocX[parentOnCard], 69.4, 75.4));
  }

  add(textField(2, 226.6, 109.8, 116.8, app.ao_area_code, 320));
  add(textField(2, 359.7, 109.8, 116.8, app.ao_type));
  add(textField(2, 232.1, 123.2, 130.2, app.ao_range_code, 320));
  add(textField(2, 357.8, 123.2, 130.2, app.ao_no));

  const [raFirst, raMiddle, raLast] = splitName(app.ra_name);
  add(textField(2, 109.1, 167.5, 174.5, raFirst));
  add(textField(2, 108.9, 180.6, 187.6, raMiddle));
  add(textField(2, 105.6, 194.0, 201.0, raLast));
  add(textField(2, 150.0, 209.7, 216.7, app.ra_pan));
  add(textField(2, 111.8, 226.0, 233.0, app.ra_aadhaar));

  const ra = app.ra_address || {};
  add(textField(2, 110.8, 257.3, 264.3, ra.line1));
  add(textField(2, 125.9, 270.7, 277.7, ra.line2));
  add(textField(2, 89.3, 284.1, 291.1, ra.post_office));
  add(textField(2, 127.9, 297.5, 304.5, ra.city));
  add(textField(2, 74.4, 310.9, 317.9, ra.district));
  add(textField(2, 118.9, 324.3, 331.3, ra.state, 223));
  add(textField(2, 272.2, 324.3, 331.3, ra.country, 393));
  add(textField(2, 443.4, 324.3, 331.3, ra.pincode, 560));

  add(textField(2, 222.5, 355.4, 362.4, app.ra_mobile_country_code, 303));
  add(textField(2, 351.0, 355.4, 362.4, app.ra_mobile));
  add(textField(2, 91.2, 369.4, 376.4, app.ra_email));
  add(textField(2, 215.4, 383.4, 390.4, app.ra_landline_std_code, 302));
  add(textField(2, 355.8, 383.4, 390.4, app.ra_landline_number));

  const comm = (app.communication_address || '').toLowerCase();
  const commX = { residence: 221.25, ra: 307.3, office: 453.2 };
  if (commX[comm] !== undefined) {
    add(tick(2, commX[comm], 419.4, 425.4));
  }

  const docAppX = { identity: 75.9, address: 174.5, dob: 275.4 };
  for (const d of (app.documents_applicant || [])) {
    if (docAppX[d] !== undefined) add(tick(2, docAppX[d], 476.5, 482.5));
  }

  const docRaX = { identity: 75.9, address: 174.5 };
  for (const d of (app.documents_ra || [])) {
    if (docRaX[d] !== undefined) add(tick(2, docRaX[d], 513.6, 519.6));
  }

  return fields;
}

module.exports = { buildFields, PDF_W, PDF_H };