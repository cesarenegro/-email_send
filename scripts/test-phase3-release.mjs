// Local release gates: actual modules, browser components and valid desktop-generated PDFs.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
const tools=createRequire(path.resolve('output/audit-local-20261013/tools/package.json'));
const {build}=tools('esbuild');const {chromium}=tools('playwright');
await build({stdin:{contents:"export * from './lib/email-import/pdf-parser'; export * from './lib/security/sanitize-html';",resolveDir:process.cwd()},bundle:true,packages:'external',platform:'node',format:'esm',outfile:'output/audit-local-20261013/release-modules.mjs'});
const {parsePdfBuffer,checkPdfResourceLimits,sanitizeEmailHtml}=await import('../output/audit-local-20261013/release-modules.mjs');
const checks=[];const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name);};
const digital=await parsePdfBuffer(await readFile('scripts/fixtures/phase3/real-text.pdf'));
assert.equal(digital.success,true);assert.equal(digital.pageCount,1);
assert.equal(digital.text,'MARKETING - Primo Secondo Terzo\nPerché società e qualità: € 100. A & B <Urgente>\nSecondo font e testo ordinato.');
pass('Valid ReportLab PDF: literal MARKETING, ordered text, accents, euro, two fonts and embedded ToUnicode');
assert.equal((await parsePdfBuffer(await readFile('scripts/fixtures/phase3/encrypted.pdf'))).unsupportedFormat,true);
assert.equal((await parsePdfBuffer(await readFile('scripts/fixtures/phase3/scan.pdf'))).isScanned,true);
assert.equal((await parsePdfBuffer(Buffer.from('not a PDF'))).unsupportedFormat,true);
pass('Real encrypted and image-only PDFs distinguished from invalid input');
function bomb(sizes){let p='%PDF-1.4\n';for(const size of sizes){const b=zlib.deflateSync(Buffer.alloc(size,65));p+='1 0 obj\n<< /Length '+b.length+' /Filter /FlateDecode >>\nstream\n'+b.toString('latin1')+'\nendstream\nendobj\n';}return Buffer.from(p,'latin1');}
assert.throws(()=>checkPdfResourceLimits(bomb([5*1024*1024])),/limite/);
assert.throws(()=>checkPdfResourceLimits(bomb(Array(5).fill(3*1024*1024))),/budget cumulativo/);
pass('Per-stream and cumulative decompression limits reject oversized documents');
const attacks=['<img/src=data:, onerror=window.__auditXss=1>','<img/src="x"/onerror="window.__auditXss=1">','<svg><foreignObject><img src=x onerror=window.__auditXss=1></foreignObject></svg>','<a href="java&#x73;cript:window.__auditXss=1">link</a>','<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.__auditXss=1>">'];
for(const value of attacks)assert.ok(!/onerror|javascript:/i.test(sanitizeEmailHtml(value)));
pass('Server sanitizer rejects slash, entity and foreign-content payloads');
const ui=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Preview from './components/dummies/steps/Step5PreviewConfirm';window.renderAudit=html=>createRoot(document.getElementById('root')).render(<Preview fromEmail="audit@example.com" subject="Offerta A & B <Urgente>" html={html} isConfirmed={false} onConfirmChange={()=>{}}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
for(const value of attacks){const p=await browser.newPage();await p.route('**/*',r=>r.abort());await p.setContent('<div id="root"></div>');await p.addScriptTag({content:ui.outputFiles[0].text});await p.evaluate(html=>window.renderAudit(html),value);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>window.__auditXss),undefined);assert.equal(await p.locator('[onerror],[onload],a[href^="javascript:"]').count(),0);assert.ok((await p.locator('body').innerText()).includes('Offerta A & B <Urgente>'));await p.close();}
pass('Actual Step5PreviewConfirm in browser: no payload execution and correct subject');
}finally{await browser.close();}
await writeFile('output/audit-local-20261013/phase3-release-results.json',JSON.stringify({at:new Date().toISOString(),checks},null,2));
