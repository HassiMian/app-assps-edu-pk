import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,'../../../../..')

async function createManual(page,name,question='What is photosynthesis?') {
 await page.goto('http://localhost:5242/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-create-paper-home]').waitFor({timeout:15000}); await page.locator('[data-creation-option="blank"]').click(); await page.locator('[data-create-blank-paper]').waitFor()
 await page.getByLabel('Blank paper class').selectOption('7'); await page.getByLabel('Blank paper subject').fill('Science'); await page.getByLabel('Assessment type').selectOption('Weekly Assessment'); await page.getByLabel('Assessment scope').fill('Chapter 3'); await page.getByLabel('Paper Name (optional)').fill(name); await page.getByLabel('Blank paper total marks').fill('10'); await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click(); await page.locator('#paper-canvas').waitFor()
 await page.getByRole('button',{name:/Type First Question/}).click(); await page.getByLabel('Selected question heading').fill('Q1. Answer briefly. (10)'); await page.getByLabel('Selected question content').fill(question); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('10')
}
async function stored(page,name) { return page.evaluate(n=>{ const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')); const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}); return all.find(p=>p.userAuthored&&p.name===n)||null },name) }

test('Assessment persistence adversarial: offline queue recovery + two-tab conflict', {timeout:90000}, async t=>{
 const vite=await createServer({root,server:{port:5242,strictPort:true},appType:'spa'}); await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}); const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{ localStorage.setItem('al_siddique_token','mock-jwt-token'); localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps',email:'admin@alsiddique.edu.pk'})) })
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'})); await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))

 const offline=await context.newPage(); offline.on('dialog',d=>d.accept().catch(()=>{})); const offlineName=`Offline Recovery ${Date.now()}`; await createManual(offline,offlineName)
 const outage=async route=>route.abort('internetdisconnected'); await context.route('**/api/assessment-studio/**',outage)
 await offline.getByRole('button',{name:'Save Draft'}).click()
 await offline.waitForFunction(n=>{ const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')); return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name===n&&p.persistenceAuthority==='LOCAL_RECOVERY_QUEUED')}catch{return false}})},offlineName,{timeout:12000})
 const queued=await stored(offline,offlineName); assert.equal(queued.persistenceMode,'DEGRADED_OFFLINE'); assert.equal(queued.serverRevision,0)
 await context.unroute('**/api/assessment-studio/**',outage); await offline.evaluate(()=>window.dispatchEvent(new Event('online')))
 await offline.waitForFunction(n=>{ const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')); return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name===n&&p.persistenceAuthority==='SERVER_REVISION_SOURCE_OF_TRUTH'&&p.serverRevision===1)}catch{return false}})},offlineName,{timeout:15000})

 const a=await context.newPage(); a.on('dialog',d=>d.accept().catch(()=>{})); const conflictName=`Two Tab ${Date.now()}`; await createManual(a,conflictName,'Version one'); await a.getByRole('button',{name:'Save Draft'}).click(); await a.waitForFunction(n=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name===n&&p.serverRevision===1)}catch{return false}})},conflictName,{timeout:12000})
 const b=await context.newPage(); await b.evaluate(()=>localStorage.removeItem('al_siddique_assessment_server_reopen_v1')).catch(()=>{}); const bDialogs=[]; b.on('dialog',d=>{bDialogs.push(d.message());d.accept().catch(()=>{})}); await b.goto(`http://localhost:5242/paper-workspace-test.html?reopen&reopenName=${encodeURIComponent(conflictName)}`,{waitUntil:'domcontentloaded'}); await b.locator('#paper-canvas').waitFor({timeout:15000})
 await a.getByLabel('Selected question content').fill('Version from tab A'); await a.getByRole('button',{name:'Save Draft'}).click(); await a.waitForFunction(n=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name===n&&p.serverRevision===2)}catch{return false}})},conflictName,{timeout:12000})
 await b.getByRole('button',{name:'Edit Paper'}).click().catch(()=>{}); await b.getByLabel('Edit question content').fill('Stale version from tab B'); await b.getByRole('button',{name:'Save Draft'}).click(); await b.waitForFunction(()=>document.querySelector('[data-assessment-persistence-status]')?.textContent?.includes('Conflict'),null,{timeout:12000})
 assert.ok(bDialogs.some(m=>m.includes('SAVE CONFLICT'))); const conflicted=await stored(b,conflictName); assert.equal(conflicted.persistenceAuthority,'LOCAL_RECOVERY_CONFLICT'); assert.equal(conflicted.serverRevision,2)
 console.log('ASSESSMENT_PERSISTENCE_BROWSER_ADVERSARIAL 2/2 PASS')
})
