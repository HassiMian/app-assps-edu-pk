import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..')
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome'].find(fs.existsSync) || chromium.executablePath()

test('Lesson Plans UI loads, saves revision-bound plan and shares authoritative server copy',{timeout:60000},async t=>{
 const vite=await createServer({root,server:{port:5274,strictPort:true},appType:'spa'});await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1000}})
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}));localStorage.setItem('al_siddique_lesson_plans',JSON.stringify([{id:'legacy-other-school',title:'Private legacy plan',date:'2026-10-01'}]))})
 let created=null,shared=false
 await context.route('**/api/auth/me',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:999,role:'admin',school_id:1,tenant_id:'assps'}})}))
 await context.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],classes:[{level:'7',name:'Seven',sections:['Blue'],active:true}],subjects:[{name:'Science',classes:['7']}]}})}))
 await context.route('**/api/lesson-plans?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/lesson-plans',async r=>{
   if(r.request().method()!=='POST')return r.fallback()
   const body=r.request().postDataJSON();created={...body,id:body.id||'lp-browser-1',revision:1,serverRevision:1,sentToPortal:false,persistenceMode:'ONLINE'}
   return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:created})})
 })
 await context.route('**/api/lesson-plans/*/share',async r=>{
   shared=true;const body=r.request().postDataJSON();assert.equal(Number(body.expectedRevision),1)
   created={...created,revision:2,serverRevision:2,sentToPortal:true}
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:created,delivery:{students:2,notifications:4}})})
 })
 const page=await context.newPage();await page.goto('http://localhost:5274/lesson-plan-test.html',{waitUntil:'domcontentloaded'})
 await page.getByText('Lesson Plans',{exact:true}).waitFor({timeout:12000})
 assert.equal(await page.getByText('Private legacy plan',{exact:true}).count(),0,'unscoped legacy data must not leak into current account')
 await page.getByRole('button',{name:/Create First Plan|New Plan/}).first().click()
 await page.getByPlaceholder('e.g. The Water Cycle — Formation of Clouds').fill('Forces and Motion')
 const selects=page.locator('select');await selects.nth(1).selectOption('7');await selects.nth(2).selectOption('Science')
 await page.getByPlaceholder('e.g. Chapter 4 — Water').fill('Force and Motion')
 await page.getByRole('button',{name:'Save Plan'}).first().click()
 await page.getByText('Forces and Motion',{exact:true}).waitFor({timeout:12000})
 assert.ok(created,'create API must receive the authored lesson plan')
 assert.equal(created.classLevel,'7');assert.equal(created.subject,'Science')
 const recovery=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('al_siddique_lesson_plans')).map(k=>localStorage.getItem(k)).join('\n'))
 assert.match(recovery,/"serverRevision":1|"revision":1/)
 await page.getByRole('button',{name:/Portal/}).first().click()
 await page.getByText(/published: 2 student records, 4 notifications queued/i).waitFor({timeout:10000})
 assert.equal(shared,true)
 await page.getByText('Sent to Portal',{exact:true}).waitFor({timeout:10000})
 // Auth-context change must remount with the other tenant/actor cache, never
 // reuse the previous teacher's in-memory plans or older unscoped drafts.
 await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent('auth:refreshed',{detail:{user:{id:1000,role:'admin',school_id:2,tenant_id:'peer'}}}))
 })
 await page.getByText('Create First Plan',{exact:false}).first().waitFor({timeout:12000})
 assert.equal(await page.getByText('Forces and Motion',{exact:true}).count(),0,'prior school plan must disappear')
 assert.equal(await page.getByText('Private legacy plan',{exact:true}).count(),0,'legacy plan remains quarantined')
 await page.evaluate(() => {
  window.dispatchEvent(new CustomEvent('auth:refreshed',{detail:{user:{id:999,role:'admin',school_id:1,tenant_id:'assps'}}}))
 })
 await page.getByText('Forces and Motion',{exact:true}).first().waitFor({timeout:12000})

 console.log('LESSON_PLANS_BROWSER 1/1 PASS')
})
