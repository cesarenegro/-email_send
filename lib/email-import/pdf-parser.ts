import zlib from 'node:zlib';
import { escapeHtml } from '@/lib/security/sanitize-html';

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  html: string;
  isScanned: boolean;
  pageCount?: number;
  message?: string;
}

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DECOMPRESSED_BYTES = 20 * 1024 * 1024; // 20MB zip-bomb defense

/**
 * Decodes PDF string escapes (octal, hex, and standard escapes).
 */
function decodePdfLiteralString(raw: string): string {
  // 1. Octal escapes \ddd
  let decoded = raw.replace(/\\([0-7]{1,3})/g, (_m, oct) => {
    return String.fromCharCode(parseInt(oct, 8));
  });

  // 2. Standard single-character escapes
  decoded = decoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1');

  return decoded;
}

/**
 * Decodes PDF hexadecimal string <48656c6c6f>.
 */
function decodePdfHexString(hex: string): string {
  const cleanHex = hex.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byteHex = cleanHex.slice(i, i + 2);
    if (byteHex.length === 2) {
      bytes.push(parseInt(byteHex, 16));
    }
  }

  // Check for UTF-16BE BOM (0xFE 0xFF)
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let str = '';
    for (let i = 2; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        str += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
      }
    }
    return str;
  }

  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Extracts text chunks from a decompressed or raw PDF content stream.
 */
function extractTextFromStreamContent(streamContent: string): string[] {
  const chunks: string[] = [];
  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(streamContent)) !== null) {
    const block = btMatch[0];

    // Case A: (...) Tj - literal string
    const tjLiteralRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjLiteralRegex.exec(block)) !== null) {
      const decoded = decodePdfLiteralString(tjMatch[1]).trim();
      if (decoded) chunks.push(decoded);
    }

    // Case B: <...> Tj - hex string
    const tjHexRegex = /<([0-9a-fA-F\s]+)>\s*Tj/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = tjHexRegex.exec(block)) !== null) {
      const decoded = decodePdfHexString(hexMatch[1]).trim();
      if (decoded) chunks.push(decoded);
    }

    // Case C: [(...)] TJ or [<...>] TJ - array of strings and spacing
    const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = arrayTjRegex.exec(block)) !== null) {
      const inner = arrayMatch[1];
      const partRegex = /\(([\s\S]*?)\)|<([0-9a-fA-F\s]+)>/g;
      let partMatch: RegExpExecArray | null;
      let assembledLine = '';

      while ((partMatch = partRegex.exec(inner)) !== null) {
        if (partMatch[1] !== undefined) {
          assembledLine += decodePdfLiteralString(partMatch[1]);
        } else if (partMatch[2] !== undefined) {
          assembledLine += decodePdfHexString(partMatch[2]);
        }
      }

      if (assembledLine.trim()) {
        chunks.push(assembledLine.trim());
      }
    }

    // Case D: ' or " single-quote text operators
    const quoteRegex = /\(([\s\S]*?)\)\s*['"]/g;
    let quoteMatch: RegExpExecArray | null;
    while ((quoteMatch = quoteRegex.exec(block)) !== null) {
      const decoded = decodePdfLiteralString(quoteMatch[1]).trim();
      if (decoded) chunks.push(decoded);
    }
  }

  return chunks;
}

/**
 * Parses a PDF buffer, decompressing FlateDecode streams as needed,
 * and extracts text formatted as clean, safe HTML paragraphs.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfExtractionResult> {
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      text: '',
      html: '',
      isScanned: false,
      message: 'Il file PDF è vuoto.',
    };
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    return {
      success: false,
      text: '',
      html: '',
      isScanned: false,
      message: 'Il file PDF supera la dimensione massima consentita di 10MB.',
    };
  }

  const rawString = buffer.toString('binary');
  if (!rawString.includes('%PDF-')) {
    return {
      success: false,
      text: '',
      html: '',
      isScanned: false,
      message: 'Il file caricato non sembra un formato PDF valido.',
    };
  }

  // Count pages if possible
  const pagesMatches = rawString.match(/\/Type\s*\/Page\b/g);
  const pageCount = pagesMatches ? pagesMatches.length : 1;

  // Detect image-only indicators
  const hasImages =
    rawString.includes('/Subtype /Image') ||
    rawString.includes('/Subtype/Image') ||
    rawString.includes('/DCTDecode') ||
    rawString.includes('/JPXDecode');

  const allChunks: string[] = [];
  let totalDecompressedBytes = 0;

  // Stream matching regex: extracts dict << ... >> and binary stream
  const streamRegex = /<<([\s\S]*?)>>\s*stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let streamMatch: RegExpExecArray | null;

  while ((streamMatch = streamRegex.exec(rawString)) !== null) {
    const dict = streamMatch[1];
    const streamContent = streamMatch[2];
    const streamBuf = Buffer.from(streamContent, 'binary');

    let decompressedStr = '';

    // Check if stream is compressed with FlateDecode
    if (dict.includes('/FlateDecode')) {
      try {
        const uncompressed = zlib.inflateSync(streamBuf);
        totalDecompressedBytes += uncompressed.length;
        if (totalDecompressedBytes > MAX_DECOMPRESSED_BYTES) {
          throw new Error('Limite di decompressione superato');
        }
        decompressedStr = uncompressed.toString('latin1');
      } catch {
        try {
          const uncompressed = zlib.inflateRawSync(streamBuf);
          totalDecompressedBytes += uncompressed.length;
          if (totalDecompressedBytes > MAX_DECOMPRESSED_BYTES) {
            throw new Error('Limite di decompressione superato');
          }
          decompressedStr = uncompressed.toString('latin1');
        } catch {
          // Non-critical stream or font data failed to decompress
        }
      }
    } else {
      // Uncompressed stream
      decompressedStr = streamContent;
    }

    if (decompressedStr) {
      const chunks = extractTextFromStreamContent(decompressedStr);
      allChunks.push(...chunks);
    }
  }

  // Also check uncompressed text directly in the raw PDF body if any was missed
  if (allChunks.length === 0) {
    const directChunks = extractTextFromStreamContent(rawString);
    allChunks.push(...directChunks);
  }

  const rawFullText = allChunks.join(' ').replace(/\s+/g, ' ').trim();

  // If very little text is extracted (< 20 chars) and images exist, consider scanned
  const isScanned = rawFullText.length < 25 && hasImages;

  if (isScanned) {
    return {
      success: false,
      text: rawFullText,
      html: '',
      isScanned: true,
      pageCount,
      message: 'Questo PDF sembra una scansione o contiene solo immagini. Incolla il testo manualmente nell\'editor.',
    };
  }

  if (rawFullText.length === 0) {
    return {
      success: false,
      text: '',
      html: '',
      isScanned: false,
      pageCount,
      message: 'Nessun testo estraibile trovato in questo documento PDF.',
    };
  }

  // Format extracted chunks into clean, escaped HTML paragraphs
  const paragraphs: string[] = [];
  let currentPara: string[] = [];

  for (const chunk of allChunks) {
    currentPara.push(chunk);
    // Break into new paragraph on sentence-ending punctuation or long chunk
    if (chunk.endsWith('.') || chunk.endsWith(':') || chunk.endsWith('!') || chunk.endsWith('?') || currentPara.length >= 4) {
      paragraphs.push(currentPara.join(' '));
      currentPara = [];
    }
  }
  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(' '));
  }

  const html = paragraphs
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6;">${escapeHtml(p)}</p>`)
    .join('');

  return {
    success: true,
    text: rawFullText,
    html,
    isScanned: false,
    pageCount,
  };
}
