import process from 'node:process'
// earlyYearsBrowserAcceptance.test.js — Browser E2E Acceptance Test Suite for Early Years Worksheets
import { test, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
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
const PORT = 5191
const BASE_URL = `http://localhost:${PORT}/ey-test.html`

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find((candidate) => fs.existsSync(candidate))

before(async () => {
  // 1. Start Vite dev server on PORT 5191
  server = await createServer({
    root: frontendRoot,
    server: { port: PORT, strictPort: true }
  })
  await server.listen()

  // 2. Launch Chromium browser
  browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  })
  page = await context.newPage()
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

test('EY-BROWSER-PREMIUM: premium child templates and Paper Workspace classics change the real A4 presentation', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('assps-early-years-template-map-v1', JSON.stringify({
    'ey-starter-english-2026': 'little-scholars-navy'
  })))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  const selector = page.getByLabel('Early Years template')
  const sheet = page.locator('.early-years-sheet-a4')
  const premiumHeader = page.locator('[data-early-years-premium-header]')
  assert.equal(await selector.inputValue(), 'scholar-spark')
  const migratedTemplateMap = await page.evaluate(() => JSON.parse(localStorage.getItem('assps-early-years-template-map-v1') || '{}'))
  assert.equal(migratedTemplateMap['ey-starter-english-2026'], 'scholar-spark', 'Legacy template ids must migrate automatically')
  assert.equal(await sheet.getAttribute('data-template-id'), 'scholar-spark')
  assert.equal(await sheet.getAttribute('data-premium-early-years'), 'true')
  assert.equal(await premiumHeader.getAttribute('data-early-years-premium-header'), 'true')
  assert.equal(await page.locator('[data-early-years-template-swatches] button').count(), 8)

  const firstQuestion = page.locator('.early-years-question-block').first()
  assert.equal(await firstQuestion.getAttribute('data-premium-question'), 'true')
  assert.notEqual(await firstQuestion.evaluate(el => getComputedStyle(el).borderStyle), 'none')

  const starterBackground = await sheet.evaluate(el => getComputedStyle(el).backgroundImage)
  assert.match(starterBackground, /radial-gradient|linear-gradient/)

  await page.getByRole('button', { name: 'Use Coral Creative template' }).click()
  await page.waitForTimeout(100)
  assert.equal(await selector.inputValue(), 'coral-creative')
  assert.equal(await sheet.getAttribute('data-template-id'), 'coral-creative')
  const coralAccent = await firstQuestion.evaluate(el => getComputedStyle(el).boxShadow)
  assert.notEqual(coralAccent, 'none')

  await selector.selectOption('workspace-academic')
  await page.waitForTimeout(100)
  assert.equal(await sheet.getAttribute('data-template-id'), 'workspace-academic')
  assert.equal(await sheet.getAttribute('data-premium-early-years'), 'false')

  const options = await selector.locator('option').allTextContents()
  assert.ok(options.includes('Scholar Spark'))
  assert.ok(options.includes('Workspace · Academic Navy'))
  assert.ok(options.includes('Ferozi Learning Lab'))
  assert.ok(options.includes('Pencil & Paper'))
})

test('EY-BROWSER-SKETCH-V2: every sketch used by the 9 Early Years papers resolves to professional-v2 line art', async () => {
  const usedSketchIds = [
    'sketch.apple.v1','sketch.banana.v1','sketch.butterfly.v1','sketch.caterpillar.v1',
    'sketch.chicken.v1','sketch.cricket-bat.v1','sketch.doll.v1','sketch.fish.v1',
    'sketch.flower.v1','sketch.grapes.v1','sketch.hand-fan.v1','sketch.kite.v1',
    'sketch.lion.v1','sketch.mango.v1','sketch.mouse.v1','sketch.pencil.v1','sketch.tomato.v1'
  ]
  const result = await page.evaluate(async (ids) => {
    const module = await import('/src/Modules/Paper-Generator/PaperEditor/earlyYears/assets/SketchAssetRegistry.js')
    return ids.map((id) => {
      const asset = module.getSketchAsset(id)
      return {
        id,
        qualityVersion: asset?.qualityVersion || '',
        source: asset?.source || '',
        printSafe: asset?.printSafe === true,
        svgContent: asset?.svgContent || '',
      }
    })
  }, usedSketchIds)

  assert.equal(result.length, 17)
  for (const asset of result) {
    assert.equal(asset.qualityVersion, 'professional-v2', `${asset.id} must use professional-v2 geometry`)
    assert.equal(asset.source, 'BUILTIN')
    assert.equal(asset.printSafe, true)
    assert.match(asset.svgContent, /stroke-linecap="round"/)
    assert.match(asset.svgContent, /stroke-linejoin="round"/)
    assert.ok(asset.svgContent.length > 300, `${asset.id} line art must contain real geometry`)
  }
})

