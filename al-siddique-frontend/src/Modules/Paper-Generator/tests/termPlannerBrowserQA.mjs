import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const host='127.0.0.1',port=5207
const dev=await createServer({configFile:'vite.config.js',
 server:{host,port,strictPort:true,hmr:false}})
await dev.listen()
const browser=await chromium.launch({headless:true,
 executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1500,height:960},
 acceptDownloads:true})
const errors=[],writes=[],serverRows=[]
const source='/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json'
const original=JSON.parse(fs.readFileSync(source,'utf8'))
await page.addInitScript(()=>{
 localStorage.setItem('al_siddique_user',
  JSON.stringify({id:92001,role:'admin',designation:'Principal',school_id:1}))
})
page.on('pageerror',e=>errors.push(e.message))
await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname,method=route.request().method()
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',
  body:JSON.stringify({success:status<400,data,message:status===409?'Revision conflict':undefined})})
 if(path.includes('/api/students'))return reply([])
 if(path.endsWith('/planner/private-source-bundle'))return reply(original)
 if(path==='/api/lesson-plans'){
  if(method==='GET')return reply(serverRows)
  if(method==='POST'){
   const body=route.request().postDataJSON()
   assert.equal(body.planningScope,'term')
   assert.equal(body.plannerDocument?.schemaVersion,3)
   assert.equal(body.plannerDocument?.provenance?.academicPublication,'BLOCKED')
   assert.equal(body.plannerDocument?.provenance?.marker,'ASSPS_TERM_NOTEBOOK_V1')
   assert.equal(body.sentToPortal,undefined)
   assert.ok(!JSON.stringify(body).includes('QA Student'))
   const saved={...body,id:'lp_synthetic_term_001',revision:1,serverRevision:1}
   serverRows.push(saved);writes.push(body)
   return reply(saved,201)
  }
 }
 if(path==='/api/lesson-plans/lp_synthetic_term_001'&&method==='PUT'){
  const body=route.request().postDataJSON()
  if(Number(body.expectedRevision)!==serverRows[0].serverRevision)
   return reply(null,409)
  const saved={...body,id:'lp_synthetic_term_001',revision:2,serverRevision:2}
  serverRows[0]=saved;writes.push(body)
  return reply(saved)
 }
 return reply(null,401)
})
try{
 await page.goto('http://'+host+':'+port+'/weekly-notebook-test.html',{waitUntil:'networkidle'})
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:18000})
 await page.locator('[data-wn-class]').selectOption('Four')
 await page.getByRole('button',{name:'1. Term Syllabus'}).click()
 assert.equal(await page.locator('[data-term-edit-subject]').count(),6)
 assert.equal(await page.locator('.term-print-subjects tbody tr').count(),6)
 const assessmentCount=await page.locator('.term-print-assessments tbody tr').count()
 assert.ok(assessmentCount>=2)
 assert.equal(await page.locator('.term-print-subjects thead th').count(),2)
 const detailed='Formation of clouds • Source-derived, teacher-review draft. '.repeat(24)
 await page.getByLabel('English term coverage').fill(detailed)
 await page.getByLabel('English page from').fill('31')
 await page.getByLabel('English page to').fill('65')
 await page.getByLabel('Term English font').selectOption('Georgia')
 await page.locator('.term-controls input[type=range]').first().fill('16')
 const updatedDate='2026-10-30'
 await page.getByLabel('Assessment 1 date').fill(updatedDate)
 await page.getByRole('button',{name:'Restore source date'}).first().click()
 assert.notEqual(await page.getByLabel('Assessment 1 date').inputValue(),updatedDate)
 await page.getByLabel('Assessment 1 date').fill(updatedDate)
 const originalNumberedCount=await page.locator('.term-edit-assessments tbody tr').count()
 await page.getByRole('button',{name:'Add assessment'}).click()
 assert.equal(await page.locator('.term-edit-assessments tbody tr').count(),originalNumberedCount+1)
 await page.getByRole('button',{name:'Remove',exact:true}).last().click()
 assert.equal(await page.locator('.term-edit-assessments tbody tr').count(),originalNumberedCount)
 assert.ok((await page.locator('.term-print-assessments').innerText()).includes(updatedDate))
 await page.getByRole('button',{name:'Save Term'}).click()
 await page.getByText('Saved term draft to the school server').waitFor({timeout:12000})
 assert.equal(serverRows.length,1)
 assert.equal(writes.length,1)
 assert.equal(writes[0].plannerDocument.termCoverageRows[0].detail,detailed)
 assert.equal(writes[0].plannerDocument.layoutSettings.fontFamily,'Georgia')
 assert.equal(writes[0].plannerDocument.layoutSettings.fontSize,16)
 assert.equal(writes[0].plannerDocument.assessments[0].date,updatedDate)
 assert.equal(writes[0].plannerDocument.assessments[0].origin,'MANUAL_PROPOSAL')
 const popupEvent=page.waitForEvent('popup',{timeout:10000})
 await page.getByRole('button',{name:'Print / PDF'}).click()
 const popup=await popupEvent
 await popup.waitForLoadState('domcontentloaded')
 const printed=await popup.locator('body').innerText()
 assert.ok(printed.includes('AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'))
 assert.ok(printed.includes('ASSESSMENT'))
 assert.ok(printed.includes(updatedDate))
 const printedFont=await popup.locator('.term-print-document').evaluate(n=>
  getComputedStyle(n).getPropertyValue('--term-text-family').trim())
 assert.equal(printedFont,'Georgia')
 const pdf='/tmp/assps-term-browser-private-synthetic-a4.pdf'
 await popup.pdf({path:pdf,format:'A4',printBackground:true})
 const bytes=fs.statSync(pdf).size
 assert.ok(bytes>10000)
 await popup.close()
 await page.reload({waitUntil:'networkidle'})
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:18000})
 await page.locator('[data-wn-class]').selectOption('Four')
 await page.getByRole('button',{name:'1. Term Syllabus'}).click()
 await page.locator('.term-saved button').first().waitFor()
 await page.locator('.term-saved button').first().click()
 assert.equal(await page.getByLabel('English term coverage').inputValue(),detailed)
 assert.equal(await page.getByLabel('English page from').inputValue(),'31')
 assert.equal(await page.getByLabel('English page to').inputValue(),'65')
 assert.equal(await page.getByLabel('Term English font').inputValue(),'Georgia')
 assert.equal(await page.getByLabel('Assessment 1 date').inputValue(),updatedDate)
 await page.getByLabel('English term coverage').fill(detailed+' EDITED')
 await page.getByRole('button',{name:'Save Term'}).click()
 await page.getByText('Saved term draft to the school server').waitFor({timeout:12000})
 assert.equal(writes.length,2)
 assert.equal(serverRows[0].serverRevision,2)
 assert.equal(serverRows[0].plannerDocument.termCoverageRows[0].detail,detailed+' EDITED')
 assert.equal(errors.length,0,JSON.stringify(errors))
 console.log('TERM_PLANNER_CHROMIUM_PASS: class6subjects + numbered assessments + date provenance + font/column settings + server POST/PUT revision1to2 + reload/reopen + term A4 PDF')
 console.log('TERM_PLANNER_PDF_BYTES',bytes)
 console.log('NO_PRODUCTION_WRITES: localhost mock server, synthetic owner only')
}catch(ex){
 console.error('TERM_PLANNER_CHROMIUM_FAILED',ex.stack||ex.message)
 console.error('PAGE_ERRORS',errors)
 console.error('VISIBLE_TEXT',String(await page.locator('body').innerText()).slice(0,1200))
 process.exitCode=1
}finally{await browser.close();await dev.close()}
