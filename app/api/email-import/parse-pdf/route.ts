import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Extracts plain text from raw uncompressed/FlateDecode PDF text operators (BT...ET, Tj, TJ).
 */
function extractTextFromPdfBuffer(buffer: Buffer): { text: string; isScanned: boolean } {
  const content = buffer.toString('latin1');
  const textChunks: string[] = [];

  // Match text blocks inside BT ... ET
  const btRegex = /BT[\s\S]*?ET/g;
  let match: RegExpExecArray | null;

  while ((match = btRegex.exec(content)) !== null) {
    const block = match[0];

    // Extract (...) Tj strings
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const rawStr = tjMatch[1].replace(/\\([()\\])/g, '$1');
      if (rawStr.trim()) textChunks.push(rawStr);
    }

    // Extract [(...)] TJ arrays
    const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = arrayTjRegex.exec(block)) !== null) {
      const arrayContent = arrayMatch[1];
      const innerStrings = arrayContent.match(/\(([\s\S]*?)\)/g);
      if (innerStrings) {
        const line = innerStrings
          .map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
          .join('');
        if (line.trim()) textChunks.push(line);
      }
    }
  }

  const fullText = textChunks.join(' ').replace(/\s+/g, ' ').trim();
  const hasImages = content.includes('/Image') || content.includes('/XObject') || content.includes('/DCTDecode');

  // If very little or no text is extracted but image operators are found, it's a scanned PDF
  const isScanned = fullText.length < 40 && hasImages;

  return {
    text: fullText,
    isScanned,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nessun file PDF fornito' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text, isScanned } = extractTextFromPdfBuffer(buffer);

    if (isScanned || text.length < 20) {
      return NextResponse.json({
        success: false,
        isScanned: true,
        message:
          'Questo file PDF sembra essere una scansione o una brochure grafica priva di testo digitale selezionabile. Per garantire la migliore leggibilità della tua email, ti consigliamo di copiare e incollare il testo direttamente nell\'editor visuale.',
      });
    }

    // Split text into coherent paragraphs
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    let currentP = '';

    for (const s of sentences) {
      currentP += (currentP ? ' ' : '') + s;
      if (currentP.length > 250) {
        paragraphs.push(`<p>${currentP}</p>`);
        currentP = '';
      }
    }
    if (currentP) {
      paragraphs.push(`<p>${currentP}</p>`);
    }

    const html = paragraphs.join('');

    return NextResponse.json({
      success: true,
      isScanned: false,
      text,
      html,
      message: 'Testo estratto con successo dal PDF. Controlla la formattazione nell\'editor.',
    });
  } catch (err: any) {
    console.error('Error parsing PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante la lettura del PDF' },
      { status: 500 }
    );
  }
}