test('EY-BROWSER-01: Starter English Q3 renders colouring sketches (Apple, Mango, Grapes, Banana)', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Verify Q3 Coloring Block
  const coloringBlock = page.locator('.early-years-picture-coloring-block')
  await coloringBlock.waitFor({ timeout: 5000 })
  const areas = coloringBlock.locator('.early-years-colouring-area')
  assert.equal(await areas.count(), 4, 'Must render 4 coloring areas')

  // Verify sketches are present as SVGs
  const svgCount = await coloringBlock.locator('svg.early-years-sketch').count()
  assert.equal(svgCount, 4, 'Must render 4 SVG sketches')

  // Verify labels
  const text = await coloringBlock.textContent()
  assert.ok(text.includes('Apple'))
  assert.ok(text.includes('Mango'))
  assert.ok(text.includes('Grapes'))
  assert.ok(text.includes('Banana'))
})

test('EY-BROWSER-02: Starter English Q4 renders visual matching (Lion, Flower, Doll, Kite, Apple)', async () => {
  const matchingContainer = page.locator('.early-years-matching-columns').nth(1) // Q4 matching
  await matchingContainer.waitFor({ timeout: 5000 })

  const matchingText = await matchingContainer.textContent()
  assert.ok(matchingText.includes('Apple'))
  assert.ok(matchingText.includes('Doll'))
  assert.ok(matchingText.includes('Kite'))
  assert.ok(matchingText.includes('Flower'))
  assert.ok(matchingText.includes('Lion'))

  // Verify right-side sketch assets are rendered
  const sketchSVGs = await matchingContainer.locator('svg.early-years-sketch').count()
  assert.equal(sketchSVGs, 5, 'Must render 5 matching sketch SVGs')
})

test('EY-BROWSER-03: Starter English Q5 renders circle choice rows for A, B, C, D', async () => {
  const choiceRows = page.locator('.early-years-choice-letter-rows')
  await choiceRows.waitFor({ timeout: 5000 })

  const rowsText = await choiceRows.textContent()
  assert.ok(rowsText.includes('A'))
  assert.ok(rowsText.includes('B'))
  assert.ok(rowsText.includes('C'))
  assert.ok(rowsText.includes('D'))
})

test('EY-BROWSER-04: Starter Urdu Q2 pictures (Chicken, Hand fan, Tomato) and Q5 matching', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Verify RTL direction
  const sheet = page.locator('.early-years-sheet-a4')
  const dir = await sheet.getAttribute('direction') || await sheet.evaluate((el) => window.getComputedStyle(el).direction)
  assert.equal(dir, 'rtl', 'Urdu sheet must be RTL')

  // Q2 Circle Choice with Sketches
  const sketchChoices = page.locator('.early-years-circle-choice-sketches')
  await sketchChoices.waitFor({ timeout: 5000 })
  const choiceItems = sketchChoices.locator('.early-years-sketch')
  assert.equal(await choiceItems.count(), 3, 'Must render 3 sketch items (chicken, fan, tomato)')

  // Q4 Colouring (Pencil, Mango, Grapes)
  const coloring = page.locator('.early-years-picture-coloring-block')
  const coloringText = await coloring.textContent()
  assert.ok(coloringText.includes('پنسل'))
  assert.ok(coloringText.includes('آم'))
  assert.ok(coloringText.includes('انگور'))

  // Q5 Matching
  const matching = page.locator('.early-years-matching-columns')
  const matchText = await matching.textContent()
  assert.ok(matchText.includes('تتلی'))
  assert.ok(matchText.includes('انگور'))
  assert.ok(matchText.includes('بلا'))
})

test('EY-BROWSER-05: Starter Math Q1 caterpillar number trace & Q2 apple counting matching', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Q1 Caterpillar
  const caterpillar = page.locator('.early-years-caterpillar-trace')
  await caterpillar.waitFor({ timeout: 5000 })
  const catText = await caterpillar.textContent()
  for (let i = 1; i <= 10; i++) {
    assert.ok(catText.includes(String(i)), `Caterpillar must include number ${i}`)
  }

  // Q2 Apple counting matching
  const matching = page.locator('.early-years-matching-columns').first()
  await matching.waitFor({ timeout: 5000 })
  const appleSVGs = await matching.locator('svg.early-years-sketch').count()
  // Total apples: 4 + 3 + 5 + 2 + 1 = 15 apples
  assert.equal(appleSVGs, 15, 'Must render 15 individual apple line-art sketches')

  // Q3 Dotted square trace block
  const squareBlock = page.locator('.early-years-trace-shape-block')
  await squareBlock.waitFor({ timeout: 5000 })
  const squareSvg = squareBlock.locator('svg.early-years-sketch')
  assert.equal(await squareSvg.count(), 1, 'Must render dotted square shape')
})

