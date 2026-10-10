import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Buffer } from 'node:buffer'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

test('real Chromium renders A4 and half-size A5 PDF from the print iframe', { timeout: 90000 }, async t => {
  const server = await createServer({ root, server: { port: 5773, strictPort: true } })
  await server.listen()
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  t.after(async () => { await browser.close(); await server.close() })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5773/paper-workspace-test.html', { waitUntil: 'domcontentloaded' })
  for (const [isHalf, width, height] of [[false, 595, 842], [true, 420, 595]]) {
    const html = await page.evaluate(async half => {
      const module = await import('/src/Modules/Paper-Generator/PaperEditor/printing/PrintEngine.js')
      const paper = document.createElement('article')
      paper.className = 'paper-document-surface'
      paper.textContent = 'Exam 2026 — سوال — 10 marks'
      if (!module.executePaperPrint(paper, { isHalf: half })) throw new Error('Cannot print')
      return document.getElementById('__print_frame').contentDocument.documentElement.outerHTML
    }, isHalf)
    const pdfPage = await browser.newPage()
    await pdfPage.route('https://fonts.googleapis.com/**', route => route.abort())
    await pdfPage.route('https://fonts.gstatic.com/**', route => route.abort())
    try {
      await pdfPage.setContent(html, { waitUntil: 'domcontentloaded' })
      const pdf = await pdfPage.pdf({ preferCSSPageSize: true })
      const match = Buffer.from(pdf).toString('latin1').match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
      assert.ok(match, 'PDF page size must exist')
      assert.ok(Math.abs(Number(match[1]) - width) < 2)
      assert.ok(Math.abs(Number(match[2]) - height) < 2)
      console.log('PRINT_PDF_REAL_CHROMIUM', isHalf ? 'A5 PASS' : 'A4 PASS')
    } finally { await pdfPage.close() }
  }
})
