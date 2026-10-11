import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = 5972
const host = `http://127.0.0.1:${port}`

console.log('Starting Vite preview/server for QA browser capture...')
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
})

let logs = ''
for (const stream of [vite.stdout, vite.stderr]) {
  stream.on('data', x => logs += x.toString())
}

try {
  let ready = false
  for (let n = 0; n < 90; n++) {
    try {
      const r = await fetch(host + '/scripts/fixtures/marks-entry-firstterm.html', { signal: AbortSignal.timeout(850) })
      if (r.ok) { ready = true; break }
    } catch {}
    await sleep(200)
  }
  assert.ok(ready, 'Vite failed to start: ' + logs.slice(-500))

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })

  const students = [
    { id: 101, name: 'Redacted Student A', class: 'One', gr_number: 'GR-101', father_name: 'Parent A' },
    { id: 102, name: 'Redacted Student B', class: 'Class One', gr_number: 'GR-102', father_name: 'Parent B' }
  ]

  const json = (r, data, status = 200) => r.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(data)
  })

  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api/')) return route.continue()
    if (request.method() === 'OPTIONS') return json(route, {})
    const path = url.pathname

    if (path === '/api/academic/setup') return json(route, {
      success: true, configured: true, data: {
        classes: [
          { name: 'Starter', level: 'starter', active: true },
          { name: 'Mover', level: 'mover', active: true },
          { name: 'Flyer', level: 'flyer', active: true },
          { name: 'One', level: '1', active: true },
          { name: 'Two', level: '2', active: true },
          { name: 'Three', level: '3', active: true },
          { name: 'Four', level: '4', active: true },
          { name: 'Five', level: '5', active: true },
          { name: 'Six', level: '6', active: true },
          { name: 'Seven', level: '7', active: true },
          { name: 'Eight', level: '8', active: true },
          { name: 'Nine', level: '9', active: true },
          { name: 'Pre Nine', level: 'pre-nine', active: true }
        ],
        subjects: [],
        sessionStart: '2026-04-01', sessionEnd: '2027-03-31'
      }
    })

    if (path === '/api/exams' && request.method() === 'GET') return json(route, {
      success: true, data: [
        { id: 9, name: 'First Term Exam', type: 'TE', class: 'All Classes', session: '2026-2027', total_marks: 100, pass_marks: 33 }
      ]
    })

    if (path === '/api/students') return json(route, { success: true, data: students })

    if (path === '/api/exams/results/9') return json(route, {
      success: true, data: [
        { exam_id: 9, student_id: 101, subject: 'English', marks_obtained: 88, total_marks: 100 }
      ]
    })

    return json(route, { success: true, data: [] })
  })

  await page.goto(host + '/scripts/fixtures/marks-entry-firstterm.html', { waitUntil: 'networkidle' })
  await sleep(1000)

  // Select Class One
  const classSelect = page.locator('select').nth(1)
  await classSelect.selectOption('One')
  await sleep(500)

  // Select Subject English
  const subjectSelect = page.locator('select').nth(3)
  await subjectSelect.selectOption('English')
  await sleep(500)

  // Click Search Students
  await page.getByRole('button', { name: 'Search Students' }).click()
  await sleep(1000)

  // Take screenshot of populated roster
  await page.screenshot({ path: '/root/workspace/assps-core-firstterm-production-rc-20261011/marks_entry_qa_students_loaded.png', fullPage: true })
  console.log('SCREENSHOT_SAVED: marks_entry_qa_students_loaded.png')

  await browser.close()
} finally {
  if (vite) vite.kill()
}
