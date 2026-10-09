import {test} from 'node:test'
import {Buffer} from 'node:buffer'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5633
const fixtures=[
 {name:'sentence',param:'earlySentenceOverflow',selector:'[data-sentence-usage-table]',marker:/SENTENCE-CELL-\d{2}/g},
 {name:'pair',param:'earlyPairOverflow',selector:'[data-pair-practice-table]',marker:/PAIR-CELL-\d{2}/g},
]

test('Early language sentence and pair tables: bilingual long words never leave real screen/print/PDF bounds',{timeout:140000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 for(const item of fixtures){
  await t.test(item.name+' Urdu English source paragraphs and print geometry',{timeout:65000},async()=>{
   const page=await browser.newPage({viewport:{width:1500,height:1000}})
   try{
    page.on('dialog',d=>d.accept().catch(()=>{}))
    await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
    await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?${item.param}`,{waitUntil:'domcontentloaded',timeout:35000})
    await page.locator(item.selector).waitFor({timeout:20000})
    const metric=async frame=>frame.evaluate((el,args)=>{
     const doc=el?.contentDocument||document,tab=doc.querySelector(args.selector)
     if(!tab)return null
     const cells=[...tab.querySelectorAll('th,td')]
     return {rows:tab.querySelectorAll('tbody tr').length,client:tab.clientWidth,scroll:tab.scrollWidth,
      broken:cells.filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>({text:c.textContent.slice(0,24),client:c.clientWidth,scroll:c.scrollWidth})),
      text:tab.textContent,rtl:doc.defaultView.getComputedStyle(tab).direction,
      html:doc.documentElement.outerHTML}
    },{selector:item.selector})
    const preview=await metric(page.locator('html'))
    assert.ok(preview,`Missing ${item.name} table in true editor`)
    console.log(item.name.toUpperCase()+'_PREVIEW_GEOMETRY',JSON.stringify({scroll:preview.scroll,client:preview.client,broken:preview.broken}))
    assert.equal(preview.rows,4);assert.equal(preview.rtl,'rtl')
    assert.equal([...preview.text.matchAll(item.marker)].length,4)
    if(item.name==='sentence'){
     assert.ok(preview.text.includes('ط'.repeat(225)),'Soft break elements must not modify original Urdu word characters')
     assert.ok(await page.locator(item.selector).locator('wbr').count()>0,'Extreme uninterrupted Urdu script must receive invisible break opportunities')
    }
    assert.ok(preview.text.includes('بادل')&&preview.text.includes('Sunshine'))
    assert.ok(preview.scroll<=preview.client+1,`${item.name} table outside real A4 screen: ${preview.scroll}/${preview.client}`)
    assert.deepEqual(preview.broken,[],`${item.name} headers and data cells must stay inside widths`)
    await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
    const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:16000})
    const printed=await metric(frame)
    assert.ok(printed);assert.equal(printed.rows,4)
    assert.equal([...printed.text.matchAll(item.marker)].length,4)
    if(item.name==='sentence') assert.ok(printed.text.includes('ط'.repeat(225)),'Printed copy must preserve every Urdu word character')
    assert.deepEqual(printed.broken,[])
    assert.ok(printed.scroll<=printed.client+1)
    const pdfPage=await browser.newPage()
    try{await pdfPage.setContent(printed.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});assert.ok(pdf.length>8000)
      const pages=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
      assert.ok(pages>=1&&pages<=12);console.log(item.name.toUpperCase()+'_A4_PAGES',pages)
    }finally{await pdfPage.close()}
    console.log(item.name.toUpperCase()+'_PRINT_GEOMETRY',JSON.stringify({scroll:printed.scroll,client:printed.client}))
   }finally{await page.close()}
  })
 }
})
