'use strict';
// Isolated client-only Chromium acceptance; intercepted fake API responses.
// No real user credentials, sessions, production SQL or live browser navigation.
const assert=require('node:assert/strict'),path=require('node:path');
if(process.env.CONNECT_ISOLATED_QA!=='yes')throw Error('ISOLATED_QA_ONLY');
const {chromium}=require(path.join(process.env.CONNECT_BROWSER_TOOLING_ROOT,'node_modules/playwright'));
const host='api.assps.edu.pk', origin='https://'+host+':3017';
let browser, passed=0, mocked=0, external=0;
const check=(name,result)=>{assert.ok(result,name);passed++;console.log('PASS '+name)};
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP '+host+' 127.0.0.1, EXCLUDE localhost']});
 const ctx=await browser.newContext({ignoreHTTPSErrors:false});
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname===host && u.protocol==='https:' && u.port==='3017')return route.continue();
  external++;return route.abort('blockedbyclient');
 });
 await ctx.route('**/api/auth/login',route=>{
  if(route.request().method()!=='POST')return route.continue();
  mocked++;
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({success:true,mustChangePassword:true,
     redirectTo:'/auth/change-password?userId=990010001',
     user:{id:990010001,role:'teacher',school_id:1}})});
 });
 const page=await ctx.newPage();
 const pageerrors=[];
 page.on('pageerror',e=>pageerrors.push(e.message));
 let initialMeCalls=0;
 page.on('request',request=>{if(request.url().includes('/api/auth/me'))initialMeCalls++});
 await page.goto(origin+'/login?next=%2Fteacher',{waitUntil:'domcontentloaded',timeout:20000});
 const user=page.locator('input[autocomplete="username"]');
 if(!(await user.isVisible({timeout:2000}).catch(()=>false))){
   if(await page.getByRole('button',{name:/Login Selector/}).isVisible().catch(()=>false))
     await page.getByRole('button',{name:/Login Selector/}).click();
   if(!(await user.isVisible({timeout:2000}).catch(()=>false)))
     await page.getByRole('button',{name:/Secure access for teachers/i}).click();
 }
 await user.waitFor({state:'visible',timeout:8000});
 await user.fill('ISOLATED_QA_NONACCOUNT');
 await page.locator('input[autocomplete="current-password"]').first().fill('SYNTHETIC_NO_REAL_PASSWORD');
 await page.locator('form button[type="submit"]').first().click();
 await page.waitForURL(/\/auth\/change-password\?userId=990010001$/, {timeout:12000});
 check('synthetic temporary-password login opens change challenge',page.url().endsWith('/auth/change-password?userId=990010001'));
 check('only intercepted client-side API was used for login',mocked===1);
 check('synthetic challenge never enters admin portal',!page.url().includes('/admin'));
 await page.waitForTimeout(1550);
 check('challenge remains on change-password page after anonymous session probe',
   new URL(page.url()).pathname==='/auth/change-password');
 const fields=page.locator('input[autocomplete="current-password"], input[autocomplete="new-password"]');
 check('change-password page has three protected fields',await fields.count()===3);
 check('change-password page hides all three passwords',await fields.evaluateAll(xs=>xs.every(x=>x.type==='password')));
 const toggle=page.getByRole('button',{name:'Show temporary password'});
 check('visibility control is accessible',await toggle.isVisible());
 await toggle.evaluate(el=>el.click());
 await page.waitForTimeout(220);
 check('visibility toggle exposes temporary password only',await fields.evaluateAll(xs=>xs[0].type==='text' && xs[1].type==='password' && xs[2].type==='password'));
 await page.getByRole('button',{name:'Hide temporary password'}).evaluate(el=>el.click());
 await page.waitForTimeout(220);
 check('toggle restores masked field',await fields.evaluateAll(xs=>xs.every(x=>x.type==='password')));
 check('no Chromium uncaught script errors',pageerrors.length===0);
 console.log('ISOLATED_FIRST_LOGIN_BROWSER_ACCEPTANCE '+passed+'/'+passed+' PASS; mocked_browser_login='+mocked+' outside_blocked='+external+' initial_auth_me_calls='+initialMeCalls);
})().catch(e=>{console.error('ISOLATED_FIRST_LOGIN_BROWSER_HOLD '+e.message);process.exitCode=2;}).finally(async()=>{if(browser)await browser.close()});
