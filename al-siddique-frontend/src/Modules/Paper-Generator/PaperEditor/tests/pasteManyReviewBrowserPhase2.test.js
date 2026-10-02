import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import process from 'node:process'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)
let server,browser,page
before(async()=>{
 server=await createServer({root,server:{port:5242,strictPort:true},appType:'spa'});await server.listen()
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1500,height:1100}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_user',JSON.stringify({tenant_id:'paste-e2e-check',email:'test@internal.example'}))
 })
 page=await context.newPage()
 page.on('dialog',async dialog=>dialog.dismiss())
 await page.goto('http://localhost:5242/paste-many-review-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('[data-supervised-paste-many]').waitFor()
})
after(async()=>{await browser?.close();await server?.close()})
const count=async()=>Number(await page.locator('[data-paste-store-count]').textContent())
async function reopen(){
 await page.getByRole('button',{name:'Close ×'}).click()
 await page.locator('[data-open-paste-many]').click()
 await page.locator('[data-supervised-paste-many]').waitFor()
}
test('review gate parses 3 plain rows, requires marks, detects duplicates, commits exactly 2 once', {timeout:65000}, async()=>{
 assert.equal(await count(),0)
 await page.getByLabel('Paste many source text').fill('1. Define photosynthesis.\n2. Define photosynthesis!\n3. What is respiration?')
 await page.locator('[data-review-paste]').click()
 assert.equal(await page.locator('[data-paste-row]').count(),3)
 assert.equal(await page.locator('[data-paste-commit]').isDisabled(),true)
 for(let i=1;i<=3;i++)await page.getByLabel('Row '+i+' marks').fill('2')
 assert.match(await page.locator('[data-paste-row]').nth(1).innerText(),/DUPLICATE/)
 assert.equal(await page.locator('[data-paste-commit]').isDisabled(),true)
 await page.getByRole('button',{name:'Skip Flagged Duplicates'}).click()
 assert.equal(await page.locator('[data-paste-commit]').isEnabled(),true)
 await page.locator('[data-paste-commit]').click()
 await page.getByRole('status').waitFor()
 assert.equal(await count(),2)
 const records=JSON.parse(await page.locator('[data-paste-store-records]').textContent())
 assert.deepEqual(records.map(q=>q.marks),[2,2])
 assert.equal(records.every(q=>q.source==='supervised-paste-many'),true)
 assert.equal(await page.locator('[data-paste-row]').count(),0)
})
test('same prompt from previous commit is flagged even with changed marks; existing store untouched', {timeout:45000},async()=>{
 await reopen()
 await page.getByLabel('Paste many source text').fill('Q: Define photosynthesis!\nMARKS: 7\n---\nQ: Define a nucleus.\nMARKS: 2')
 await page.locator('[data-review-paste]').click()
 assert.equal(await page.locator('[data-paste-row]').count(),2)
 assert.match(await page.locator('[data-paste-row]').first().innerText(),/existing bank/)
 assert.equal(await page.locator('[data-paste-commit]').isDisabled(),true)
 await page.getByLabel('Include row 1').uncheck()
 assert.equal(await page.locator('[data-paste-commit]').isEnabled(),true)
 await page.locator('[data-paste-commit]').click()
 assert.equal(await count(),3)
 const rows=JSON.parse(await page.locator('[data-paste-store-records]').textContent())
 assert.equal(rows[0].marks,2)
})
test('structured Urdu and MCQ data are reviewed and stored with correct language fields', {timeout:55000},async()=>{
 await reopen()
 await page.getByLabel('Paste default medium').selectOption('urdu')
 await page.getByLabel('Paste many source text').fill('Q: پانی کی تعریف کریں۔\nMARKS: 2')
 await page.locator('[data-review-paste]').click()
 assert.equal(await page.getByLabel('Row 1 Urdu question').inputValue(),'پانی کی تعریف کریں۔')
 assert.equal(await page.locator('[data-paste-commit]').isEnabled(),true)
 await page.locator('[data-paste-commit]').click()
 assert.equal(await count(),4)
 await reopen()
 await page.getByLabel('Paste default type').selectOption('mcq')
 await page.getByLabel('Paste many source text').fill('Q: Which part makes food?\nA: Roots\nB: Leaves\nC: Stem\nANS: B\nMARKS: 1')
 await page.locator('[data-review-paste]').click()
 assert.equal(await page.getByLabel('Row 1 option B').inputValue(),'Leaves')
 await page.locator('[data-paste-commit]').click()
 assert.equal(await count(),5)
 const saved=JSON.parse(await page.locator('[data-paste-store-records]').textContent())
 assert.equal(saved[3].text,'')
 assert.equal(saved[3].textUrdu,'پانی کی تعریف کریں۔')
 assert.equal(saved[4].type,'mcq')
 assert.equal(saved[4].answer,'B')
 assert.equal(saved[4].options.length,3)
})
test('browser storage error does not produce false commit or clear reviewed data', {timeout:45000},async()=>{
 await reopen()
 await page.getByLabel('Paste many source text').fill('Q: Why does ice melt?\nMARKS: 2')
 await page.locator('[data-review-paste]').click()
 assert.equal(await page.locator('[data-paste-commit]').isEnabled(),true)
 await page.evaluate(()=>{
  window.__pasteOriginalSetItem=Storage.prototype.setItem
  Storage.prototype.setItem=function(k,v){
   if(String(k).startsWith('al_siddique_paper_store'))throw new Error('simulated storage full')
   return window.__pasteOriginalSetItem.call(this,k,v)
  }
 })
 await page.locator('[data-paste-commit]').click()
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').textContent(),/storage write failed/i)
 assert.equal(await page.locator('[data-paste-row]').count(),1)
 assert.equal(await count(),5)
 await page.evaluate(()=>{Storage.prototype.setItem=window.__pasteOriginalSetItem})
 await page.locator('[data-paste-commit]').click()
 assert.equal(await count(),6)
})

test('real Question Bank toolbar routes Paste Many into the supervised modal', {timeout:35000},async()=>{
 await page.getByRole('button',{name:'Close ×'}).click()
 await page.locator('[data-show-real-question-bank]').click()
 await page.getByText('Supervised Paste Acceptance',{exact:true}).last().click()
 await page.getByRole('button',{name:/Paste Many \/ Review/}).click()
 await page.locator('[data-supervised-paste-many]').waitFor()
 assert.match(await page.locator('[data-supervised-paste-many] h2').textContent(),/Review before Commit/)
 assert.equal(await count(),6)
})
