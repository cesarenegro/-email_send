// Real wizard + real API + real remote DB. Future date prevents delivery; exact fixtures removed.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {admin,login,cookiesFor,revoke,tools} from './audit-live-helpers.mjs';
const origin=process.env.LIVE_ORIGIN||'http://localhost:3000';
const {chromium}=tools('playwright');let A,browser,smtpId,campaignId;
const report={at:new Date().toISOString(),origin,checks:[]};
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
try{
 A=await login('cesare@arkitecna.com');browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext();await context.addCookies(await cookiesFor(A.session,origin));
 const r=await context.request.post(origin+'/api/smtp/connections',{data:{name:'__audit_release__',host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:true,username:process.env.SMTP_USER,password:process.env.SMTP_PASS,from_name:'Audit MAIL-K',from_email:process.env.SMTP_USER}});
 const saved=await r.json();if(saved.id)smtpId=saved.id;assert.equal(r.status(),201,JSON.stringify(saved));
 const page=await context.newPage();page.setDefaultTimeout(25000);
 await page.goto(origin+'/campaigns/new');await page.getByRole('button',{name:'SETUP-DUMMIES',exact:true}).click();
 const next=page.getByRole('button',{name:'Continua',exact:true});await next.click();
 await page.getByPlaceholder('es. Presentazione Nuovi Servizi 2026').fill('__audit_release_'+Date.now());await next.click();
 await page.getByPlaceholder('es. Opportunità di collaborazione per {{azienda}}').fill('Audit A & B <Urgente>');await next.click();
 const pdfReply=page.waitForResponse(r=>r.url().endsWith('/api/email-import/parse-pdf'));
 await page.locator('input[type=file]').setInputFiles('scripts/fixtures/phase3/real-text.pdf');
 const pdf=await pdfReply;const extracted=await pdf.json();assert.equal(pdf.status(),200,JSON.stringify(extracted));assert.equal(extracted.success,true,JSON.stringify(extracted));
 await page.locator('[contenteditable=true]').filter({hasText:'MARKETING'}).waitFor();await next.click();
 assert.ok((await page.locator('body').innerText()).includes('Audit A & B <Urgente>'));
 assert.equal(await next.isDisabled(),true);await page.locator('input[type=checkbox]').check();await next.click();
 await page.locator('input[type=file]').setInputFiles({name:'audit.csv',mimeType:'text/csv',buffer:Buffer.from('azienda,email\nAudit,'+process.env.SMTP_USER+'\nDuplicato,'+process.env.SMTP_USER+'\nInvalido,not-an-email\n')});
 await next.click();
 await page.getByRole('button',{name:/In una data e ora precisa/}).click();await page.locator('input[type=datetime-local]').fill('2099-11-10T10:00');await next.click();
 pass('Actual wizard steps 1–8: SMTP, name, subject, real PDF upload, confirmation, CSV deduplication, scheduling');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/campaigns')&&r.request().method()==='POST');
 const started=page.waitForResponse(r=>r.url().endsWith('/start')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Programma Campagna',exact:true}).click();
 const createResponse=await created;const campaign=await createResponse.json();campaignId=campaign.id;assert.equal(createResponse.status(),201,JSON.stringify(campaign));
 const start=await started;assert.equal(start.status(),200,await start.text());
 const row=await admin.from('campaigns').select('status,next_send_at,smtp_connection_id,html_template,subject_template').eq('id',campaignId).single();assert.ifError(row.error);
 assert.equal(row.data.status,'active');assert.equal(new Date(row.data.next_send_at).toISOString(),'2099-11-10T09:00:00.000Z');assert.equal(row.data.smtp_connection_id,smtpId);assert.ok(row.data.html_template.includes('MARKETING'));assert.equal(row.data.subject_template,'Audit A & B <Urgente>');
 const leads=await admin.from('campaign_leads').select('email,status').eq('campaign_id',campaignId);assert.ifError(leads.error);assert.equal(leads.data.length,1);assert.equal(leads.data[0].email,process.env.SMTP_USER);assert.equal(leads.data[0].status,'pending');
 pass('Actual creation, lead persistence, activation and future schedule verified on remote DB; no messages dispatched');
 const html=await context.request.post(origin+'/api/email-import/parse',{multipart:{file:{name:'audit.html',mimeType:'text/html',buffer:Buffer.from('<p>Test</p><img/src=data:, onerror=window.__auditXss=1>')}}});const sanitized=await html.json();assert.equal(html.status(),200);assert.ok(!sanitized.html.includes('onerror'));pass('Live HTML import blocks reported slash bypass');
}catch(e){report.checks.push({name:'Execution',status:'FAIL',evidence:e.message});console.error(e.message);process.exitCode=1;}
finally{
 await browser?.close();
 if(campaignId){assert.ifError((await admin.from('campaign_leads').delete().eq('campaign_id',campaignId)).error);assert.ifError((await admin.from('campaigns').delete().eq('id',campaignId)).error);}
 if(smtpId)assert.ifError((await admin.from('smtp_connections').delete().eq('id',smtpId)).error);
 await revoke(A);report.cleanup=true;
 await writeFile('output/audit-local-20261013/wizard-release-'+(origin.includes('localhost')?'local':'production')+'.json',JSON.stringify(report,null,2));
}
