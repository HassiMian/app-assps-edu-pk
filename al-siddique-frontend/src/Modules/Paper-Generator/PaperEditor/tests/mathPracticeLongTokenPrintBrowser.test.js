import {test} from 'node:test'
import {Buffer} from 'node:buffer'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5503
const fixtures=[
 {name:'math-compare',param:'mathPracticeOverflow',selector:'[data-math-practice-grid]',token:/MATH-PRACTICE-\d{2}/g,rows:6},
 {name:'math-tables',param:'mathTablesOverflow',selector:'[data-math-table-practice]',token:/MATH-TABLE-\d{2}/g,rows:4},
]
test('Mathematics numbered practice and multiplication tables preserve A4 print geometry',{timeout:120000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 for(const f of fixtures){
  await t.test(f.name+' actual editor preview, print iframe and PDF',{timeout:70000},async()=>{
   const page=await browser.newPage({viewport:{width:1500,height:1000}})
   try{
    page.on('dialog',d=>d.accept().catch(()=>{}))
    await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
    await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?${f.param}`,{waitUntil:'domcontentloaded',timeout:35000})
    await page.locator(f.selector).waitFor({timeout:18000})
    const geometry=async frame=>frame.evaluate((el,arg)=>{
     const doc=el?.contentDocument||document,root=doc.querySelector(arg)
     if(!root)return null
     const elements=[...root.querySelectorAll('div')].filter(d=>d.children.length<=2)
     return {client:root.clientWidth,scroll:root.scrollWidth,broken:elements.filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>({width:x.clientWidth,scroll:x.scrollWidth,text:x.textContent?.slice(0,30)})).slice(0,12),
      text:root.textContent,html:doc.documentElement.outerHTML,mathFont:doc.defaultView.getComputedStyle(root).fontFamily}
    },f.selector)
    const before=await geometry(page.locator('html'))
    assert.ok(before)
    console.log(f.name.toUpperCase()+'_PREVIEW_WIDTH',JSON.stringify({client:before.client,scroll:before.scroll,broken:before.broken}))
    assert.equal([...before.text.matchAll(f.token)].length,f.rows)
    assert.ok(before.text.includes('۱۲۳۴۵۶۷۸۹۰'.repeat(20)),'Original Urdu-digit source run must remain complete')
    assert.ok(before.text.includes(f.name==='math-compare' ? 'x² + y² = z²' : '7 × 3 = 21'),'Actual original mathematical symbols and superscripts must remain intact')
    assert.ok(before.scroll<=before.client+1,`Overflow ${f.name}: ${before.scroll}/${before.client}`)
    assert.deepEqual(before.broken,[])
    await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click()
    const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached',timeout:14000})
    const printed=await geometry(frame);assert.ok(printed)
    assert.equal([...printed.text.matchAll(f.token)].length,f.rows)
    assert.ok(printed.text.includes('۱۲۳۴۵۶۷۸۹۰'.repeat(20)),'Print must retain all original Urdu mathematical digits')
    assert.ok(printed.text.includes(f.name==='math-compare' ? 'x² + y² = z²' : '7 × 3 = 21'),'Print must retain original mathematical symbols')
    assert.ok(printed.scroll<=printed.client+1);assert.deepEqual(printed.broken,[])
    const pdfPage=await browser.newPage()
    try{await pdfPage.setContent(printed.html,{waitUntil:'load'});const pdf=await pdfPage.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
     assert.ok(pdf.length>8000);const pages=(Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
     assert.ok(pages>=1&&pages<=14);console.log(f.name.toUpperCase()+'_PDF_PAGES',pages)
    }finally{await pdfPage.close()}
    console.log(f.name.toUpperCase()+'_PRINT_WIDTH',JSON.stringify({client:printed.client,scroll:printed.scroll}))
   }finally{await page.close()}
  })
 }
})
