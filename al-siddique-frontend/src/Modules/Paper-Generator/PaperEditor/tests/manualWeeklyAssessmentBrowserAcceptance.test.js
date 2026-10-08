import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

function savedManualPapers() {
 return [...Object.keys(localStorage)]
}

test('Manual Weekly Assessment: no Question Bank -> canonical save -> finalize -> reopen -> print', {timeout:90000}, async t=>{
 const server=await createServer({root,server:{port:5241,strictPort:true},appType:'spa'})
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
 await context.route('**/api/students**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}))
 await context.route('**/api/settings/public**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 let revision=0
 await context.route('**/api/assessment-studio/papers/*/revisions',route=>{
   revision+=1
   return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'browser-weekly-paper',currentRevision:revision,contentHash:'c'.repeat(64),status:'DRAFT'}})})
 })
 await context.route('**/api/assessment-studio/papers/*/releases',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{release_id:'browser-release',revision_number:revision,content_hash:'c'.repeat(64)}})}))
 await context.route('**/api/assessment-studio/papers/*',route=>{
   if(route.request().method()==='GET') return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({success:false,message:'Harness uses local recovery copy'})})
   return route.continue()
 })
 const page=await context.newPage()
 const dialogs=[]
 page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept().catch(()=>{})})
 const pageErrors=[]
 page.on('pageerror',error=>pageErrors.push(error.message))

 await page.goto('http://localhost:5241/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-create-paper-home]').waitFor({timeout:15000})
 await page.locator('[data-creation-option="blank"]').click()
 await page.locator('[data-create-blank-paper]').waitFor()
 await page.getByLabel('Blank paper class').selectOption('7')
 await page.getByLabel('Blank paper subject').fill('Science')
 await page.getByLabel('Assessment type').selectOption('Weekly Assessment')
 await page.getByLabel('Assessment scope').fill('Chapter 3 — Photosynthesis')
 await page.getByLabel('Paper Name (optional)').fill('Architecture V1 Weekly Science')
 await page.getByLabel('Blank paper total marks').fill('10')
 await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
 await page.locator('#paper-canvas').waitFor()

 await page.getByRole('button',{name:/Type First Question/}).click()
 await page.getByLabel('Selected question heading').fill('Q1. Answer briefly. (10)')
 await page.getByLabel('Selected question content').fill('What is photosynthesis?')
 await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('10')
 const checking=page.locator('[data-checking-strip]')
 await checking.waitFor({timeout:8000})
 assert.match(await checking.textContent(),/Q1 \[ __\/10 \]/)
 assert.match(await page.locator('[data-checking-total]').textContent(),/TOTAL \[ __\/10 \]/)
 assert.equal(await checking.locator('[data-question-instance-id]').count(),1)
 await page.getByRole('button',{name:'Save Draft'}).click()
 await page.waitForFunction(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.name==='Architecture V1 Weekly Science'&&p.persistenceAuthority==='SERVER_REVISION_SOURCE_OF_TRUTH')}catch{return false}})
 },null,{timeout:12000})

 const draft=await page.evaluate(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}})
   return all.find(p=>p.userAuthored&&p.name==='Architecture V1 Weekly Science')||null
 })
 assert.ok(draft,'manual draft must be persisted')
 assert.equal(draft.assessmentType,'Weekly Assessment')
 assert.equal(draft.scope.label,'Chapter 3 — Photosynthesis')
 assert.equal(draft.canonicalAuthority,'PaperDocumentV2')
 assert.equal(draft.persistenceAuthority,'SERVER_REVISION_SOURCE_OF_TRUTH')
 assert.equal(draft.persistenceMode,'ONLINE')
 assert.equal(draft.serverRevision,1)
 assert.ok(draft.serverPaperId)
 assert.equal(draft.canonicalDocument.documentOrigin,'USER_AUTHORED')
 assert.equal(draft.canonicalDocument.sourceIdentity,null)
 assert.equal(draft.canonicalDocument.assessment.creationMode,'MANUAL')
 assert.equal(draft.canonicalDocument.assessment.scope.label,'Chapter 3 — Photosynthesis')
 assert.equal(draft.canonicalDocument.sections.length,1)
 assert.equal(draft.canonicalDocument.sections[0].nodes[0].content,'What is photosynthesis?')
 assert.equal(draft.canonicalDocument.scoringPlan.maximumObtainableMarks,10)
 assert.equal(draft.canonicalDocument.scoringPlan.balanced,true)

 await page.locator('[data-finalize-assessment]').click()
 await page.waitForFunction(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.name==='Architecture V1 Weekly Science'&&p.assessmentRelease?.status==='FINALIZED')}catch{return false}})
 },null,{timeout:12000})
 const finalized=await page.evaluate(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}})
   return all.find(p=>p.userAuthored&&p.name==='Architecture V1 Weekly Science')||null
 })
 assert.equal(finalized.lifecycleStatus,'FINALIZED')
 assert.equal(finalized.printReadiness,'READY')
 assert.equal(finalized.assessmentRelease.status,'FINALIZED')
 assert.match(finalized.assessmentRelease.contentHash,/^[a-f0-9]{64}$/)
 assert.equal(finalized.assessmentRelease.snapshot.sections[0].nodes[0].content,'What is photosynthesis?')
 assert.ok(dialogs.some(message=>message.includes('Assessment finalized. Release hash:')))

 await page.goto('http://localhost:5241/paper-workspace-test.html?reopen&reopenName=Architecture%20V1%20Weekly%20Science',{waitUntil:'domcontentloaded'})
 await page.locator('#paper-canvas .preview-container').waitFor({timeout:15000})
 assert.ok((await page.locator('[data-official-section]').first().textContent()).includes('What is photosynthesis?'))
 await page.getByRole('button',{name:'Print',exact:true}).click()
 await page.locator('iframe').first().waitFor({state:'attached',timeout:12000})
 assert.deepEqual(pageErrors,[])
})
