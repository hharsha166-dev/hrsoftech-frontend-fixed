"""
Maps application data -> fields.json for Form 93 (Application for Allotment of PAN).
Coordinates were extracted from the official Form 93 PDF's text/line structure
(pdfplumber) and hand-verified against rendered page images.

Input `app` dict keys (matches the `applications` table already used by the
hrsoftech-pan-portal backend):
  full_name, gender ('male'/'female'/'transgender'), dob ('YYYY-MM-DD'),
  aadhaar_number, residence_address {line1, line2, post_office, city,
  district, state, country, pincode}, office_address {...same keys...},
  residential_status ('resident'/'non_resident'/'rnor'),
  passport_number, tin, mobile_country_code, mobile, email,
  landline_std_code, landline_number, source_of_income (list of:
  'salary','business','house_property','capital_gains','other','none'),
  single_parent ('yes'/'no'), father_name, mother_name,
  parent_on_card ('father'/'mother'),
  ao_area_code, ao_type, ao_range_code, ao_no,
  ra_name, ra_pan, ra_aadhaar, ra_address {...}, ra_mobile_country_code,
  ra_mobile, ra_email, ra_landline_std_code, ra_landline_number,
  communication_address ('residence'/'ra'/'office'),
  documents_applicant (list of: 'identity','address','dob'),
  documents_ra (list of: 'identity','address')
"""

PDF_W, PDF_H = 595.276, 841.89001


def _split_name(full_name):
    parts = (full_name or "").split()
    first = parts[0] if parts else ""
    middle = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    last = parts[-1] if len(parts) > 1 else ""
    return first, middle, last


def _text_field(page, description, left, top, bottom, text, right=560, font_size=9):
    return {
        "page_number": page,
        "description": description,
        "field_label": description,
        "label_bounding_box": [max(left - 15, 0), top, left, bottom],
        "entry_bounding_box": [left + 4, top - 0.5, right, bottom + 0.5],
        "entry_text": {"text": str(text), "font_size": font_size},
    }


def _tick(page, description, cx, top, bottom, half_w=6):
    """Small X mark centered at cx to fill a printed 'Tick' box."""
    return {
        "page_number": page,
        "description": description,
        "field_label": description,
        "label_bounding_box": [cx - half_w, top - 3.2, cx + half_w, top - 0.4],
        "entry_bounding_box": [cx - half_w, top - 0.3, cx + half_w, bottom + 0.3],
        "entry_text": {"text": "X", "font_size": min(6, bottom - top - 0.6)},
    }


