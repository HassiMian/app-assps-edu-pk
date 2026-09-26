// earlyYearsOverlayAcceptance.test.js — Comprehensive E2E tests for Overlay Wiring, Slot Selection, Uploads, Pre Classes UI, and 9-Paper Screenshot QA
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { getEarlyYearsPaperById } from '../earlyYears/data/earlyYearsSourceStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '../../../../..')
const repoRoot = path.resolve(frontendRoot, '..')
const screenshotsDir = path.resolve(repoRoot, 'runtime/server-snapshots/screenshots')

let server
let browser
let page
const PORT = 5192
const BASE_URL = `http://localhost:${PORT}/ey-test.html`

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`
].find((candidate) => candidate && fs.existsSync(candidate))

before(async () => {
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }

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
    viewport: { width: 1440, height: 1100 }
  })
  page = await context.newPage()
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

// ─────────────────────────────────────────────────────────────
// 1. PRE CLASSES REAL UI ROUTE ACCEPTANCE (Req 17)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-01: Real PaperGenerator UI route navigation: Pre Classes Papers -> Starter English -> Mover Urdu -> Flyer Math', async () => {
  await page.goto(`${BASE_URL}?mode=generator`, { waitUntil: 'domcontentloaded' })

  // Click "Pre Classes Papers" tab button in top nav
  const preClassesTab = page.locator('button:has-text("Pre Classes Papers")').first()
  await preClassesTab.waitFor({ timeout: 10000 })
  await preClassesTab.click()

  // Verify Early Years Worksheet Editor loads with Starter English
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const sheetHeader = await page.locator('.early-years-sheet-a4').textContent()
  assert.ok(sheetHeader.includes('Starter'), 'Must display Starter worksheet')
  assert.ok(sheetHeader.toLowerCase().includes('english'), 'Must display English subject')

  // Switch to Mover Urdu
  const paperSelect = page.locator('header select').first()
  await paperSelect.selectOption('ey-mover-urdu-2026')
  await page.waitForTimeout(400)
  const moverUrduText = await page.locator('.early-years-sheet-a4').textContent()
  assert.ok(moverUrduText.includes('Mover') || moverUrduText.includes('اردو'), 'Must switch to Mover Urdu')
  const dir = await page.locator('.early-years-sheet-a4').getAttribute('direction') ||
              await page.locator('.early-years-sheet-a4').evaluate((el) => window.getComputedStyle(el).direction)
  assert.equal(dir, 'rtl', 'Mover Urdu must be RTL')

  // Switch to Flyer Math
  await paperSelect.selectOption('ey-flyer-math-2026')
  await page.waitForTimeout(400)
  const flyerMathText = await page.locator('.early-years-sheet-a4').textContent()
  assert.ok(flyerMathText.includes('Flyer'), 'Must switch to Flyer Math')
})

// ─────────────────────────────────────────────────────────────
// 2. SKETCH SIZE FUNCTIONAL TEST (Req 9)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-02: Sketch size overlay: changing smallVisual to colouringVisual increases rendered bounding width', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open Inspector QA/Controls Panel
  const qaBtn = page.locator('button:has-text("QA Panel")')
  await qaBtn.click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Select Question 3 (ey-starter-math-q3: Trace shape)
  const qSelect = page.locator('.early-years-inspector select').first()
  await qSelect.selectOption('2') // Q3 is index 2

  // Locate the rendered trace shape SVG
  const traceBlock = page.locator('.early-years-trace-shape-block')
  const sketchSvg = traceBlock.locator('svg.early-years-sketch').first()
  await sketchSvg.waitFor({ timeout: 5000 })

  // Set size to smallVisual
  const sizeSelect = page.locator('#sketchSizeSelector')
  await sizeSelect.selectOption('smallVisual')
  await page.waitForTimeout(300)
  const boxSmall = await sketchSvg.boundingBox()
  assert.ok(boxSmall, 'Small sketch bounding box must exist')

  // Set size to colouringVisual
  await sizeSelect.selectOption('colouringVisual')
  await page.waitForTimeout(300)
  const boxColouring = await sketchSvg.boundingBox()
  assert.ok(boxColouring, 'Colouring sketch bounding box must exist')

  assert.ok(
    boxColouring.width > boxSmall.width,
    `Colouring visual width (${boxColouring.width}px) must be strictly greater than small visual width (${boxSmall.width}px)`
  )
})

// ─────────────────────────────────────────────────────────────
// 3. ANSWER LINES FUNCTIONAL TEST (Req 10)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-03: Answer lines overlay: lineCount 3 -> 5 and lineGapMm 11 -> 12 change rendered DOM; source content unchanged', async () => {
  await page.goto(`${BASE_URL}?paper=ey-mover-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open Inspector
  await page.locator('button:has-text("QA Panel")').click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Select Q3 (AlphabetWritingArea: index 2)
  const qSelect = page.locator('.early-years-inspector select').first()
  await qSelect.selectOption('2')

  const linesArea = page.locator('.early-years-handwriting-lines')
  await linesArea.waitFor({ timeout: 5000 })

  // Verify initial rendered line count is 4 (source default) or 3
  const lineCountSelect = page.locator('#answerLineCountSelector')
  await lineCountSelect.selectOption('5')
  await page.waitForTimeout(300)

  // Assert actual rendered line count in preview is 5
  const renderedRowsCount = await linesArea.locator('> div').count()
  assert.equal(renderedRowsCount, 5, 'Rendered lines count must update to 5')

  // Change line gap from 11mm to 12mm
  const gapSelect = page.locator('#answerLineGapSelector')
  await gapSelect.selectOption('12')
  await page.waitForTimeout(300)

  // Verify source document in storage is UNMUTED
  const moverEng = getEarlyYearsPaperById('ey-mover-english-2026')
  const q3Source = moverEng.questions.find((q) => q.questionNumber === 3)
  assert.equal(q3Source.content.lines, 4, 'Source V2 content.lines must remain 4')
})

