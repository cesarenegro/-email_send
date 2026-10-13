// AUTHORIZED LIVE AUDIT: real remote Auth/DB and real SMTP self-test.
// Creates only tracked temporary rows, removes them in finally, revokes only test sessions.
// No deployment, migration, campaign launch, password logging or credential files.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {admin,login,cookiesFor,revoke,tools,url,anonKey} from './audit-live-helpers.mjs';
const {chromium}=tools('playwright');
const {build}=tools('esbuild');
const origin='http://localhost:3000';
const report={at:new Date().toISOString(),origin,database:new URL(url).hostname,checks:[],limits:['Public deployment /api/smtp/connections returned authenticated 404. Tests below target local app and real remote dependencies.']};
const fixtureIds=[];
let A,B,browser,release;
function pass(name,evidence){report.checks.push({name,status:'PASS',evidence});console.log('PASS '+name+(evidence?' '+JSON.stringify(evidence):''));}
async function api(context,route,data){const r=await context.request[data===undefined?'get':'post'](origin+route,data===undefined?{}:{data});return {status:r.status(),data:await r.json()};}
try {
  A=await login('cesare@arkitecna.com'); B=await login('yelhk.cpa@gmail.com');
  pass('Two distinct real Supabase Auth sessions', {differentUsers:A.user.id!==B.user.id});
  browser=await chromium.launch({channel:'msedge',headless:true});
  const ca=await browser.newContext(), cb=await browser.newContext();
  await ca.addCookies(await cookiesFor(A.session,origin)); await cb.addCookies(await cookiesFor(B.session,origin));
  const page=await ca.newPage(); page.setDefaultTimeout(20000);
  await page.goto(origin+'/campaigns/new');
  await page.getByRole('button',{name:'SETUP-DUMMIES',exact:true}).click();
  const email=page.getByPlaceholder('es. nome@dominio.it');
  await email.waitFor(); assert.equal(await email.inputValue(),A.user.email);
  await page.getByPlaceholder('es. Mario Rossi | Azienda').fill('MAIL-K audit temporaneo');
  await email.fill(process.env.SMTP_USER); await email.press('Tab');
  await page.getByRole('button',{name:'Parametri server (Host/Porta SMTP)',exact:true}).click().catch(()=>{});
  await page.getByPlaceholder('es. smtp.gmail.com').fill(process.env.SMTP_HOST);
  await page.locator('input[type=password]').fill(process.env.SMTP_PASS);
  const savedResponse=page.waitForResponse(r=>r.url().endsWith('/api/smtp/connections')&&r.request().method()==='POST',{timeout:45000});
  await page.getByRole('button',{name:'Verifica e Collega Casella',exact:true}).click();
  const sr=await savedResponse; const saved=await sr.json();
  if (saved.id) fixtureIds.push(saved.id);
  assert.equal(sr.status(),201,JSON.stringify(saved)); assert.equal(saved.is_verified,true);
  assert.equal(saved.from_email,process.env.SMTP_USER); assert.ok(!('encrypted_password' in saved));
  pass('Real wizard → SMTP verification → encrypted remote save',{id:saved.id,status:sr.status()});
  const encrypted=await admin.from('smtp_connections').select('encrypted_password,user_id').eq('id',saved.id).single();
  assert.ifError(encrypted.error);assert.equal(encrypted.data.user_id,A.user.id);
  assert.ok(encrypted.data.encrypted_password.startsWith('v1:'));assert.notEqual(encrypted.data.encrypted_password,process.env.SMTP_PASS);
  pass('Remote credentials encrypted and bound to A');
  const own=await A.client.from('user_smtp_connections_view').select('*').eq('id',saved.id);
  assert.ifError(own.error);assert.equal(own.data.length,1);assert.ok(!('encrypted_password' in own.data[0]));
  const foreign=await B.client.from('user_smtp_connections_view').select('*').eq('id',saved.id);
  assert.ifError(foreign.error);assert.equal(foreign.data.length,0);
  pass('Real JWT A sees metadata, real JWT B sees zero rows');
  for(const account of [A,B]){
    const read=await account.client.from('smtp_connections').select('id').eq('id',saved.id);
    assert.equal(read.error?.code,'42501');
    const write=await account.client.from('user_smtp_connections_view').update({name:'UNAUTHORIZED AUDIT WRITE'}).eq('id',saved.id);
    assert.equal(write.error?.code,'42501');
  }
  pass('Both users denied base-table read and view update (42501)');
  const bList=await api(cb,'/api/smtp/connections'); assert.equal(bList.status,200);assert.ok(!bList.data.some(x=>x.id===saved.id));
  const bSend=await api(cb,'/api/settings/send-test',{to:process.env.SMTP_USER,smtp_connection_id:saved.id});
  assert.equal(bSend.status,400);assert.match(bSend.data.error,/altro utente/);
  const bDefault=await api(cb,'/api/settings/send-test',{to:process.env.SMTP_USER});
  assert.equal(bDefault.status,400);assert.match(bDefault.data.error,/Nessuna configurazione SMTP/);
  pass('API B cannot list/use A SMTP; no admin fallback',{foreign:bSend.status,withoutConnection:bDefault.status});
  const send=await api(ca,'/api/settings/send-test',{to:process.env.SMTP_USER,smtp_connection_id:saved.id});
  assert.equal(send.status,200,JSON.stringify(send));assert.equal(send.data.fromEmail,process.env.SMTP_USER);assert.ok(send.data.messageId);
  report.messageId=send.data.messageId;
  pass('Real application SMTP self-send accepted',{messageId:send.data.messageId,from:send.data.fromEmail,to:process.env.SMTP_USER});

  // Authentication is real; only delivery timing of the successful verify response is controlled.
  const authBundle=await build({stdin:{contents:`import {createBrowserClient} from '@supabase/ssr'; window.auditAuth=createBrowserClient(${JSON.stringify(url)},${JSON.stringify(anonKey)});`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
  const switchTab=await ca.newPage();await switchTab.goto(origin+'/campaigns/new');
  await switchTab.addScriptTag({content:authBundle.outputFiles[0].text});
  await page.getByRole('button',{name:'Collega Nuova',exact:true}).click();
  await page.locator('input[type=password]').fill(process.env.SMTP_PASS);
  let signalReady; const ready=new Promise(resolve=>signalReady=resolve);
  const gate=new Promise(resolve=>release=resolve);
  let posts=0;
  page.on('request',r=>{if(r.url().endsWith('/api/smtp/connections')&&r.method()==='POST') posts++;});
  await page.route('**/api/smtp/verify',async route=>{
    const response=await route.fetch();
    report.raceVerifyStatus=response.status();
    signalReady();await gate;
    await route.fulfill({response}).catch(()=>{});
  });
  await page.getByRole('button',{name:'Verifica e Collega Casella',exact:true}).click();
  await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Real SMTP race handshake timeout')),30000))]);
  assert.equal(report.raceVerifyStatus,200);
  const changed=await switchTab.evaluate(async session=>{const r=await window.auditAuth.auth.setSession(session);return {error:r.error?.message,id:r.data.user?.id};},B.session);
  assert.equal(changed.id,B.user.id);assert.ok(!changed.error);
  await page.waitForFunction(expected=>document.querySelector('input[placeholder="es. nome@dominio.it"]')?.value===expected,B.user.email);
  release();await page.waitForTimeout(1500);
  assert.equal(posts,0);assert.equal(await page.locator('input[type=password]').inputValue(),'');
  const drafts=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('mailk_dummies_wizard_draft_'))));
  const bd=JSON.parse(drafts['mailk_dummies_wizard_draft_'+B.user.id]);
  assert.equal(bd.userId,B.user.id);assert.ok(!bd.smtp.smtpConnectionId);assert.equal(bd.smtp.email,B.user.email);
  assert.ok(!JSON.stringify(drafts).includes(process.env.SMTP_PASS));
  const after=await admin.from('smtp_connections').select('id').eq('user_id',B.user.id);
  assert.ifError(after.error);assert.equal(after.data.length,0);
  pass('Real two-tab A→B Auth switch during real SMTP verification: zero save POSTs; B draft/password clean');
  await page.screenshot({path:'output/audit-local-20261013/live-switch-B.png'});
}catch(error){report.checks.push({name:'Execution stopped',status:'FAIL',evidence:error.message});console.error('FAIL '+error.message);process.exitCode=1;}
finally{
  release?.();await browser?.close();
  for(const id of fixtureIds){const d=await admin.from('smtp_connections').delete().eq('id',id);if(d.error){report.cleanupError=d.error.message;process.exitCode=1;}}
  if(fixtureIds.length){const remaining=await admin.from('smtp_connections').select('id').in('id',fixtureIds);report.fixturesRemaining=remaining.data?.length;if(remaining.error||remaining.data.length)process.exitCode=1;}
  await revoke(A);await revoke(B);
  report.sessionsRevoked=true;
  await writeFile('output/audit-local-20261013/live-results.json',JSON.stringify(report,null,2));
  console.log('Cleanup '+JSON.stringify({fixturesRemaining:report.fixturesRemaining,sessionsRevoked:report.sessionsRevoked}));
}
