import { NextRequest, NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import { createClient } from '@/lib/supabase/server';
import { sanitizeEmailHtml, escapeHtml } from '@/lib/security/sanitize-html';

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

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. EML email file
    if (fileName.endsWith('.eml') || fileName.endsWith('.msg')) {
      const parsed = await simpleParser(buffer);
      const subject = parsed.subject || '';
      let html = parsed.html || '';

      // Fallback to text formatted into simple paragraphs if no html
      if (!html && parsed.text) {
        html = parsed.text
          .split('\n\n')
          .filter((p) => p.trim().length > 0)
          .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
          .join('');
      }

      const cleanHtml = sanitizeEmailHtml(html);

      return NextResponse.json({
        success: true,
        type: 'eml',
        fileName: file.name,
        subject,
        html: cleanHtml,
        text: parsed.text || '',
      });
    }

    // 2. HTML / HTM file
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      const rawText = buffer.toString('utf-8');

      // Extract title if present as suggested subject
      const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const suggestedSubject = titleMatch ? titleMatch[1].trim() : '';
      const cleanHtml = sanitizeEmailHtml(rawText);

      return NextResponse.json({
        success: true,
        type: 'html',
        fileName: file.name,
        subject: suggestedSubject,
        html: cleanHtml,
        text: '',
      });
    }

    // 3. Plain Text file
    if (fileName.endsWith('.txt')) {
      const rawText = buffer.toString('utf-8');
      const lines = rawText.split('\n');
      const suggestedSubject = lines[0]?.trim() || '';
      const paragraphs = rawText
        .split(/\n\s*\n/)
        .filter((p) => p.trim().length > 0)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('');

      return NextResponse.json({
        success: true,
        type: 'txt',
        fileName: file.name,
        subject: suggestedSubject,
        html: paragraphs,
        text: rawText,
      });
    }

    return NextResponse.json(
      { error: 'Formato file non supportato. Carica un file .eml, .html o .txt' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error parsing email file:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante l’analisi del file' },
      { status: 500 }
    );
  }
}

