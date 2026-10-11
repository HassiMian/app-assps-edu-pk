import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = 5962
const host = `http://127.0.0.1:${port}`
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
)

let browser
try {
  let ready = false
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(host + '/scripts/fixtures/result-cards-app.html', { signal: AbortSignal.timeout(900) })
      if (r.ok) { ready = true; break }
    } catch {}
    await sleep(250)
  }

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } })

  await page.route('**/api/exams', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 9, name: 'First Term Examination 2026-2027', class: 'All Classes', total_marks: 100, pass_marks: 40 },
          { id: 10, name: 'Mid Term Exam 2026', class: 'Class Seven', total_marks: 100, pass_marks: 40 },
        ]
      })
    })
  })

  await page.route('**/api/exams/grade-settings', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { from: 80, to: 100, label: 'A+' },
          { from: 70, to: 79, label: 'A' },
          { from: 60, to: 69, label: 'B' },
          { from: 50, to: 59, label: 'C' },
          { from: 40, to: 49, label: 'D' },
          { from: 0, to: 39, label: 'F' },
        ]
      })
    })
  })

  await page.route('**/api/academic/setup', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        configured: true,
        data: {
          classes: [
            { name: 'Starter', level: 'starter', sections: ['Blue'] },
            { name: 'Mover', level: 'mover', sections: ['Blue'] },
            { name: 'Flyer', level: 'flyer', sections: ['Blue'] },
            { name: 'One', level: '1', sections: ['A', 'B'] },
            { name: 'Two', level: '2', sections: ['A'] },
            { name: 'Three', level: '3', sections: ['A'] },
            { name: 'Four', level: '4', sections: ['A'] },
            { name: 'Five', level: '5', sections: ['A'] },
            { name: 'Six', level: '6', sections: ['A'] },
            { name: 'Seven', level: '7', sections: ['Blue'] },
            { name: 'Eight', level: '8', sections: ['Blue', 'Green'] },
            { name: 'Pre Nine', level: 'pre-nine', sections: ['Blue'] },
            { name: 'Nine', level: '9', sections: ['Blue'] },
            { name: 'Ten', level: '10', sections: ['Blue'] },
          ],
          subjects: []
        }
      })
    })
  })

  const exam9Results = [
    { student_id: 801, name: 'Tariq Eight-Blue', student_class: 'Eight', student_section: 'Blue', gr_number: 'GR-801', roll_number: '1', subject: 'English', marks_obtained: 85, total_marks: 100 },
    { student_id: 801, name: 'Tariq Eight-Blue', student_class: 'Eight', student_section: 'Blue', gr_number: 'GR-801', roll_number: '1', subject: 'Math', marks_obtained: 90, total_marks: 100 },
    { student_id: 802, name: 'Sana Eight-Green', student_class: 'Eight', student_section: 'Green', gr_number: 'GR-802', roll_number: '2', subject: 'English', marks_obtained: 78, total_marks: 100 },
    { student_id: 802, name: 'Sana Eight-Green', student_class: 'Eight', student_section: 'Green', gr_number: 'GR-802', roll_number: '2', subject: 'Math', marks_obtained: 82, total_marks: 100 },
    { student_id: 701, name: 'Bilal Seven', student_class: 'Seven', student_section: 'Blue', gr_number: 'GR-701', roll_number: '5', subject: 'English', marks_obtained: 65, total_marks: 100 },
    { student_id: 101, name: 'Ayesha One', student_class: 'One', student_section: 'A', gr_number: 'GR-101', roll_number: '10', subject: 'English', marks_obtained: 95, total_marks: 100 },
    { student_id: 901, name: 'PreNine Student', student_class: 'Pre Nine', student_section: 'A', gr_number: 'GR-901', roll_number: '20', subject: 'English', marks_obtained: 70, total_marks: 100 },
    { student_id: 902, name: 'Nine Student', student_class: 'Nine', student_section: 'A', gr_number: 'GR-902', roll_number: '21', subject: 'English', marks_obtained: 72, total_marks: 100 },
  ]

  await page.route(url => url.pathname.startsWith('/api/exams/results'), route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: exam9Results })
    })
  })

  await page.goto(host + '/scripts/fixtures/result-cards-app.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Result Cards' }).waitFor({ timeout: 15000 })
  await page.getByText(/student\(s\) found for this exam/).waitFor({ timeout: 10000 })

  const targetSelect = page.locator('#result-cards-print-target-select')
  await targetSelect.selectOption('class')

  const classSelect = page.locator('#result-cards-class-select')
  await classSelect.waitFor()
  await classSelect.selectOption('Eight')

  const sectionSelect = page.locator('#result-cards-section-select')
  await sectionSelect.waitFor()
  await sectionSelect.selectOption('Blue')

  await page.waitForTimeout(500)
  await page.screenshot({ path: 'scripts/fixtures/result-cards-class-eight-isolated.png', fullPage: true })
  console.log('SCREENSHOT_SAVED')
  await page.close()
} finally {
  if (browser) await browser.close()
  child.kill('SIGTERM')
  await sleep(500)
  if (!child.killed) child.kill('SIGKILL')
}
