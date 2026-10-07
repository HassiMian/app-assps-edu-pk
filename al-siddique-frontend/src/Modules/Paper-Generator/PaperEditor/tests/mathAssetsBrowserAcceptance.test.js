import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('Workspace preserves editable math and immutable image asset capabilities through save', {timeout:90000}, async t=>{
 const vite=await createServer({root,server:{port:5268,strictPort:true},appType:'spa'})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_token','mock-jwt-token')
  localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))
 })
 await context.route('**/api/assessment-studio/papers/**/revisions',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({data:{currentRevision:1,contentHash:'math-assets-browser-hash'}}),
 }))
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}))
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await vite.close().catch(()=>{})})

 const page=await context.newPage()
 page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.goto('http://localhost:5268/paper-workspace-test.html?mathAssets',{waitUntil:'domcontentloaded'})
 await page.locator('.pts-paper-generator-shell').waitFor({timeout:15000})
 await page.getByRole('button',{name:'Save Draft'}).click()

 await page.waitForFunction(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  return keys.some(k=>{try{
   return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.name==='Math Assets Browser Fixture'&&p.canonicalDocument?.assets?.length===1)
  }catch{return false}})
 },null,{timeout:12000})

 const saved=await page.evaluate(()=>{
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
  return keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}})
   .find(p=>p.name==='Math Assets Browser Fixture')
 })
 assert.ok(saved)
 const mathNode=saved.canonicalDocument.sections[0].nodes[0]
 const imageNode=saved.canonicalDocument.sections[1].nodes[0]
 assert.deepEqual(mathNode.contentCapabilities,['math'])
 assert.deepEqual(mathNode.math,{format:'latex',source:'x^2 + y^2 = z^2',display:'block'})
 assert.deepEqual(imageNode.contentCapabilities,['image'])
 assert.deepEqual(imageNode.assetRefs,['asset-image-browser-1'])
 assert.equal(saved.canonicalDocument.assets[0].sha256,'a'.repeat(64))
 assert.equal(saved.canonicalDocument.assets[0].effectiveDpi,25.4)
 assert.equal(saved.canonicalDocument.assets[0].altText,'A one-pixel browser test image')
 assert.equal(saved.canonicalDocument.scoringPlan.maximumObtainableMarks,4)
 console.log('MATH_ASSETS_BROWSER 1/1 PASS')
})