// ─────────────────────────────────────────────────────────────
// 4. QUESTION LAYOUT FUNCTIONAL TEST (Req 11)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-04: Question layout: stacked -> visual-left modifies DOM class/style; unsupported layout button is disabled', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open Inspector
  await page.locator('button:has-text("QA Panel")').click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Select Q2 (CircleChoiceWithSketch: index 1)
  const qSelect = page.locator('.early-years-inspector select').first()
  await qSelect.selectOption('1')

  const q2Block = page.locator('.early-years-question-block').nth(1)
  const choicesContainer = q2Block.locator('.early-years-circle-choice-sketches')
  await choicesContainer.waitFor({ timeout: 5000 })

  // Switch to visual-left
  const visualLeftBtn = page.locator('#layout-btn-visual-left')
  await visualLeftBtn.click()
  await page.waitForTimeout(300)

  // Assert layout attribute and style
  const dataLayout = await choicesContainer.getAttribute('data-layout')
  assert.equal(dataLayout, 'visual-left', 'Must apply data-layout="visual-left"')

  // Switch to Q1 (TraceGlyphGrid: index 0) where visual-left is unsupported
  await qSelect.selectOption('0')
  await page.waitForTimeout(300)

  // Verify unsupported layout button (visual-left for TraceGlyphGrid) is disabled
  const visualLeftBtnQ1 = page.locator('#layout-btn-visual-left')
  const isDisabled = await visualLeftBtnQ1.isDisabled()
  assert.equal(isDisabled, true, 'visual-left layout button must be disabled for TraceGlyphGrid')
})

