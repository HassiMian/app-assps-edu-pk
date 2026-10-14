import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5318
const academic={success:true,configured:true,data:{classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Urdu',classes:['8']},{name:'Math',classes:['8']}],periodsPerDay:8}}
const students=Array.from({length:45},(_,i)=>({id:i+1,name:`Starter Learner ${i+1}`,roll_number:String(i+1),class:'Eight',section:'Blue'}))
test('45 cards paginate into isolated A4 print document, typography controls reflect in output',{timeout:60000},async()=>{
 const server=await createServer({root,server:{port:PORT,strictPort:true}});await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 const context=await browser.newContext({viewport:{width:1540,height:1100}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 await context.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{school_name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',school_logo:''}})}))
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:students})}))
 await context.route('**/api/lesson-plans?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 const page=await context.newPage()
 try{
  await page.goto(`http://localhost:${PORT}/daily-diary-workspace-test.html`)
  await page.locator('[data-diary-workspace]').waitFor()
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.getByText('45 students loaded').waitFor()
  await page.locator('[data-card-count="6"]').click()
  assert.equal(await page.locator('[data-a4-page]').count(),8)
  assert.equal(await page.locator('[data-student-card]').count(),45)
  await page.getByLabel('Subject title font size').fill('13')
  await page.getByLabel('Subject column width').fill('36')
  await page.getByLabel('Diary row height').fill('30')
  await page.getByLabel('Diary card header size').fill('130')
  await page.getByLabel('Subject title font family').selectOption('Georgia, serif')
  const styles=await page.locator('[data-student-card]').first().evaluate(el=>({size:el.style.getPropertyValue('--subject-title-size'),width:el.style.getPropertyValue('--subject-width'),height:el.style.getPropertyValue('--row-height'),head:el.style.getPropertyValue('--head-scale')}))
  assert.equal(styles.width,'36%');assert.ok(Math.abs(parseFloat(styles.head)-1.118)<0.001);assert.ok(parseFloat(styles.size)>10);assert.ok(parseFloat(styles.height)>25)
  await page.evaluate(()=>{window.__asspsPrint=null;new MutationObserver(()=>{const iframe=document.querySelector('iframe[data-diary-print-frame]');if(iframe&&!iframe.contentWindow.__asspsPrintWrapped){iframe.contentWindow.__asspsPrintWrapped=true;iframe.contentWindow.print=()=>{window.__asspsPrint={sheets:iframe.contentDocument.querySelectorAll('[data-a4-page]').length,cards:iframe.contentDocument.querySelectorAll('[data-student-card]').length,siteChrome:iframe.contentDocument.querySelectorAll('nav,aside,.dd-controls,.dd-toolbar').length,sheetFirst:iframe.contentDocument.querySelector('[data-a4-page]').textContent.slice(0,150),style:iframe.contentDocument.querySelector('[data-student-card]').style.getPropertyValue('--subject-width'),css:iframe.contentDocument.querySelectorAll('link[rel=stylesheet],style').length,html:iframe.contentDocument.documentElement.outerHTML}}}}).observe(document.body,{childList:true})})
  await page.getByRole('button',{name:/Print \/ PDF/i}).click()
  await page.waitForFunction(()=>window.__asspsPrint!==null,{timeout:15000})
  const result=await page.evaluate(()=>window.__asspsPrint)
  assert.equal(result.sheets,8);assert.equal(result.cards,45);assert.equal(result.siteChrome,0);assert.equal(result.style,'36%');assert.ok(result.css>0)
  const pdfPage=await context.newPage()
  try{
    await pdfPage.setContent(result.html,{waitUntil:'load'})
    await pdfPage.evaluate(()=>document.fonts?.ready)
    const pdf=await pdfPage.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})
    const match=/\/Type\s*\/Page\b/g
    const actualPages=(pdf.toString('latin1').match(match)||[]).length
    assert.equal(actualPages,8,`PDF must contain 8 A4 sheets, got ${actualPages}`)
    console.log('DAILY_DIARY_PRINT_ISOLATION PASS',JSON.stringify({sheets:result.sheets,cards:result.cards,siteChrome:result.siteChrome,pdfPages:actualPages,subjectWidth:result.style}))
  }finally{await pdfPage.close()}
 }finally{await context.close();await browser.close();await server.close()}
})
