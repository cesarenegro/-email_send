import ExcelJS from 'exceljs';
import { LeadResearchResult, LeadResearchJob } from '@/types/lead-research';

/**
 * Sanitizes strings against CSV/Excel formula injection (DDE attacks).
 * If the value starts with =, +, -, @, tab, or carriage return, it prepends a single quote.
 */
export function sanitizeForFormulaInjection(val: string | null | undefined): string {
  if (!val) return '';
  const str = String(val);
  const firstChar = str.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    return `'${str}`;
  }
  return str;
}

export interface LeadExportRow {
  company_name: string;
  category: string;
  country: string;
  region: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  contact_person: string;
  contact_role: string;
  sources: string;
  collected_at: string;
  data_status: string;
  human_verified: string;
  verified_at: string;
  deliverability_status: string;
  notes: string;
}

export function formatResultRows(results: LeadResearchResult[]): LeadExportRow[] {
  return results.map((r) => {
    const sourceUrls = Object.values(r.source_evidence || {})
      .map((ev) => ev.source_url)
      .filter(Boolean)
      .join(' | ');

    return {
      company_name: r.company_name || '',
      category: r.category || '',
      country: r.country || '',
      region: r.region || '',
      city: r.city || '',
      address: r.address || '',
      email: r.email || '',
      phone: r.phone || '',
      website: r.website || '',
      contact_person: r.contact_person || '',
      contact_role: r.contact_role || '',
      sources: sourceUrls || r.website || '',
      collected_at: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
      data_status: r.data_status === 'web_found' ? 'Trovata su fonte pubblica' : 'Non verificata',
      human_verified: r.human_verified ? 'Sì (Verificato da operatore)' : 'No (Automazione AI)',
      verified_at: r.verified_at ? new Date(r.verified_at).toISOString() : '',
      deliverability_status: 'Non verificata (Nessun invio effettuato)',
      notes: r.verification_notes || '',
    };
  });
}

/**
 * Generates a real formatted .xlsx buffer using ExcelJS
 */
