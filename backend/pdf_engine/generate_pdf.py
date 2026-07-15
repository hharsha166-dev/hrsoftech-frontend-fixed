#!/usr/bin/env python3
"""
Usage:
    python3 generate_pdf.py <application_type> <template_pdf> <output_pdf>

Reads the application row as JSON from stdin, maps it to form fields using
map_form93 or map_correction depending on application_type, fills the
template PDF, and writes the result to output_pdf.

Exit code 0 + prints the output path on success.
Exit code 1 + prints an error message on failure (caller should treat the
sample PDF as unavailable and NOT let a retailer submit it as-is).
"""
import sys
import json
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor"))

from adapt_row import adapt

def main():
    if len(sys.argv) != 4:
        print("Usage: generate_pdf.py <new_pan|correction> <template_pdf> <output_pdf>", file=sys.stderr)
        sys.exit(1)

    application_type, template_pdf, output_pdf = sys.argv[1:4]
    row = json.load(sys.stdin)
    app = adapt(row)

    if application_type == "new_pan":
        from map_form93 import build_fields, PDF_W, PDF_H
        num_pages = 5
    elif application_type == "correction":
        from map_correction import build_fields, PDF_W, PDF_H
        num_pages = 4
    else:
        print(f"Unknown application_type: {application_type}", file=sys.stderr)
        sys.exit(1)

    fields = build_fields(app)
    field_values = {
        "pages": [
            {"page_number": p, "pdf_width": PDF_W, "pdf_height": PDF_H}
            for p in range(1, num_pages + 1)
        ],
        "form_fields": fields,
    }

    tmp_json = output_pdf + ".fields.json"
    with open(tmp_json, "w") as f:
        json.dump(field_values, f)

    # Validate before filling
    from check_bounding_boxes import get_bounding_box_messages
    with open(tmp_json) as f:
        messages = get_bounding_box_messages(f)

    failures = [m for m in messages if m.startswith("FAILURE")]
    if failures:
        for m in messages:
            print(m, file=sys.stderr)
        sys.exit(1)

    from fill_pdf_form_with_annotations import fill_pdf_form
    fill_pdf_form(template_pdf, tmp_json, output_pdf)

    os.remove(tmp_json)
    print(output_pdf)

if __name__ == "__main__":
    main()