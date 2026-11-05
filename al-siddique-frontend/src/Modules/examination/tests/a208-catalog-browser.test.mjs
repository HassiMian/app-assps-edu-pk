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
const coverage={success:true,data:{verifiedTeachingPolicy:'active_teacher_employee_and_reviewed_timetable',totalActiveStudents:329,uncoveredStudents:220,coveredCohorts:7,uncoveredCohorts:6,cohorts:[...missing.map(({className,section},i)=>({class_name:className,section,active_students:[56,42,25,38,31,28][i],active_assignment_records:0,reviewed_timetable_rows:0,has_subject_assignment:false})),...['Four|Blue','Five|Blue','Six|Blue','Seven|Blue','Pre Nine|Blue','Nine|Fatima','Nine|Usman'].map(item=>{const[class_name,section]=item.split('|');return{class_name,section,active_students:1,active_assignment_records:8,reviewed_timetable_rows:48,has_subject_assignment:true}})]}}
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
  if(url.pathname.endsWith('/cohort-coverage'))return reply(route,coverage)
  return route.abort()
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5898/a208-catalog-test.html')
 await page.getByText('6 active class-section cohort(s) are not represented.',{exact:false}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Starter — Blue').count(),1)
 assert.equal(await page.getByText('Three — Red').count(),1)
 assert.equal(await page.getByText('Pre-Nine',{exact:true}).count(),1)
 assert.equal(await page.getByText('Students needing verified teaching evidence:',{exact:false}).count(),1)
 assert.ok((await page.locator('body').innerText()).includes('220 / 329'))
 assert.equal(await page.getByText('Verified teaching-source gaps',{exact:false}).count(),1)
 assert.equal(await page.getByRole('columnheader',{name:'Reviewed timetable entries'}).count(),1)
 assert.equal(await page.locator('table').first().locator('tbody tr').count(),6)
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

test('older unverified coverage endpoint fails closed and never claims ready',async t=>{
 const vite=await createServer({root:fe,server:{host:'127.0.0.1',port:5900,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chromiumExecutable,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 await context.route('**/api/**',route=>{
  const url=new URL(route.request().url())
  if(url.pathname.endsWith('/preview'))return reply(route,preview)
  if(url.pathname.endsWith('/offerings'))return reply(route,offerings)
  if(url.pathname.endsWith('/cohort-coverage'))return reply(route,{success:true,data:{...coverage.data,verifiedTeachingPolicy:undefined}})
  return route.abort()
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5900/a208-catalog-test.html')
 await page.getByText('Strict teacher-evidence coverage certification is missing or inconsistent.',{exact:false}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Students needing verified teaching evidence:',{exact:false}).count(),0)
 assert.equal(await page.locator('button').filter({hasText:'Stage'}).count(),0)
})
