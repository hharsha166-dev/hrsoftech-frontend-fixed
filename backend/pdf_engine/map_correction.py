"""
Maps application data -> fields.json for "Request For Changes Or Correction
in PAN Data [For an Individual]". Coordinates extracted from the official
PDF's text structure and hand-verified against rendered images.

Input `app` dict — same shape as map_form93, plus:
  pan_number (existing PAN being corrected), aadhaar_number,
  name_as_per_aadhaar {first, middle, last},
  address_type ('residence'/'office'),
  change_fields (list of which Part-A rows are being changed — used only
  to decide which "Tick" boxes in column 2 get marked; the corresponding
  text field is filled the same way regardless),
  documents (list of: 'identity','address','dob','other_proof','pan_copy')
"""

PDF_W, PDF_H = 595.276, 841.89001


def _split_name(full_name):
    parts = (full_name or "").split()
    first = parts[0] if parts else ""
    middle = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    last = parts[-1] if len(parts) > 1 else ""
    return first, middle, last


def _text_field(page, description, left, top, bottom, text, right=560, font_size=8):
    return {
        "page_number": page,
        "description": description,
        "field_label": description,
        "label_bounding_box": [max(left - 15, 0), top, left, bottom],
        "entry_bounding_box": [left + 4, top - 0.5, right, bottom + 0.5],
        "entry_text": {"text": str(text), "font_size": font_size},
    }


def _tick(page, description, cx, top, bottom, half_w=6):
    return {
        "page_number": page,
        "description": description,
        "field_label": description,
        "label_bounding_box": [cx - half_w, top - 3.2, cx + half_w, top - 0.4],
        "entry_bounding_box": [cx - half_w, top - 0.3, cx + half_w, bottom + 0.3],
        "entry_text": {"text": "X", "font_size": min(6, bottom - top - 0.6)},
    }


# The row-level "which field is being changed" tick column sits at x=77-88
ROW_TICK_X = 82.5


