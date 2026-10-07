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

test('Class 8 Urdu opens compact with A4 preview visible, marks preserved and normal manual editor accessible', {timeout:35000}, async t=>{
 const server=await createServer({root,server:{port:5238,strictPort:true},appType:'spa'})
 await server.listen()
 t.after(async()=>server.close())
 const browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 t.after(async()=>browser.close())
 const page=await browser.newPage({viewport:{width:1640,height:960}})
 await page.route('**/api/settings/public**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await page.goto('http://localhost:5238/paper-workspace-test.html?recovery8',{waitUntil:'domcontentloaded'})
 await page.locator('#paper-canvas .preview-container').waitFor({timeout:12000})
 const details=page.locator('[data-paper-metadata-editor]')
 assert.equal(await details.evaluate(el=>el.open),false,'Metadata must start collapsed')
 assert.equal(await page.locator('[data-marks-reconciliation]').count(),0,'Unrequested nine-question grid must be removed')
 assert.equal(await page.getByRole('button',{name:'Edit Paper',exact:true}).count(),1,'Existing editor remains accessible')
 assert.equal(await page.getByLabel('Total Marks').inputValue(),'70','Saved header marks must not reset')
 assert.equal(await page.locator('[data-paper-quality-gate]').isVisible(),false,'Advanced QA must not push preview down')
 const canvas=await page.locator('#paper-canvas').boundingBox()
 assert.ok(canvas && canvas.height>=350,'A4 preview region must be usable without scrolling past the old panel: '+JSON.stringify(canvas))
 assert.ok(await page.locator('[data-official-section]').count()===9,'All nine sections preserved')
 assert.equal(await page.getByRole('button',{name:'Done Editing'}).count(),0,'Do not force editing when paper opens')
 await page.getByRole('button',{name:'Edit Paper',exact:true}).click()
 assert.equal(await page.getByRole('button',{name:'Done Editing'}).count(),1)
 assert.equal(await page.getByLabel('Total Marks').inputValue(),'70')
 await page.getByRole('button',{name:'Done Editing'}).click()
 assert.equal(await page.locator('[data-paper-metadata-editor]').evaluate(el=>el.open),false)
})
