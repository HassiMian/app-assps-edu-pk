import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')

test('academic defaults hydrate classes once and derived classNames remain stable', { timeout:60000 }, async t => {
  const server = await createServer({ root, server:{ port:5262, strictPort:true }, appType:'spa' })
  await server.listen()
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] })
  const context = await browser.newContext()
  t.after(async()=>{ await context.close().catch(()=>{}); await browser.close().catch(()=>{}); await server.close().catch(()=>{}) })
  const page = await context.newPage()
  let academicRequests = 0
  await page.route('**/api/academic/setup', async route => {
    academicRequests += 1
    await new Promise(resolve => setTimeout(resolve, 120))
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({
      success:true,
      configured:false,
      data:null,
      defaults:{ periodsPerDay:8, localities:['Rayya Khas'], classes:[
        {level:'starter',name:'Starter',active:true,sections:['Blue']},
        {level:'1',name:'One',active:true,sections:['Blue']},
      ], subjects:[] }
    }) })
  })
  await page.goto('http://127.0.0.1:5262/academic-store-test.html', { waitUntil:'domcontentloaded' })
  await page.locator('#a-loading').filter({hasText:'false'}).waitFor({timeout:10000})
  await page.locator('#b-loading').filter({hasText:'false'}).waitFor({timeout:10000})
  assert.equal(await page.locator('#a-configured').textContent(), 'false')
  assert.equal(await page.locator('#a-classes').textContent(), 'Starter|One')
  assert.equal(await page.locator('#b-classes').textContent(), 'Starter|One')
  assert.equal(academicRequests, 1, 'simultaneous academic hydration must be single-flight')
  const before = await page.locator('#a-changes').textContent()
  await page.click('#a-force')
  await page.waitForTimeout(50)
  assert.equal(await page.locator('#a-changes').textContent(), before, 'classNames identity must remain stable across unrelated rerender')
})
