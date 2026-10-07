import Papa from 'papaparse';

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: Papa.ParseError[];
}

export function parseCsvString(csvContent: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  const headers = parsed.meta.fields || [];
  const rows = parsed.data || [];

  return {
    headers,
    rows,
    errors: parsed.errors,
  };
}
