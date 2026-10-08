import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5294;const URL=`http://localhost:${PORT}/lesson-planning-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Science',classes:['8']},{name:'Math',classes:['8']}]}}
const generated={schemaVersion:2,documentType:'ASSPS_LESSON_PLAN',planningType:'term',status:'draft',classLevel:'8',section:'Blue',startDate:'2026-10-01',endDate:'2026-12-20',termLabel:'First Term',bufferRatio:.1,blackoutDates:[],subjects:[{subject:'English',capacityPeriods:20,bufferPeriods:2,usablePeriods:18,estimatedRequiredPeriods:16,overloadPeriods:0,status:'within_capacity',rationale:'20 timetable periods found.',units:[{id:'eng-1',label:'Reading Skills',allocatedPeriods:8,source:'curriculum',sourceVersion:'NCP English',needsReview:false}],lessons:[{key:'eng-1-l1',date:'2026-10-05',period:'1st',subject:'English',unitId:'eng-1',unitLabel:'Reading Skills',title:'Reading Skills — Lesson 1',objectives:['Read fluently'],activities:['Guided reading'],assessment:'Oral check',homework:'Exercise 4',resources:[],status:'planned',confidence:'high',source:'curriculum'}]},{subject:'Science',capacityPeriods:18,bufferPeriods:2,usablePeriods:16,estimatedRequiredPeriods:17,overloadPeriods:1,status:'over_capacity',rationale:'18 timetable periods found.',units:[{id:'sci-1',label:'Cells',allocatedPeriods:7,source:'curriculum',sourceVersion:'NCP Science',needsReview:false}],lessons:[{key:'sci-1-l1',date:'2026-10-06',period:'2nd',subject:'Science',unitId:'sci-1',unitLabel:'Cells',title:'Cell Structure',objectives:['Explain cell structure'],activities:['Diagram work'],assessment:'Exit ticket',homework:'Review notes',resources:[],status:'planned',confidence:'high',source:'curriculum'}]}],analysis:{totalCapacityPeriods:38,totalUsablePeriods:34,curriculumScopeCount:12,questionBankSignalCount:9,warnings:['Holiday calendar requires teacher confirmation.']},provenance:{deterministic:true,aiEnhanced:true}}

test('mode-driven Lesson Planning generates multi-subject term plan, saves and opens student-card bridge',{timeout:90000},async()=>{
 const server=await createServer({root,server:{port:PORT,strictPort:true}});await server.listen();const browser=await chromium.launch({headless:true,executablePath:installedChrome,args:['--no-sandbox','--disable-setuid-sandbox']});const context=await browser.newContext({viewport:{width:1540,height:1000}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 await context.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await context.route('**/api/lesson-plans/planner/context**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{availableSubjects:['English','Science','Math'],timetable:[],curriculumScopes:[],questionBankSignals:[],warnings:[]}})}))
 await context.route('**/api/lesson-plans/planner/generate',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:generated,analysis:generated.analysis,ai:{configured:true,used:true,model:'test-model'},context:{availableSubjects:['English','Science'],warnings:[]}})}))
 await context.route('**/api/lesson-plans?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/lesson-plans',async r=>{if(r.request().method()!=='POST')return r.fallback();const body=await r.request().postDataJSON();return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{...body,id:'lp-browser-1',revision:1,serverRevision:1}})})})
 const page=await context.newPage();try{
  await page.goto(URL,{waitUntil:'domcontentloaded'});await page.locator('[data-lesson-planning-workspace]').waitFor({state:'visible',timeout:12000})
  await page.locator('[data-planning-type="term"]').click();await page.locator('[data-lp-class]').selectOption('8');await page.locator('[data-lp-section]').selectOption('Blue')
  await page.getByRole('button',{name:'English',exact:true}).click();await page.getByRole('button',{name:'Science',exact:true}).click()
  await page.locator('[data-generate-plan]').click();await page.locator('[data-subject-plan="English"]').waitFor({state:'visible',timeout:10000});await page.locator('[data-subject-plan="Science"]').waitFor({state:'visible'})
  assert.match((await page.locator('[data-planning-analysis]').textContent())||'',/Capacity/);assert.match((await page.locator('[data-planning-analysis]').textContent())||'',/Question Bank/);assert.match((await page.locator('[data-subject-plan="Science"]').textContent())||'',/Over by 1/)
  assert.equal(await page.getByText('Lesson Title / Topic',{exact:false}).count(),0,'term root must not pretend to be one lesson')
  let bridge=null;await page.evaluate(()=>{window.__bridge=null;window.addEventListener('assps-open-diary-lesson-plan',e=>window.__bridge=e.detail,{once:true})})
  await page.locator('[data-save-plan]').click();await page.getByText('Lesson plan saved safely.').waitFor({timeout:10000})
  await page.getByRole('button',{name:'Student Cards'}).click();bridge=await page.evaluate(()=>window.__bridge);assert.equal(bridge.planId,'lp-browser-1');assert.equal(bridge.classLevel,'8');assert.equal(bridge.section,'Blue')
  console.log('LESSON_PLANNING_WORKSPACE_BROWSER 1/1 PASS')
 }finally{await context.close();await browser.close();await server.close()}
})
