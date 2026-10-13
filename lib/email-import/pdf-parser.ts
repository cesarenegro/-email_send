import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { escapeHtml } from '../security/sanitize-html';

export interface PdfExtractionResult {
  success: boolean; text: string; html: string; isScanned: boolean;
  unsupportedFormat?: boolean; pageCount?: number; message?: string;
}
export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_SINGLE_STREAM_BYTES = 4 * 1024 * 1024;
export const MAX_CUMULATIVE_DECOMPRESSED_BYTES = 12 * 1024 * 1024;
function unsupported(message: string): PdfExtractionResult {
  return { success: false, text: '', html: '', isScanned: false, unsupportedFormat: true, message };
}
function ascii85(input: Buffer): Buffer {
  const text = input.toString('latin1').replace(/\s/g, '').replace(/^<~/, '').replace(/~>$/, '');
  const out: number[] = [];
  let group: number[] = [];
  const emit = (digits: number[], count: number) => {
    let value = 0;
    for (const digit of digits) value = value * 85 + digit;
    if (value > 0xffffffff) throw new Error('Codifica ASCII85 PDF non valida.');
    for (let i = 0; i < count; i++) out.push((value >>> (24 - 8 * i)) & 255);
    if (out.length > MAX_SINGLE_STREAM_BYTES) throw new Error('Flusso PDF supera il limite consentito durante la decompressione.');
  };
  for (const char of text) {
    if (char === 'z' && !group.length) { emit([0, 0, 0, 0, 0], 4); continue; }
    const digit = char.charCodeAt(0) - 33;
    if (digit < 0 || digit > 84) throw new Error('Codifica ASCII85 PDF non valida.');
    group.push(digit);
    if (group.length === 5) { emit(group, 4); group = []; }
  }
  if (group.length === 1) throw new Error('Codifica ASCII85 PDF incompleta.');
  if (group.length > 1) { const count = group.length - 1; while (group.length < 5) group.push(84); emit(group, count); }
  return Buffer.from(out);
}
// Resource preflight only: PDF.js interprets PDF syntax, fonts and text order.
// Unknown filter chains are refused instead of bypassing the resource budget.
export function checkPdfResourceLimits(buffer: Buffer): void {
  const raw = buffer.toString('latin1');
  let total = 0;
  const streams = /<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)endstream/g;
  for (const match of raw.matchAll(streams)) {
    const dict = match[1];
    if (/#/.test(dict)) throw new Error('Codifica dei nomi PDF non supportata per l’importazione sicura.');
    const length = /\/Length\s+(\d+)\b(?!\s+\d+\s+R)/.exec(dict);
    let data: Buffer = Buffer.from(match[2], 'latin1');
    if (length) data = data.subarray(0, Number(length[1]));
    else data = data.subarray(0, data.length - (match[2].endsWith('\r\n') ? 2 : match[2].endsWith('\n') ? 1 : 0));
    const filter = /\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dict);
    if (/\/Filter\b/.test(dict) && !filter) throw new Error('Filtro PDF indiretto non supportato per l’importazione sicura.');
    const filters = filter?.[1].match(/\/\w+/g) || [];
    for (const name of filters) {
      if (name === '/ASCII85Decode' || name === '/A85') data = ascii85(data);
      else if (name === '/FlateDecode' || name === '/Fl') {
        const remaining = MAX_CUMULATIVE_DECOMPRESSED_BYTES - total;
        if (remaining <= 0) throw new Error('Superato il budget cumulativo di decompressione di 12MB.');
        try { data = zlib.inflateSync(data, { maxOutputLength: Math.min(MAX_SINGLE_STREAM_BYTES, remaining) }); }
        catch (error: any) {
          if (error.code === 'ERR_BUFFER_TOO_LARGE') throw new Error('Flusso compresso supera il limite consentito durante la decompressione (4MB per stream, 12MB totali).');
          throw new Error('Flusso PDF compresso non valido o non supportato.');
        }
      } else if (!['/DCTDecode', '/JPXDecode', '/CCITTFaxDecode'].includes(name)) {
        throw new Error('Filtro PDF non supportato per l’importazione sicura.');
      }
    }
    if (data.length > MAX_SINGLE_STREAM_BYTES) throw new Error('Flusso PDF supera il limite consentito durante la decompressione.');
    total += data.length;
    if (total > MAX_CUMULATIVE_DECOMPRESSED_BYTES) throw new Error('Superato il budget cumulativo di decompressione di 12MB.');
  }
}
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfExtractionResult> {
  if (!buffer?.length) return unsupported('Il file PDF caricato è vuoto.');
  if (buffer.length > MAX_PDF_SIZE_BYTES) throw new Error('Il file PDF supera la dimensione massima consentita di 10MB.');
  if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return unsupported('Il file non corrisponde a un documento PDF valido.');
  if (/\/Encrypt\b/.test(buffer.toString('latin1'))) return unsupported('Questo PDF richiede una password: esportane una copia senza protezione.');
  checkPdfResourceLimits(buffer);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  const packageRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(packageRoot, 'legacy/build/pdf.worker.mjs')).href;
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer), useSystemFonts: false, disableFontFace: true, stopAtErrors: true, verbosity: 0,
    standardFontDataUrl: path.join(packageRoot, 'standard_fonts').replace(/\\/g, '/') + '/',
    cMapUrl: path.join(packageRoot, 'cmaps').replace(/\\/g, '/') + '/', cMapPacked: true, maxImageSize: 0,
  });
  try {
    const document = await task.promise;
    if (document.numPages > 50) throw new Error('Importa un PDF di massimo 50 pagine.');
    const paragraphs: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let line = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        line += item.str;
        if (item.hasEOL) { if (line.trim()) paragraphs.push(line.trim()); line = ''; }
      }
      if (line.trim()) paragraphs.push(line.trim());
      page.cleanup();
    }
    const text = paragraphs.join('\n').trim();
    if (!text) return {
      success: false, text: '', html: '', isScanned: /\/Subtype\s*\/Image\b/.test(buffer.toString('latin1')),
      pageCount: document.numPages,
      message: 'Nessun testo selezionabile trovato. Se il PDF è una scansione, scrivi o incolla il testo nell’editor.',
    };
    return { success: true, text, html: paragraphs.map(p => '<p>' + escapeHtml(p) + '</p>').join(''), isScanned: false, pageCount: document.numPages };
  } catch (error: any) {
    if (error.name === 'PasswordException') return unsupported('Questo PDF richiede una password: esportane una copia senza protezione.');
    if (error.name === 'InvalidPDFException' || error.name === 'FormatError') return unsupported('Documento PDF non valido o formato non supportato.');
    throw error;
  } finally { await task.destroy(); }
}