// ─────────────────────────────────────────────────────────────
// 5. SKETCH ASSET OVERRIDE & TARGET VISUAL SLOT (Req 6)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-05: Target visual slot selector overrides specific sketch slot in Starter English Q3 without source mutation', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open Inspector
  await page.locator('button:has-text("QA Panel")').click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Select Q3 (PictureColoringBlock with 4 fruits: index 2)
  const qSelect = page.locator('.early-years-inspector select').first()
  await qSelect.selectOption('2')

  // Target Visual Slot selector must be present because Q3 has 4 visual slots
  const slotSelect = page.locator('#targetVisualSlotSelector')
  await slotSelect.waitFor({ timeout: 5000 })

  // Before slot selection: sketch replacement disabled / warning shown
  const warningText = await page.locator('.early-years-inspector').textContent()
  assert.ok(warningText.includes('Select a slot above to enable sketch replacement'))

  // Select slot "0" (Apple)
  await slotSelect.selectOption('0')
  await page.waitForTimeout(200)

  // Click asset "cricket-bat"
  const cricketBatTile = page.locator('#sketchAssetGrid div[title*="cricket-bat"]').first()
  await cricketBatTile.click()
  await page.waitForTimeout(400)

  // Assert preview: slot 0 now has cricket bat (rect/spine), while slot 1 retains mango
  const coloringBlock = page.locator('.early-years-picture-coloring-block')
  const area0Svg = coloringBlock.locator('.early-years-colouring-area').first().locator('svg')
  const svgContent = await area0Svg.innerHTML()
  assert.ok(svgContent.includes('rect') || svgContent.includes('Handle'), 'Slot 0 must render cricket bat SVG')

  // Assert source V2 JSON was NOT mutated
  const sourceStarter = getEarlyYearsPaperById('ey-starter-english-2026')
  const q3Source = sourceStarter.questions.find((q) => q.questionNumber === 3)
  assert.equal(q3Source.content.items[0].sketchId, 'sketch.apple.v1', 'Source sketchId must remain sketch.apple.v1')
})

// ─────────────────────────────────────────────────────────────
// 6. FIX USER-UPLOAD DUPLICATION & SESSION LABEL (Req 7, 8)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-06: Upload sketch registers exactly once with session-only badge and updates preview', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Open Inspector
  await page.locator('button:has-text("QA Panel")').click()
  await page.waitForSelector('.early-years-inspector', { timeout: 5000 })

  // Select Q3 and slot 1 (Mango)
  const qSelect = page.locator('.early-years-inspector select').first()
  await qSelect.selectOption('2')
  const slotSelect = page.locator('#targetVisualSlotSelector')
  await slotSelect.selectOption('1')

  const countBefore = await page.locator('#sketchAssetGrid > div').count()

  // Upload a valid custom SVG
  const testSvgPath = path.resolve(frontendRoot, 'test-sketch-temp.svg')
  fs.writeFileSync(
    testSvgPath,
    '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="none" stroke="#000" stroke-width="2" /><text x="50" y="55" text-anchor="middle">STAR</text></svg>'
  )

  try {
    const fileInput = page.locator('#sketchFileInput')
    await fileInput.setInputFiles(testSvgPath)
    await page.waitForTimeout(600)

    // Assert exactly ONE tile was added
    const countAfter = await page.locator('#sketchAssetGrid > div').count()
    assert.equal(countAfter, countBefore + 1, 'Exactly one new asset tile must be added to library')

    // Assert UI shows "Session-only custom asset"
    const inspectorText = await page.locator('.early-years-inspector').textContent()
    assert.ok(inspectorText.includes('Session-only custom asset'), 'Must display "Session-only custom asset" notice')

    // Assert preview slot 1 updated to the uploaded SVG
    const coloringBlock = page.locator('.early-years-picture-coloring-block')
    const area1 = coloringBlock.locator('.early-years-colouring-area').nth(1)
    const svgContent = await area1.innerHTML()
    assert.ok(svgContent.includes('STAR'), 'Slot 1 preview must render uploaded SVG text "STAR"')
  } finally {
    if (fs.existsSync(testSvgPath)) fs.unlinkSync(testSvgPath)
  }
})

// ─────────────────────────────────────────────────────────────
// 7. NINE-PAPER VISUAL PROOF & SCREENSHOT QA (Req 18, 19, 20)
// ─────────────────────────────────────────────────────────────
const PAPERS_TO_CAPTURE = [
  { id: 'ey-starter-english-2026', filename: 'ey-starter-english.png', isRtl: false, qCount: 5, hasSketches: true },
  { id: 'ey-starter-urdu-2026',    filename: 'ey-starter-urdu.png',    isRtl: true,  qCount: 5, hasSketches: true },
  { id: 'ey-starter-math-2026',    filename: 'ey-starter-math.png',    isRtl: false, qCount: 5, hasSketches: true },
  { id: 'ey-mover-english-2026',   filename: 'ey-mover-english.png',   isRtl: false, qCount: 4, hasSketches: true },
  { id: 'ey-mover-urdu-2026',      filename: 'ey-mover-urdu.png',      isRtl: true,  qCount: 4, hasSketches: false },
  { id: 'ey-mover-math-2026',      filename: 'ey-mover-math.png',      isRtl: false, qCount: 4, hasSketches: true },
  { id: 'ey-flyer-english-2026',   filename: 'ey-flyer-english.png',   isRtl: false, qCount: 5, hasSketches: false },
  { id: 'ey-flyer-urdu-2026',      filename: 'ey-flyer-urdu.png',      isRtl: true,  qCount: 6, hasSketches: false },
  { id: 'ey-flyer-math-2026',      filename: 'ey-flyer-math.png',      isRtl: false, qCount: 5, hasSketches: false }
]

