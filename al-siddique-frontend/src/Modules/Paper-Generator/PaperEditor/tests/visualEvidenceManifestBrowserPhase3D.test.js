// End-to-end with the actual original EarlyYearsWorksheetEditor and native A4 renderer.
// Only synthetic/local browser fixture. Does NOT claim to capture the principal's approved papers.
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {createHash} from 'node:crypto'
import {Buffer} from 'node:buffer'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {getEarlyYearsPaperById} from '../earlyYears/data/earlyYearsSourceStore.js'
import official from '../../seed-data/official-first-term-2026-v13.json' with {type:'json'}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const paper=getEarlyYearsPaperById('ey-starter-english-2026')
const scope='tenant-phase3d-browser'
const overlayKey='assps-early-years-editor-working-copy-v1__'+scope
const templateKey='assps-early-years-template-map-v1'
const sha=b=>createHash('sha256').update(b).digest('hex')
const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)
let server,browser,context,page
before(async()=>{
 server=await createServer({root,server:{port:5295,strictPort:true},appType:'spa'})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
 context=await browser.newContext({acceptDownloads:true,viewport:{width:1600,height:1200}})
 await context.addInitScript(({overlayKey,templateKey,paperId})=>{
  localStorage.setItem('al_siddique_user',JSON.stringify({id:27,role:'principal',school_id:91,tenant_id:'phase3d-browser'}))
  localStorage.setItem('al_siddique_token','local_phase3d_browser_fixture')
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
  localStorage.setItem(overlayKey,JSON.stringify({[paperId+'::__header__']:{totalMarksOverride:50}}))
  localStorage.setItem(templateKey,JSON.stringify({[paperId]:'scholar-spark'}))
 },{overlayKey,templateKey,paperId:paper.id})
 page=await context.newPage()
 await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto('http://localhost:5295/ey-test.html?paper='+paper.id,{waitUntil:'domcontentloaded'})
 await page.locator('.early-years-sheet-a4').waitFor()
 await page.waitForFunction(()=>document.querySelector('#early-years-template-select')?.value==='scholar-spark')
})
after(async()=>{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await server?.close().catch(()=>{})})
const storage=()=>page.evaluate(({overlayKey,templateKey})=>({
 overlay:localStorage.getItem(overlayKey),template:localStorage.getItem(templateKey),
}),{overlayKey,templateKey})
test('real native Early Years editor exports JSON, hashes PNG+PDF, verifies 4 original files, never mutates local source', {timeout:80000},async()=>{
 const initial=await storage()
 await page.getByRole('button',{name:/Capture Early Years reference baseline/}).click()
 await page.locator('[data-early-years-reference-baseline]').waitFor()
 await page.getByLabel('Confirm Early Years reference baseline').check()
 const [dataDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-download-early-years-baseline]').click()])
 const baselineBytes=fs.readFileSync(await dataDownload.path()),baseline=JSON.parse(baselineBytes.toString('utf8'))
 assert.equal(baseline.identity.paperId,paper.id)
 assert.equal(baseline.approval.renderCutoverAllowed,false)
 await page.locator('[data-early-years-reference-baseline]').getByRole('button',{name:/Close/}).click()
 await page.evaluate(()=>document.fonts.ready)
 const sheet=page.locator('.early-years-sheet-a4')
 const pngBytes=await sheet.screenshot({animations:'disabled'})
 const w=pngBytes.readUInt32BE(16),h=pngBytes.readUInt32BE(20)
 console.log('NATIVE_FIXTURE_PAGE_PNG_DIMENSIONS='+w+'x'+h)
 const pdfBytes=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})
 assert.ok(pngBytes.byteLength>2000&&pdfBytes.byteLength>2000)
 assert.equal(pdfBytes.subarray(0,4).toString(),'%PDF')
 assert.deepEqual(await storage(),initial)
 await page.getByRole('button',{name:/Capture Early Years reference baseline/}).click()
 await page.locator('[data-early-years-reference-baseline]').getByRole('button',{name:/Bind original A4 screenshot/}).click()
 const dialog=page.locator('[data-visual-evidence-dialog]')
 await dialog.waitFor()
 await dialog.locator('[data-visual-baseline-json]').setInputFiles({
  name:dataDownload.suggestedFilename(),mimeType:'application/json',buffer:baselineBytes})
 await dialog.locator('[data-visual-screen-png]').setInputFiles({
  name:'starter-original-preview-a4.png',mimeType:'image/png',buffer:pngBytes})
 await dialog.locator('[data-visual-native-pdf]').setInputFiles({
  name:'starter-original-print-a4.pdf',mimeType:'application/pdf',buffer:pdfBytes})
 for(const name of ['nativePreviewChecked','nativePrintPdfChecked','samePaperAndRevisionChecked',
  'contentLayoutAndFontsCompared','retainedThreeOriginalFiles','acknowledgeNotApproval'])
  await dialog.getByLabel(name).check()
 const generate=dialog.locator('[data-generate-visual-manifest]')
 assert.equal(await generate.isDisabled(),false)
 const [download]=await Promise.all([page.waitForEvent('download'),generate.click()])
 const manifestBytes=fs.readFileSync(await download.path()),manifest=JSON.parse(manifestBytes.toString('utf8'))
 assert.equal(manifest.subject.paperId,paper.id)
 assert.equal(manifest.subject.baselinePayloadSha256,baseline.integrity.payloadSha256)
 assert.equal(manifest.evidence.screen.sha256,sha(pngBytes))
 assert.equal(manifest.evidence.print.sha256,sha(pdfBytes))
 assert.equal(manifest.evidence.screen.width,w)
 assert.equal(manifest.evidence.screen.height,h)
 assert.equal(manifest.assurance.approvalStatus,'EVIDENCE_COLLECTED_UNVERIFIED')
 assert.equal(manifest.assurance.currentProductionCutoverAllowed,false)
 assert.equal(manifest.assurance.actualVisualDifferenceEvaluation,'PENDING_INDEPENDENT_REVIEW')
 assert.deepEqual(await storage(),initial)
 await dialog.locator('[data-visual-manifest-import]').setInputFiles({
  name:download.suggestedFilename(),mimeType:'application/json',buffer:manifestBytes})
 await dialog.locator('[data-verify-visual-manifest]').click()
 await dialog.getByRole('status').filter({hasText:/VERIFY PASS/}).waitFor()
 assert.deepEqual(await storage(),initial)
 // Same filename but one modified byte must be rejected without writing to source/overlay.
 const corrupted=Buffer.from(pdfBytes);corrupted[40]^=1
 await dialog.locator('[data-visual-native-pdf]').setInputFiles({
  name:'starter-original-print-a4.pdf',mimeType:'application/pdf',buffer:corrupted})
 await dialog.locator('[data-verify-visual-manifest]').click()
 await dialog.getByRole('alert').waitFor()
 assert.match(await dialog.getByRole('alert').innerText(),/Evidence bytes|PDF/i)
 assert.deepEqual(await storage(),initial)
})

