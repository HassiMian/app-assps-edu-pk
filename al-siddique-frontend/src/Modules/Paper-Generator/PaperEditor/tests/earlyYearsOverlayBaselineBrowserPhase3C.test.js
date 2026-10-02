// Real EarlyYearsWorksheetEditor reference card; only fixture data, NEVER a live teacher approval.
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {createHash} from 'node:crypto'
import {Buffer} from 'node:buffer'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {getEarlyYearsPaperById} from '../earlyYears/data/earlyYearsSourceStore.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const source=getEarlyYearsPaperById('ey-starter-english-2026')
const templateKey='assps-early-years-template-map-v1'
const overlayKey='assps-early-years-editor-working-copy-v1__tenant-phase3c-browser'
const paperOverlay={
 [source.id+'::__header__']:{totalMarksOverride:50},
 [source.id+'::'+source.questions[0].id]:{lineCount:4},
 'ey-other-paper-2026::other':{lineCount:9}
}
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)
const hash=b=>createHash('sha256').update(b).digest('hex')
let server,browser,context,page,downloadPath,downloadName
before(async()=>{
 server=await createServer({root,server:{port:5291,strictPort:true},appType:'spa'})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 context=await browser.newContext({acceptDownloads:true,viewport:{width:1600,height:1200}})
 await context.addInitScript(({overlayKey,templateKey,paperId,overlays})=>{
  localStorage.setItem('al_siddique_user',JSON.stringify({id:19,role:'principal',school_id:91,tenant_id:'phase3c-browser'}))
  localStorage.setItem(overlayKey,JSON.stringify(overlays))
  localStorage.setItem(templateKey,JSON.stringify({[paperId]:'scholar-spark','ey-mover-urdu-2026':'mint-discovery-v2'}))
 },{overlayKey,templateKey,paperId:source.id,overlays:paperOverlay})
 page=await context.newPage()
 await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto('http://localhost:5291/ey-test.html?paper='+source.id,{waitUntil:'domcontentloaded'})
 await page.locator('.early-years-sheet-a4').waitFor()
 await page.locator('#early-years-template-select').waitFor()
 await page.waitForFunction(()=>document.querySelector('#early-years-template-select')?.value==='scholar-spark')
})
after(async()=>{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await server?.close().catch(()=>{})})
const raw=()=>page.evaluate(({overlayKey,templateKey})=>({
 overlays:localStorage.getItem(overlayKey),templates:localStorage.getItem(templateKey)
}),{overlayKey,templateKey})
const fixture=()=>({name:downloadName,mimeType:'application/json',buffer:fs.readFileSync(downloadPath)})
test('visible original editor exports exact paper + selected overlays + selected template, no storage mutation', {timeout:35000},async()=>{
 const beforeState=await raw()
 await page.getByRole('button',{name:/Capture Early Years reference baseline for ey-starter-english/}).click()
 const dialog=page.locator('[data-early-years-reference-baseline]')
 await dialog.waitFor()
 const btn=dialog.locator('[data-download-early-years-baseline]')
 assert.equal(await btn.isDisabled(),true)
 assert.match(await dialog.innerText(),/DATA EVIDENCE ONLY/)
 await page.getByLabel('Confirm Early Years reference baseline').check()
 const [download]=await Promise.all([page.waitForEvent('download'),btn.click()])
 downloadPath=await download.path();downloadName=download.suggestedFilename()
 const bundle=JSON.parse(fs.readFileSync(downloadPath,'utf8'))
 assert.equal(bundle.identity.paperId,source.id)
 assert.deepEqual(bundle.teacherSource,source)
 assert.deepEqual(bundle.overlays.__header__,paperOverlay[source.id+'::__header__'])
 assert.deepEqual(bundle.overlays[source.questions[0].id],paperOverlay[source.id+'::'+source.questions[0].id])
 assert.equal(Object.keys(bundle.overlays).length,2)
 assert.equal(bundle.template.storedRaw,'scholar-spark')
 assert.equal(bundle.approval.visualEvidence,'SCREENSHOT_AND_A4_PDF_PENDING')
 assert.equal(bundle.approval.renderCutoverAllowed,false)
 assert.deepEqual(await raw(),beforeState,'No overlay/template storage write allowed.')
})
test('imported downloaded baseline compares MATCH but never restores or saves content', {timeout:20000},async()=>{
 assert.ok(downloadPath)
 const pre=await raw()
 await page.getByLabel('Compare Early Years reference JSON').setInputFiles(fixture())
 const comparison=page.locator('[data-early-years-baseline-result]')
 await comparison.waitFor()
 assert.match(await comparison.innerText(),/MATCH: all persisted reference overlays/)
 assert.deepEqual(await raw(),pre)
})
test('external local overlay change is flagged and stale current editor export fails closed', {timeout:20000},async()=>{
 await page.evaluate(key=>{
  const data=JSON.parse(localStorage.getItem(key))
  data['ey-starter-english-2026::__header__'].totalMarksOverride=73
  localStorage.setItem(key,JSON.stringify(data))
 },overlayKey)
 const pre=await raw()
 await page.getByLabel('Compare Early Years reference JSON').setInputFiles(fixture())
 const result=page.locator('[data-early-years-baseline-result]')
 assert.match(await result.innerText(),/CHANGED: exact-pattern comparison failed/)
 assert.match(await result.innerText(),/Stale displayed editor: true/)
 await page.locator('[data-download-early-years-baseline]').click()
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/PERSISTED data/)
 assert.deepEqual(await raw(),pre)
})
test('corrupted/counterfeit imported file does not install overlay, change template or approve paper', {timeout:20000},async()=>{
 const pre=await raw()
 await page.getByLabel('Compare Early Years reference JSON').setInputFiles({
  name:'fake-approved.json',mimeType:'application/json',
  buffer:Buffer.from('{"format":"assps-early-years-reference-overlay-baseline","version":1,"approval":{"renderCutoverAllowed":true}}')})
 assert.match(await page.getByRole('alert').innerText(),/Comparison blocked/)
 assert.deepEqual(await raw(),pre)
})
test('native A4 edited FIXTURE produces screenshot+PDF proof outside git, not a user-approved visual baseline', {timeout:40000},async()=>{
 // Restore TEST-ONLY persisted fixture from the earlier simulated stale edit, then reload the existing renderer.
 await page.evaluate(({key,original})=>localStorage.setItem(key,JSON.stringify(original)),
  {key:overlayKey,original:paperOverlay})
 await page.reload({waitUntil:'domcontentloaded'})
 const sheet=page.locator('.early-years-sheet-a4')
 await sheet.waitFor()
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'assps-phase3c-visual-fixture-'))
 const png=path.join(folder,source.id+'-screen-a4.png'),pdf=path.join(folder,source.id+'-native-print-a4.pdf')
 await page.emulateMedia({media:'screen'})
 await sheet.screenshot({path:png,animations:'disabled'})
 const screenMetrics=await sheet.evaluate(el=>({width:el.getBoundingClientRect().width,
  height:el.getBoundingClientRect().height,text:el.innerText,
  font:getComputedStyle(el).fontFamily,dir:getComputedStyle(el).direction}))
 await page.pdf({path:pdf,format:'A4',preferCSSPageSize:true,printBackground:true})
 assert.equal(fs.readFileSync(png).subarray(1,4).toString(),'PNG')
 assert.equal(fs.readFileSync(pdf).subarray(0,4).toString(),'%PDF')
 assert.ok(fs.statSync(png).size>2000&&fs.statSync(pdf).size>2000)
 assert.ok(screenMetrics.width>750&&screenMetrics.width<830)
 assert.ok(screenMetrics.text.includes('AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'))
 assert.ok(screenMetrics.font.length>0)
 const manifest={status:'AUTOMATED_FIXTURE_ONLY_NOT_APPROVED',paperId:source.id,
  screenSha256:hash(fs.readFileSync(png)),pdfSha256:hash(fs.readFileSync(pdf)),
  screenMetrics,sourceSha256:hash(Buffer.from(JSON.stringify(source)))}
 fs.writeFileSync(path.join(folder,'fixture-evidence-manifest.json'),JSON.stringify(manifest,null,2))
 console.log('EARLY_YEARS_PHASE3C_VISUAL_FIXTURE_OUTSIDE_GIT='+folder)
 await page.emulateMedia({media:'screen'})
})
