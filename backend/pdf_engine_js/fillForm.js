const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Draws a checkmark (✓) using two line segments, centered in the given box.
 * Standard PDF fonts can't reliably encode a Unicode checkmark glyph
 * through pdf-lib's text API, so this draws it as vector lines instead —
 * this matches how a real checkmark looks in filled official forms
 * (previously an "X" was used here, which isn't what NSDL forms show).
 */
function drawCheckmark(page, pdfHeight, left, top, right, bottom) {
  const boxBottomY = pdfHeight - bottom;
  const boxTopY = pdfHeight - top;
  const cx = (left + right) / 2;
  const cy = (boxBottomY + boxTopY) / 2;
  const s = Math.min(right - left, boxTopY - boxBottomY) * 0.32;
  page.drawLine({
    start: { x: cx - s * 0.9, y: cy },
    end: { x: cx - s * 0.15, y: cy - s * 0.75 },
    thickness: 1.1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: cx - s * 0.15, y: cy - s * 0.75 },
    end: { x: cx + s, y: cy + s * 0.85 },
    thickness: 1.1,
    color: rgb(0, 0, 0),
  });
}

/**
 * Fills a template PDF. Supports two field kinds:
 *  - "text" fields (single continuous box, e.g. State, Country, Email):
 *    entry_bounding_box + entry_text, drawn as one string (old behavior).
 *  - "char_grid" fields (a row of small character boxes, e.g. Name,
 *    Address, Aadhaar Number): box_start_x, box_width, num_boxes, top,
 *    bottom, text — each character of `text` is drawn centered in its
 *    own box, left to right, one box per character.
 */
async function fillPdfForm(inputPdfPath, fieldsData, outputPdfPath) {
  const inputBytes = fs.readFileSync(inputPdfPath);
  const pdfDoc = await PDFDocument.load(inputBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  let count = 0;

  function drawInBox(page, pdfHeight, left, top, bottom, text, fontSize, centerX) {
    const boxBottomY = pdfHeight - bottom;
    const boxTopY = pdfHeight - top;
    const boxHeight = boxTopY - boxBottomY;
    const baselineY = boxBottomY + Math.max((boxHeight - fontSize) / 2, 0.5) + fontSize * 0.2;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const x = centerX !== undefined ? centerX - textWidth / 2 : left;
    page.drawText(text, { x, y: baselineY, size: fontSize, font, color: rgb(0, 0, 0) });
  }

  for (const field of fieldsData.form_fields) {
    const page = pages[field.page_number - 1];
    if (!page) continue;
    const { height: pdfHeight } = page.getSize();

    if (field.kind === 'tick') {
      const [left, top, right, bottom] = field.entry_bounding_box;
      drawCheckmark(page, pdfHeight, left, top, right, bottom);
      count += 1;
      continue;
    }

    if (field.kind === 'char_grid') {
      const text = String(field.text || '');
      if (!text) continue;
      const fontSize = field.font_size || 9;
      const chars = text.split('');
      for (let i = 0; i < chars.length && i < field.num_boxes; i++) {
        const ch = chars[i];
        if (ch === ' ') continue;
        const boxCenterX = field.box_start_x + i * field.box_width + field.box_width / 2;
        drawInBox(page, pdfHeight, field.box_start_x, field.top, field.bottom, ch, fontSize, boxCenterX);
        count += 1;
      }
      continue;
    }

    // plain single-box text field (old behavior)
    if (!field.entry_text || !field.entry_text.text) continue;
    const text = String(field.entry_text.text);
    if (!text) continue;
    const [left, top, , bottom] = field.entry_bounding_box;
    const fontSize = field.entry_text.font_size || 8;
    drawInBox(page, pdfHeight, left, top, bottom, text, fontSize);
    count += 1;
  }

  const outputBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, outputBytes);
  return count;
}

module.exports = { fillPdfForm };
