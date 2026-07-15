"""
Adapts a flat `applications` table row (as stored by this project's SQLite
schema) into the richer dict shape expected by map_form93.build_fields and
map_correction.build_fields.

The DB schema only has one address (address_line1/2, city, state, pincode) —
used as the residence/communication address for both form types. Office
address, RA (representative assessee), AO code, TIN, passport, and
source-of-income aren't in this schema; the adapter leaves those blank,
which the mappers already treat as "skip this field" (falsy values aren't
written).
"""


def adapt(row: dict) -> dict:
    address = {
        "line1": row.get("address_line1") or "",
        "line2": row.get("address_line2") or "",
        "post_office": "",
        "city": row.get("city") or "",
        "district": "",
        "state": row.get("state") or "",
        "country": "India",
        "pincode": row.get("pincode") or "",
    }

    correction_fields = row.get("correction_fields")
    change_fields = set()
    if correction_fields:
        import json
        try:
            change_fields = set(json.loads(correction_fields))
        except (ValueError, TypeError):
            pass

    return {
        "full_name": row.get("full_name") or "",
        "gender": (row.get("gender") or "").lower(),
        "dob": row.get("dob") or "",
        "aadhaar_number": row.get("aadhaar_number") or "",
        "residence_address": address,
        "office_address": {},
        "residential_status": "resident",
        "passport_number": "",
        "tin": "",
        "mobile_country_code": "91" if row.get("mobile") else "",
        "mobile": row.get("mobile") or "",
        "email": row.get("email") or "",
        "landline_std_code": "",
        "landline_number": "",
        "source_of_income": [],
        "single_parent": "",
        "father_name": row.get("father_name") or "",
        "mother_name": row.get("mother_name") or "",
        "parent_on_card": "father" if row.get("father_name") else ("mother" if row.get("mother_name") else ""),
        "communication_address": "residence",
        "documents_applicant": ["identity", "address", "dob"],
        "documents_ra": [],

        # correction-form-specific
        "pan_number": row.get("existing_pan") or "",
        "name_as_per_aadhaar": {},
        "address_type": "residence",
        "change_fields": change_fields,
        "documents": ["identity", "address", "pan_copy"],
    }