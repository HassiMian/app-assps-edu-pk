import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Buffer} from 'node:buffer'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5670

test('Markdown escaped pipes and literal backslashes remain exactly 3 columns in Paper Workspace and A4 print',{timeout:100000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const page=await browser.newPage({viewport:{width:1500,height:1050}})
 page.on('dialog',d=>d.accept().catch(()=>{}))
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?escapedPipeTable`,{waitUntil:'domcontentloaded',timeout:35000})
 const sel='[data-source-table]';await page.locator(sel).waitFor({timeout:18000})
 const metric=async frame=>frame.evaluate(el=>{
  const d=el?.contentDocument||document,tab=d.querySelector('[data-source-table]');if(!tab)return null
  const data=[...tab.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('td')].map(c=>c.textContent.trim()))
  const cells=[...tab.querySelectorAll('td')]
  return {data,width:tab.clientWidth,scroll:tab.scrollWidth,spill:cells.filter(c=>c.scrollWidth>c.clientWidth+1).length,
    rtl:d.defaultView.getComputedStyle(tab).direction,html:d.documentElement.outerHTML}
 })
 const check=m=>{
  assert.ok(m)
  console.log('ESCAPED_MARKDOWN_TABLE_METRIC',JSON.stringify({width:m.width,scroll:m.scroll,cols:m.data.map(r=>r.length),data:m.data}))
  assert.deepEqual(m.data.map(r=>r.length),[3,3,3],'Escaped pipes must NOT become extra table cells')
  assert.equal(m.data[0][0],'Formula | Unit')
  assert.equal(m.data[1][0],'Pressure | Temperature [ESCAPED-01]')
  assert.equal(m.data[1][1],'دباؤ | حرارت [ESCAPED-02]')
  assert.equal(m.data[1][2],String.raw`C:\Science [ESCAPED-03]`)
  assert.equal(m.data[2][2],'Value | axis [ESCAPED-04]')
  assert.equal(m.rtl,'rtl')
  assert.ok(m.scroll<=m.width+1,'Multilingual 3-column source exceeds A4 width')
  assert.equal(m.spill,0,'Source text spills beyond its intended table column')
 }
 check(await metric(page.locator('html')))
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:12000})
 const printed=await metric(frame);check(printed)
 const pdfPage=await browser.newPage()
 try{await pdfPage.setContent(printed.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>8000)
  const pages=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;assert.ok(pages>=1&&pages<=5);console.log('ESCAPED_MARKDOWN_A4_PAGES',pages)
 }finally{await pdfPage.close()}
 // Real user path: enter editing mode, focus existing cell, type an answer
 // containing a literal pipe, blur to commit, and leave editing mode.
 await page.getByRole('button',{name:'Edit Paper',exact:true}).click()
 const cell=page.locator('[data-source-table] [data-edit-field="source-table-1-2"]')
 await cell.waitFor({state:'visible'})
 await cell.click()
 const changed=String.raw`C:\Science | Grade 7 [ESCAPED-03]`
 await cell.fill(changed)
 await cell.press('Tab')
 await page.getByRole('button',{name:'Done Editing',exact:true}).click()
 const edited=await metric(page.locator('html'))
 console.log('ESCAPED_MARKDOWN_EDITOR_ROUNDTRIP',JSON.stringify({columns:edited.data.map(r=>r.length),cell:edited.data[1][2]}))
 assert.deepEqual(edited.data.map(row=>row.length),[3,3,3],'Editing a pipe-bearing cell must not create a fourth column')
 assert.equal(edited.data[1][2],changed,'Committed edited cell must not duplicate/strip source text')
 assert.equal(edited.data[1][0],'Pressure | Temperature [ESCAPED-01]')
 assert.equal(edited.data[1][1],'دباؤ | حرارت [ESCAPED-02]')
 await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
 const reprinted=await metric(frame)
 assert.deepEqual(reprinted.data,edited.data,'Edited table must survive clone print without delimiter drift')
})
