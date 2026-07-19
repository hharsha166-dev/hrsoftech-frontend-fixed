const { adaptRow } = require('./adaptRow');
const mapForm93 = require('./mapForm93');
const mapCorrection = require('./mapCorrection');
const { fillPdfForm } = require('./fillForm');

/**
 * Generates the auto-filled sample PDF for an application row.
 * Replaces the old generate_pdf.py CLI (which required a python3 runtime
 * that Railway's Node builder does not provide).
 *
 * @param {object} applicationRow - the raw `applications` DB row
 * @param {string} templatePath - path to form93.pdf or correction.pdf
 * @param {string} outputPath - where to write the filled PDF
 */
async function generatePdf(applicationRow, templatePath, outputPath) {
  const app = adaptRow(applicationRow);

  const mapper = applicationRow.application_type === 'new_pan' ? mapForm93 : mapCorrection;
  const fields = mapper.buildFields(app);
  const numPages = applicationRow.application_type === 'new_pan' ? 5 : 4;

  const fieldsData = {
    pages: Array.from({ length: numPages }, (_, i) => ({
      page_number: i + 1,
      pdf_width: mapper.PDF_W,
      pdf_height: mapper.PDF_H,
    })),
    form_fields: fields,
  };

  await fillPdfForm(templatePath, fieldsData, outputPath);
  return outputPath;
}

module.exports = { generatePdf };