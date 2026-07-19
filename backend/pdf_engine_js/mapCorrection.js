/**
 * Maps application data -> form_fields array for the PAN Correction form.
 * Direct port of map_correction.py — same coordinates, same logic.
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

const ROW_TICK_X = 82.5;

function buildFields(app) {
  const fields = [];
  const add = (f) => { if (f) fields.push(f); };
  const rowTick = (page, top, bottom) => add(tick(page, ROW_TICK_X, top, bottom));

  const res = app.residence_address || {};
  const changeFields = new Set(app.change_fields || []);

  // ---------------- PAGE 1 ----------------
  add(textField(1, 358.3, 77.2, 84.2, app.pan_number, 560));
  add(textField(1, 328.9, 118.0, 125.0, app.aadhaar_number, 560));

  if (changeFields.has('name')) rowTick(1, 193.6, 199.6);
  const [first, middle, last] = splitName(app.full_name);
  add(textField(1, 129.4, 207.5, 214.5, first));
  add(textField(1, 135.7, 220.9, 227.9, middle));
  add(textField(1, 129.1, 234.6, 241.6, last));

  if (changeFields.has('name_aadhaar')) rowTick(1, 251.9, 257.9);
  const aadName = app.name_as_per_aadhaar || {};
  add(textField(1, 129.4, 264.9, 271.9, aadName.first));
  add(textField(1, 135.7, 278.3, 285.3, aadName.middle));
  add(textField(1, 129.1, 291.7, 298.7, aadName.last));

  if (changeFields.has('gender')) rowTick(1, 306.4, 312.4);
  const gender = (app.gender || '').toLowerCase();
  const genderTickX = { male: 201.0, female: 250.5, transgender: 309.1 };
  if (genderTickX[gender] !== undefined) add(tick(1, genderTickX[gender] + 5, 306.1, 312.1));

  if (changeFields.has('dob')) rowTick(1, 319.8, 325.8);
  if (app.dob) {
    const parts = app.dob.split('-');
    if (parts.length === 3) {
      const [y, m, dd] = parts;
      add({ page_number: 1, entry_bounding_box: [189, 319.4, 222, 327.6], entry_text: { text: dd, font_size: 7 } });
      add({ page_number: 1, entry_bounding_box: [236, 319.4, 268, 327.6], entry_text: { text: m, font_size: 7 } });
      add({ page_number: 1, entry_bounding_box: [283, 319.4, 330, 327.6], entry_text: { text: y, font_size: 7 } });
    }
  }

  if (changeFields.has('address')) rowTick(1, 336.6, 342.6);
  const addrType = (app.address_type || 'residence').toLowerCase();
  const addrTypeX = { residence: 180.7, office: 263.1 };
  if (addrTypeX[addrType] !== undefined) add(tick(1, addrTypeX[addrType] + 5, 353.7, 359.7));
  add(textField(1, 111.7, 368.0, 375.0, res.line1));
  add(textField(1, 126.8, 381.4, 388.4, res.line2));
  add(textField(1, 90.4, 394.8, 401.8, res.post_office));
  add(textField(1, 128.9, 408.2, 415.2, res.city));
  add(textField(1, 75.4, 421.6, 428.6, res.district));
  add(textField(1, 119.8, 435.0, 442.0, res.state, 227));
  add(textField(1, 276.5, 435.0, 442.0, res.country, 396));
  add(textField(1, 447.0, 435.0, 442.0, res.pincode, 560));

  if (changeFields.has('passport')) rowTick(1, 448.7, 454.7);
  add(textField(1, 157.3, 448.8, 455.8, app.passport_number));

  if (changeFields.has('tin')) rowTick(1, 462.1, 468.1);
  add(textField(1, 288.6, 462.2, 469.2, app.tin));

  if (changeFields.has('contact')) rowTick(1, 492.4, 498.4);
  add(textField(1, 260.0, 511.9, 518.9, app.mobile_country_code, 349));
  add(textField(1, 396.8, 511.9, 518.9, app.mobile));
  add(textField(1, 92.2, 525.3, 532.3, app.email));
  add(textField(1, 273.6, 538.7, 545.7, app.landline_isd_code, 352));
  add(textField(1, 129.0, 551.7, 558.7, app.landline_std_code, 216));
  add(textField(1, 272.5, 561.7, 568.7, app.landline_number));

  if (changeFields.has('father_name')) rowTick(1, 607.7, 613.7);
  const [fFirst, fMiddle, fLast] = splitName(app.father_name);
  add(textField(1, 162.9, 607.8, 614.8, fFirst));
  add(textField(1, 162.1, 620.8, 627.8, fMiddle));
  add(textField(1, 158.8, 634.3, 641.3, fLast));

  if (changeFields.has('mother_name')) rowTick(1, 648.0, 654.0);
  const [mFirst, mMiddle, mLast] = splitName(app.mother_name);
  add(textField(1, 164.7, 648.0, 655.0, mFirst));
  add(textField(1, 163.5, 661.1, 668.1, mMiddle));
  add(textField(1, 160.2, 674.5, 681.5, mLast));

  const parentOnCard = (app.parent_on_card || '').toLowerCase();
  const pocX = { father: 375.4, mother: 439.6 };
  if (pocX[parentOnCard] !== undefined) add(tick(1, pocX[parentOnCard] - 30, 691.6, 697.6));

  const docX = { identity: 70.5, address: 169.1, dob: 270.0 };
  for (const d of (app.documents || [])) {
    if (docX[d] !== undefined) add(tick(1, docX[d] + 5, 752.8, 758.8));
  }
  const docX2 = { other_proof: 70.5, pan_copy: 269.9 };
  for (const d of (app.documents || [])) {
    if (docX2[d] !== undefined) add(tick(1, docX2[d] + 5, 776.8, 782.8));
  }

  // Page 2 (Verification & Declaration) is filled by hand at signing time.
  return fields;
}

module.exports = { buildFields, PDF_W, PDF_H };