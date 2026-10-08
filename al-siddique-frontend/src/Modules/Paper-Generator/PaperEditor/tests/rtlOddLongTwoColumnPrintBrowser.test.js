import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5422
const geometry=()=>{
 const box=document.querySelector('[data-short-two-column]')
 if(!box)return null
 const columns=[...box.children]
 const paper=document.getElementById('paper-canvas')
 const base=box.getBoundingClientRect()
 return {
  columns:columns.length,items:box.querySelectorAll('[data-numbered-response-row]').length,
  numbers:columns.map(col=>[...col.querySelectorAll('[data-item-serial]')].map(node=>node.textContent.trim())),
  direction:getComputedStyle(box).direction,
  paperWidth:paper.getBoundingClientRect().width,
  boxWidth:base.width,scrollWidth:box.scrollWidth,clientWidth:box.clientWidth,
  maxRight:Math.max(...[...box.querySelectorAll('[data-numbered-response-row]')].map(row=>row.getBoundingClientRect().right)),
  minLeft:Math.min(...[...box.querySelectorAll('[data-numbered-response-row]')].map(row=>row.getBoundingClientRect().left)),
  boxLeft:base.left,boxRight:base.right,
  layout:getComputedStyle(box).gridTemplateColumns,
  isLong:columns[0]?.scrollHeight>600,
 }
}
test('real Chromium long RTL odd two-column preview and cloned print geometry',{timeout:90000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 const page=await browser.newPage({viewport:{width:1500,height:1100}})
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 page.on('dialog',d=>d.accept().catch(()=>{}))
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?rtlOddOverflow`,{waitUntil:'domcontentloaded'})
 await page.locator('[data-short-two-column]').waitFor({timeout:18000})
 const pre=await page.evaluate(geometry)
 assert.equal(pre.columns,2)
 assert.equal(pre.items,25)
 assert.equal(pre.direction,'rtl')
 assert.equal(pre.numbers[0].length,13,'Odd split must keep 13 items in RTL first/right column')
 assert.equal(pre.numbers[1].length,12)
 assert.equal(pre.numbers[0][0],'1.')
 assert.equal(pre.numbers[0].at(-1),'13.')
 assert.equal(pre.numbers[1][0],'14.')
 assert.equal(pre.numbers[1].at(-1),'25.')
 assert.ok(pre.isLong,'The print fixture must cross at least one normal-page height')
 assert.ok(pre.scrollWidth<=pre.clientWidth+1,`Preview horizontal text spill: ${JSON.stringify(pre)}`)
 assert.ok(pre.maxRight<=pre.boxRight+1&&pre.minLeft>=pre.boxLeft-1,`Preview row spill: ${JSON.stringify(pre)}`)
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached',timeout:12000})
 const print=await frame.evaluate(iframe=>{
  const document=iframe.contentDocument
  const box=document?.querySelector('[data-short-two-column]')
  if(!box)return null
  const base=box.getBoundingClientRect()
  const rows=[...box.querySelectorAll('[data-numbered-response-row]')]
  const cols=[...box.children]
  return {
   itemCount:rows.length,
   counts:cols.map(col=>col.querySelectorAll('[data-numbered-response-row]').length),
   scrollWidth:box.scrollWidth,clientWidth:box.clientWidth,
   minLeft:Math.min(...rows.map(r=>r.getBoundingClientRect().left)),
   maxRight:Math.max(...rows.map(r=>r.getBoundingClientRect().right)),
   boxLeft:base.left,boxRight:base.right,
   direction:iframe.contentWindow.getComputedStyle(box).direction,
   text:box.textContent,
  }
 })
 assert.ok(print,'Real print iframe must retain 2-col section')
 assert.equal(print.itemCount,25)
 assert.deepEqual(print.counts,[13,12])
 assert.equal(print.direction,'rtl')
 assert.ok(print.scrollWidth<=print.clientWidth+1,`Print horizontally overflows: ${JSON.stringify(print).slice(0,400)}`)
 assert.ok(print.maxRight<=print.boxRight+1&&print.minLeft>=print.boxLeft-1,'Printed rows must stay inside the two-column sheet')
 for(let i=1;i<=25;i++)assert.ok(print.text.includes(`PRINT-PROOF-${String(i).padStart(2,'0')}`),'Print clone lost question '+i)
 // Exercise Chromium's real print-to-PDF compositor with the exact print
 // iframe HTML, rather than treating an onscreen screenshot as a printed page.
 const printedHtml=await frame.evaluate(iframe=>iframe.contentDocument.documentElement.outerHTML)
 const pdfPage=await browser.newPage({viewport:{width:1200,height:1100}})
 try {
  await pdfPage.setContent(printedHtml,{waitUntil:'load'})
  const pdf=await pdfPage.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
  assert.ok(pdf.length>8000,'Headless Chromium print must emit a non-empty PDF')
  const pages=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  assert.ok(pages>=2,`Long Urdu fixture must paginate beyond one A4 PDF page, pages=${pages}`)
  assert.ok(pages<=12,`Unexpected excess page/blank overflow, pages=${pages}`)
  console.log('RTL_ODD_CHROMIUM_A4_PDF_PAGES',pages)
 }finally{await pdfPage.close()}

 assert.deepEqual(errors,[])
 console.log('RTL_ODD_TWO_COLUMN_WIDTHS',JSON.stringify({previewClientWidth:pre.clientWidth,previewScrollWidth:pre.scrollWidth,printClientWidth:print.clientWidth,printScrollWidth:print.scrollWidth}))
 console.log('RTL_ODD_LONG_TWO_COLUMN_PRINT_GEOMETRY_PASS')
})