test('real Saved Papers entry exposes shared SAVED_PAPER evidence binding but does not mutate the source', {timeout:35000},async()=>{
 const original={...official.papers.find(p=>p.id.includes('class-7-social-studies')),
  id:'phase3d-generic-saved-smoke-001',name:'Phase3D Saved Native Test',userAuthored:true}
 const baseKey='al_siddique_paper_store__'+scope
 await page.evaluate(({key,paper})=>{
  localStorage.setItem(key,JSON.stringify({savedPapers:[paper],questions:[],subjects:[],questionTypes:[]}))
 },{key:baseKey,paper:original})
 await page.goto('http://localhost:5295/saved-paper-baseline-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('input[placeholder*="Search papers"]').fill('Phase3D Saved Native Test')
 const trigger=page.getByRole('button',{name:/Capture native baseline for Phase3D Saved Native Test/})
 await trigger.waitFor()
 const pre=await page.evaluate(key=>localStorage.getItem(key),baseKey)
 await trigger.click()
 await page.locator('[data-paper-baseline-dialog]').waitFor()
 await page.locator('[data-paper-baseline-dialog] [data-open-visual-evidence]').click()
 const wizard=page.locator('[data-visual-evidence-dialog]')
 await wizard.waitFor()
 assert.match(await wizard.innerText(),/SAVED_PAPER/)
 assert.match(await wizard.innerText(),new RegExp(original.id))
 assert.equal(await wizard.locator('[data-generate-visual-manifest]').isDisabled(),true)
 await wizard.getByRole('button',{name:/Close/}).click()
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),baseKey),pre)
})
