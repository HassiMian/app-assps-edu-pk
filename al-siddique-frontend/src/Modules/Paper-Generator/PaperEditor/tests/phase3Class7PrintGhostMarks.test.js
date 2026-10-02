import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import process from 'node:process'
import {chromium} from 'playwright'
import {createServer} from 'vite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)
const normalize=s=>String(s).replace(/\s+/gu,' ').trim()
test('Class 7 Social Studies screen=print and no ghost marks labels; genuine section marks stay', {timeout:60000},async t=>{
 const server=await createServer({root,server:{port:5263,strictPort:true}})
 await server.listen()
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await server.close().catch(()=>{})})
 const page=await browser.newPage({viewport:{width:1440,height:1200}})
 await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto('http://localhost:5263/b3-test.html?mode=doc__official-first-term-2026-class-7-social-studies',
 {waitUntil:'domcontentloaded'})
 const paper=page.locator('[data-canonical-working-document]').first()
 await paper.waitFor()
 const btn=page.getByRole('button',{name:'Done Editing'})
 if(await btn.count())await btn.click()
 const screen=normalize(await paper.innerText())
 assert.ok(screen.includes('قشر الارض'),'Original Urdu question must stay intact')
 assert.ok(screen.includes('( 10 Marks)'),'Real section mark remains visible')
 assert.ok(!screen.includes('( Marks)'),'Ghost numeric-less badge must not be on screen')
 await page.emulateMedia({media:'print'})
 const print=normalize(await paper.innerText())
 assert.equal(print,screen,'No screen/print text changes permitted')
 const ghosts=paper.locator('.canonical-question-marks-empty, .canonical-section-marks-empty')
 const n=await ghosts.count()
 for(let i=0;i<n;i++) assert.equal(await ghosts.nth(i).evaluate(el=>getComputedStyle(el).display),'none')
 assert.ok(print.includes('( 10 Marks)'),'Real section total must still print')
})
