import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url)); const root=path.resolve(here,'../../../../..')

test('manual add-block menu persists canonical semantic table', {timeout:90000}, async t=>{
 const vite=await createServer({root,server:{port:5243,strictPort:true},appType:'spa'}); await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}); const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 await context.route('**/api/assessment-studio/papers/**/revisions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{currentRevision:1,contentHash:'universal-block-test-hash'}})}))
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'})); await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,configured:false,data:null,defaults:{periodsPerDay:8,localities:['Rayya Khas'],classes:[],subjects:[]}})}))
 await context.route('**/api/auth/me',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:999,role:'admin',school_id:1,tenant_id:'assps'}})}))
 const page=await context.newPage(); page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.goto('http://localhost:5243/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-creation-option="blank"]').click(); await page.locator('[data-create-blank-paper]').waitFor()
 await page.getByLabel('Blank paper class').selectOption('7'); await page.getByLabel('Blank paper subject').fill('Science'); await page.getByLabel('Blank paper total marks').fill('4'); await page.getByLabel('Paper Name (optional)').fill('Universal Table Browser Test'); await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
 await page.getByRole('button',{name:/Type First Question/}).click(); await page.getByLabel('Selected question content').fill('Warmup'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('0')
 await page.locator('[data-block-add-menu]').evaluate(el=>el.open=true); await page.locator('[data-add-block="table"]').click()
 assert.equal(await page.locator('[data-block-add-menu]').evaluate(el=>el.open),false,'Add Block menu should collapse after Table is inserted')
 await page.getByLabel('Selected question content').fill('Noun | Plural\nBook | Books'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('4'); await page.getByRole('button',{name:'Save Draft'}).click()
 await page.waitForFunction(()=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.canonicalDocument?.sections?.some(s=>s.nodes?.some(n=>n.type==='grammar_table')))}catch{return false}})},{timeout:12000})
 const saved=await page.evaluate(()=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));return keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}).find(p=>p.userAuthored&&p.canonicalDocument?.sections?.some(s=>s.nodes?.some(n=>n.type==='grammar_table')))})
 assert.ok(saved); assert.equal(saved.canonicalDocument.sections[1].nodes[0].type,'grammar_table'); assert.equal(saved.canonicalDocument.sections[1].nodes[0].tableSemantic,'answer_table'); assert.equal(saved.canonicalDocument.sections[1].nodes[0].rows[1].rightText,'Books')
 console.log('UNIVERSAL_BLOCK_UX_BROWSER 1/1 PASS')
})
