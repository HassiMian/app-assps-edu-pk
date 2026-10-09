import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'
const port=5937
const host=`http://127.0.0.1:${port}`
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']})
let logs=''
child.stdout.on('data',b=>{logs+=b.toString()})
child.stderr.on('data',b=>{logs+=b.toString()})
let browser
try {
 let running=false
 for(let i=0;i<75;i++){
  try{const r=await fetch(host+'/login',{signal:AbortSignal.timeout(1200)});if(r.ok){running=true;break}}catch{}
  await sleep(350)
 }
 assert.ok(running,'Vite did not start: '+logs.slice(-1100))
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const page=await browser.newPage({viewport:{width:1200,height:900}})
 let requests=0, confirms=0, capturedRequests=[]
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname!=='127.0.0.1') return route.abort('blockedbyclient')
  if(url.pathname==='/api/auth/password-reset/request'){
   requests++
   capturedRequests.push(route.request().postDataJSON())
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Generic response',resetToken:'a'.repeat(48)})})
  }
  if(url.pathname==='/api/auth/password-reset/confirm'){
   confirms++
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,message:'Updated'})})
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})})
  return route.continue()
 })
 await page.goto(host+'/login',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.apex-auth-brand img').waitFor({timeout:30000})
 const logo=await page.locator('.apex-auth-brand img').evaluate(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0}))
 assert.equal(logo.src,'/apex-logo.svg'); assert.ok(logo.loaded,'Actual copied APEX image rendered')
 assert.equal(await page.locator('#login-title').innerText(),'APEX Education OS')
 assert.equal(await page.locator('.apex-auth-brand img').count(),1)
 const forgot=page.getByRole('button',{name:'Forgot password?'})
 await forgot.click()
 await page.waitForURL('**/forgot-password')
 await page.getByLabel('Account email or login ID').fill('sample.teacher@example.test')
 await page.getByRole('button',{name:'Request verification code'}).click()
 await page.getByLabel('Six-digit SMS code').waitFor()
 assert.equal(requests,1)
 await page.getByLabel('Six-digit SMS code').fill('123456')
 await page.getByLabel('New password',{exact:true}).fill('SyntheticNewPass99')
 await page.getByLabel('Confirm new password').fill('SyntheticNewPass99')
 await page.getByRole('button',{name:'Reset password'}).click()
 await page.getByRole('heading',{name:'Password updated'}).waitFor()
 assert.equal(confirms,1)
 await page.screenshot({path:'/tmp/assps-apex-login-recovery-browser-20261009.png'})
 await page.setViewportSize({width:390,height:844})
 await page.goto(host+'/login',{waitUntil:'domcontentloaded'})
 await page.locator('.apex-auth-brand img').waitFor()
 const mobile=await page.locator('.apex-auth-brand img').boundingBox()
 assert.ok(mobile.width>80 && mobile.x+mobile.width<=395,'APEX logo must fit mobile viewport '+JSON.stringify(mobile))
 await page.route('**/api/auth/password-reset/request',r=>r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({success:false,message:'Rate limited'})}))
 await page.goto(host+'/forgot-password',{waitUntil:'domcontentloaded'})
 await page.getByLabel('Account email or login ID').fill('fake@example.test')
 await page.getByRole('button',{name:'Request verification code'}).click()
 await page.getByRole('alert').getByText('Too many requests. Please try again later.').waitFor()
 console.log('MOBILE_390_AND_RATE_LIMIT_BROWSER_PASS')
 await page.unroute('**/api/auth/password-reset/request')
 await page.goto(host+'/login?school_code=rayya-fixture',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Forgot password?'}).click()
 await page.waitForURL('**/forgot-password?school_code=rayya-fixture')
 await page.getByLabel('Account email or login ID').fill('teacher@example.test')
 await page.getByRole('button',{name:'Request verification code'}).click()
 await page.getByLabel('Six-digit SMS code').waitFor()
 assert.equal(capturedRequests.at(-1)?.school_code,'rayya-fixture','School context must travel from login to recovery API')
 await page.getByRole('link',{name:'Back to sign in'}).click()
 await page.waitForURL('**/login?school_code=rayya-fixture')
 console.log('TENANT_RECOVERY_QUERY_PRESERVED_PASS')
 await page.close()
 console.log('LOGIN_APEX_RECOVERY_BROWSER_PASS actual APEX SVG, school logo absent, forgot route, synthetic OTP request/confirm; external traffic blocked')
} finally {if(browser)await browser.close();child.kill('SIGTERM');await sleep(500);if(!child.killed)child.kill('SIGKILL')}
