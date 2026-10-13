import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { sanitizeEmailHtml, escapeHtml, sanitizeUrl, sanitizeInlineStyle } from '../lib/security/sanitize-html.ts';
import { parsePdfBuffer } from '../lib/email-import/pdf-parser.ts';

console.log('=== TEST SUITE: SICUREZZA IMPORT EMAIL, SANITIZZAZIONE XSS E PARSER PDF FLATEDECODE ===\n');

// -------------------------------------------------------------
// 1. TEST SANITIZZAZIONE XSS
// -------------------------------------------------------------

// T01: Rimozione tag <script> e suo contenuto
{
  const dirty = '<p>Buongiorno {{azienda}},</p><script>alert("PWNED!");</script><p>Vi contattiamo.</p>';
  const clean = sanitizeEmailHtml(dirty);
  assert.ok(!clean.includes('<script>'), 'Script tag must be stripped');
  assert.ok(!clean.includes('alert('), 'Script contents must be stripped');
  assert.ok(clean.includes('Buongiorno {{azienda}}'), 'Legitimate text and template variables must be preserved');
  console.log('PASS T01: Rimozione completa tag <script> e contenuto');
}

// T02: Rimozione attributi inline on* (onerror, onload, onclick, onmouseover)
{
  const dirty = '<p>Offerta speciale: <img src="https://example.com/logo.png" onerror="alert(1)" onload="fetch(\'http://leak\')">.</p>';
  const clean = sanitizeEmailHtml(dirty);
  assert.ok(!clean.includes('onerror'), 'onerror attribute must be stripped');
  assert.ok(!clean.includes('onload'), 'onload attribute must be stripped');
  assert.ok(clean.includes('src="https://example.com/logo.png"'), 'Legitimate image src must be preserved');
  console.log('PASS T02: Rimozione attributi evento on* (onerror, onload)');
}

// T03: Blocco protocolli URL pericolosi (javascript:, vbscript:, data:)
{
  const dirty = `
    <p>
      <a href="javascript:alert(document.cookie)">Clicca qui</a>
      <a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Altro link</a>
      <a href="https://arkitecna.com">Sito Ufficiale</a>
    </p>
  `;
  const clean = sanitizeEmailHtml(dirty);
  assert.ok(!clean.includes('javascript:'), 'javascript: URLs must be defanged');
  assert.ok(!clean.includes('data:text/html'), 'data: HTML URLs must be defanged');
  assert.ok(clean.includes('href="https://arkitecna.com"'), 'https: URLs must be preserved');
  assert.ok(clean.includes('rel="noopener noreferrer"'), 'noopener noreferrer must be enforced on links');
  console.log('PASS T03: Blocco protocolli URL pericolosi (javascript:, data:)');
}

// T04: Rimozione tag pericolosi SVG, IFRAME, OBJECT, EMBED, FORM
{
  const dirty = `
    <div>
      <iframe src="https://evil.com"></iframe>
      <svg><circle r="10"/><script>alert(1)</script></svg>
      <object data="test.swf"></object>
      <form action="/steal"><input name="pass"></form>
      <h2>Titolo Legittimo</h2>
    </div>
  `;
  const clean = sanitizeEmailHtml(dirty);
  assert.ok(!clean.includes('iframe'), 'iframe must be stripped');
  assert.ok(!clean.includes('svg'), 'svg must be stripped');
  assert.ok(!clean.includes('object'), 'object must be stripped');
  assert.ok(!clean.includes('form'), 'form must be stripped');
  assert.ok(clean.includes('<h2>Titolo Legittimo</h2>'), 'h2 tag must be preserved');
  console.log('PASS T04: Rimozione tag pericolosi (iframe, svg, object, form)');
}

// T05: Sanitizzazione CSS inline (rimozione expression, behavior, url())
{
  const dirty = '<p style="color: #1B1C1A; font-size: 14px; background: url(\'http://leak.com/beacon\'); width: expression(alert(1));">Testo</p>';
  const clean = sanitizeEmailHtml(dirty);
  assert.ok(!clean.includes('expression'), 'CSS expression must be stripped');
  assert.ok(!clean.includes('url('), 'CSS url() must be stripped');
  assert.ok(clean.includes('color: #1B1C1A'), 'Safe CSS color must be preserved');
  assert.ok(clean.includes('font-size: 14px'), 'Safe CSS font-size must be preserved');
  console.log('PASS T05: Sanitizzazione CSS inline');
}

