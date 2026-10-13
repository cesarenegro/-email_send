// Explicitly authorized second mailbox test. Secrets are read only in memory.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {ImapFlow} from 'imapflow';
import {admin,login,cookiesFor,revoke,tools} from './audit-live-helpers.mjs';
const {chromium}=tools('playwright');
const origin = process.env.LIVE_ORIGIN || 'https://mailk.arkai.dev';
const first=JSON.parse(await readFile('output/audit-local-20261013/live-results.json','utf8'));
const report={at:new Date().toISOString(),checks:[]};
let G,browser,id,imap;
const messageIds=[first.messageId];
function record(name,status,evidence){report.checks.push({name,status,evidence});console.log(JSON.stringify({name,status,evidence}));}
try{
  G=await login('cesare.negro@gmail.com');
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext();await context.addCookies(await cookiesFor(G.session,origin));
  const password=(await readFile('E:/passowrd email CNJ gmail.txt','utf8')).trim();
  const verify=await context.request.post(origin+'/api/smtp/verify',{data:{host:'smtp.gmail.com',port:465,secure:true,user:G.user.email,pass:password}});
  const result=await verify.json();
  record('Real Gmail SMTP authentication',verify.ok()&&result.success?'PASS':'BLOCKED',{status:verify.status(),code:result.code,error:result.error});
  if(verify.ok()&&result.success){
    const save=await context.request.post(origin+'/api/smtp/connections',{data:{name:'MAIL-K Gmail audit temporaneo',host:'smtp.gmail.com',port:465,secure:true,username:G.user.email,password,from_name:'MAIL-K audit',from_email:G.user.email}});
    const saved=await save.json();id=saved.id;assert.equal(save.status(),201,JSON.stringify(saved));
    const send=await context.request.post(origin+'/api/settings/send-test',{data:{to:process.env.SMTP_USER,smtp_connection_id:id}});
    const sent=await send.json();assert.equal(send.status(),200,JSON.stringify(sent));assert.equal(sent.fromEmail,G.user.email);
    messageIds.push(sent.messageId);record('Real Gmail send to Cesare','PASS',{messageId:sent.messageId,from:sent.fromEmail,to:process.env.SMTP_USER});
  }
  // Confirm actual receipt with EXAMINE/readOnly; no message flags, deletion, or body changes.
  imap=new ImapFlow({host:'imap.hostinger.com',port:993,secure:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},logger:false,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000});
  await imap.connect();await imap.mailboxOpen('INBOX',{readOnly:true});assert.equal(imap.mailbox.readOnly,true);
  for(const messageId of messageIds){
    const found=await imap.search({header:{'message-id':messageId}},{uid:true});
    if(!found?.length){record('Receipt in INBOX','NOT_FOUND',{messageId});continue;}
    const msg=await imap.fetchOne(found[0],{envelope:true,flags:true},{uid:true});
    assert.equal(msg.envelope.messageId,messageId);
    record('Actual receipt in read-only INBOX','PASS',{messageId,uid:found[0],from:msg.envelope.from.map(x=>x.address),to:msg.envelope.to.map(x=>x.address),readOnly:imap.mailbox.readOnly});
  }
}catch(e){record('Live delivery check','FAIL',e.message);process.exitCode=1;}
finally{
  if(imap){await imap.logout().catch(()=>imap.close());}
  await browser?.close();
  if(id){const d=await admin.from('smtp_connections').delete().eq('id',id);assert.ifError(d.error);}
  await revoke(G);report.sessionRevoked=true;
  await writeFile('output/audit-local-20261013/live-delivery-results.json',JSON.stringify(report,null,2));
}