def build_fields(app: dict):
    fields = []
    add = fields.append

    def T(description, page, left, top, bottom, text, right=560, font_size=8):
        if text:
            add(_text_field(page, description, left, top, bottom, text, right, font_size))

    def TICK(description, page, cx, top, bottom):
        add(_tick(page, description, cx, top, bottom))

    ra = app.get("ra_address", {}) or {}
    res = app.get("residence_address", {}) or {}
    off = app.get("office_address", {}) or {}

    # ---------------- PAGE 1 ----------------
    first, middle, last = _split_name(app.get("full_name", ""))
    T("First Name", 1, 87.2, 198.6, 205.6, first)
    T("Middle Name", 1, 93.5, 212.0, 219.0, middle)
    T("Last Name", 1, 86.8, 225.7, 232.7, last)

    gender = (app.get("gender") or "").lower()
    gender_tick_x = {"male": 202.0, "female": 250.5, "transgender": 309.1}
    if gender in gender_tick_x:
        TICK(f"Gender: {gender}", 1, gender_tick_x[gender] + 5, 297.0, 304.0)

    dob = app.get("dob", "")
    if dob:
        try:
            y, m, dd = dob.split("-")
            add({"page_number": 1, "description": "DOB day", "field_label": "dd",
                 "label_bounding_box": [186.2, 296.0, 190.2, 303.0],
                 "entry_bounding_box": [193, 309.6, 224, 318.0], "entry_text": {"text": dd, "font_size": 7}})
            add({"page_number": 1, "description": "DOB month", "field_label": "mm",
                 "label_bounding_box": [231.7, 296.0, 237.7, 303.0],
                 "entry_bounding_box": [240, 309.6, 271, 318.0], "entry_text": {"text": m, "font_size": 7}})
            add({"page_number": 1, "description": "DOB year", "field_label": "yyyy",
                 "label_bounding_box": [278.3, 296.0, 281.9, 303.0],
                 "entry_bounding_box": [287, 309.6, 335, 318.0], "entry_text": {"text": y, "font_size": 7}})
        except ValueError:
            pass

    T("Aadhaar Number", 1, 114.6, 323.9, 330.9, app.get("aadhaar_number", ""))

    T("Residence Flat/Door/Building", 1, 112.0, 354.0, 361.0, res.get("line1", ""))
    T("Residence Road/Street", 1, 127.1, 367.4, 374.4, res.get("line2", ""))
    T("Residence Post Office", 1, 90.4, 380.8, 387.8, res.get("post_office", ""))
    T("Residence City", 1, 129.1, 394.2, 401.2, res.get("city", ""))
    T("Residence District", 1, 75.6, 407.7, 414.7, res.get("district", ""))
    T("Residence State", 1, 120.0, 421.1, 428.1, res.get("state", ""), right=225)
    T("Residence Country", 1, 276.7, 421.1, 428.1, res.get("country", ""), right=396)
    T("Residence PIN", 1, 449.2, 421.1, 428.1, res.get("pincode", ""), right=560)

    T("Office Flat/Door/Building", 1, 112.0, 451.6, 458.6, off.get("line1", ""))
    T("Office Road/Street", 1, 127.1, 465.0, 472.0, off.get("line2", ""))
    T("Office Post Office", 1, 90.4, 478.4, 485.4, off.get("post_office", ""))
    T("Office City", 1, 129.1, 491.8, 498.8, off.get("city", ""))
    T("Office District", 1, 75.6, 505.2, 512.2, off.get("district", ""))
    T("Office State", 1, 120.0, 518.6, 525.6, off.get("state", ""), right=225)
    T("Office Country", 1, 276.7, 518.6, 525.6, off.get("country", ""), right=396)
    T("Office PIN", 1, 449.2, 518.6, 525.6, off.get("pincode", ""), right=560)

    res_status = (app.get("residential_status") or "").lower()
    res_status_x = {"resident": 233.0, "non_resident": 295.1, "rnor": 372.3}
    if res_status in res_status_x:
        TICK(f"Residential Status: {res_status}", 1, res_status_x[res_status] - 20, 535.8, 541.8)

    T("Passport Number", 1, 117.1, 555.7, 562.7, app.get("passport_number", ""))
    T("TIN", 1, 265.1, 575.8, 582.8, app.get("tin", ""))

    T("Mobile Country Code", 1, 225.6, 605.9, 612.9, app.get("mobile_country_code", ""), right=310)
    T("Mobile Number", 1, 359.4, 605.9, 612.9, app.get("mobile", ""))
    T("Email ID", 1, 92.4, 619.3, 626.3, app.get("email", ""))
    T("Landline STD Code", 1, 214.8, 632.7, 639.7, app.get("landline_std_code", ""), right=310)
    T("Landline Number", 1, 365.2, 632.7, 639.7, app.get("landline_number", ""))

    income_x = {
        "salary": 181.4, "business": 258.3, "house_property": 396.7,
        "capital_gains": 181.4, "other": 258.4, "none": 397.3,
    }
    income_y = {
        "salary": (672.8, 678.8), "business": (672.8, 678.8), "house_property": (672.8, 678.8),
        "capital_gains": (689.1, 695.1), "other": (689.1, 695.1), "none": (689.1, 695.1),
    }
    for src in (app.get("source_of_income") or []):
        key = src.lower()
        if key in income_x:
            top, bottom = income_y[key]
            TICK(f"Source of Income: {key}", 1, income_x[key] + 5, top, bottom)

    single_parent = (app.get("single_parent") or "").lower()
    sp_x = {"yes": 242.7, "no": 304.2}
    if single_parent in sp_x:
        TICK(f"Single parent: {single_parent}", 1, sp_x[single_parent] + 5, 728.0, 734.0)

    f_first, f_middle, f_last = _split_name(app.get("father_name", ""))
    T("Father First Name", 1, 120.7, 742.9, 749.9, f_first)
    T("Father Middle Name", 1, 120.0, 756.0, 763.0, f_middle)
    T("Father Last Name", 1, 116.8, 769.4, 776.4, f_last)

    # ---------------- PAGE 2 ----------------
    m_first, m_middle, m_last = _split_name(app.get("mother_name", ""))
    T("Mother First Name", 2, 119.0, 25.8, 33.3, m_first)
    T("Mother Middle Name", 2, 117.9, 38.8, 45.8, m_middle)
    T("Mother Last Name", 2, 114.7, 52.2, 59.2, m_last)

    parent_on_card = (app.get("parent_on_card") or "").lower()
    poc_x = {"father": 361.6, "mother": 420.4}
    if parent_on_card in poc_x:
        TICK(f"Parent on card: {parent_on_card}", 2, poc_x[parent_on_card] - 25, 69.4, 75.4)

    T("AO Area Code", 2, 226.6, 109.8, 116.8, app.get("ao_area_code", ""), right=320)
    T("AO Type", 2, 359.7, 109.8, 116.8, app.get("ao_type", ""))
    T("AO Range Code", 2, 232.1, 123.2, 130.2, app.get("ao_range_code", ""), right=320)
    T("AO No.", 2, 357.8, 123.2, 130.2, app.get("ao_no", ""))

    ra_first, ra_middle, ra_last = _split_name(app.get("ra_name", ""))
    T("RA First Name", 2, 109.1, 167.5, 174.5, ra_first)
    T("RA Middle Name", 2, 108.9, 180.6, 187.6, ra_middle)
    T("RA Last Name", 2, 105.6, 194.0, 201.0, ra_last)
    T("RA PAN", 2, 150.0, 209.7, 216.7, app.get("ra_pan", ""))
    T("RA Aadhaar", 2, 111.8, 226.0, 233.0, app.get("ra_aadhaar", ""))

    T("RA Flat/Door/Building", 2, 110.8, 257.3, 264.3, ra.get("line1", ""))
    T("RA Road/Street", 2, 125.9, 270.7, 277.7, ra.get("line2", ""))
    T("RA Post Office", 2, 89.3, 284.1, 291.1, ra.get("post_office", ""))
    T("RA City", 2, 127.9, 297.5, 304.5, ra.get("city", ""))
    T("RA District", 2, 74.4, 310.9, 317.9, ra.get("district", ""))
    T("RA State", 2, 118.9, 324.3, 331.3, ra.get("state", ""), right=223)
    T("RA Country", 2, 272.2, 324.3, 331.3, ra.get("country", ""), right=393)
    T("RA PIN", 2, 443.4, 324.3, 331.3, ra.get("pincode", ""), right=560)

    T("RA Mobile Country Code", 2, 222.5, 355.4, 362.4, app.get("ra_mobile_country_code", ""), right=303)
    T("RA Mobile Number", 2, 351.0, 355.4, 362.4, app.get("ra_mobile", ""))
    T("RA Email ID", 2, 91.2, 369.4, 376.4, app.get("ra_email", ""))
    T("RA Landline STD Code", 2, 215.4, 383.4, 390.4, app.get("ra_landline_std_code", ""), right=302)
    T("RA Landline Number", 2, 355.8, 383.4, 390.4, app.get("ra_landline_number", ""))

    comm = (app.get("communication_address") or "").lower()
    comm_x = {"residence": 215.9, "ra": 301.9, "office": 447.8}
    if comm in comm_x:
        TICK(f"Communication address: {comm}", 2, comm_x[comm] + 5, 419.4, 425.4)

    doc_app_x = {"identity": 70.5, "address": 169.1, "dob": 270.0}
    for d in (app.get("documents_applicant") or []):
        if d in doc_app_x:
            TICK(f"Applicant doc: {d}", 2, doc_app_x[d] + 5, 476.5, 482.5)

    doc_ra_x = {"identity": 70.5, "address": 169.1}
    for d in (app.get("documents_ra") or []):
        if d in doc_ra_x:
            TICK(f"RA doc: {d}", 2, doc_ra_x[d] + 5, 513.6, 519.6)

    return fields
