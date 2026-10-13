import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePdfBuffer, MAX_PDF_SIZE_BYTES } from '@/lib/email-import/pdf-parser';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nessun file PDF fornito' }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: 'Il file PDF supera il limite di 10MB.' }, { status: 413 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await parsePdfBuffer(buffer);

    if (!result.success) {
      const statusCode = result.unsupportedFormat ? 400 : 200;
      return NextResponse.json({
        success: false,
        isScanned: result.isScanned,
        unsupportedFormat: result.unsupportedFormat || false,
        message:
          result.message ||
          'Questo file PDF sembra essere una scansione o una brochure priva di testo digitale selezionabile.',
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      isScanned: false,
      unsupportedFormat: false,
      text: result.text,
      html: result.html,
      pageCount: result.pageCount,
      message: 'Testo estratto con successo dal PDF. Controlla la formattazione nell\'editor.',
    });
  } catch (err: any) {
    console.error('Error parsing PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la lettura del PDF' },
      { status: 400 }
    );
  }
}
