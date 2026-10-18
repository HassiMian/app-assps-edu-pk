import {Buffer} from 'node:buffer'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../')
const logo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLzOQAAAABJRU5ErkJggg==','base64')

test('signed-out ASSPS code displays public settings crest without requiring login or exposing tenant identifiers', {timeout:45000},async t=>{
 const vite=await createServer({root,server:{port:5882,strictPort:true,host:'127.0.0.1'}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const page=await browser.newPage()
 let publicReads=0
 let mockLogo='/uploads/logo-fixture.png'
 await page.route('**/api/**',r=>r.fulfill({status:401,contentType:'application/json',body:'{"success":false}'}))
 await page.route('**/api/school/public-branding*',async route=>{
  publicReads++
  assert.equal(new URL(route.request().url()).searchParams.get('school_code'),'assps')
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{
   schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',logoUrl:mockLogo,
   primaryColor:'#12345a',secondaryColor:'#20a99f'
  }})})
 })
 await page.route('**/api/uploads/logo-fixture.png',r=>r.fulfill({status:200,contentType:'image/png',body:logo}))
 await page.goto('http://127.0.0.1:5882/login?school_code=assps',{waitUntil:'domcontentloaded'})
 await page.locator('.apex-auth-brand img').waitFor({timeout:12000})
 await page.waitForFunction(()=>document.querySelector('.apex-auth-brand img')?.getAttribute('src')==='/api/uploads/logo-fixture.png',null,{timeout:16000})
 assert.equal(await page.locator('.apex-auth-brand img').getAttribute('src'),'/api/uploads/logo-fixture.png')
 assert.ok(await page.locator('.apex-auth-brand img').evaluate(img=>img.complete&&img.naturalWidth>0))
 assert.match(await page.locator('h1').first().innerText(),/AL SIDDIQUE SCHOLARS PUBLIC SCHOOL/)
 assert.ok(publicReads>=1)
 assert.equal(await page.locator('[data-tenant-id]').count(),0)
 // The real school's saved Settings logo uses this exact kind of absolute HTTPS asset URL.
 mockLogo='https://app.assps.edu.pk/api/uploads/logo-fixture.png'
 await page.reload({waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>document.querySelector('.apex-auth-brand img')?.getAttribute('src')==='https://app.assps.edu.pk/api/uploads/logo-fixture.png',null,{timeout:16000})
 assert.ok(await page.locator('.apex-auth-brand img').evaluate(img=>img.complete&&img.naturalWidth>0))
 // A shared/generic hostname without an explicit school code must never impersonate ASSPS.
 const reads=publicReads
 await page.goto('http://127.0.0.1:5882/login',{waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>document.querySelector('.apex-auth-brand h1')?.textContent?.includes('APEX Education Gateway'),null,{timeout:10000})
 assert.equal(publicReads,reads)
 assert.equal(await page.locator('.apex-auth-brand img').getAttribute('src'),'/favicon.svg')
})
