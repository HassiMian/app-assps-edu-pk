import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../../..')
const corpusPath = path.resolve(here, '../../seed-data/official-first-term-2026-v13.json')
const raw = JSON.parse(fs.readFileSync(corpusPath, 'utf8'))
const papers = Array.isArray(raw) ? raw : (raw.papers || raw.documents || [])

test('Unified Workspace browser gate: all 43 official First-Term papers open Paper Workspace', { timeout: 240000 }, async t => {
  assert.equal(papers.length, 43)
  const server = await createServer({ root, server: { port: 5261, strictPort: true }, appType: 'spa' })
  await server.listen()
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1600, height: 950 } })
  t.after(async () => { await context.close().catch(()=>{}); await browser.close().catch(()=>{}); await server.close().catch(()=>{}) })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))

  for (const [index, paper] of papers.entries()) {
    await page.goto(`http://127.0.0.1:5261/paper-workspace-test.html?officialId=${encodeURIComponent(paper.id)}`, { waitUntil:'domcontentloaded' })
    await page.locator('.pts-paper-generator-shell').waitFor({ timeout: 9000 })
    assert.equal(await page.locator('.canonical-paper-editor-container').count(), 0, `${paper.id}: canonical editor must not open`)
    assert.equal(await page.locator('#paper-canvas').count(), 1, `${paper.id}: paper canvas must exist`)
    console.log(`WORKSPACE43 ${index + 1}/43 PASS ${paper.id}`)
  }
  assert.deepEqual(errors, [])
})
