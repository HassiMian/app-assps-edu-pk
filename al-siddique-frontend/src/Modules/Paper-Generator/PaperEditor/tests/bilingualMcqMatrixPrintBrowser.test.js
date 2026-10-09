import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5481
function screenAudit(){
 const table=document.querySelector('[data-official-mcq-table]')
 if(!table)return null
 const cells=[...table.querySelectorAll('tbody td')]
 return {rows:table.querySelectorAll('tbody tr').length, client:table.clientWidth,scroll:table.scrollWidth,
  overflowingCells:cells.filter(td=>td.scrollWidth>td.clientWidth+1).map(td=>({scroll:td.scrollWidth,client:td.clientWidth,first:td.textContent.slice(0,44)})),
  direction:getComputedStyle(table).direction,
  text:table.textContent,
  cellCount:cells.length,
 }
}
test('real Chromium bilingual matrix MCQ long stem/option print geometry and A4 PDF',{timeout:65000},async t=>{
 const server=await createServer({root,server:{port,strictPort:true}})
 await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await server.close().catch(()=>{})})
 const page=await browser.newPage({viewport:{width:1500,height:1000}})
 await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 page.on('dialog',d=>d.accept().catch(()=>{}) )
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`http://127.0.0.1:${port}/paper-workspace-test.html?bilingualMatrixOverflow`,{waitUntil:'domcontentloaded',timeout:65000})
 await page.locator('[data-official-mcq-table]').waitFor({timeout:16000})
 const preview=await page.evaluate(screenAudit)
 assert.ok(preview,'Official matrix table must mount')
 assert.equal(preview.rows,6,'Three MCQs must preserve a prompt row and a choices row each')
 assert.equal(preview.direction,'rtl')
 assert.ok(preview.text.includes('MCQ-STEM-01')&&preview.text.includes('MCQ-STEM-02')&&preview.text.includes('MCQ-STEM-03'))
 assert.ok(preview.text.includes('LONGENGLISHSCIENTIFICMEASUREMENT')&&preview.text.includes('VERYUNBROKENOPTIONWORD'))
 assert.ok(preview.scroll<=preview.client+1,`PREVIEW matrix table overflow: ${JSON.stringify(preview).slice(0,900)}`)
 assert.deepEqual(preview.overflowingCells,[],'All 3 bilingual prompts and 12 choices must wrap inside their cells')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const iframe=page.locator('#__print_frame'); await iframe.waitFor({state:'attached',timeout:12000})
 const printed=await iframe.evaluate(el=>{
  const doc=el.contentDocument,table=doc?.querySelector('[data-official-mcq-table]')
  if(!table)return null
  const cells=[...table.querySelectorAll('tbody td')]
  return {rows:table.querySelectorAll('tbody tr').length,client:table.clientWidth,scroll:table.scrollWidth,
   wideCells:cells.filter(td=>td.scrollWidth>td.clientWidth+1).length,text:table.textContent,html:doc.documentElement.outerHTML}
 })
 assert.ok(printed,'Real print iframe must preserve MCQ matrix')
 assert.equal(printed.rows,6)
 for(const token of ['MCQ-STEM-01','MCQ-STEM-02','MCQ-STEM-03','VERYUNBROKENOPTIONWORD'])assert.ok(printed.text.includes(token),'Print loses '+token)
 assert.ok(printed.scroll<=printed.client+1,'Printed MCQ matrix must not scroll outside A4 width')
 assert.equal(printed.wideCells,0,'Printed MCQ prompt/option table data cells must not overflow')
 const pdfPage=await browser.newPage()
 try{
  await pdfPage.setContent(printed.html,{waitUntil:'load'})
  const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})
  assert.ok(pdf.length>8000)
  const pages=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  assert.ok(pages>=1&&pages<=12,`Unexpected A4 PDF pagination ${pages}`)
  console.log('BILINGUAL_MCQ_MATRIX_A4_PAGES',pages)
 }finally{await pdfPage.close()}
 assert.deepEqual(errors,[])
 console.log('BILINGUAL_MCQ_MATRIX_GEOMETRY_PASS',JSON.stringify({previewClient:preview.client,previewScroll:preview.scroll,printClient:printed.client,printScroll:printed.scroll}))
})
