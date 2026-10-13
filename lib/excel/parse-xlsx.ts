import ExcelJS from 'exceljs';

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses an Excel (.xlsx or .xls) buffer and extracts headers and string-mapped rows.
 */
export async function parseExcelBuffer(buffer: ArrayBuffer | Buffer): Promise<ParsedSheetData> {
  const workbook = new ExcelJS.Workbook();
  // @ts-ignore exceljs handles ArrayBuffer or Buffer in load
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const rows: Record<string, string>[] = [];

  // Read header row (row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = (cell.text || cell.value?.toString() || '').trim();
    if (val) {
      headers[colNumber - 1] = val;
    }
  });

  // Filter out any sparse gaps in headers
  const validHeaders = headers.filter(Boolean);
  if (validHeaders.length === 0) {
    return { headers: [], rows: [] };
  }

  // Iterate subsequent rows
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const rowObj: Record<string, string> = {};
    let hasValues = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        let cellText = cell.text ?? '';
        if (!cellText && cell.value) {
          if (typeof cell.value === 'object' && 'text' in cell.value) {
            cellText = (cell.value as any).text || '';
          } else {
            cellText = cell.value.toString();
          }
        }
        cellText = cellText.trim();
        if (cellText) {
          rowObj[header] = cellText;
          hasValues = true;
        }
      }
    });

    if (hasValues) {
      rows.push(rowObj);
    }
  });

  return {
    headers: validHeaders,
    rows,
  };
}
