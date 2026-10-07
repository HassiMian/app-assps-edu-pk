import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('Nested ScoringPlan survives Workspace edit/save with OR + attempt-any children', {timeout:75000}, async t=>{
 const server=await createServer({root,server:{port:5271,strictPort:true},appType:'spa'})
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
  return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'nested-scoring-browser-paper',currentRevision:revision,contentHash:'e'.repeat(64),status:'DRAFT'}})})
 })

 const page=await context.newPage()
 const pageErrors=[]
 page.on('pageerror',error=>pageErrors.push(error.message))
 await page.goto('http://localhost:5271/paper-workspace-test.html?nestedScoring',{waitUntil:'domcontentloaded'})
 await page.locator('[data-edit-paper-toggle]').waitFor({timeout:15000})
 assert.match(await page.locator('[data-marks-badge]').first().textContent(),/9/)
 await page.locator('[data-edit-paper-toggle]').click()
 await page.locator('[data-official-section]').first().click()
 await page.locator('[data-section-inspector]').waitFor({timeout:10000})

 await page.getByRole('button',{name:'Save Draft'}).click()
 await page.waitForFunction(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name==='Nested Scoring Browser Paper'&&p.canonicalDocument?.scoringPlan?.maximumObtainableMarks===9&&p.canonicalDocument?.scoringPlan?.choiceGroups?.[0]?.children?.length===2)}catch{return false}})
 },null,{timeout:12000})

 const saved=await page.evaluate(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}})
  return all.find(p=>p.name==='Nested Scoring Browser Paper')||null
 })
 assert.ok(saved)
 assert.equal(saved.canonicalDocument.scoringPlan.version,3)
 assert.equal(saved.canonicalDocument.scoringPlan.maximumObtainableMarks,9)
 assert.equal(saved.canonicalDocument.scoringPlan.availableItemMarksTotal,16)
 const rootGroup=saved.canonicalDocument.scoringPlan.choiceGroups[0]
 assert.equal(rootGroup.mode,'ALL')
 assert.equal(rootGroup.children.length,2)
 assert.equal(rootGroup.children[0].mode,'OR')
 assert.equal(rootGroup.children[0].maximumObtainableMarks,5)
 assert.equal(rootGroup.children[1].mode,'ATTEMPT_ANY')
 assert.equal(rootGroup.children[1].attemptCount,2)
 assert.equal(rootGroup.children[1].maximumObtainableMarks,4)
 assert.equal(saved.canonicalDocument.sections[0].formula.children.length,2)
 assert.deepEqual(pageErrors,[])
 console.log('NESTED_SCORING_BROWSER 1/1 PASS')
})
