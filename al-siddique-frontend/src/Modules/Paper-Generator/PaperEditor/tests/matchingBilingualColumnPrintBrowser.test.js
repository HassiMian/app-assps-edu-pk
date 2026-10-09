import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5472
test('Chromium RTL matching-columns headers/cells must wrap within printed A4',{timeout:90000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const page=await browser.newPage({viewport:{width:1500,height:1100}})
 page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?matchingColumnOverflow`,{waitUntil:'domcontentloaded'})
 const sel='[data-matching-columns-table]';await page.locator(sel).waitFor({timeout:18000})
 const metric=async frame=>frame.evaluate(el=>{
  const d=el?.contentDocument||document,t=d.querySelector('[data-matching-columns-table]')
  if(!t)return null
  const cells=[...t.querySelectorAll('td,th')]
  return {rows:t.querySelectorAll('tr').length,width:t.clientWidth,scroll:t.scrollWidth,
   overflow:cells.filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>[c.scrollWidth,c.clientWidth]),
   hasUrdu:t.textContent.includes('دھوپ'),hasEnglish:t.textContent.includes('Climate'),
   markers:[...t.textContent.matchAll(/MATCHING-CELL-\d{2}/g)].map(m=>m[0]),
   rtl:d.defaultView.getComputedStyle(t).direction,
   html:d.documentElement.outerHTML}
 })
 const preview=await metric(page.locator('html'))
 console.log('MATCHING_COLUMNS_PREVIEW_METRIC',JSON.stringify({width:preview.width,scroll:preview.scroll,overflow:preview.overflow}))
 assert.equal(preview.rows,6);assert.equal(preview.rtl,'rtl')
 assert.equal(preview.markers.length,5);assert.ok(preview.hasUrdu&&preview.hasEnglish)
 assert.ok(preview.scroll<=preview.width+1,'Matching columns horizontal overflow')
 assert.deepEqual(preview.overflow,[],'Matching columns cells or headers overflow')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:12000})
 const print=await metric(frame)
 assert.ok(print&&print.scroll<=print.width+1)
 assert.deepEqual(print.overflow,[]);assert.deepEqual(print.markers,preview.markers)
 const pdfPage=await browser.newPage()
 try{await pdfPage.setContent(print.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>8000)
  const count=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;assert.ok(count>=1&&count<=9);console.log('MATCHING_COLUMNS_A4_PDF_PAGES',count)
 }finally{await pdfPage.close()}
 console.log('MATCHING_COLUMNS_PRINT_WIDTHS',JSON.stringify({preview:[preview.scroll,preview.width],print:[print.scroll,print.width]}))
})
