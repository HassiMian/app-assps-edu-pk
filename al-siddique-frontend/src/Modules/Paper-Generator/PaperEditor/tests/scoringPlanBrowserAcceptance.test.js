import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('ScoringPlan UI: attempt any 10 of 12 at 2 marks saves max 20, available 24', {timeout:75000}, async t=>{
 const server=await createServer({root,server:{port:5268,strictPort:true},appType:'spa'})
 await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_token','mock-jwt-token')
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
  localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps',email:'admin@alsiddique.edu.pk'}))
 })
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await server.close().catch(()=>{})})
 await context.route('**/api/auth/me',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:999,role:'admin',school_id:1,tenant_id:'assps',email:'admin@alsiddique.edu.pk'}})}))
 await context.route('**/api/school/settings/current',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/school/branding',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/notify/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[],notifications:[]})}))
 await context.route('**/api/academic/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{classes:[],subjects:[]}})}))
 await context.route('**/api/dashboard/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/events/upcoming',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/fees/summary',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{total:0,paid:0,pending:0}})}))
 await context.route('**/api/fees',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/employees**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}))
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 let revision=0
 await context.route('**/api/assessment-studio/papers/*/revisions',route=>{
  revision+=1
  return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'scoring-plan-browser-paper',currentRevision:revision,contentHash:'d'.repeat(64),status:'DRAFT'}})})
 })

 const page=await context.newPage()
 const pageErrors=[]
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.goto('http://localhost:5268/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-create-paper-home]').waitFor({timeout:15000})
 await page.locator('[data-creation-option="blank"]').click()
 await page.getByLabel('Blank paper class').selectOption('7')
 await page.getByLabel('Blank paper subject').fill('Science')
 await page.getByLabel('Paper Name (optional)').fill('Choice Aware Scoring Test')
 await page.getByLabel('Blank paper total marks').fill('20')
 await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
 await page.getByRole('button',{name:/Type First Question/}).click()
 await page.getByLabel('Selected question heading').fill('Q1. Attempt any ten short questions.')
 await page.getByLabel('Selected question content').fill('Twelve short questions are listed here.')

 const scoringPanel=page.locator('[data-scoring-rule-panel]')
 await scoringPanel.locator('summary').click()
 await page.getByLabel('Scoring attempt rule').selectOption('ATTEMPT_ANY')
 await page.getByLabel('Available items').fill('12')
 await page.getByLabel('Items to attempt').fill('10')
 await page.getByLabel('Marks per item').fill('2')

 const marksInput=page.locator('[data-section-inspector] input[type="number"]').nth(1)
 await page.waitForFunction(()=>{
  const el=document.querySelector('[data-section-inspector] input[type="number"]:nth-of-type(2)')
  return true
 }).catch(()=>{})
 assert.equal(await marksInput.isDisabled(),true)
 assert.equal(Number(await marksInput.inputValue()),20)
 assert.match(await page.locator('[data-scoring-max-preview]').textContent(),/Max obtainable:\s*20/)
 assert.match(await page.locator('[data-scoring-max-preview]').textContent(),/Available:\s*24/)

 await page.getByRole('button',{name:'Save Draft'}).click()
 await page.waitForFunction(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name==='Choice Aware Scoring Test'&&p.canonicalDocument?.scoringPlan?.maximumObtainableMarks===20)}catch{return false}})
 },null,{timeout:12000})

 const saved=await page.evaluate(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}})
  return all.find(p=>p.name==='Choice Aware Scoring Test')||null
 })
 assert.ok(saved)
 assert.equal(saved.canonicalDocument.sections[0].attemptRule,'ATTEMPT_ANY')
 assert.equal(saved.canonicalDocument.sections[0].attemptCount,10)
 assert.equal(saved.canonicalDocument.sections[0].actualItemCount,12)
 assert.equal(saved.canonicalDocument.sections[0].operationalSectionTotal,20)
 assert.equal(saved.canonicalDocument.sections[0].listedPotentialItemMarksTotal,24)
 assert.equal(saved.canonicalDocument.scoringPlan.strategy,'CHOICE_AWARE')
 assert.equal(saved.canonicalDocument.scoringPlan.maximumObtainableMarks,20)
 assert.equal(saved.canonicalDocument.scoringPlan.availableItemMarksTotal,24)
 assert.equal(saved.canonicalDocument.scoringPlan.choiceGroups[0].mode,'ATTEMPT_ANY')
 assert.equal(saved.canonicalDocument.scoringPlan.balanced,true)
 assert.deepEqual(pageErrors,[])
 console.log('SCORING_PLAN_BROWSER 1/1 PASS')
})
