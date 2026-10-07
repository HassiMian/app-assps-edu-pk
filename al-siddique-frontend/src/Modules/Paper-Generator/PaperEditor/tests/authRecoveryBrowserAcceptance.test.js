import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('expired server session preserves manual assessment as local auth-recovery copy', {timeout:60000}, async t=>{
  const server=await createServer({root,server:{port:5264,strictPort:true},appType:'spa'})
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
  await context.route('**/api/employees**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
  await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}))
  await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
  await context.route('**/api/assessment-studio/papers/*/revisions',r=>r.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false,message:'Session expired'})}))

  const page=await context.newPage()
  const dialogs=[]
  page.on('dialog',async d=>{dialogs.push(d.message());await d.accept().catch(()=>{})})
  await page.goto('http://localhost:5264/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
  await page.locator('[data-creation-option="blank"]').click()
  await page.locator('[data-create-blank-paper]').waitFor()
  await page.getByLabel('Blank paper class').selectOption('7')
  await page.getByLabel('Blank paper subject').fill('Science')
  await page.getByLabel('Blank paper total marks').fill('5')
  await page.getByLabel('Paper Name (optional)').fill('Auth Recovery Browser Test')
  await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
  await page.getByRole('button',{name:/Type First Question/}).click()
  await page.getByLabel('Selected question content').fill('Define force.')
  await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('5')
  await page.getByRole('button',{name:'Save Draft'}).click()

  await page.waitForFunction(()=>{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
    return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name==='Auth Recovery Browser Test'&&p.persistenceAuthority==='LOCAL_RECOVERY_AUTH_REQUIRED'&&p.authRecoveryRequired===true)}catch{return false}})
  },null,{timeout:12000})

  const saved=await page.evaluate(()=>{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
    return keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}).find(p=>p.name==='Auth Recovery Browser Test')
  })
  assert.ok(saved)
  assert.equal(saved.persistenceMode,'AUTH_REQUIRED')
  assert.equal(saved.serverRevision,0)
  assert.equal(saved.canonicalDocument.sections[0].nodes[0].content,'Define force.')
  assert.ok(dialogs.some(x=>x.includes('SESSION EXPIRED')))
  console.log('AUTH_RECOVERY_BROWSER 1/1 PASS')
})
