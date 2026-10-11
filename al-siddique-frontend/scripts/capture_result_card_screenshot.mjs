import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })

try {
  const m = {
    ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx'),
    ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardData.js'),
    ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardPrint.js'),
  }
  const logo = 'data:image/svg+xml;base64,' + readFileSync('public/school-logo.svg').toString('base64')
  const names = ['English Language', 'Mathematics', 'General Science', 'Urdu', 'Islamiyat', 'Computer Science', 'Social Studies', 'General Knowledge']
  const marks = names.map((subject, i) => ({ subject, marks_obtained: 75 + i * 2, total_marks: 100 }))
  const base = {
    student: { name: 'Redacted Student', fatherName: 'Redacted Father', className: 'Nine', rollNo: '009' },
    exam: { name: 'First Term Examination', total_marks: 100, session: '2026–2027' },
    studentMarks: marks,
    school: { name: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL', logo, address: 'Sharif Chowk, Rayya Khas, Narowal' },
    options: { ...m.DEFAULT_RESULT_OPTIONS, template: 'signature-editorial' }
  }

  const page = await browser.newPage({ viewport: { width: 950, height: 1350 } })
  const data = m.buildResultCardData(base)
  const markup = renderToStaticMarkup(createElement(m.ResultCardPreview, { data }))
  await page.setContent('<!doctype html><html><head><meta charset="UTF-8"><style>' + m.resultCardPrintCss + '</style></head><body style="background:#e2e8f0;display:flex;justify-content:center;padding:20px;">' + markup + '</body></html>')
  await page.waitForTimeout(500)

  const cardElement = page.locator('.result-card-a4')
  await cardElement.screenshot({ path: '/root/workspace/assps-core-firstterm-production-rc-20261011/result_card_signature_editorial_a4.png' })
  console.log('SAVED: result_card_signature_editorial_a4.png')
} finally {
  await browser.close()
  await vite.close()
}
