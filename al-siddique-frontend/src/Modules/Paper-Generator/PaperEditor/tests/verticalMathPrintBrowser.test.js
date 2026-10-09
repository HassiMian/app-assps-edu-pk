import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5632

test('Vertical multi-column arithmetic preserves operand characters without clipping in browser A4 print',{timeout:100000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const page=await browser.newPage({viewport:{width:1500,height:1100}})
 page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?verticalMathOverflow`,{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('[data-math-operation-matrix]').waitFor({timeout:18000})
 const metric=async frame=>frame.evaluate(el=>{
  const d=el?.contentDocument||document,t=d.querySelector('[data-math-operation-matrix]')
  if(!t)return null
  const elems=[...t.querySelectorAll('[data-place-value-stack]')]
  const spans=[...t.querySelectorAll('[data-place-value-stack] span')]
  return {width:t.clientWidth,scroll:t.scrollWidth,
    broken:spans.filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>({width:c.clientWidth,scroll:c.scrollWidth,text:c.textContent.slice(0,22)})).slice(0,12),
    stacks:elems.length,chars:t.textContent,html:d.documentElement.outerHTML,
    stacking:elems.map(e=>({scroll:e.scrollWidth,width:e.clientWidth}))}
 })
 const before=await metric(page.locator('html'));assert.ok(before)
 console.log('VERTICAL_MATH_PREVIEW_GEOMETRY',JSON.stringify({width:before.width,scroll:before.scroll,broken:before.broken,stacking:before.stacking}))
 assert.equal(before.stacks,4)
 const aligned=await page.locator('[data-place-value-stack]').first().evaluate(el=>({direction:getComputedStyle(el).direction,numeric:getComputedStyle(el).fontVariantNumeric,columns:getComputedStyle(el).gridTemplateColumns,spanCount:el.querySelectorAll('span').length}))
 assert.equal(aligned.direction,'ltr','Vertical maths must stay left-to-right even in Urdu papers')
 assert.match(aligned.numeric,/tabular-nums/,'Column values must retain digit alignment')
 assert.ok(aligned.spanCount>=4)
 assert.ok(before.chars.includes('+')&&before.chars.includes('-'),'Original operator symbols remain visible')
 assert.equal([...before.chars.matchAll(/VERT-MATH-\d{2}/g)].length,4)
 assert.ok(before.chars.includes('1234567890'.repeat(80))&&before.chars.includes('۹۸۷۶۵۴۳۲۱۰'.repeat(100)))
 assert.ok(before.scroll<=before.width+1,'Vertical maths blocks overflow A4 paper')
 assert.deepEqual(before.broken,[],'Long vertical arithmetic operands escape math columns')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:12000})
 const printed=await metric(frame);assert.ok(printed)
 assert.ok(printed.scroll<=printed.width+1);assert.deepEqual(printed.broken,[])
 assert.equal([...printed.chars.matchAll(/VERT-MATH-\d{2}/g)].length,4)
 assert.ok(printed.chars.includes('+')&&printed.chars.includes('-'),'Printed operands must preserve both operation symbols')
 assert.ok(printed.chars.includes('1234567890'.repeat(80))&&printed.chars.includes('۹۸۷۶۵۴۳۲۱۰'.repeat(100)))
 const pdfPage=await browser.newPage()
 try{await pdfPage.setContent(printed.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>8000)
  const n=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;assert.ok(n>0&&n<=40);console.log('VERTICAL_MATH_A4_PDF_PAGES',n)
 }finally{await pdfPage.close()}
 console.log('VERTICAL_MATH_PRINT_GEOMETRY',JSON.stringify({width:printed.width,scroll:printed.scroll,stacking:printed.stacking}))
})
