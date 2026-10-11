import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const port = Number(process.env.PROMOTE_BROWSER_PORT || 5979)
const host = `http://127.0.0.1:${port}`

console.log(`[TEST] Starting Vite on port ${port}...`)
const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  '--host', '127.0.0.1',
  '--port', String(port),
  '--strictPort'
], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
})

let logs = ''
for (const stream of [vite.stdout, vite.stderr]) {
  stream.on('data', chunk => logs += chunk.toString())
}

let browser = null

try {
  let ready = false
  for (let n = 0; n < 60; n++) {
    try {
      const r = await fetch(host + '/scripts/fixtures/promote-demote-fixture.html', {
        signal: AbortSignal.timeout(850)
      })
      if (r.ok) { ready = true; break }
    } catch {}
    await sleep(250)
  }
  assert.ok(ready, `Vite server failed to start:\n${logs.slice(-1000)}`)
  console.log('[TEST] Vite server ready.')

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  const studentsMock = [
    { id: 643, name: 'Student 643', gr_number: 'MIG26-005', class: 'Eight', section: 'Blue', roll_number: '1' },
    { id: 651, name: 'Student 651', gr_number: 'MIG26-013', class: 'Eight', section: 'Blue', roll_number: '2' },
    { id: 673, name: 'Student 673', gr_number: 'MIG26-035', class: 'Eight', section: 'Blue', roll_number: '3' },
    { id: 699, name: 'Student 699', gr_number: 'MIG26-061', class: 'Eight', section: 'Blue', roll_number: '4' },
    { id: 704, name: 'Student 704', gr_number: 'MIG26-066', class: 'Eight', section: 'Blue', roll_number: '5' },
    { id: 776, name: 'Student 776', gr_number: 'MIG26-138', class: 'Eight', section: 'Blue', roll_number: '6' },
    { id: 800, name: 'Student 800', gr_number: 'MIG26-162', class: 'Eight', section: 'Blue', roll_number: '7' },
    { id: 807, name: 'Student 807', gr_number: 'MIG26-169', class: 'Eight', section: 'Blue', roll_number: '8' },
    { id: 882, name: 'Student 882', gr_number: 'MIG26-244', class: 'Eight', section: 'Blue', roll_number: '9' },
    { id: 903, name: 'Student 903', gr_number: 'MIG26-265', class: 'Eight', section: 'Blue', roll_number: '10' },
    { id: 915, name: 'Student 915', gr_number: 'MIG26-277', class: 'Eight', section: 'Blue', roll_number: '11' },
  ]

  const capturedPosts = []

  const json = (r, data, status = 200) => r.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(data)
  })

  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.hostname === '127.0.0.1' && !url.pathname.startsWith('/api/')) return route.continue()
    if (request.method() === 'OPTIONS') return json(route, {})

    const pathname = url.pathname

    if (pathname === '/api/academic/setup') {
      return json(route, {
        success: true,
        configured: true,
        data: {
          classes: [
            { name: 'Starter', level: 'starter', active: true, sections: ['Blue'] },
            { name: 'Mover', level: 'mover', active: true, sections: ['Purple'] },
            { name: 'Flyer', level: 'flyer', active: true, sections: ['Pink'] },
            { name: 'One', level: 1, active: true, sections: ['Yellow'] },
            { name: 'Two', level: 2, active: true, sections: ['Orange'] },
            { name: 'Three', level: 3, active: true, sections: ['Red'] },
            { name: 'Four', level: 4, active: true, sections: ['Blue'] },
            { name: 'Five', level: 5, active: true, sections: ['Blue'] },
            { name: 'Six', level: 6, active: true, sections: ['Blue'] },
            { name: 'Seven', level: 7, active: true, sections: ['Blue'] },
            { name: 'Eight', level: 8, active: true, sections: ['Blue'] },
            { name: 'Pre Nine', level: 'pre-nine', active: true, sections: ['Blue'] },
            { name: 'Nine', level: 9, active: true, sections: ['Fatima', 'Usman'] },
            { name: 'Ten', level: 10, active: true, sections: ['A'] },
          ],
          subjects: [],
          sessionStart: '2026-04-01',
          sessionEnd: '2027-03-31',
        }
      })
    }

    if (pathname === '/api/students' && request.method() === 'GET') {
      const cls = url.searchParams.get('class')
      if (cls === 'Eight') {
        return json(route, { success: true, count: 11, data: studentsMock })
      }
      return json(route, { success: true, count: 0, data: [] })
    }

    if (pathname === '/api/students/bulk-class-assignment' && request.method() === 'POST') {
      const body = request.postDataJSON()
      capturedPosts.push(body)
      return json(route, {
        success: true,
        count: body.assignments?.length || 0,
        message: `${body.assignments?.length || 0} student assignments updated.`
      })
    }

    return route.continue()
  })

  console.log('[TEST] Navigating to PromoteDemote fixture in browser...')
  await page.goto(`${host}/scripts/fixtures/promote-demote-fixture.html`, { waitUntil: 'networkidle' })

  // 1. Verify Header and Stepper Cards
  const headerText = await page.textContent('h1')
  assert.match(headerText, /Promote \/ Demote Students/i, 'Header must be present')
  console.log('PASS: Header rendered correctly')

  // 2. Verify Canonical Class Order in Source Select
  const classOptions = await page.$$eval('select >> nth=0 >> option', opts => opts.map(o => o.value))
  const expectedOrder = ['Starter', 'Mover', 'Flyer', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Pre Nine', 'Nine', 'Ten']
  assert.deepEqual(classOptions, expectedOrder, `Classes must appear in exact natural order. Got: ${JSON.stringify(classOptions)}`)
  console.log('PASS: Canonical class order verified in selector')

  // Pre Nine and Nine distinct check
  assert.ok(classOptions.includes('Pre Nine'), 'Pre Nine must be present in options')
  assert.ok(classOptions.includes('Nine'), 'Nine must be present in options')
  assert.notEqual(classOptions.indexOf('Pre Nine'), classOptions.indexOf('Nine'), 'Pre Nine and Nine must remain separate')
  console.log('PASS: Pre Nine and Nine verified as distinct classes')

  // 3. Switch to Class Eight & Load Students
  await page.selectOption('select >> nth=0', 'Eight')
  await page.click('button:has-text("Load Students")')
  await page.waitForTimeout(500)

  // Verify rows rendered
  const rows = await page.$$('tbody tr')
  assert.equal(rows.length, 11, `Expected 11 student rows in Class Eight, found ${rows.length}`)
  console.log('PASS: 11 student rows loaded for Class Eight')

  // 4. Test "Select All"
  await page.click('button:has-text("Select All")')
  await page.waitForTimeout(200)
  const selectionBadge = await page.textContent('text=/\\d+ of \\d+ selected/')
  assert.match(selectionBadge, /11 of 11 selected/, 'All 11 students must be selected')
  console.log('PASS: Select All correctly selected 11 of 11 students')

  // 5. Test Quick Direction Selection (Promote / Demote)
  // Clicking "Next Class (Promote ↑)" should select Pre Nine
  await page.click('button:has-text("Next Class (Promote ↑)")')
  await page.waitForTimeout(200)
  const destClassVal = await page.$eval('select >> nth=2', el => el.value)
  assert.equal(destClassVal, 'Pre Nine', `Next class after Eight should be Pre Nine, got ${destClassVal}`)
  console.log('PASS: Quick Promote button selected Pre Nine')

  // Clicking "Prev Class (Demote ↓)" should select Seven
  await page.click('button:has-text("Prev Class (Demote ↓)")')
  await page.waitForTimeout(200)
  const demoteClassVal = await page.$eval('select >> nth=2', el => el.value)
  assert.equal(demoteClassVal, 'Seven', `Previous class before Eight should be Seven, got ${demoteClassVal}`)
  console.log('PASS: Quick Demote button selected Seven')

  // 6. Test Custom Destination Selection: Nine (Section Fatima)
  await page.selectOption('select >> nth=2', 'Nine')
  await page.waitForTimeout(200)
  const nineSections = await page.$$eval('select >> nth=3 >> option', opts => opts.map(o => o.value))
  assert.deepEqual(nineSections, ['Fatima', 'Usman'], 'Nine sections must match Academic Setup')
  await page.selectOption('select >> nth=3', 'Fatima')
  console.log('PASS: Destination Nine (Section Fatima) selected and validated')

  // 7. Preview Modal
  await page.click('button:has-text("Review & Preview Movement")')
  await page.waitForSelector('text=Review & Confirm Cohort Movement', { timeout: 3000 })
  console.log('PASS: Confirmation Preview Modal opened')

  const modalText = await page.textContent('div[style*="position: fixed"]')
  assert.match(modalText, /Source.*Eight/s, 'Modal must display Source: Eight')
  assert.match(modalText, /Destination.*Nine/s, 'Modal must display Destination: Nine')
  assert.match(modalText, /Fatima/, 'Modal must display Destination Section: Fatima')
  assert.match(modalText, /11 students/, 'Modal must display 11 students count')
  assert.match(modalText, /Preservation Guarantee/, 'Modal must display Preservation Guarantee')
  console.log('PASS: Preview Modal displays source, destination, count, and safety guarantee')

  // 8. Apply Movement
  await page.click('button:has-text("Apply Transition (11)")')
  await page.waitForTimeout(500)

  // Verify captured backend POST
  assert.equal(capturedPosts.length, 1, 'Exactly one POST request must be made')
  const postBody = capturedPosts[0]
  assert.equal(postBody.source_class, 'Eight')
  assert.equal(postBody.assignments.length, 11)
  assert.equal(postBody.assignments[0].class, 'Nine')
  assert.equal(postBody.assignments[0].section, 'Fatima')
  console.log('PASS: Atomic bulk assignment payload verified with source_class guard')

  // Verify Post-Success State
  await page.waitForSelector('text=Successfully moved 11 students', { timeout: 3000 })
  console.log('PASS: Success banner displayed')

  const verifiedBanner = await page.textContent('text=/Verified transition of/')
  assert.match(verifiedBanner, /11 students.*Nine.*Fatima/, 'Verified destination banner must be displayed')
  console.log('PASS: Verified destination banner displayed')

  // Capture screenshot as evidence
  await page.screenshot({ path: 'scripts/fixtures/promote-demote-browser-pass.png', fullPage: true })
  console.log('PASS: Screenshot captured at scripts/fixtures/promote-demote-browser-pass.png')

  console.log('\n================================================================================')
  console.log('ALL BROWSER END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY!')
  console.log('================================================================================')
} finally {
  if (browser) await browser.close()
  if (vite) {
    vite.kill('SIGTERM')
  }
}