export async function generateXlsxBuffer(
  job: LeadResearchJob,
  results: LeadResearchResult[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAIL-K Precision Outbound';
  workbook.created = new Date();

  // 1. Primary Sheet: Contatti e Aziende
  const sheet = workbook.addWorksheet('Contatti e Aziende', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Ragione Sociale / Studio', key: 'company_name', width: 28 },
    { header: 'Settore / Categoria', key: 'category', width: 22 },
    { header: 'Paese', key: 'country', width: 14 },
    { header: 'Regione', key: 'region', width: 16 },
    { header: 'Città', key: 'city', width: 18 },
    { header: 'Indirizzo Sede', key: 'address', width: 26 },
    { header: 'Email Principale', key: 'email', width: 26 },
    { header: 'Telefono', key: 'phone', width: 20 },
    { header: 'Sito Web', key: 'website', width: 28 },
    { header: 'Referente Pubblico', key: 'contact_person', width: 22 },
    { header: 'Ruolo / Incarico', key: 'contact_role', width: 20 },
    { header: 'Fonti Web Primarie', key: 'sources', width: 34 },
    { header: 'Data Raccolta', key: 'collected_at', width: 16 },
    { header: 'Stato Dato', key: 'data_status', width: 24 },
    { header: 'Verifica Umana', key: 'human_verified', width: 24 },
    { header: 'Data Controllo', key: 'verified_at', width: 20 },
    { header: 'Consegnabilità Email', key: 'deliverability_status', width: 28 },
    { header: 'Note Operative', key: 'notes', width: 28 },
  ];

  // Header styling: Elegant dark charcoal with white text
  const headerRow = sheet.getRow(1);
  headerRow.height = 26;
  headerRow.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1B1C1A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

  const rows = formatResultRows(results);
  for (const r of rows) {
    const row = sheet.addRow({
      company_name: sanitizeForFormulaInjection(r.company_name),
      category: sanitizeForFormulaInjection(r.category),
      country: sanitizeForFormulaInjection(r.country),
      region: sanitizeForFormulaInjection(r.region),
      city: sanitizeForFormulaInjection(r.city),
      address: sanitizeForFormulaInjection(r.address),
      email: sanitizeForFormulaInjection(r.email),
      phone: sanitizeForFormulaInjection(r.phone),
      website: sanitizeForFormulaInjection(r.website),
      contact_person: sanitizeForFormulaInjection(r.contact_person),
      contact_role: sanitizeForFormulaInjection(r.contact_role),
      sources: sanitizeForFormulaInjection(r.sources),
      collected_at: r.collected_at,
      data_status: r.data_status,
      human_verified: r.human_verified,
      verified_at: r.verified_at,
      deliverability_status: r.deliverability_status,
      notes: sanitizeForFormulaInjection(r.notes),
    });

    row.font = { name: 'Segoe UI', size: 9 };
    row.alignment = { vertical: 'middle' };
  }

  // Auto-filter
  sheet.autoFilter = {
    from: 'A1',
    to: `R${Math.max(2, rows.length + 1)}`,
  };

  // 2. Summary & Audit Sheet
  const summarySheet = workbook.addWorksheet('Riepilogo e Parametri');
  summarySheet.columns = [
    { header: 'Parametro', key: 'key', width: 30 },
    { header: 'Valore / Specifica', key: 'val', width: 50 },
  ];

  const summaryHeader = summarySheet.getRow(1);
  summaryHeader.height = 24;
  summaryHeader.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  summaryHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF30312F' },
  };

  summarySheet.addRow({ key: 'Identificativo Ricerca', val: job.id });
  summarySheet.addRow({ key: 'Servizio Acquistato', val: `Ricerca ${job.sku}` });
  summarySheet.addRow({ key: 'Valuta e Importo', val: `$${(job.price_cents / 100).toFixed(2)} USD` });
  summarySheet.addRow({ key: 'Data Creazione', val: new Date(job.created_at).toLocaleString() });
  summarySheet.addRow({ key: 'Stato Finale', val: job.status });
  summarySheet.addRow({ key: 'Totale Risultati Estratti', val: results.length });
  summarySheet.addRow({ key: 'Brief Utente', val: job.initial_brief });
  summarySheet.addRow({ key: 'Motore di Rilevamento', val: job.sku === 'AD_HOC' ? 'Team Umano MAIL-K' : 'OpenAI + Tavily Engine' });
  summarySheet.addRow({
    key: 'Avvertenza di Conformità',
    val: 'Dati raccolti esclusivamente da fonti pubbliche. Nessuna email garantita a priori. Verifica deliverability non eseguita per preservare la reputazione.',
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates an Excel-compatible UTF-8 CSV with BOM (\uFEFF)
 */
export function generateCsvString(results: LeadResearchResult[]): string {
  const headers = [
    'Ragione Sociale / Studio',
    'Settore / Categoria',
    'Paese',
    'Regione',
    'Città',
    'Indirizzo Sede',
    'Email Principale',
    'Telefono',
    'Sito Web',
    'Referente Pubblico',
    'Ruolo / Incarico',
    'Fonti Web Primarie',
    'Data Raccolta',
    'Stato Dato',
    'Verifica Umana',
    'Data Controllo',
    'Consegnabilità Email',
    'Note Operative',
  ];

  const rows = formatResultRows(results);

  function escapeCsvCell(text: string | null | undefined): string {
    const sanitized = sanitizeForFormulaInjection(text);
    if (sanitized.includes('"') || sanitized.includes(';') || sanitized.includes(',') || sanitized.includes('\n')) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  }

  const csvLines: string[] = [];
  csvLines.push(headers.map(escapeCsvCell).join(';'));

  for (const r of rows) {
    const line = [
      escapeCsvCell(r.company_name),
      escapeCsvCell(r.category),
      escapeCsvCell(r.country),
      escapeCsvCell(r.region),
      escapeCsvCell(r.city),
      escapeCsvCell(r.address),
      escapeCsvCell(r.email),
      escapeCsvCell(r.phone),
      escapeCsvCell(r.website),
      escapeCsvCell(r.contact_person),
      escapeCsvCell(r.contact_role),
      escapeCsvCell(r.sources),
      escapeCsvCell(r.collected_at),
      escapeCsvCell(r.data_status),
      escapeCsvCell(r.human_verified),
      escapeCsvCell(r.verified_at),
      escapeCsvCell(r.deliverability_status),
      escapeCsvCell(r.notes),
    ].join(';');
    csvLines.push(line);
  }

  // Prepend UTF-8 BOM
  return '\uFEFF' + csvLines.join('\r\n');
}
