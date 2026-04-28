import XLSX from 'xlsx';

// Converts an XLSX file to an array of row objects (same shape as csv-parser output)
export function parseXLSXRows(filePath, sheetIndex = 0) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[sheetIndex];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Converts an XLSX file to a plain CSV string (for AI extraction)
export function xlsxToCSVText(filePath) {
  const workbook = XLSX.readFile(filePath);
  return workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return workbook.SheetNames.length > 1 ? `Sheet: ${name}\n${csv}` : csv;
  }).join('\n\n');
}
