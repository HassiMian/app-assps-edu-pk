import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5561

test('real old Lesson Plan Auto-Generate never skips February and saves original month-end intent',{timeout:105000},async t=>{
 const v=await createServer({root,server:{port:PORT,strictPort:true}});await v.listen()
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});t.after(async()=>{await b.close();await v.close()})
 const c=await b.newContext({timezoneId:'America/Los_Angeles',viewport:{width:1500,height:1000}})
 const saved=[]
 await c.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,configured:true,data:{classes:[{level:'7',name:'Seven',active:true}],subjects:[{name:'Science',classes:['7']}],periodsPerDay:8}})}))
 await c.route('**/api/lesson-plans?**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await c.route('**/api/lesson-plans',async r=>{
  if(r.request().method()==='POST'){
   const body=r.request().postDataJSON();saved.push(body)
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{...body,id:body.id,revision:1,serverRevision:1}})})
  }
  return r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'});
 })
 const p=await c.newPage()
 try{
  await p.goto(`http://127.0.0.1:${PORT}/lesson-plan-test.html`,{waitUntil:'domcontentloaded',timeout:35000})
  await p.getByRole('button',{name:/Auto-Generate/}).first().click()
  const sels=p.locator('select')
  await sels.nth(0).selectOption('7')
  await sels.nth(1).selectOption('Science')
  await p.locator('input[type="date"]').first().fill('2026-01-31')
  await sels.nth(2).selectOption('monthly');await sels.nth(3).selectOption('3')
  await p.getByRole('button',{name:/Generate Plans/}).click()
  await p.waitForFunction(()=>Array.from(document.querySelectorAll('body')).some(e=>e.textContent.includes('Lesson Plans')))
  await p.waitForTimeout(1100)
  const dates=saved.map(s=>s.date)
  console.log('REAL_LEGACY_AUTOGEN_SAVED_DATES',JSON.stringify(dates))
  assert.deepEqual(dates.sort(),['2026-01-31','2026-02-28','2026-03-31'])
  assert.ok(saved.every(row=>row.planningScope==='monthly'))
 }finally{await c.close()}
})