test('EY-BROWSER-06: Mover English fish/mouse choices and Mover Math pattern copy', async () => {
  // Mover English
  await page.goto(`${BASE_URL}?paper=ey-mover-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const fishMouse = page.locator('.early-years-circle-choice-with-sketch-container')
  await fishMouse.waitFor({ timeout: 5000 })
  const text = await fishMouse.textContent()

  assert.ok(text.includes('Fish'))
  assert.ok(text.includes('Mouse'))
  assert.ok(text.includes('Cat'))
  assert.ok(text.includes('Dog'))

  // Mover Math
  await page.goto(`${BASE_URL}?paper=ey-mover-math-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })
  const patternBlock = page.locator('.early-years-pattern-copy-block')
  await patternBlock.waitFor({ timeout: 5000 })
  const patternSvgs = await patternBlock.locator('svg.early-years-sketch').count()
  assert.equal(patternSvgs, 3, 'Must render triangle, arrow, and circle shape SVGs')
})

test('EY-BROWSER-07: Flyer Urdu Q1 join letters exercise and Q3 missing letters grid', async () => {
  await page.goto(`${BASE_URL}?paper=ey-flyer-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Q1 Join letters
  const joinExercise = page.locator('.early-years-urdu-join-letters')
  await joinExercise.waitFor({ timeout: 5000 })
  const joinText = await joinExercise.textContent()
  assert.ok(joinText.includes('ا + ن + ا + ر'))
  assert.ok(joinText.includes('ک + ت + ا + ب'))

  // Q3 Missing letters grid
  const missingUrdu = page.locator('.early-years-missing-urdu-letter-grid')
  await missingUrdu.waitFor({ timeout: 5000 })
  const muText = await missingUrdu.textContent()
  assert.ok(muText.includes('ا'))
  assert.ok(muText.includes('ب'))
  assert.ok(muText.includes('ت'))
})

test('EY-BROWSER-08: Flyer English preserves duplicate spelling candidate ball/ball/bill', async () => {
  await page.goto(`${BASE_URL}?paper=ey-flyer-english-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  const choiceRows = page.locator('.early-years-choice-letter-rows')
  await choiceRows.waitFor({ timeout: 5000 })
  const ballRow = choiceRows.locator('> div').filter({ hasText: 'ball' }).first()
  const ballRowText = await ballRow.textContent()
  assert.ok(ballRowText.includes('ball'))
  assert.ok(ballRowText.includes('bill'))

  // Count occurrences of ball
  const ballCount = (ballRowText.match(/ball/g) || []).length
  assert.equal(ballCount, 2, 'Duplicate option "ball" must remain preserved in source view')
})

test('EY-BROWSER-09: Font Acceptance: Computed font family and fallback notice verified', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Check computed font-family on Urdu question heading
  const urduHeading = page.locator('.early-years-question-block span').nth(1)
  const computedFamily = await urduHeading.evaluate((el) => window.getComputedStyle(el).fontFamily)
  assert.ok(
    computedFamily.includes('Jameel Noori Nastaleeq') || computedFamily.includes('Noto Nastaliq Urdu') || computedFamily.includes('serif'),
    `Computed font family (${computedFamily}) must include configured Urdu font stack`
  )

  // Non-printable notice bar exists when Jameel is not installed locally
  const notice = page.locator('.early-years-font-notice')
  const count = await notice.count()
  if (count > 0) {
    const noticeText = await notice.textContent()
    assert.ok(noticeText.includes('Jameel Noori Nastaleeq'))
    assert.ok(noticeText.includes('Noto Nastaliq Urdu'))
  }
})

test('EY-BROWSER-10: Source QA inspector opens and displays conflict details', async () => {
  await page.goto(`${BASE_URL}?paper=ey-starter-urdu-2026`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.early-years-sheet-a4', { timeout: 10000 })

  // Click QA Panel button
  const qaBtn = page.locator('button:has-text("QA Panel")')
  await qaBtn.click()

  // Verify inspector sidebar appears
  const inspector = page.locator('.early-years-inspector')
  await inspector.waitFor({ timeout: 5000 })

  // Switch to Source QA tab
  const qaTab = inspector.locator('button:has-text("Source QA")')
  await qaTab.click()

  // Verify Marks Audit shows 50 vs 80 conflict
  const inspectorText = await inspector.textContent()
  assert.ok(inspectorText.includes('50'), 'Must show header total 50')
  assert.ok(inspectorText.includes('80'), 'Must show question total 80')
  assert.ok(inspectorText.includes('SOURCE_TOTAL_CONFLICT'), 'Must show SOURCE_TOTAL_CONFLICT badge')
})
