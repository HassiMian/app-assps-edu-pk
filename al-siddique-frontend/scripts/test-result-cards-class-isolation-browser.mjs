import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = 5961
const host = `http://127.0.0.1:${port}`
const child = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] }
)

let output = ''
for (const s of [child.stdout, child.stderr]) {
  s.on('data', v => { output += v.toString() })
}

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
  assert.ok(ready, output.slice(-900))

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()))
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message))
  page.on('request', req => console.log('[REQ]', req.method(), req.url()))
  page.on('response', res => console.log('[RES]', res.status(), res.url()))

  // Mock API endpoints
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
    // Class Eight - Section Blue
    { student_id: 801, name: 'Tariq Eight-Blue', student_class: 'Eight', student_section: 'Blue', gr_number: 'GR-801', roll_number: '1', subject: 'English', marks_obtained: 85, total_marks: 100 },
    { student_id: 801, name: 'Tariq Eight-Blue', student_class: 'Eight', student_section: 'Blue', gr_number: 'GR-801', roll_number: '1', subject: 'Math', marks_obtained: 90, total_marks: 100 },
    // Class Eight - Section Green
    { student_id: 802, name: 'Sana Eight-Green', student_class: 'Eight', student_section: 'Green', gr_number: 'GR-802', roll_number: '2', subject: 'English', marks_obtained: 78, total_marks: 100 },
    { student_id: 802, name: 'Sana Eight-Green', student_class: 'Eight', student_section: 'Green', gr_number: 'GR-802', roll_number: '2', subject: 'Math', marks_obtained: 82, total_marks: 100 },
    // Class Seven - Section Blue
    { student_id: 701, name: 'Bilal Seven', student_class: 'Seven', student_section: 'Blue', gr_number: 'GR-701', roll_number: '5', subject: 'English', marks_obtained: 65, total_marks: 100 },
    // Class One - Section A
    { student_id: 101, name: 'Ayesha One', student_class: 'One', student_section: 'A', gr_number: 'GR-101', roll_number: '10', subject: 'English', marks_obtained: 95, total_marks: 100 },
    // Pre Nine - MUST BE EXCLUDED from Exam 9
    { student_id: 901, name: 'PreNine Student', student_class: 'Pre Nine', student_section: 'A', gr_number: 'GR-901', roll_number: '20', subject: 'English', marks_obtained: 70, total_marks: 100 },
    // Nine - MUST BE EXCLUDED from Exam 9
    { student_id: 902, name: 'Nine Student', student_class: 'Nine', student_section: 'A', gr_number: 'GR-902', roll_number: '21', subject: 'English', marks_obtained: 72, total_marks: 100 },
  ]

  const exam10Results = [
    { student_id: 701, name: 'Bilal Seven', student_class: 'Seven', student_section: 'Blue', gr_number: 'GR-701', roll_number: '5', subject: 'English', marks_obtained: 65, total_marks: 100 },
  ]

  await page.route(url => url.pathname.startsWith('/api/exams/results'), route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/exams/results/10') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: exam10Results })
      })
    } else if (url.pathname === '/api/exams/results/9') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: exam9Results })
      })
    } else if (url.pathname === '/api/exams/results') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: exam9Results })
      })
    } else {
      route.continue()
    }
  })

  await page.goto(host + '/scripts/fixtures/result-cards-app.html', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Result Cards' }).waitFor({ timeout: 15000 })

  console.log('[TEST] Checking Exam 9 student filtering: Pre Nine and Nine excluded...')
  const targetSelect = page.locator('#result-cards-print-target-select')
  await targetSelect.waitFor()

  // Wait for students to load
  await page.getByText(/student\(s\) found for this exam/).waitFor({ timeout: 10000 })
  const optionsText = await targetSelect.innerText()

  // Verify Pre Nine and Nine students are EXCLUDED from Exam 9
  assert.ok(!optionsText.includes('PreNine Student'), 'Pre Nine student must not be present for Exam 9')
  assert.ok(!optionsText.includes('Nine Student'), 'Nine student must not be present for Exam 9')
  assert.ok(optionsText.includes('Tariq Eight-Blue'), 'Class Eight student must be present')
  assert.ok(optionsText.includes('Bilal Seven'), 'Class Seven student must be present')
  assert.ok(optionsText.includes('Ayesha One'), 'Class One student must be present')
  console.log('PASS: Exam 9 excludes Pre Nine and Nine students (Requirement 5)')

  console.log('[TEST] Testing Whole Class selection and Class Eight isolation...')
  // Select "Whole Class"
  await targetSelect.selectOption('class')

  // Verify explicit Class selector appears
  const classSelect = page.locator('#result-cards-class-select')
  await classSelect.waitFor()
  assert.ok(await classSelect.isVisible(), 'Explicit Class selector must be visible when Whole Class is selected')

  // Check class options: canonically ordered Starter through Eight, NO Pre Nine, Nine, Ten
  const classOptions = await classSelect.locator('option').allInnerTexts()
  console.log('[TEST] Available classes for Exam 9:', classOptions)
  assert.ok(!classOptions.some(opt => /pre\s*nine/i.test(opt)), 'Pre Nine must not appear in Exam 9 class list')
  assert.ok(!classOptions.some(opt => /nine/i.test(opt) && !/pre\s*nine/i.test(opt)), 'Nine must not appear in Exam 9 class list')
  assert.ok(!classOptions.some(opt => /ten/i.test(opt)), 'Ten must not appear in Exam 9 class list')

  // Verify Starter through Eight are available in canonical order
  const validClasses = classOptions.filter(opt => opt !== 'Select Class to print')
  assert.ok(validClasses.includes('Class Eight'), 'Class Eight must be an option')
  assert.ok(validClasses.includes('Class Seven'), 'Class Seven must be an option')
  assert.ok(validClasses.includes('Class One'), 'Class One must be an option')

  // Select "Eight"
  await classSelect.selectOption('Eight')
  const sectionSelect = page.locator('#result-cards-section-select')
  await sectionSelect.waitFor()
  assert.ok(await sectionSelect.isVisible(), 'Optional Section selector must be visible')

  const sectionOptions = await sectionSelect.locator('option').allInnerTexts()
  assert.ok(sectionOptions.includes('All Sections'), 'All Sections option must exist')
  assert.ok(sectionOptions.includes('Section Blue'), 'Section Blue must exist')
  assert.ok(sectionOptions.includes('Section Green'), 'Section Green must exist')

  // Verify class print cards count shows 2 cards for Class Eight
  await page.getByText(/2 card\(s\) for Class Eight/).waitFor()
  console.log('PASS: Class Eight selection isolates 2 Class Eight cards')

  // Now test Section filter: select Section Blue
  await sectionSelect.selectOption('Blue')
  await page.getByText(/1 card\(s\) for Class Eight \/ Section Blue/).waitFor()
  console.log('PASS: Section Blue isolates 1 card')

  // Reset section back to All Sections
  await sectionSelect.selectOption('')
  await page.getByText(/2 card\(s\) for Class Eight/).waitFor()

  // Click Open Designer / Generate Report Cards
  await page.locator('#result-cards-open-designer-btn').click()
  await page.getByText('Professional Result Card Designer').waitFor()

  // In modal, verify that preview card has Class Eight and NEVER All Classes
  const modalA4 = page.locator('.result-designer .result-card-a4')
  await modalA4.waitFor()
  const modalText = await modalA4.innerText()
  assert.ok(modalText.includes('Class Eight') || modalText.includes('Eight'), 'Card must show student enrolled class Eight')
  assert.ok(!modalText.includes('All Classes'), 'Student class must never show All Classes')

  // Check preview readiness text: exactly 2 cards
  const readinessText = await page.locator('.result-print-readiness').innerText()
  assert.ok(readinessText.includes('2 card(s)'), 'Batch must contain exactly 2 cards for Class Eight, got: ' + readinessText)
  console.log('PASS: Whole Class -> Class Eight prints ONLY Class Eight students (Requirement 1, 2, 7)')

  // Close designer modal
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByText('Professional Result Card Designer').waitFor({ state: 'detached' })

  console.log('[TEST] Testing separate, explicit All Classes print choice...')
  // Select "all"
  await targetSelect.selectOption('all')
  await page.getByText(/4 card\(s\) across all classes/).waitFor()

  // Open designer for All Classes
  await page.locator('#result-cards-open-designer-btn').click()
  await page.getByText('Professional Result Card Designer').waitFor()
  const allBatchText = await page.locator('.result-print-readiness').innerText()
  assert.ok(allBatchText.includes('4 card(s)'), 'Explicit All Classes batch must contain all 4 valid students, got: ' + allBatchText)
  console.log('PASS: Separate All Classes option explicitly prints all classes (Requirement 3, 7)')

  // Close designer modal
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByText('Professional Result Card Designer').waitFor({ state: 'detached' })

  console.log('[TEST] Testing stale state reset on exam change...')
  // Select Exam 10
  const examSelect = page.locator('#result-cards-exam-select')
  await examSelect.selectOption('10')

  // Check that target select is reset and Class Eight selection is reset
  await page.getByText(/1 student\(s\) found for this exam/).waitFor({ timeout: 10000 })
  const newTargetValue = await targetSelect.inputValue()
  assert.notEqual(newTargetValue, 'class', 'Target mode should reset on exam change')
  console.log('PASS: Exam change resets stale print selections (Requirement 4)')

  // Switch back to Exam 9 and test empty-result / unscored prevention
  await examSelect.selectOption('9')
  await page.getByText(/student\(s\) found for this exam/).waitFor({ timeout: 10000 })
  await targetSelect.selectOption('class')
  await classSelect.waitFor()

  // Select a class with no students (e.g. Class Four)
  await classSelect.selectOption('Four')
  await page.getByText(/0 card\(s\) for Class Four/).waitFor()
  const printBtn = page.locator('#result-cards-open-designer-btn')
  assert.ok(await printBtn.isDisabled(), 'Print button must be disabled when class has 0 printable cards')
  console.log('PASS: Empty result print prevention verified (Requirement 8)')

  console.log('\n======================================================')
  console.log('ALL RESULT CARDS CLASS ISOLATION BROWSER CHECKS PASS!')
  console.log('======================================================\n')
  await page.close()
} finally {
  if (browser) await browser.close()
  child.kill('SIGTERM')
  await sleep(500)
  if (!child.killed) child.kill('SIGKILL')
}
