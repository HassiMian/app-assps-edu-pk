import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')
const executable=[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(file=>fs.existsSync(file))

test('Flyer Urdu: missing presentation fixed, marks edited, persisted, and printable', {timeout:35000}, async t=>{
 const server=await createServer({root,server:{port:5197,strictPort:true},appType:'spa'})
 await server.listen()
 t.after(async()=>server.close())
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 t.after(async()=>browser.close())
 const context=await browser.newContext({viewport:{width:1500,height:1000}})
 const page=await context.newPage()
 await page.goto('http://localhost:5197/ey-test.html?paper=ey-flyer-urdu-2026',{waitUntil:'domcontentloaded'})
 await page.locator('.early-years-sheet-a4').waitFor({timeout:10000})
 assert.equal(await page.getByText('Unsupported presentation:',{exact:false}).count(),0)
 assert.ok(await page.locator('.early-years-question-block').nth(3).locator('.early-years-urdu-handwriting-response').count()>0,'Q4 Urdu alphabet practice renders')
 assert.equal(await page.locator('[data-early-years-draft-warning]').count(),1,'50 versus 60 starts as draft')
 await page.getByRole('button',{name:'Edit Paper / Marks'}).click()
 await page.locator('.early-years-inspector').waitFor()
 await page.locator('.early-years-inspector select').first().selectOption('1')
 await page.getByLabel('Early Years Question Marks').fill('10')
 assert.equal(await page.locator('[data-early-years-draft-warning]').count(),0,'reconciled 50/50 no warning')
 const badge=page.locator('.early-years-question-block').nth(1).locator('.early-years-question-marks')
 assert.match(await badge.textContent(),/10/)
 const stored=await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k.startsWith('assps-early-years-editor-working-copy-v1')))
 assert.ok(stored,'working-copy overlay persisted')
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.early-years-sheet-a4').waitFor()
 assert.equal(await page.locator('[data-early-years-draft-warning]').count(),0,'reload preserves reconciled marks')
 assert.match(await page.locator('.early-years-question-block').nth(1).locator('.early-years-question-marks').textContent(),/10/)
 await page.evaluate(()=>{window.__printCalls=0;window.print=()=>{window.__printCalls++}})
 await page.getByRole('button',{name:/Print Worksheet/}).click()
 await page.waitForFunction(()=>window.__printCalls===1,{timeout:6000})
})