def build_fields(app: dict):
    fields = []
    add = fields.append

    def T(description, page, left, top, bottom, text, right=560, font_size=8):
        if text:
            add(_text_field(page, description, left, top, bottom, text, right, font_size))

    def TICK(description, page, cx, top, bottom):
        add(_tick(page, description, cx, top, bottom))

    def ROW_TICK(description, page, top, bottom):
        add(_tick(page, description, ROW_TICK_X, top, bottom))

    res = app.get("residence_address", {}) or {}
    change_fields = set(app.get("change_fields") or [])

    # ---------------- PAGE 1 ----------------
    T("PAN Number", 1, 358.3, 77.2, 84.2, app.get("pan_number", ""), right=560)
    T("Aadhaar Number", 1, 328.9, 118.0, 125.0, app.get("aadhaar_number", ""), right=560)

    if "name" in change_fields:
        ROW_TICK("Row tick: Name", 1, 193.6, 199.6)
    first, middle, last = _split_name(app.get("full_name", ""))
    T("First Name", 1, 129.4, 207.5, 214.5, first)
    T("Middle Name", 1, 135.7, 220.9, 227.9, middle)
    T("Last Name", 1, 129.1, 234.6, 241.6, last)

    if "name_aadhaar" in change_fields:
        ROW_TICK("Row tick: Name as per Aadhaar", 1, 251.9, 257.9)
    aad_name = app.get("name_as_per_aadhaar") or {}
    T("Aadhaar First Name", 1, 129.4, 264.9, 271.9, aad_name.get("first", ""))
    T("Aadhaar Middle Name", 1, 135.7, 278.3, 285.3, aad_name.get("middle", ""))
    T("Aadhaar Last Name", 1, 129.1, 291.7, 298.7, aad_name.get("last", ""))

    if "gender" in change_fields:
        ROW_TICK("Row tick: Gender", 1, 306.4, 312.4)
    gender = (app.get("gender") or "").lower()
    gender_tick_x = {"male": 201.0, "female": 250.5, "transgender": 309.1}
    if gender in gender_tick_x:
        TICK(f"Gender: {gender}", 1, gender_tick_x[gender] + 5, 306.1, 312.1)

    if "dob" in change_fields:
        ROW_TICK("Row tick: DOB", 1, 319.8, 325.8)
    dob = app.get("dob", "")
    if dob:
        try:
            y, m, dd = dob.split("-")
            add({"page_number": 1, "description": "DOB day", "field_label": "dd",
                 "label_bounding_box": [182.1, 305.5, 186.0, 312.5],
                 "entry_bounding_box": [189, 319.4, 222, 327.6], "entry_text": {"text": dd, "font_size": 7}})
            add({"page_number": 1, "description": "DOB month", "field_label": "mm",
                 "label_bounding_box": [227.7, 305.5, 233.5, 312.5],
                 "entry_bounding_box": [236, 319.4, 268, 327.6], "entry_text": {"text": m, "font_size": 7}})
            add({"page_number": 1, "description": "DOB year", "field_label": "yyyy",
                 "label_bounding_box": [274.2, 305.5, 277.7, 312.5],
                 "entry_bounding_box": [283, 319.4, 330, 327.6], "entry_text": {"text": y, "font_size": 7}})
        except ValueError:
            pass

    if "address" in change_fields:
        ROW_TICK("Row tick: Address", 1, 336.6, 342.6)
    addr_type = (app.get("address_type") or "residence").lower()
    addr_type_x = {"residence": 180.7, "office": 263.1}
    if addr_type in addr_type_x:
        TICK(f"Address type: {addr_type}", 1, addr_type_x[addr_type] + 5, 353.7, 359.7)
    T("Flat/Door/Building", 1, 111.7, 368.0, 375.0, res.get("line1", ""))
    T("Road/Street", 1, 126.8, 381.4, 388.4, res.get("line2", ""))
    T("Post Office", 1, 90.4, 394.8, 401.8, res.get("post_office", ""))
    T("City", 1, 128.9, 408.2, 415.2, res.get("city", ""))
    T("District", 1, 75.4, 421.6, 428.6, res.get("district", ""))
    T("State", 1, 119.8, 435.0, 442.0, res.get("state", ""), right=227)
    T("Country", 1, 276.5, 435.0, 442.0, res.get("country", ""), right=396)
    T("PIN", 1, 447.0, 435.0, 442.0, res.get("pincode", ""), right=560)

    if "passport" in change_fields:
        ROW_TICK("Row tick: Passport", 1, 448.7, 454.7)
    T("Passport Number", 1, 157.3, 448.8, 455.8, app.get("passport_number", ""))

    if "tin" in change_fields:
        ROW_TICK("Row tick: TIN", 1, 462.1, 468.1)
    T("TIN", 1, 288.6, 462.2, 469.2, app.get("tin", ""))

    if "contact" in change_fields:
        ROW_TICK("Row tick: Contact Details", 1, 492.4, 498.4)
    T("Mobile Country Code", 1, 260.0, 511.9, 518.9, app.get("mobile_country_code", ""), right=349)
    T("Mobile Number", 1, 396.8, 511.9, 518.9, app.get("mobile", ""))
    T("Email ID", 1, 92.2, 525.3, 532.3, app.get("email", ""))
    T("Landline Country/ISD Code", 1, 273.6, 538.7, 545.7, app.get("landline_isd_code", ""), right=352)
    T("Landline Area/STD Code", 1, 129.0, 551.7, 558.7, app.get("landline_std_code", ""), right=216)
    T("Landline Number", 1, 272.5, 561.7, 568.7, app.get("landline_number", ""))

    if "father_name" in change_fields:
        ROW_TICK("Row tick: Father's Name", 1, 607.7, 613.7)
    f_first, f_middle, f_last = _split_name(app.get("father_name", ""))
    T("Father First Name", 1, 162.9, 607.8, 614.8, f_first)
    T("Father Middle Name", 1, 162.1, 620.8, 627.8, f_middle)
    T("Father Last Name", 1, 158.8, 634.3, 641.3, f_last)

    if "mother_name" in change_fields:
        ROW_TICK("Row tick: Mother's Name", 1, 648.0, 654.0)
    m_first, m_middle, m_last = _split_name(app.get("mother_name", ""))
    T("Mother First Name", 1, 164.7, 648.0, 655.0, m_first)
    T("Mother Middle Name", 1, 163.5, 661.1, 668.1, m_middle)
    T("Mother Last Name", 1, 160.2, 674.5, 681.5, m_last)

    parent_on_card = (app.get("parent_on_card") or "").lower()
    poc_x = {"father": 375.4, "mother": 439.6}
    if parent_on_card in poc_x:
        TICK(f"Parent on card: {parent_on_card}", 1, poc_x[parent_on_card] - 30, 691.6, 697.6)

    doc_x = {"identity": 70.5, "address": 169.1, "dob": 270.0}
    for d in (app.get("documents") or []):
        if d in doc_x:
            TICK(f"Document: {d}", 1, doc_x[d] + 5, 752.8, 758.8)
    doc_x2 = {"other_proof": 70.5, "pan_copy": 269.9}
    for d in (app.get("documents") or []):
        if d in doc_x2:
            TICK(f"Document: {d}", 1, doc_x2[d] + 5, 776.8, 782.8)

    # ---------------- PAGE 2: Verification & Declaration ----------------
    # Declarant name / place / date / capacity are filled in by hand at
    # signing time (per the original form's dotted-line design), so no
    # auto-fill fields are generated for page 2.

    return fields
