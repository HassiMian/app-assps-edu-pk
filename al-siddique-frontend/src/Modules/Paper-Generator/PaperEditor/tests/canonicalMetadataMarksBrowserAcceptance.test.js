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
const PORT = 5193
const PAPER_ID = 'doc__official-first-term-2026-class-6-science'
const BASE_URL = `http://localhost:${PORT}/b3-test.html?mode=${PAPER_ID}`

let server
let browser
let page

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => fs.existsSync(candidate))

before(async () => {
  server = await createServer({
    root: frontendRoot,
    server: { port: PORT, strictPort: true },
  })
  await server.listen()

  browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  page = await context.newPage()
  await page.route('**/api/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

async function replaceInline(locator, text) {
  await locator.click()
  await locator.press('Control+A')
  await locator.fill(text)
  await locator.press('Enter')
}

test('Phase 9 browser: header metadata and total marks edit independently', async () => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })

  const classField = page.locator('[data-canonical-inline-editor][aria-label="Class"]')
  const timeField = page.locator('[data-canonical-inline-editor][aria-label="Time Allowed"]')
  const totalField = page.locator('[data-canonical-inline-editor][aria-label="Total marks"]')

  assert.strictEqual(await classField.count(), 1)
  assert.strictEqual(await timeField.count(), 1)
  assert.strictEqual(await totalField.count(), 1)

  await replaceInline(classField, '6-A')
  await replaceInline(timeField, '2 Hours 30 Minutes')
  await replaceInline(totalField, '60')

  assert.strictEqual((await classField.textContent()).trim(), '6-A')
  assert.strictEqual((await timeField.textContent()).trim(), '2 Hours 30 Minutes')
  assert.strictEqual((await totalField.textContent()).trim(), '60')

  await page.getByRole('button', { name: '+ Add header field' }).click()
  const customLabel = page.locator('[data-canonical-inline-editor][aria-label="Custom field label"]').last()
  await replaceInline(customLabel, 'Term')
  assert.strictEqual((await customLabel.textContent()).trim(), 'Term')
})

test('Phase 9 browser: question number and marks are separate scoped controls', async () => {
  const questionNumber = page.locator('[data-canonical-inline-editor][aria-label="Question 1 number"]').first()
  const questionMarks = page.locator('[data-canonical-inline-editor][aria-label="Question 1 marks"]').first()

  assert.strictEqual(await questionNumber.count(), 1)
  assert.strictEqual(await questionMarks.count(), 1)

  const questionNode = questionNumber.locator('xpath=ancestor::*[@data-node-id][1]')
  const firstQuestionBefore = await questionNode.getAttribute('data-node-id')
  await replaceInline(questionNumber, '3A')
  await replaceInline(questionMarks, '12')

  assert.strictEqual((await questionNumber.textContent()).trim(), '3A')
  assert.strictEqual((await questionMarks.textContent()).trim(), '12')

  const firstQuestionAfter = await questionNode.getAttribute('data-node-id')
  assert.strictEqual(firstQuestionAfter, firstQuestionBefore)
})

test('Phase 9 browser: section marks edit does not mutate school identity', async () => {
  const schoolName = await page.locator('.canonical-school-header h1').textContent()
  const logoCount = await page.locator('.canonical-school-header img').count()

  const sectionMarks = page.locator('[data-canonical-inline-editor][aria-label^="Section "][aria-label$=" marks"]').first()
  assert.strictEqual(await sectionMarks.count(), 1)

  await replaceInline(sectionMarks, '25')
  assert.strictEqual((await sectionMarks.textContent()).trim(), '25')

  assert.strictEqual(await page.locator('.canonical-school-header h1').textContent(), schoolName)
  assert.strictEqual(await page.locator('.canonical-school-header img').count(), logoCount)
})


test('Phase 10 browser: section title and instruction edit independently', async () => {
  const titleField = page.locator('[data-canonical-inline-editor][aria-label="Section 1 title"]').first()
  const instructionField = page.locator('[data-canonical-inline-editor][aria-label="Section 1 instruction"]').first()

  assert.strictEqual(await titleField.count(), 1)
  assert.strictEqual(await instructionField.count(), 1)

  const beforeNodeIds = await page.locator('[data-node-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-node-id')))

  await replaceInline(titleField, 'Section A — Browser Edited')
  await replaceInline(instructionField, 'Attempt all questions carefully.')

  assert.strictEqual((await titleField.textContent()).trim(), 'Section A — Browser Edited')
  assert.strictEqual((await instructionField.textContent()).trim(), 'Attempt all questions carefully.')

  const afterNodeIds = await page.locator('[data-node-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-node-id')))
  assert.deepStrictEqual(afterNodeIds, beforeNodeIds)
})


test('Phase 11 browser: general instructions and active-question spacing stay scoped', async () => {
  const instructions = page.locator('[data-canonical-inline-editor][aria-label="General instructions"]')
  assert.strictEqual(await instructions.count(), 1)

  await instructions.click()
  await instructions.press('Control+A')
  await instructions.fill('Read every question carefully.')
  await instructions.evaluate(element => element.blur())
  assert.strictEqual((await instructions.textContent()).trim(), 'Read every question carefully.')

  const editable = page.locator('.canonical-editable-stem-content').first()
  assert.strictEqual(await editable.count(), 1)
  await editable.click()

  const paragraph = editable.locator('p').first()
  const originalText = await paragraph.textContent()

  await page.locator('select[aria-label="Line Height"]').selectOption('1.5')
  await page.locator('select[aria-label="Paragraph Spacing"]').selectOption('6pt')

  const lineHeight = await paragraph.evaluate(element => element.style.lineHeight)
  const marginBottom = await paragraph.evaluate(element => element.style.marginBottom)
  assert.strictEqual(lineHeight, '1.5')
  assert.strictEqual(marginBottom, '6pt')
  assert.strictEqual(await paragraph.textContent(), originalText)

  const fieldKey = await editable.getAttribute('data-field-key')
  assert.ok(fieldKey)
  await page.getByRole('button', { name: 'Done Editing' }).click()

  const staticParagraph = page.locator(`[data-field-key="${fieldKey}"] .canonical-static-text p`).first()
  assert.strictEqual(await staticParagraph.count(), 1)
  assert.strictEqual(await staticParagraph.evaluate(element => element.style.lineHeight), '1.5')
  assert.strictEqual(await staticParagraph.evaluate(element => element.style.marginBottom), '6pt')
  assert.strictEqual(await staticParagraph.textContent(), originalText)
})
