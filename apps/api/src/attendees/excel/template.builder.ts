import * as ExcelJS from 'exceljs';
import {
  COLUMNS,
  CATEGORY_LABELS,
  TEMPLATE_SHEET_NAME,
  INSTRUCTIONS_SHEET_NAME,
  INSTRUCTIONS_TEXT,
  SAMPLE_ROWS,
  MAX_ROWS,
} from './headers';

export async function buildImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VIMS Event Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(TEMPLATE_SHEET_NAME);

  sheet.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Bold + frozen header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Pre-fill three sample rows so organizers see the expected shape
  for (const sample of SAMPLE_ROWS) {
    sheet.addRow(sample);
  }

  // Excel data-validation dropdown on the Category column for rows 2..MAX_ROWS+1
  const categoryColLetter = sheet.getColumn('category').letter;
  for (let row = 2; row <= MAX_ROWS + 1; row++) {
    sheet.getCell(`${categoryColLetter}${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${CATEGORY_LABELS.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid category',
      error: `Category must be one of: ${CATEGORY_LABELS.join(', ')}`,
    };
  }

  // Hidden instructions sheet
  const instructions = workbook.addWorksheet(INSTRUCTIONS_SHEET_NAME, {
    state: 'hidden',
  });
  instructions.getColumn(1).width = 100;
  INSTRUCTIONS_TEXT.forEach((line, i) => {
    instructions.getCell(`A${i + 1}`).value = line;
    if (i === 0) instructions.getCell(`A${i + 1}`).font = { bold: true };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
