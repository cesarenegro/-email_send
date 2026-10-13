// Real Step1Smtp mounted in Chromium; only HTTP responses and parent session are controlled.
// npm install --prefix output/audit-local-20261013/tools --no-audit --no-fund playwright esbuild
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const root = process.cwd();
const tools = createRequire(path.join(root, 'output/audit-local-20261013/tools/package.json'));
const { build } = tools('esbuild');
const { chromium } = tools('playwright');
const harness = `
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Step from './components/dummies/steps/Step1Smtp';
window.epoch = 1; window.requests = []; window.updates = [];
const pending = [];
window.fetch = (url, options = {}) => {
  window.requests.push({url, method: options.method || 'GET', signal: options.signal});
  // Intentionally ignore abort: a response already in flight may still complete.
  return new Promise(resolve => pending.push({url, method: options.method || 'GET', resolve}));
};
window.reply = (url, method, data) => {
  const i = pending.findIndex(x => x.url === url && x.method === method);
  if (i < 0) throw new Error('No pending request: ' + url);
  pending.splice(i, 1)[0].resolve({ok: true, json: async () => data});
};
const initial = user => ({useExisting:false, email:user+'@example.com', host:'smtp.example.com',
  port:465, secure:true, provider:'custom', isVerified:false, smtpConnectionId:null});
function Harness() {
  const [user, setUser] = useState('A');
  const [data, setData] = useState(initial('A'));
  window.switchUser = next => { window.epoch++; setUser(next); setData(initial(next || 'guest')); };
  window.rotateSession = () => { window.epoch++; };
  useEffect(() => {if(user) localStorage.setItem('draft_'+user, JSON.stringify(data));}, [user,data]);
  return user ? <Step key={user} currentUserId={user} getSessionToken={() => window.epoch}
    data={data} onUpdate={(update, owner) => {window.updates.push({update,owner}); setData(d=>({...d,...update}));}} /> : <p>Signed out</p>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness /></React.StrictMode>);
`;
async function bundle(mutated = false) {
  return (await build({stdin:{contents:harness, resolveDir:root, loader:'tsx'}, bundle:true,
    write:false, format:'iife', platform:'browser', define:{'process.env.NODE_ENV':'"development"'},
    plugins: mutated ? [{name:'mutation', setup(b){b.onLoad({filter:/Step1Smtp\.tsx$/},async args=>({
      contents:(await readFile(args.path,'utf8')).replace(/isCurrent: \(\) => Boolean\([\s\S]*?getSessionToken\(\) === token\)/,
        'isCurrent: () => Boolean(currentUserId)'), loader:'tsx'}));}}] : []})).outputFiles[0].text;
}
let source = await bundle();
const server = http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');
  res.end(req.url==='/app.js'?source:'<html><body><div id="root"></div><script src="/app.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({channel:'msedge',headless:true});
const results=[];
const flush = async page => {await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
async function open() {
  const page=await browser.newPage();
  await page.goto(url); await page.locator('input[type=password]').waitFor();
  return page;
}
async function start(page) {
  await page.locator('input[type=password]').fill('synthetic-password');
  await page.getByRole('button',{name:'Verifica e Collega Casella'}).click();
  await page.waitForFunction(()=>window.requests.some(r=>r.url==='/api/smtp/verify'));
}
async function replyVerify(page) {
  await page.evaluate(()=>window.reply('/api/smtp/verify','POST',{success:true})); await flush(page);
}
async function writes(page) {return page.evaluate(()=>window.requests.filter(r=>r.url==='/api/smtp/connections'&&r.method==='POST').length);}
async function scenario(name, fn) {
  const page=await open();try{await fn(page);results.push({name,status:'PASS'});console.log('PASS',name);}finally{await page.close();}
}
try {
  await scenario('Positive: current session verifies and saves once',async p=>{
    await start(p);await replyVerify(p);assert.equal(await writes(p),1);
    await p.evaluate(()=>window.reply('/api/smtp/connections','POST',{id:'connection-A',is_verified:true}));await flush(p);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('draft_A')).smtpConnectionId),'connection-A');
    assert.equal(await p.evaluate(()=>JSON.stringify(localStorage).includes('synthetic-password')),false);
    await p.getByRole('button',{name:'Collega Nuova'}).click();
    assert.equal(await p.locator('input[type=password]').inputValue(),'');
  });
  await scenario('A -> B: late verify cannot POST or change B draft',async p=>{
    await start(p);await p.evaluate(()=>window.switchUser('B'));await flush(p);
    const before=await p.evaluate(()=>localStorage.getItem('draft_B'));
    await replyVerify(p);assert.equal(await writes(p),0);
    assert.equal(await p.evaluate(()=>localStorage.getItem('draft_B')),before);
    assert.equal(await p.evaluate(()=>window.requests.find(r=>r.url==='/api/smtp/verify').signal.aborted),true);
  });
  await scenario('Logout -> same user: old verify stays invalid',async p=>{
    await start(p);await p.evaluate(()=>window.switchUser(null));await flush(p);
    await p.evaluate(()=>window.switchUser('A'));await flush(p);await replyVerify(p);assert.equal(await writes(p),0);
  });
  await scenario('Session changes before React remount: token blocks continuation',async p=>{
    await start(p);await p.evaluate(()=>window.rotateSession());await replyVerify(p);assert.equal(await writes(p),0);
  });
  await scenario('Unmount: late verify does not save',async p=>{
    await start(p);await p.evaluate(()=>window.switchUser(null));await flush(p);await replyVerify(p);assert.equal(await writes(p),0);
  });
  await scenario('Late save response cannot change B',async p=>{
    await start(p);await replyVerify(p);assert.equal(await writes(p),1);
    await p.evaluate(()=>window.switchUser('B'));await flush(p);
    const before=await p.evaluate(()=>localStorage.getItem('draft_B'));
    await p.evaluate(()=>window.reply('/api/smtp/connections','POST',{id:'connection-A',is_verified:true}));await flush(p);
    assert.equal(await p.evaluate(()=>localStorage.getItem('draft_B')),before);
  });
  // Verify this suite detects the original class of bug, without modifying application files.
  source=await bundle(true);
  await scenario('Mutation check: disabled guards reproduce unwanted save',async p=>{
    await start(p);await p.evaluate(()=>window.switchUser('B'));await flush(p);await replyVerify(p);
    assert.equal(await writes(p),1,'Test must detect a save when guards are disabled');
  });
} finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));
  await mkdir('output/audit-local-20261013',{recursive:true});
  await writeFile('output/audit-local-20261013/browser-results.json',JSON.stringify(results,null,2));
}
