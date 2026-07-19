const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Fills a template PDF with text at exact coordinates, replacing the old
 * Python (pypdf) FreeText-annotation approach with direct pdf-lib text
 * drawing. Coordinates use the same "top-down" convention as before
 * (top/bottom measured from the top of the page in PDF points) so the
 * field data from map_form93.js / map_correction.js needs no changes.
 *
 * fieldsData shape (same as the old fields.json):
 * {
 *   pages: [{ page_number, pdf_width, pdf_height }, ...],
 *   form_fields: [
 *     { page_number, entry_bounding_box: [left, top, right, bottom],
 *       entry_text: { text, font_size } },
 *     ...
 *   ]
 * }
 */
async function fillPdfForm(inputPdfPath, fieldsData, outputPdfPath) {
  const inputBytes = fs.readFileSync(inputPdfPath);
  const pdfDoc = await PDFDocument.load(inputBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  let count = 0;

  for (const field of fieldsData.form_fields) {
    if (!field.entry_text || !field.entry_text.text) continue;
    const text = String(field.entry_text.text);
    if (!text) continue;

    const page = pages[field.page_number - 1];
    if (!page) continue;
    const { height: pdfHeight } = page.getSize();

    const [left, top, , bottom] = field.entry_bounding_box;
    // Convert from top-down coordinates to pdf-lib's bottom-left origin.
    const boxBottomY = pdfHeight - bottom;
    const boxTopY = pdfHeight - top;
    const boxHeight = boxTopY - boxBottomY;

    const fontSize = field.entry_text.font_size || 8;
    // Sit the baseline a little above the box's bottom edge so text reads
    // similarly to how the previous FreeText annotations rendered.
    const baselineY = boxBottomY + Math.max((boxHeight - fontSize) / 2, 0.5);

    page.drawText(text, {
      x: left,
      y: baselineY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    count += 1;
  }

  const outputBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, outputBytes);
  return count;
}

module.exports = { fillPdfForm };