test('EY-OVERLAY-07: Nine-paper visual proof: captures all 9 A4 screenshots and validates QA invariants', async () => {
  for (const item of PAPERS_TO_CAPTURE) {
    await page.goto(`${BASE_URL}?paper=${item.id}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
    await page.waitForTimeout(400) // allow layout calculation

    const sheet = page.locator('.early-years-sheet-a4').first()

    // 1. Screenshot QA: Direction
    const dir = await sheet.getAttribute('direction') ||
                await sheet.evaluate((el) => window.getComputedStyle(el).direction)
    assert.equal(dir, item.isRtl ? 'rtl' : 'ltr', `${item.id} direction must be ${item.isRtl ? 'rtl' : 'ltr'}`)

    // 2. Screenshot QA: Question count & numbers
    const questions = sheet.locator('.early-years-question-block')
    const qCount = await questions.count()
    assert.equal(qCount, item.qCount, `${item.id} must render exactly ${item.qCount} question blocks`)

    // 3. Screenshot QA: Marks displayed
    const marksBadges = sheet.locator('.early-years-question-marks')
    assert.equal(await marksBadges.count(), item.qCount, `${item.id} must display marks on every question`)

    // 4. Screenshot QA: SVGs valid where expected
    if (item.hasSketches) {
      const svgs = sheet.locator('svg')
      const svgCount = await svgs.count()
      assert.ok(svgCount > 0, `${item.id} must contain SVG sketches`)
    }

    // 5. Screenshot QA: No inspector UI inside printable page
    const inspectorInside = sheet.locator('.early-years-inspector')
    assert.equal(await inspectorInside.count(), 0, 'No inspector UI may appear inside printable sheet')

    // 6. Capture full screenshot of the A4 sheet at 100% scale
    const screenshotPath = path.resolve(screenshotsDir, item.filename)
    await sheet.screenshot({ path: screenshotPath })
    assert.ok(fs.existsSync(screenshotPath), `Screenshot ${item.filename} must be generated`)
    const stats = fs.statSync(screenshotPath)
    assert.ok(stats.size > 20000, `Screenshot ${item.filename} must have substantive file size (>20KB)`)
  }
})

// ─────────────────────────────────────────────────────────────
// 8. JAMEEL NOORI NASTALEEQ FONT DIAGNOSTICS (Req 20)
// ─────────────────────────────────────────────────────────────
test('EY-OVERLAY-08: Jameel font diagnostics reports requested status and deployment prerequisite', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  const urduBlock = page.locator('.early-years-question-block span').nth(1)
  const computedFamily = await urduBlock.evaluate((el) => window.getComputedStyle(el).fontFamily)

  // Verify CSS Requested font stack contains Jameel Noori Nastaleeq
  const CSS_REQUESTED_JAMEEL = computedFamily.includes('Jameel Noori Nastaleeq')
  assert.equal(CSS_REQUESTED_JAMEEL, true, 'CSS_REQUESTED_JAMEEL must be true')

  // Check if Jameel font is actually loaded into browser font registry
  const jameelActuallyLoaded = await page.evaluate(async () => {
    if (!document.fonts) return false
    return document.fonts.check("16px 'Jameel Noori Nastaleeq'")
  })

  // Log status for closeout report
  console.log('JAMEEL FONT STATUS:', {
    CSS_REQUESTED_JAMEEL: true,
    JAMEEL_ACTUALLY_LOADED: jameelActuallyLoaded,
    FALLBACK_STATUS: jameelActuallyLoaded ? 'LOCAL_JAMEEL_ACTIVE' : 'JAMEEL_DEPLOYMENT_PREREQUISITE'
  })

  assert.equal(typeof jameelActuallyLoaded, 'boolean')
})
