import { NextRequest, NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/server';
import { sanitizeEmailHtml, escapeHtml } from '@/lib/security/sanitize-html';

export const dynamic = 'force-dynamic';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function getMimeTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const uploadedImages: { name: string; url: string; path: string; size?: number }[] = [];

    // 1. EML / MSG email file (Direct export from Outlook, Apple Mail, Thunderbird, Gmail)
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

      // Process attachments (inline CID images & attached images)
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (let i = 0; i < parsed.attachments.length; i++) {
          const att = parsed.attachments[i];
          const isImage =
            att.contentType?.toLowerCase().startsWith('image/') ||
            IMAGE_EXTENSIONS.some((ext) => (att.filename || '').toLowerCase().endsWith(ext));

          if (!isImage || !att.content) continue;

          const rawExt = (att.filename || '').split('.').pop() || 'jpg';
          const ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
          const safeName = (att.filename || `image-${i + 1}${ext}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
          const uniqueFilename = `${Date.now()}-${i + 1}-${safeName}`;
          const storagePath = `${user.id}/imports/${uniqueFilename}`;
          const mimeType = att.contentType || getMimeTypeFromExt(ext);

          const { error: uploadError } = await supabase.storage
            .from('newsletter-images')
            .upload(storagePath, att.content, {
              contentType: mimeType,
              cacheControl: '31536000',
              upsert: true,
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(storagePath);
            const publicUrl = urlData.publicUrl;

            uploadedImages.push({
              name: att.filename || safeName,
              url: publicUrl,
              path: storagePath,
              size: att.size,
            });

            // Replace Content-ID (CID) references in HTML
            if (att.cid) {
              const cleanCid = att.cid.replace(/^<|>$/g, '');
              html = html.split(`cid:${cleanCid}`).join(publicUrl);
              html = html.split(`cid:<${cleanCid}>`).join(publicUrl);
            }

            // Replace filename references
            if (att.filename) {
              html = html.split(`"${att.filename}"`).join(`"${publicUrl}"`);
              html = html.split(`'${att.filename}'`).join(`'${publicUrl}'`);
            }
          }
        }
      }

      const cleanHtml = sanitizeEmailHtml(html);

      return NextResponse.json({
        success: true,
        type: 'eml',
        fileName: file.name,
        subject,
        html: cleanHtml,
        text: parsed.text || '',
        images: uploadedImages,
      });
    }

    // 2. ZIP Archive (HTML + Images folder)
    if (fileName.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buffer);
      const zipEntries = Object.keys(zip.files);

      // Find HTML file in zip (prefer index.html or first HTML found)
      let htmlEntryName = zipEntries.find((name) => {
        const lower = name.toLowerCase();
        return !name.startsWith('__MACOSX/') && (lower.endsWith('/index.html') || lower === 'index.html');
      });

      if (!htmlEntryName) {
        htmlEntryName = zipEntries.find((name) => {
          const lower = name.toLowerCase();
          return !name.startsWith('__MACOSX/') && (lower.endsWith('.html') || lower.endsWith('.htm'));
        });
      }

      if (!htmlEntryName) {
        return NextResponse.json(
          { error: "L'archivio ZIP non contiene alcun file HTML (.html o .htm)." },
          { status: 400 }
        );
      }

      const rawHtml = await zip.files[htmlEntryName].async('string');
      let html = rawHtml;

      // Extract suggested subject from <title> if present
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const suggestedSubject = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.zip$/i, '');

      // Find all image files in zip and upload them to Supabase Storage
      const imageEntries = zipEntries.filter((name) => {
        if (name.startsWith('__MACOSX/') || zip.files[name].dir) return false;
        const lower = name.toLowerCase();
        return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      });

      for (let i = 0; i < imageEntries.length; i++) {
        const entryName = imageEntries[i];
        const fileObj = zip.files[entryName];
        const imgBuffer = await fileObj.async('nodebuffer');

        const baseFilename = entryName.split('/').pop()?.split('\\').pop() || `image-${i + 1}.jpg`;
        const ext = '.' + (baseFilename.split('.').pop() || 'jpg');
        const safeName = baseFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const uniqueFilename = `${Date.now()}-${i + 1}-${safeName}`;
        const storagePath = `${user.id}/imports/${uniqueFilename}`;
        const mimeType = getMimeTypeFromExt(ext);

        const { error: uploadError } = await supabase.storage
          .from('newsletter-images')
          .upload(storagePath, imgBuffer, {
            contentType: mimeType,
            cacheControl: '31536000',
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('newsletter-images').getPublicUrl(storagePath);
          const publicUrl = urlData.publicUrl;

          uploadedImages.push({
            name: baseFilename,
            url: publicUrl,
            path: storagePath,
            size: imgBuffer.length,
          });

          // Replace full relative path (e.g. "images/pic.jpg", "./images/pic.jpg") and baseFilename
          html = html.split(`"${entryName}"`).join(`"${publicUrl}"`);
          html = html.split(`'${entryName}'`).join(`'${publicUrl}'`);

          html = html.split(`"./${entryName}"`).join(`"${publicUrl}"`);
          html = html.split(`'./${entryName}'`).join(`'${publicUrl}'`);

          html = html.split(`"${baseFilename}"`).join(`"${publicUrl}"`);
          html = html.split(`'${baseFilename}'`).join(`'${publicUrl}'`);
        }
      }

      const cleanHtml = sanitizeEmailHtml(html);

      return NextResponse.json({
        success: true,
        type: 'zip',
        fileName: file.name,
        subject: suggestedSubject,
        html: cleanHtml,
        text: '',
        images: uploadedImages,
      });
    }

    // 3. Single HTML / HTM file
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      const rawText = buffer.toString('utf-8');

      // Extract title if present as suggested subject
      const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const suggestedSubject = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.html?$/i, '');
      const cleanHtml = sanitizeEmailHtml(rawText);

      return NextResponse.json({
        success: true,
        type: 'html',
        fileName: file.name,
        subject: suggestedSubject,
        html: cleanHtml,
        text: '',
        images: [],
      });
    }

    // 4. Plain Text file
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
        images: [],
      });
    }

    return NextResponse.json(
      { error: 'Formato file non supportato. Carica un file .eml, .msg, .zip, .html o .txt' },
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
