import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const PORT = Number(process.env.ASSPS_CANONICAL_A4_PDF_PORT || 5350)
let server
let browser
let page
const browserErrors = []

before(async () => {
  server = await createServer({root: frontendRoot, server: {port: PORT, strictPort: true}})
  await server.listen()
  browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
  const context = await browser.newContext({viewport:{width:1440,height:1100}})
  page = await context.newPage()
  await page.route('**/favicon.ico', route=>route.fulfill({status:204,body:''}))
  await page.route('**/api/**', route=>route.fulfill({
    status:200,contentType:'application/json',body:'{"success":true,"data":{}}'
  }))
  page.on('pageerror',error=>browserErrors.push(error.message))
})
after(async()=>{
  await browser?.close()
  await server?.close()
})
test('official Urdu and English canonical documents produce genuine A4 Chromium PDFs', {timeout:180000}, async()=>{
  const cases=[
    ['doc__official-first-term-2026-class-1-urdu','rtl','Jameel'],
    ['doc__official-first-term-2026-class-1-english','ltr','Times New Roman'],
  ]
  for (const [id,expectedDirection,expectedFont] of cases) {
    browserErrors.length=0
    await page.goto(`http://127.0.0.1:${PORT}/b3-test.html?mode=${encodeURIComponent(id)}`,{
      waitUntil:'domcontentloaded',timeout:45000,
    })
    await page.locator('[data-canonical-working-document]').waitFor({timeout:20000})
    const article=page.locator('[data-canonical-working-document]').first()
    const data=await article.evaluate(el=>({
      direction:getComputedStyle(el).direction,
      family:getComputedStyle(el).fontFamily,
      content:el.innerText,
      overflow:el.scrollWidth-el.clientWidth,
    }))
    assert.equal(data.direction,expectedDirection,id+': direction mismatch')
    assert.ok(data.family.includes(expectedFont),id+': expected font stack missing')
    assert.ok(data.content.length>200,id+': empty document')
    assert.ok(!data.content.includes('[object Object]'),id+': leaked JS object')
    assert.ok(data.overflow<=3,id+': horizontal overflow')
    await page.evaluate(()=>document.fonts.ready)
    await page.emulateMedia({media:'print'})
    const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-',id+': PDF signature')
    assert.ok(pdf.length>10000,id+': unexpectedly short PDF')
    const pdfSource=pdf.toString('latin1')
    const box=pdfSource.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
    assert.ok(box,id+': PDF page box missing')
    assert.ok(Math.abs(Number(box[1])-595)<5 && Math.abs(Number(box[2])-842)<5,
      id+': expected A4 print geometry')
    assert.deepEqual(browserErrors,[],id+': browser runtime exception')
    console.log('CANONICAL_A4_PDF_CHROMIUM_PASS',id,
      'direction='+data.direction,'bytes='+pdf.length,
      'mediaBox='+box[1]+'x'+box[2])
  }
})
