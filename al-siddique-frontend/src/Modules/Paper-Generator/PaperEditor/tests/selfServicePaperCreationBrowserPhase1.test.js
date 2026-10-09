import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)

test('Blank Urdu paper: create without bank, save empty draft, add typed question, save same ID, reopen and print preview', {timeout:90000}, async t=>{
 const server=await createServer({root,server:{port:5239,strictPort:true},appType:'spa'})
 await server.listen()
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_token','mock-jwt-token')
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
  localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))
 })
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await server.close().catch(()=>{})})
 await context.route('**/api/students**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}))
 await context.route('**/api/settings/public**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await context.route('**/api/settings',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/academic/setup',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  success:true,configured:false,data:null,defaults:{periodsPerDay:8,localities:['Rayya Khas'],classes:[],subjects:[]},
 })}))
 await context.route('**/api/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:999,role:'admin',school_id:1,tenant_id:'assps'}})}))
 let revision=0
 await context.route('**/api/assessment-studio/papers/*/revisions',route=>{
  revision+=1
  return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'phase1-browser-urdu',currentRevision:revision,contentHash:'c'.repeat(64),status:'DRAFT'}})})
 })
 const page=await context.newPage()
 page.on('dialog', dialog=>dialog.accept().catch(()=>{}))
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 console.log('E2E_BEGIN_BROWSER_NAV')
 await page.goto('http://localhost:5239/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-create-paper-home]').waitFor({timeout:15000})
 console.log('E2E_CREATION_HOME_READY')
 assert.equal(await page.locator('[data-creation-option]').count(),4)
 await page.locator('[data-creation-option="blank"]').click()
 await page.locator('[data-create-blank-paper]').waitFor()
 await page.getByLabel('Blank paper class').selectOption('8')
 await page.getByLabel('Blank paper subject').fill('Urdu')
 await page.getByLabel('Blank paper language').selectOption('urdu')
 await page.getByLabel('Paper Name (optional)').fill('Phase1 Browser Urdu')
 await page.getByLabel('Blank paper total marks').fill('5')
 await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
 console.log('E2E_BLANK_FORM_SUBMITTED')
 await page.locator('#paper-canvas').waitFor()
 assert.equal(await page.getByLabel('Total Marks').inputValue(),'5')
 assert.equal(await page.locator('[data-official-section]').count(),0)
 assert.equal(await page.getByRole('button',{name:'Save Draft'}).isEnabled(),true)
 await page.getByRole('button',{name:'Save Draft'}).click()
 console.log('E2E_EMPTY_DRAFT_SAVE_CLICKED')
 await page.waitForFunction(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.name==='Phase1 Browser Urdu')}catch{return false}})
 },null,{timeout:12000})
 const savedBefore=await page.evaluate(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}).filter(p=>p.userAuthored && p.name==='Phase1 Browser Urdu')
 })
 assert.equal(savedBefore.length,1,'Exactly one new saved draft after first Save')
 assert.equal(savedBefore[0].printReadiness,'DRAFT')
 assert.equal(savedBefore[0].official_section.length,0)
 const savedId=savedBefore[0].id
 await page.getByRole('button',{name:/Type First Question/}).click()
 console.log('E2E_FIRST_QUESTION_ADDED')
 await page.getByLabel('Selected question heading').waitFor()
 await page.getByLabel('Selected question heading').fill('سوال نمبر 1: مختصر جواب دیں۔ (5)')
 await page.getByLabel('Selected question content').fill('پاکستان کا دارالحکومت کیا ہے؟')
 await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('5')
 await page.getByRole('button',{name:'Save Draft'}).click()
 console.log('E2E_QUESTION_SAVE_CLICKED')
 await page.waitForFunction(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.name==='Phase1 Browser Urdu'&&(p.official_section||[]).length===1)}catch{return false}})
 },null,{timeout:12000})
 const savedAfter=await page.evaluate(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
   return keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}).filter(p=>p.userAuthored && p.name==='Phase1 Browser Urdu')
 })
 assert.equal(savedAfter.length,1,'Second Save updates same draft, never creates a duplicate')
 assert.equal(savedAfter[0].id,savedId)
 assert.equal(savedAfter[0].official_section.length,1)
 assert.equal(savedAfter[0].official_section[0].content,'پاکستان کا دارالحکومت کیا ہے؟')
 assert.equal(savedAfter[0].config.totalMarks,5)
 assert.equal(savedAfter[0].selectedQuestions.official_section.marks,5)
 assert.equal(savedAfter[0].printReadiness,'READY')
 console.log('E2E_REOPEN_NAV')
 await page.goto('http://localhost:5239/paper-workspace-test.html?reopen',{waitUntil:'domcontentloaded'})
 await page.locator('#paper-canvas .preview-container').waitFor({timeout:15000})
 assert.equal(await page.getByLabel('Total Marks').inputValue(),'5')
 assert.equal(await page.locator('[data-official-section]').count(),1)
 assert.ok((await page.locator('[data-official-section]').first().textContent()).includes('پاکستان کا دارالحکومت کیا ہے؟'))
 assert.equal(await page.locator('[data-paper-metadata-editor]').evaluate(el=>el.open),false)
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 await page.locator('iframe').first().waitFor({state:'attached',timeout:12000})
 assert.deepEqual(errors,[])
})