// T06: Escaping HTML di testo semplice
{
  const raw = 'Gentile cliente <info@azienda.it>, la vostra fattura è di € 100 > 50 & "confermata".';
  const escaped = escapeHtml(raw);
  assert.ok(!escaped.includes('<info@azienda.it>'), 'Angle brackets must be escaped');
  assert.ok(escaped.includes('&lt;info@azienda.it&gt;'), 'Angle brackets must be converted to entities');
  assert.ok(escaped.includes('&amp;'), 'Ampersands must be escaped');
  assert.ok(escaped.includes('&quot;'), 'Quotes must be escaped');
  console.log('PASS T06: Escaping corretto di testo semplice');
}

// -------------------------------------------------------------
// 2. TEST PARSER PDF CON FLATEDECODE E GESTIONE SCANSIONI
// -------------------------------------------------------------

function makeSyntheticPdf(text, compress = true) {
  const streamData = `BT /F1 12 Tf 72 712 Td (${text.replace(/([()\\])/g, '\\$1')}) Tj ET`;
  let streamBuf;
  let filterAttr = '';

  if (compress) {
    streamBuf = zlib.deflateSync(Buffer.from(streamData, 'latin1'));
    filterAttr = '/Filter /FlateDecode ';
  } else {
    streamBuf = Buffer.from(streamData, 'latin1');
  }

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamBuf.length} ${filterAttr}>>
stream
` + streamBuf.toString('binary') + `
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;

  return Buffer.from(pdf, 'binary');
}

function makeScannedImagePdf() {
  const fakeImageStream = Buffer.alloc(500, 0xff);
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 4 0 R >> >> >>
endobj
4 0 obj
<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${fakeImageStream.length} >>
stream
` + fakeImageStream.toString('binary') + `
endstream
endobj
trailer
<< /Size 5 /Root 1 0 R >>
%%EOF`;
  return Buffer.from(pdf, 'binary');
}

// T07: Estrazione testo da PDF con compressione FlateDecode
{
  const expectedText = 'MAIL-K Precision Outbound: Proposta di partenariato per aziende high-ticket.';
  const pdfBuffer = makeSyntheticPdf(expectedText, true);
  const res = await parsePdfBuffer(pdfBuffer);

  assert.equal(res.success, true);
  assert.equal(res.isScanned, false);
  assert.ok(res.text.includes('MAIL-K Precision Outbound'));
  assert.ok(res.html.includes('<p style="margin: 0 0 14px 0; line-height: 1.6;">'));
  console.log('PASS T07: Decompressione FlateDecode ed estrazione testo PDF riuscita');
}

// T08: Estrazione testo da PDF non compresso
{
  const expectedText = 'Documento non compresso con testo digitale per collaudo integrato.';
  const pdfBuffer = makeSyntheticPdf(expectedText, false);
  const res = await parsePdfBuffer(pdfBuffer);

  assert.equal(res.success, true);
  assert.equal(res.isScanned, false);
  assert.ok(res.text.includes('Documento non compresso'));
  console.log('PASS T08: Estrazione testo da PDF non compresso riuscita');
}

// T09: Distinzione accurata di PDF scansionato (solo immagini bitmap)
{
  const scannedPdfBuffer = makeScannedImagePdf();
  const res = await parsePdfBuffer(scannedPdfBuffer);

  assert.equal(res.success, false);
  assert.equal(res.isScanned, true);
  assert.ok(res.message.includes('scansione'));
  console.log('PASS T09: Riconoscimento accurato di PDF scansionato');
}

// T10: Rifiuto file non valido o vuoto
{
  const invalidBuffer = Buffer.from('Questo non è un file PDF valido.');
  const res = await parsePdfBuffer(invalidBuffer);
  assert.equal(res.success, false);
  assert.ok(res.message.includes('non sembra un formato PDF valido'));

  const emptyRes = await parsePdfBuffer(Buffer.alloc(0));
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.message.includes('vuoto'));
  console.log('PASS T10: Rifiuto file PDF vuoti o non validi');
}

console.log('\n=== TUTTI I 10 TEST DI SICUREZZA E PARSING PDF SONO STATI SUPERATI CON SUCCESSO (10/10 PASS) ===');
