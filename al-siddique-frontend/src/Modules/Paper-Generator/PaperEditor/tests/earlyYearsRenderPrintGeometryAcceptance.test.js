// earlyYearsRenderPrintGeometryAcceptance.test.js
// Final Render-Fidelity, Print Media, and Geometry QA Gate for Early Years Worksheets
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '../../../../..')

let server
let browser
let page
const PORT = 5193
const BASE_URL = `http://localhost:${PORT}/ey-test.html`

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find((candidate) => fs.existsSync(candidate))

const ALL_9_PAPERS = [
  'ey-starter-english-2026',
  'ey-starter-urdu-2026',
  'ey-starter-math-2026',
  'ey-mover-english-2026',
  'ey-mover-urdu-2026',
  'ey-mover-math-2026',
  'ey-flyer-english-2026',
  'ey-flyer-urdu-2026',
  'ey-flyer-math-2026'
]

before(async () => {
  server = await createServer({
    root: frontendRoot,
    server: { port: PORT, strictPort: true }
  })
  await server.listen()

  browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 }
  })
  page = await context.newPage()
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

// ─────────────────────────────────────────────────────────────
// 1. CORPUS RENDER COMPLETENESS TEST (Section 11 & 12)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-01: Corpus Render Completeness: Non-empty bodies across all 9 papers', async () => {
  for (const paperId of ALL_9_PAPERS) {
    await page.goto(`${BASE_URL}?paper=${paperId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

    const questionBlocks = page.locator('.early-years-question-block')
    const count = await questionBlocks.count()
    assert.ok(count >= 3, `Paper ${paperId} must have at least 3 questions, found ${count}`)

    for (let i = 0; i < count; i++) {
      const qBlock = questionBlocks.nth(i)
      const qText = await qBlock.textContent()
      assert.ok(qText.trim().length > 0, `Paper ${paperId} question ${i + 1} must have non-empty text`)

      // Ensure question has rendered academic/response content (not empty body)
      const hasSvgs = (await qBlock.locator('svg').count()) > 0
      const hasCells = (await qBlock.locator('.num-cell, .missing-cell, .counting-cell, .after-sequence-blank, .after-sequence-row, .early-years-missing-letter-grid > div, .early-years-missing-urdu-letter-grid > div, .early-years-matching-columns, .early-years-lines, .handwriting-lane, .early-years-source-faithful-practice-layout').count()) > 0
      const hasSubstantiveText = qText.length > 25

      assert.ok(
        hasSvgs || hasCells || hasSubstantiveText,
        `Paper ${paperId} Q${i + 1} must render visible text, SVG, or response cells (no empty body)`
      )
    }
  }
})

test('EY-RENDER-02: Specific Ambiguous & Structured Question Non-Empty Invariants', async () => {
  // 1. Mover English Q1: rawSourceLayout practice block
  await page.goto(`${BASE_URL}?paper=ey-mover-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const mEngQ1 = page.locator('.early-years-question-block').nth(0)
  const practiceLayout = mEngQ1.locator('.early-years-source-faithful-practice-layout')
  await practiceLayout.waitFor({ timeout: 5000 })
  const q1Text = await practiceLayout.textContent()
  assert.ok(q1Text.includes('A   D'), 'Mover English Q1 must render teacher raw layout A   D')
  assert.ok(q1Text.includes('H   J'), 'Mover English Q1 must render H   J')

  // 2. Mover Urdu Q2: rawSourceLayout with Nastaleeq typography
  await page.goto(`${BASE_URL}?paper=ey-mover-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const mUrduQ2 = page.locator('.early-years-question-block').nth(1)
  const urduPractice = mUrduQ2.locator('.early-years-source-faithful-practice-layout')
  await urduPractice.waitFor({ timeout: 5000 })
  const urduText = await urduPractice.textContent()
  assert.ok(urduText.includes('ب   ا'), 'Mover Urdu Q2 must render raw teacher layout ب   ا')
  assert.ok(urduText.includes('ث   ت'), 'Mover Urdu Q2 must render ث   ت')
  assert.ok(urduText.includes('ر   ذ'), 'Mover Urdu Q2 must render ر   ذ')

  // 3. Mover Math Q1: exactly 5 rows × 4 cells
  await page.goto(`${BASE_URL}?paper=ey-mover-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const mMathQ1 = page.locator('.early-years-question-block').nth(0)
  const rowsContainer = mMathQ1.locator('.early-years-missing-number-rows')
  await rowsContainer.waitFor({ timeout: 5000 })
  const rows = rowsContainer.locator('.missing-number-row')
  assert.equal(await rows.count(), 5, 'Mover Math Q1 must render exactly 5 rows')
  const cells = rowsContainer.locator('.num-cell')
  assert.equal(await cells.count(), 20, 'Mover Math Q1 must render exactly 20 cells (5x4)')

  // 4. Flyer Math Q1: rawSourceSequence with visible teacher underscores
  await page.goto(`${BASE_URL}?paper=ey-flyer-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const fMathQ1 = page.locator('.early-years-question-block').nth(0)
  const rawSeqBlock = fMathQ1.locator('.early-years-source-faithful-practice-layout')
  await rawSeqBlock.waitFor({ timeout: 5000 })
  const rawSeqText = await rawSeqBlock.textContent()
  assert.ok(rawSeqText.includes('1 __3 _6 __ 9___11_ 13 _ 15__17 __20'), 'Flyer Math Q1 must preserve teacher underscores')

  // 5. Flyer Math Q5: after-sequence mode with 5 sequence rows
  const fMathQ5 = page.locator('.early-years-question-block').nth(4)
  const afterSeqGrid = fMathQ5.locator('.after-sequence-mode')
  await afterSeqGrid.waitFor({ timeout: 5000 })
  const seqRows = afterSeqGrid.locator('.after-sequence-row')
  assert.equal(await seqRows.count(), 5, 'Flyer Math Q5 must render 5 after-sequence rows')
})

// ─────────────────────────────────────────────────────────────
// 2. COUNTING ANSWER-LEAK TEST (Section 13)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-03: Counting Writing Grid Must NOT Leak Answers', async () => {
  // Mover Math Q3: Write Counting 1 to 30
  await page.goto(`${BASE_URL}?paper=ey-mover-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const mMathQ3 = page.locator('.early-years-question-block').nth(2)
  const mCells = mMathQ3.locator('.counting-cell')
  assert.equal(await mCells.count(), 30, 'Mover Math Q3 must have exactly 30 response cells')
  const mGuideNumbers = await mMathQ3.locator('.guide-number').count()
  assert.equal(mGuideNumbers, 0, 'Mover Math Q3 must have 0 visible guide numbers (no answer leak)')
  for (let i = 0; i < 30; i++) {
    const text = (await mCells.nth(i).textContent()).trim()
    assert.equal(text, '', `Cell ${i + 1} must be empty`)
  }

  // Flyer Math Q4: Write numbers counting 1 to 50
  await page.goto(`${BASE_URL}?paper=ey-flyer-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const fMathQ4 = page.locator('.early-years-question-block').nth(3)
  const fCells = fMathQ4.locator('.counting-cell')
  assert.equal(await fCells.count(), 50, 'Flyer Math Q4 must have exactly 50 response cells')
  const fGuideNumbers = await fMathQ4.locator('.guide-number').count()
  assert.equal(fGuideNumbers, 0, 'Flyer Math Q4 must have 0 visible guide numbers (no answer leak)')
  for (let i = 0; i < 50; i++) {
    const text = (await fCells.nth(i).textContent()).trim()
    assert.equal(text, '', `Cell ${i + 1} must be empty`)
  }
})

// ─────────────────────────────────────────────────────────────
// 3. SOURCE-FIDELITY RENDER TEST (Section 14)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-04: Source-Fidelity Render: Exact Rows, Targets, and Shared Word Bank', async () => {
  // Mover Math Q1 exact rows:
  // Row 0: 1 _ 3 _
  // Row 1: 5 6 _ 8
  // Row 2: _ 10 11 _
  // Row 3: 13 _ 15 _
  // Row 4: 17 _ 19 _
  await page.goto(`${BASE_URL}?paper=ey-mover-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const row0 = page.locator('.missing-number-row').nth(0)
  assert.equal((await row0.locator('.num-cell').nth(0).textContent()).trim(), '1')
  assert.equal((await row0.locator('.num-cell').nth(1).textContent()).trim(), '')
  assert.equal((await row0.locator('.num-cell').nth(2).textContent()).trim(), '3')
  assert.equal((await row0.locator('.num-cell').nth(3).textContent()).trim(), '')

  const row1 = page.locator('.missing-number-row').nth(1)
  assert.equal((await row1.locator('.num-cell').nth(0).textContent()).trim(), '5')
  assert.equal((await row1.locator('.num-cell').nth(1).textContent()).trim(), '6')
  assert.equal((await row1.locator('.num-cell').nth(2).textContent()).trim(), '')
  assert.equal((await row1.locator('.num-cell').nth(3).textContent()).trim(), '8')

  const row2 = page.locator('.missing-number-row').nth(2)
  assert.equal((await row2.locator('.num-cell').nth(0).textContent()).trim(), '')
  assert.equal((await row2.locator('.num-cell').nth(1).textContent()).trim(), '10')
  assert.equal((await row2.locator('.num-cell').nth(2).textContent()).trim(), '11')
  assert.equal((await row2.locator('.num-cell').nth(3).textContent()).trim(), '')

  // Flyer Math Q2 targets: 10, 14, 21, 8, 17, 25, 13
  await page.goto(`${BASE_URL}?paper=ey-flyer-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const fMathQ2 = page.locator('.early-years-question-block').nth(1)
  const q2Text = await fMathQ2.textContent()
  for (const target of ['10', '14', '21', '8', '17', '25', '13']) {
    assert.ok(q2Text.includes(target), `Flyer Math Q2 must contain before-target ${target}`)
  }

  // Flyer Math Q5 sequences: 13,14,15; 25,26,27; 29,30,31; 35,36,37; 47,48,49
  const fMathQ5 = page.locator('.early-years-question-block').nth(4)
  const q5Text = await fMathQ5.textContent()
  assert.ok(q5Text.includes('13, 14, 15,'), 'Must render sequence 13, 14, 15')
  assert.ok(q5Text.includes('25, 26, 27,'), 'Must render sequence 25, 26, 27')
  assert.ok(q5Text.includes('29, 30, 31,'), 'Must render sequence 29, 30, 31')
  assert.ok(q5Text.includes('35, 36, 37,'), 'Must render sequence 35, 36, 37')
  assert.ok(q5Text.includes('47, 48, 49,'), 'Must render sequence 47, 48, 49')

  // Mover English Q2 shared word bank: Fish, Dog, Cat, Monkey, Mouse, Bus (exactly once each)
  await page.goto(`${BASE_URL}?paper=ey-mover-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const wordBank = page.locator('.early-years-shared-word-bank')
  await wordBank.waitFor({ timeout: 5000 })
  const wordItems = wordBank.locator('.shared-word-item')
  assert.equal(await wordItems.count(), 6, 'Must render exactly 6 words in shared word bank')

  const words = []
  for (let i = 0; i < 6; i++) {
    words.push((await wordItems.nth(i).textContent()).trim())
  }
  const expectedWords = ['Fish', 'Dog', 'Cat', 'Monkey', 'Mouse', 'Bus']
  assert.deepEqual(words.sort(), expectedWords.sort(), 'Shared word bank must contain teacher words exactly once')
})

// ─────────────────────────────────────────────────────────────
// 4. OVERLAY REVISION & NO CONTAINER REMOUNT (Section 15)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-05: Single Overlay Revision Delta & No Full Container Remount', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open inspector
  const qaBtn = page.locator('button:has-text("QA Panel")')
  await qaBtn.click()
  const inspector = page.locator('.early-years-inspector')
  await inspector.waitFor({ timeout: 5000 })

  // Select Question 3 (index 2: Trace shape)
  const qSelect = inspector.locator('select').first()
  await qSelect.selectOption('2')

  // Mark DOM element identity on sheet container
  await page.evaluate(() => {
    const sheet = document.querySelector('.early-years-sheet-a4')
    if (sheet) sheet.setAttribute('data-preserved-instance', 'original-mount')
  })

  // Change sketch size to colouringVisual (trigger overlay change)
  const sizeSelect = inspector.locator('#sketchSizeSelector')
  await sizeSelect.waitFor({ timeout: 5000 })
  await sizeSelect.selectOption('colouringVisual')
  await page.waitForTimeout(400)

  // Verify the sheet was NOT remounted (the DOM node preserved attribute survives)
  const isOriginal = await page.evaluate(() => {
    const sheet = document.querySelector('.early-years-sheet-a4')
    return sheet?.getAttribute('data-preserved-instance') === 'original-mount'
  })
  assert.equal(isOriginal, true, 'Sheet container must NOT remount on presentation overlay change')
})


// ─────────────────────────────────────────────────────────────
// 5. PRINT ACCEPTANCE & ARTIFACT GENERATION (Section 16 & 17)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-06: Print Media Styling & A4 PDF Generation Outside Git', async () => {
  // Test Starter Urdu
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open inspector to prove no-print hides it
  const qaBtn = page.locator('button:has-text("QA Panel")')
  await qaBtn.click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Emulate print media
  await page.emulateMedia({ media: 'print' })

  // Assert .no-print elements are hidden
  const inspectorDisplay = await page.locator('.early-years-inspector').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(inspectorDisplay, 'none', 'Inspector must be hidden in print media')

  const headerDisplay = await page.locator('header.no-print').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(headerDisplay, 'none', 'Top header must be hidden in print media')

  // Assert sheet styling for print
  const sheetStyles = await page.locator('.early-years-sheet-a4').evaluate((el) => {
    const cs = window.getComputedStyle(el)
    return {
      transform: cs.transform,
      boxShadow: cs.boxShadow,
      backgroundColor: cs.backgroundColor
    }
  })
  assert.equal(sheetStyles.transform, 'none', 'Sheet transform must be none in print')
  assert.equal(sheetStyles.boxShadow, 'none', 'Sheet box-shadow must be none in print')
  assert.ok(
    sheetStyles.backgroundColor.includes('255, 255, 255') || sheetStyles.backgroundColor === 'white',
    'Sheet background must be white in print'
  )

  // Assert question blocks have page-break-inside avoid
  const qBlockBreak = await page.locator('.early-years-question-block').first().evaluate((el) => {
    const cs = window.getComputedStyle(el)
    return cs.breakInside || cs.pageBreakInside
  })
  assert.equal(qBlockBreak, 'avoid', 'Question block must have break-inside: avoid')

  // Generate Starter Urdu A4 PDF OUTSIDE Git (in OS tmpdir)
  const tmpDir = os.tmpdir()
  const starterUrduPdfPath = path.join(tmpDir, 'Starter_Urdu_A4_Print.pdf')
  await page.pdf({
    path: starterUrduPdfPath,
    format: 'A4',
    printBackground: true
  })
  assert.ok(fs.existsSync(starterUrduPdfPath), 'Starter Urdu PDF artifact must exist')
  assert.ok(fs.statSync(starterUrduPdfPath).size > 1000, 'Starter Urdu PDF artifact must be substantive')

  // Test Flyer Math
  await page.emulateMedia({ media: 'screen' })
  await page.goto(`${BASE_URL}?paper=ey-flyer-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  await page.emulateMedia({ media: 'print' })

  const flyerMathPdfPath = path.join(tmpDir, 'Flyer_Math_A4_Print.pdf')
  await page.pdf({
    path: flyerMathPdfPath,
    format: 'A4',
    printBackground: true
  })
  assert.ok(fs.existsSync(flyerMathPdfPath), 'Flyer Math PDF artifact must exist')
  assert.ok(fs.statSync(flyerMathPdfPath).size > 1000, 'Flyer Math PDF artifact must be substantive')

  // Reset to screen media
  await page.emulateMedia({ media: 'screen' })
})

// ─────────────────────────────────────────────────────────────
// 6. REAL GEOMETRY QA: 9-PAPER CLIPPING & OVERLAP CHECK (Section 18 & 19)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-07: Real Geometry QA: 0 clipping and 0 overlap across all 9 papers', async () => {
  const TOLERANCE_PX = 8
  const geometryViolations = []

  for (const paperId of ALL_9_PAPERS) {
    await page.goto(`${BASE_URL}?paper=${paperId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

    const sheetBox = await page.locator('.early-years-sheet-a4').boundingBox()
    assert.ok(sheetBox, `Must get bounding box for sheet in ${paperId}`)

    const qBlocks = page.locator('.early-years-question-block')
    const qCount = await qBlocks.count()
    let prevBottom = -Infinity

    for (let i = 0; i < qCount; i++) {
      const q = qBlocks.nth(i)
      const qBox = await q.boundingBox()
      if (!qBox) continue

      // 1. Horizontal bounds: left >= sheet.left - tolerance, right <= sheet.right + tolerance
      if (qBox.x < sheetBox.x - TOLERANCE_PX) {
        geometryViolations.push(`${paperId} Q${i + 1}: Left boundary clip (x=${qBox.x} < sheetX=${sheetBox.x})`)
      }
      if (qBox.x + qBox.width > sheetBox.x + sheetBox.width + TOLERANCE_PX) {
        geometryViolations.push(`${paperId} Q${i + 1}: Right boundary overflow (right=${qBox.x + qBox.width} > sheetRight=${sheetBox.x + sheetBox.width})`)
      }

      // 2. Sequential vertical non-overlap: next.top >= previous.bottom - 1px
      if (prevBottom !== -Infinity && qBox.y < prevBottom - 1) {
        geometryViolations.push(`${paperId} Q${i + 1}: Vertical overlap with previous question (top=${qBox.y} < prevBottom=${prevBottom})`)
      }
      prevBottom = qBox.y + qBox.height

      // 3. Visible Sketch SVG checks inside owning block
      const svgs = q.locator('svg.early-years-sketch')
      const svgCount = await svgs.count()
      for (let s = 0; s < svgCount; s++) {
        const svgBox = await svgs.nth(s).boundingBox()
        if (svgBox) {
          if (svgBox.width <= 0 || svgBox.height <= 0) {
            geometryViolations.push(`${paperId} Q${i + 1} SVG ${s + 1}: Non-positive dimension (${svgBox.width}x${svgBox.height})`)
          }
          if (svgBox.x < qBox.x - TOLERANCE_PX || svgBox.x + svgBox.width > qBox.x + qBox.width + TOLERANCE_PX) {
            geometryViolations.push(`${paperId} Q${i + 1} SVG ${s + 1}: SVG horizontal overflow`)
          }
        }
      }
    }
  }

  if (geometryViolations.length > 0) {
    console.error('Geometry Violations Found:\n' + geometryViolations.join('\n'))
  }
  assert.equal(geometryViolations.length, 0, `Geometry violations must be 0, found: ${geometryViolations.join('; ')}`)
})

// ─────────────────────────────────────────────────────────────
// 7. REAL PRODUCT ROUTE PRINT TEST (Sections 4, 5, 6, 7)
// ─────────────────────────────────────────────────────────────

test('EY-RENDER-08: Real PaperGenerator Route Print: Chrome Hidden, PDFs Generated, Screen Clean', async () => {
  // 1. Open real PaperGenerator route
  await page.goto(`${BASE_URL}?mode=generator`, { waitUntil: 'domcontentloaded' })

  // 2. Click "Pre Classes Papers" tab in PaperGenerator
  const preClassesTab = page.locator('button:has-text("Pre Classes Papers")').first()
  await preClassesTab.waitFor({ timeout: 10000 })
  await preClassesTab.click()

  // 3. Wait for Early Years sheet
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // 4. Open QA Inspector
  const qaBtn = page.locator('button:has-text("QA Panel")')
  if (await qaBtn.count() > 0) {
    await qaBtn.click()
    await page.waitForSelector('.early-years-inspector', { timeout: 5000 })
  }

  // 5. Emulate Print Media
  await page.emulateMedia({ media: 'print' })

  // A. Paper Generator module navigation strip: display === none
  const navDisplay = await page.locator('.paper-generator-module-tabs').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(navDisplay, 'none', 'Paper Generator module navigation strip must have display: none in print')

  // B. Early Years editor top header: display === none
  const headerDisplay = await page.locator('header.no-print').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(headerDisplay, 'none', 'Early Years editor top header must have display: none in print')

  // C. Inspector: display === none
  const inspectorDisplay = await page.locator('.early-years-inspector').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(inspectorDisplay, 'none', 'Inspector must have display: none in print')

  // D. Urdu font diagnostic notice: display === none (if present)
  const fontNoticeLocator = page.locator('.early-years-paper-viewport > .no-print')
  if (await fontNoticeLocator.count() > 0) {
    const noticeDisplay = await fontNoticeLocator.evaluate((el) => window.getComputedStyle(el).display)
    assert.equal(noticeDisplay, 'none', 'Urdu font diagnostic notice must have display: none in print')
  }

  // E. .early-years-sheet-a4: displayed
  const sheetDisplay = await page.locator('.early-years-sheet-a4').evaluate((el) => window.getComputedStyle(el).display)
  assert.notEqual(sheetDisplay, 'none', 'Sheet must be displayed in print')

  // F. sheet transform: none
  const transform = await page.locator('.early-years-sheet-a4').evaluate((el) => window.getComputedStyle(el).transform)
  assert.equal(transform, 'none', 'Sheet transform must be none in print')

  // G. sheet boxShadow: none
  const boxShadow = await page.locator('.early-years-sheet-a4').evaluate((el) => window.getComputedStyle(el).boxShadow)
  assert.equal(boxShadow, 'none', 'Sheet boxShadow must be none in print')

  // H. sheet width corresponds to A4 print styling (210mm)
  const sheetWidth = await page.locator('.early-years-sheet-a4').evaluate((el) => window.getComputedStyle(el).width)
  assert.ok(
    sheetWidth.includes('793') || sheetWidth.includes('794') || sheetWidth.includes('210mm'),
    `Sheet width (${sheetWidth}) must correspond to A4 width 210mm`
  )

  // 6. Product-chrome visibility test: No visible text from module navigation outside worksheet
  const chromeTexts = ['Build Paper', 'Word Editor', 'Pre Classes Papers', 'Saved Papers', 'Question Bank']
  for (const text of chromeTexts) {
    const locators = await page.locator(`button:has-text("${text}"), span:has-text("${text}")`).all()
    for (const loc of locators) {
      const isVisibleInPrint = await loc.evaluate((node) => {
        let curr = node
        while (curr) {
          if (window.getComputedStyle(curr).display === 'none') return false
          curr = curr.parentElement
        }
        return typeof node.checkVisibility === 'function' ? node.checkVisibility() : true
      })
      assert.equal(isVisibleInPrint, false, `Text "${text}" must not be visible in print chrome`)
    }
  }


  // 7. Real Product PDF Generation outside Git in OS temp directory
  const tmpDir = os.tmpdir()
  const starterEnglishRealPdf = path.join(tmpDir, 'Starter_English_RealProduct_A4.pdf')
  await page.pdf({
    path: starterEnglishRealPdf,
    format: 'A4',
    printBackground: true
  })
  assert.ok(fs.existsSync(starterEnglishRealPdf), 'Starter English real route PDF must exist')
  assert.ok(fs.statSync(starterEnglishRealPdf).size > 1000, 'Starter English real route PDF must have substantive size')

  // Switch to Starter Urdu and generate second real product PDF
  await page.emulateMedia({ media: 'screen' })
  const paperSelect = page.locator('header select').first()
  await paperSelect.selectOption('ey-starter-urdu-2026')
  await page.waitForTimeout(400)
  await page.emulateMedia({ media: 'print' })

  const starterUrduRealPdf = path.join(tmpDir, 'Starter_Urdu_RealProduct_A4.pdf')
  await page.pdf({
    path: starterUrduRealPdf,
    format: 'A4',
    printBackground: true
  })
  assert.ok(fs.existsSync(starterUrduRealPdf), 'Starter Urdu real route PDF must exist')
  assert.ok(fs.statSync(starterUrduRealPdf).size > 1000, 'Starter Urdu real route PDF must have substantive size')

  // 8. Screen Regression: Switch back to screen media
  await page.emulateMedia({ media: 'screen' })

  // Assert module tabs are visible again and functional
  const screenNavDisplay = await page.locator('.paper-generator-module-tabs').evaluate((el) => window.getComputedStyle(el).display)
  assert.equal(screenNavDisplay, 'flex', 'Module navigation tabs must be visible on screen')

  const preClassesBtn = page.locator('button:has-text("Pre Classes Papers")').first()
  assert.ok(await preClassesBtn.isVisible(), 'Pre Classes Papers tab button must be visible on screen')

  const questionBankBtn = page.locator('button:has-text("Question Bank")').first()
  assert.ok(await questionBankBtn.isVisible(), 'Question Bank tab button must be visible on screen')

  const savedPapersBtn = page.locator('button:has-text("Saved Papers")').first()
  assert.ok(await savedPapersBtn.isVisible(), 'Saved Papers tab button must be visible on screen')
})


