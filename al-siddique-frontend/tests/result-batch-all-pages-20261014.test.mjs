import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const url = process.env.RESULT_BATCH_QA_URL || 'http://127.0.0.1:5185/result-batch-pages-qa.html'
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
try {
  const context = await browser.newContext({ viewport:{width:1500,height:980}, acceptDownloads:false })
  // The real print-window renderer runs in a separate tab. Override the
  // OS dialog in this synthetic test only, never in the application.
  await context.addInitScript(() => { window.print = () => { document.documentElement.dataset.qaPrintRequested='true' } })
  const page = await context.newPage()
  page.on('dialog', dialog => dialog.accept())
  const exceptions=[]
  page.on('pageerror',e => exceptions.push(e.message))
  await page.goto(url,{waitUntil:'domcontentloaded'})
  await page.getByRole('heading',{name:'Professional Result Card Designer'}).waitFor({timeout:20000})
  const panel = page.locator('.result-batch-pages-panel')
  await panel.locator('[data-result-preview-page="45"]').waitFor({timeout:20000})
  assert.equal(await panel.locator('.result-batch-preview-page').count(),45)
  assert.equal(await panel.locator('.result-batch-preview-page .result-card-a4').count(),45)
  assert.equal(await panel.locator('.result-batch-preview-page').first().getAttribute('aria-label'),'Page 1 of 45: QA Student 01')
  assert.equal(await panel.locator('.result-batch-preview-page').last().getAttribute('aria-label'),'Page 45 of 45: QA Student 45')
  const zoom = await panel.locator('.result-batch-card-viewport').first().evaluate(e=>({height:e.clientHeight,parent:e.parentElement.clientHeight}))
  assert.ok(zoom.height>400,'scaled full A4 visible')
  await page.getByRole('combobox',{name:'Go to result card page'}).selectOption('44')
  assert.equal(await page.locator('#result-preview-page-select').inputValue(),'44')
  await page.getByRole('button',{name:'One Page'}).click()
  assert.equal(await panel.locator('.result-card-a4').count(),1)
  assert.match(await panel.locator('.result-batch-preview-page').getAttribute('aria-label'),/Page 45 of 45/)
  // Changing the shared template must update the focused card and all 45
  // printed cards without making the principal pick students again.
  await page.getByRole('button',{name:/Swiss Grid/}).click()
  await panel.locator('.result-card-a4.premium-swiss').waitFor({timeout:12000})
  // An individual-page preview must never change the complete print payload.
  const popupPromise = page.waitForEvent('popup',{timeout:25000})
  await page.getByRole('button',{name:'Print All 45 Cards'}).first().click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  const count = await popup.locator('.result-card-a4').count()
  assert.equal(count,45, 'Single Print All action must render all 45 A4 pages')
  assert.equal(await popup.locator('.result-card-a4.premium-swiss').count(),45,'template should apply to the entire batch')
  const firstStudent = await popup.locator('.result-card-a4').first().innerText()
  const lastStudent = await popup.locator('.result-card-a4').last().innerText()
  assert.match(firstStudent,/QA Student 01/)
  assert.match(lastStudent,/QA Student 45/)
  assert.ok((await popup.title()).includes('45 Students'))
  await popup.waitForTimeout(900)
  const printing = await popup.locator('html').getAttribute('data-qa-print-requested')
  const issue = await popup.locator('#result-print-status').innerText()
  assert.equal(printing,'true', 'Print job must invoke browser print automatically; blocked reason: ' + issue)
  await popup.close()
  await page.getByRole('button',{name:'All Pages'}).click()
  assert.equal(await panel.locator('.result-card-a4').count(),45)
  assert.equal(exceptions.length,0,exceptions.join('; '))
  console.log('PASS: 45 visible paginated previews, jump to page 45, focused mode, single Print All opens 45-page print window, return to All Pages')
} finally {
  await browser.close()
}
