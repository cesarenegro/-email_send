import {login,cookiesFor,revoke,tools} from './audit-live-helpers.mjs';
const {chromium}=tools('playwright');
let account,browser;
try {
  account=await login('cesare@arkitecna.com');
  browser=await chromium.launch({channel:'msedge',headless:true});
  for (const origin of ['http://localhost:3000']) {
    const context=await browser.newContext();
    await context.addCookies(await cookiesFor(account.session,origin));
    const page=await context.newPage();
    const api=await context.request.get(origin+'/api/smtp/connections');
    await page.goto(origin+'/campaigns/new',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'SETUP-DUMMIES',exact:true}).waitFor({timeout:15000}).catch(()=>{});
    console.log(JSON.stringify({origin,apiStatus:api.status(),apiType:api.headers()['content-type'],pagePath:new URL(page.url()).pathname,wizardButtons:await page.getByRole('button',{name:'SETUP-DUMMIES',exact:true}).count()}));
    console.log((await page.locator('body').innerText()).slice(0,2500));
    await context.close();
  }
} finally {await browser?.close();await revoke(account);}
