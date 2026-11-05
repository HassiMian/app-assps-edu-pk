import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const fe=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const chromiumExecutable='/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const missing=['Starter|Blue','Mover|Purple','Flyer|Pink','One|Yellow','Two|Orange','Three|Red'].map(x=>{const [className,section]=x.split('|');return{className,section}})
const preview={success:true,data:{examId:14,assessment:'Assessment 1',verifiedCandidateCount:54,activeCohorts:7,totalActiveStudentCohorts:13,uncoveredCohorts:missing,canStageFullCoverage:false,candidates:[{class_name:'Pre-Nine',section:'Blue',subject:'English'}]}}
const offerings={success:true,data:{examId:14,examName:'Assessment 1',totalOfferings:0,pendingCount:0,offerings:[]}}
const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
test('A208 browser renders missing cohort evidence and never submits academic writes',async t=>{
 const vite=await createServer({root:fe,server:{host:'127.0.0.1',port:5898,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chromiumExecutable,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 const methods=[]
 await context.route('**/api/**',route=>{
  methods.push(route.request().method())
  const url=new URL(route.request().url())
  if(url.pathname.endsWith('/preview'))return reply(route,preview)
  if(url.pathname.endsWith('/offerings'))return reply(route,offerings)
  return route.abort()
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5898/a208-catalog-test.html')
 await page.getByText('6 active class-section cohort(s) are not represented.',{exact:false}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Starter — Blue').count(),1)
 assert.equal(await page.getByText('Three — Red').count(),1)
 assert.equal(await page.getByText('Pre-Nine',{exact:true}).count(),1)
 assert.ok(methods.length>=2)
 assert.ok(methods.every(method=>method==='GET'))
 await page.getByRole('button',{name:/Refresh/}).click()
 await page.getByText('6 active class-section cohort(s) are not represented.',{exact:false}).waitFor()
 assert.ok(methods.every(method=>method==='GET'))
})
test('unauthorized academic catalog never reveals candidates and reports 403',async t=>{
 const vite=await createServer({root:fe,server:{host:'127.0.0.1',port:5899,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chromiumExecutable,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 await context.route('**/api/**',route=>reply(route,{success:false,code:'AUTHENTIC_SCHOOL_ADMIN_REQUIRED'},403))
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5899/a208-catalog-test.html')
 await page.getByRole('alert').waitFor({timeout:20000})
 assert.equal(await page.getByText('Verified candidate subjects:').count(),0)
 assert.ok((await page.getByRole('alert').innerText()).includes('AUTHENTIC_SCHOOL_ADMIN_REQUIRED'))
})
