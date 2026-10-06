import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('Class 1 Islamiyat opens Paper Workspace, never Canonical Editor V2', {timeout:60000}, async t=>{
  const server=await createServer({root,server:{port:5258,strictPort:true},appType:'spa'})
  await server.listen()
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:1600,height:950}})
  t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await server.close().catch(()=>{})})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://localhost:5258/paper-workspace-test.html?officialId=official-first-term-2026-class-1-islamiyat',{waitUntil:'domcontentloaded'})
  await page.locator('.pts-paper-generator-shell').waitFor({timeout:15000})
  assert.equal(await page.locator('.canonical-paper-editor-container').count(),0)
  assert.equal(await page.getByText('Paper Information — edit all header fields',{exact:true}).count(),1)
  assert.ok(await page.getByRole('button',{name:/Question Menu/}).count() >= 1)
  const body=await page.locator('#paper-canvas').textContent()
  assert.match(body,/SubjectIslamiyat/)
  assert.match(body,/سوال نمبر 1/u)
  assert.deepEqual(errors,[])
})
