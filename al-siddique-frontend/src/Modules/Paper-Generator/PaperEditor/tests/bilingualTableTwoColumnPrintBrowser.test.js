import { Buffer } from 'node:buffer'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5446
const audit=()=>{
 const doc=document
 const table=doc.querySelector('[data-short-table-columns="2"]')
 if(!table)return null
 const rect=table.getBoundingClientRect()
 const cells=[...table.querySelectorAll('td')]
 const bounds=cells.map(td=>td.getBoundingClientRect())
 return {columns:2,rows:table.querySelectorAll('tbody tr').length,
  tableWidth:rect.width,tableLeft:rect.left,tableRight:rect.right,
  tableClientWidth:table.clientWidth,tableScrollWidth:table.scrollWidth,
  actualBorderCollapse:doc.defaultView.getComputedStyle(table).borderCollapse,
  maxCellRight:Math.max(...bounds.map(x=>x.right)),minCellLeft:Math.min(...bounds.map(x=>x.left)),
  cellOverflow:cells.filter(td=>td.scrollWidth>td.clientWidth+1).map(td=>({client:td.clientWidth,scroll:td.scrollWidth,text:td.textContent.slice(0,35)})),
  tokens:[...table.textContent.matchAll(/BILINGUAL-TABLE-\d{2}/g)].map(m=>m[0]),
  direction:doc.defaultView.getComputedStyle(table).direction,
  hasUrdu:table.textContent.includes('پاکستان'),hasEnglish:table.textContent.includes('English climate'),
 }
}
test('real Chromium bilingual Urdu-English 9-item table two-column preview/print/PDF must not overflow',{timeout:85000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 const page=await browser.newPage({viewport:{width:1500,height:1000}})
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 page.on('dialog',d=>d.accept().catch(()=>{}))
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?bilingualTableOverflow`,{waitUntil:'domcontentloaded'})
 await page.locator('[data-short-table-columns="2"]').waitFor({timeout:18000})
 const preview=await page.evaluate(audit)
 assert.ok(preview,'Two-column table fixture did not mount')
 assert.equal(preview.rows,5,'Odd count must create 5 paired rows from 9 numbered items')
 assert.equal(preview.actualBorderCollapse,'collapse')
 assert.equal(preview.direction,'rtl')
 assert.ok(preview.hasUrdu&&preview.hasEnglish,'Both Urdu and English source text must be visible in real DOM')
 assert.equal(preview.tokens.length,9,'All 9 unique question tokens must be present')
 assert.deepEqual(preview.tokens,['01','06','02','07','03','08','04','09','05'].map(n=>`BILINGUAL-TABLE-${n}`),'Odd 5+4 columns must pair questions in original serial order')
 assert.ok(preview.tableScrollWidth<=preview.tableClientWidth+1,`Bilingual preview table overflows: ${JSON.stringify(preview)}`)
 assert.deepEqual(preview.cellOverflow,[],'Individual bilingual cells must wrap, never clip/spill')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:12000})
 const print=await frame.evaluate(el=>{
  const doc=el.contentDocument,table=doc?.querySelector('[data-short-table-columns="2"]')
  if(!table)return null
  const cells=[...table.querySelectorAll('td')]
  return {scroll:table.scrollWidth,client:table.clientWidth,
   rows:table.querySelectorAll('tbody tr').length,
   wideCells:cells.filter(td=>td.scrollWidth>td.clientWidth+1).length,
   tokens:[...table.textContent.matchAll(/BILINGUAL-TABLE-\d{2}/g)].map(m=>m[0]),
   html:doc.documentElement.outerHTML,
  }
 })
 assert.ok(print,'Real print iframe must contain bilingual short table')
 assert.equal(print.rows,5)
 assert.equal(print.tokens.length,9)
 assert.deepEqual(print.tokens,preview.tokens,'Print iframe must retain all question ordering from screen')
 assert.ok(print.scroll<=print.client+1,'Real print frame table must not overflow')
 assert.equal(print.wideCells,0,'Real print frame must not contain overflowed cells')
 const pdfPage=await browser.newPage()
 try{
  await pdfPage.setContent(print.html,{waitUntil:'load'})
  const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})
  assert.ok(pdf.length>8000)
  const count=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  assert.ok(count>=2&&count<=8,`Long bilingual table should paginate on several A4 pages; got ${count}`)
  console.log('BILINGUAL_SHORT_TABLE_A4_PDF_PAGES',count)
 }finally{await pdfPage.close()}
 assert.deepEqual(errors,[])
 console.log('BILINGUAL_TABLE_TWO_COLUMN_PRINT_GEOMETRY_PASS',JSON.stringify({previewWidth:preview.tableClientWidth,previewScroll:preview.tableScrollWidth,printWidth:print.client,printScroll:print.scroll}))
})
