import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

async function openAdd(page,type){
 const menu=page.locator('[data-block-add-menu]')
 await menu.evaluate(el=>{el.open=true})
 await page.locator(`[data-add-block="${type}"]`).click()
 assert.equal(await menu.evaluate(el=>el.open),false,`Add Block menu should collapse after ${type} is inserted`)
}

test('universal add-block modes persist canonical node types and balanced marks', {timeout:90000}, async t=>{
 const vite=await createServer({root,server:{port:5244,strictPort:true},appType:'spa'}); await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1640,height:960}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 await context.route('**/api/assessment-studio/papers/**/revisions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{currentRevision:1,contentHash:'universal-modes-test-hash'}})}))
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}))
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 const page=await context.newPage(); page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.goto('http://localhost:5244/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
 await page.locator('[data-create-paper-home]').waitFor({timeout:15000})
 await page.locator('[data-creation-option="blank"]').click(); await page.locator('[data-create-blank-paper]').waitFor()
 await page.getByLabel('Blank paper class').selectOption('7'); await page.getByLabel('Blank paper subject').fill('Science')
 await page.getByLabel('Paper Name (optional)').fill('Universal Four Block Modes'); await page.getByLabel('Blank paper total marks').fill('12')
 await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click(); await page.locator('#paper-canvas').waitFor()

 await openAdd(page,'question'); await page.getByLabel('Selected question content').fill('Define force.'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('2')
 await openAdd(page,'table'); await page.getByLabel('Selected question content').fill('Noun | Plural\nBook | Books'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('3')
 await openAdd(page,'matching'); await page.getByLabel('Selected question content').fill('Force | Push or pull\nMass | Amount of matter'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('3')
 await openAdd(page,'long'); await page.getByLabel('Selected question content').fill('Explain contact and non-contact forces with examples.'); await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('4')
 await page.getByRole('button',{name:'Save Draft'}).click()

 await page.waitForFunction(()=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));return keys.some(k=>{try{return (JSON.parse(localStorage.getItem(k)).savedPapers||[]).some(p=>p.userAuthored&&p.name==='Universal Four Block Modes'&&p.canonicalDocument?.sections?.length===4)}catch{return false}})},{timeout:12000})
 const saved=await page.evaluate(()=>{const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'));const all=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}});return all.find(p=>p.userAuthored&&p.name==='Universal Four Block Modes')||null})
 assert.ok(saved)
 const nodes=saved.canonicalDocument.sections.map(s=>s.nodes[0])
 assert.deepEqual(nodes.map(n=>n.type),['rich_text','grammar_table','matching_columns','long_question'])
 assert.equal(nodes[1].tableSemantic,'answer_table'); assert.equal(nodes[1].rows[1].rightText,'Books')
 assert.equal(nodes[2].leftItems[1].text,'Mass'); assert.equal(nodes[2].rightItems[1].text,'Amount of matter')
 assert.equal(nodes[3].stemText,'Explain contact and non-contact forces with examples.')
 assert.equal(saved.canonicalDocument.scoringPlan.maximumObtainableMarks,12); assert.equal(saved.canonicalDocument.scoringPlan.balanced,true)
 console.log('UNIVERSAL_BLOCK_MODES_BROWSER 4/4 PASS')
})
