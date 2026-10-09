import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5496
test('Chromium source Markdown table must remain within screen and printed A4',{timeout:90000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const page=await browser.newPage({viewport:{width:1500,height:1100}})
 page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?sourceTableOverflow`,{waitUntil:'domcontentloaded'})
 const sel='[data-source-table]';await page.locator(sel).waitFor({timeout:18000})
 const metric=async frame=>frame.evaluate(el=>{
  const d=el?.contentDocument||document,t=d.querySelector('[data-source-table]')
  if(!t)return null
  const cells=[...t.querySelectorAll('td')]
  return {rows:t.querySelectorAll('tr').length,width:t.clientWidth,scroll:t.scrollWidth,
   overflow:cells.filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>[c.scrollWidth,c.clientWidth]),
   hasUrdu:t.textContent.includes('ماحولیات'),hasEnglish:t.textContent.includes('climate data'),
   markers:[...t.textContent.matchAll(/SOURCE-CELL-\d{2}/g)].map(m=>m[0]),
   rtl:d.defaultView.getComputedStyle(t).direction,
   html:d.documentElement.outerHTML}
 })
 const preview=await metric(page.locator('html'))
 console.log('SOURCE_TABLE_PREVIEW_METRIC',JSON.stringify({width:preview.width,scroll:preview.scroll,overflow:preview.overflow}))
 assert.equal(preview.rows,4);assert.equal(preview.rtl,'rtl')
 assert.equal(preview.markers.length,3);assert.ok(preview.hasUrdu&&preview.hasEnglish)
 assert.ok(preview.scroll<=preview.width+1,'Source table horizontal scroll overflows A4')
 assert.deepEqual(preview.overflow,[],'Source table has overflowing question cells')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:12000})
 const print=await metric(frame)
 assert.ok(print&&print.scroll<=print.width+1)
 assert.deepEqual(print.overflow,[]);assert.deepEqual(print.markers,preview.markers)
 const pdfPage=await browser.newPage()
 try{await pdfPage.setContent(print.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>8000)
  const count=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;assert.ok(count>=1&&count<=9);console.log('SOURCE_TABLE_A4_PDF_PAGES',count)
 }finally{await pdfPage.close()}
 console.log('SOURCE_TABLE_PRINT_WIDTHS',JSON.stringify({preview:[preview.scroll,preview.width],print:[print.scroll,print.width]}))
})
