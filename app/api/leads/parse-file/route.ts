import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer } from '@/lib/excel/parse-xlsx';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nessun file selezionato' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    // 1. Excel (.xlsx, .xls)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await parseExcelBuffer(buffer);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        return NextResponse.json(
          { error: 'Nessuna riga o colonna valida trovata nel foglio Excel' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'xlsx',
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        totalRows: parsed.rows.length,
      });
    }

    // 2. CSV (.csv)
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = Buffer.from(arrayBuffer).toString('utf-8');
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim().replace(/^["']|["']$/g, ''),
      });

      const headers = (parsed.meta.fields || []).filter((h) => h && h.trim().length > 0);
      const rows = (parsed.data || []).filter((r) => Object.values(r).some((v) => v && v.trim().length > 0));

      if (headers.length === 0 || rows.length === 0) {
        return NextResponse.json(
          { error: 'Nessuna colonna o riga valida rilevata nel file CSV' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'csv',
        fileName: file.name,
        headers,
        rows,
        totalRows: rows.length,
      });
    }

    return NextResponse.json(
      { error: 'Formato file non supportato. Carica un file .csv o .xlsx' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error parsing leads file:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la lettura del file' },
      { status: 500 }
    );
  }
}
