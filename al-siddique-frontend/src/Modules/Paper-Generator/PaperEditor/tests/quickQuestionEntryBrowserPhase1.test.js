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
test('Quick Add retains context, rejects duplicates, saves another question and keeps translations', {timeout:45000},async t=>{
 const server=await createServer({root,server:{port:5240,strictPort:true},appType:'spa'})
 await server.listen()
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await server.close().catch(()=>{})})
 const page=await browser.newPage({viewport:{width:1300,height:1000}})
 await page.goto('http://localhost:5240/quick-question-entry-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('[data-quick-question-entry]').waitFor()
 assert.equal(await page.locator('[data-quick-count]').textContent(),'0')
 await page.getByLabel('Quick question text').fill('Define photosynthesis.')
 await page.getByRole('button',{name:'Save & Add Another'}).click()
 assert.equal(await page.locator('[data-quick-count]').textContent(),'1')
 assert.equal(await page.getByLabel('Quick question text').inputValue(),'')
 assert.equal(await page.getByLabel('Quick question marks').inputValue(),'2')
 await page.getByLabel('Quick question text').fill('Define photosynthesis.')
 await page.getByRole('button',{name:'Save & Add Another'}).click()
 assert.match(await page.getByRole('alert').textContent(),/already exists/)
 assert.equal(await page.locator('[data-quick-count]').textContent(),'1')
 await page.getByLabel('Quick question language').selectOption('dual')
 await page.getByLabel('Quick question text').fill('What is a cell?')
 await page.getByLabel('Quick question Urdu translation').fill('خلیہ کیا ہے؟')
 await page.getByRole('button',{name:'Save Question'}).click()
 assert.equal(await page.locator('[data-quick-count]').textContent(),'2')
 assert.equal(await page.locator('[data-quick-question-entry]').count(),0)
 const records=JSON.parse(await page.locator('[data-quick-records]').textContent())
 assert.equal(records[0].text,'Define photosynthesis.')
 assert.equal(records[1].text,'What is a cell?')
 assert.equal(records[1].textUrdu,'خلیہ کیا ہے؟')
 assert.equal(records[0].subjectId,records[1].subjectId)
 assert.equal(records[1].medium,'dual')
})
