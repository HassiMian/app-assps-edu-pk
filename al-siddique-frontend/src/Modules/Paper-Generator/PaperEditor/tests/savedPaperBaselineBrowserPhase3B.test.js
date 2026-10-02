import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {Buffer} from 'node:buffer'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const testPaper={
 id:'paper-phase3b-native-001',name:'Phase3B Native Review',
 documentFormat:'pts-native-v13',userAuthored:true,printReadiness:'READY',
 config:{title:'FIRST TERM EXAMINATION',classLevel:'7',subject:'Social Studies',language:'urdu',totalMarks:50},
 official_section:[
  {id:'native-s1',heading:'سوال نمبر 1: درست جواب دیں۔',content:'پاکستان کا دارالحکومت کیا ہے؟',marks:50,
   medium:'urdu',type:'official_section',sourceOrder:1}
 ],selectedQuestions:{official_section:{questions:[],marks:50}},
 editorSettings:{template:'academic',fontFamily:'Jameel Noori Nastaleeq',fontSize:13,pageBorder:'thin'},
 createdAt:'2026-10-02T05:00:00.000Z',
}
const draftKey='doc__'+testPaper.id
const draft={
 baseCanonicalDocumentId:draftKey,baseFingerprint:'f'.repeat(64),draftVersion:2,savedAt:'2026-10-02T06:00:00.000Z',
 fieldPatches:{},metadataPatch:{},structured:{structuredPatches:{},insertedNodes:{},deletedNodeIds:[]}}
const executable=['C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 process.env.LOCALAPPDATA+'/Google/Chrome/Application/chrome.exe'].find(fs.existsSync)
let server,browser,context,page,downloadPath,downloadFilename
const downloadedFile=()=>({name:downloadFilename,mimeType:'application/json',buffer:fs.readFileSync(downloadPath)})
before(async()=>{
 server=await createServer({root,server:{port:5274,strictPort:true},appType:'spa'});await server.listen()
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox']})
 context=await browser.newContext({acceptDownloads:true,viewport:{width:1600,height:1200}})
 await context.addInitScript(({paper,draft,key})=>{
  const user={id:1,role:'principal',school_id:91,tenant_id:'phase3b-browser'}
  localStorage.setItem('al_siddique_user',JSON.stringify(user))
  localStorage.setItem('al_siddique_token','local_phase3b_proof')
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
  localStorage.setItem('al_siddique_paper_store__tenant-phase3b-browser',JSON.stringify({savedPapers:[paper],questions:[],subjects:[],questionTypes:[]}))
  localStorage.setItem('al_siddique_canonical_working_drafts__tenant-phase3b-browser',JSON.stringify({[key]:draft}))
 },{paper:testPaper,draft,key:draftKey})
 page=await context.newPage()
 await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await page.goto('http://localhost:5274/saved-paper-baseline-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('input[placeholder*="Search papers"]').fill('Phase3B Native Review')
 await page.getByRole('button',{name:/Capture native baseline for Phase3B Native Review/}).waitFor({timeout:15000})
})
after(async()=>{await context?.close().catch(()=>{});await browser?.close().catch(()=>{});await server?.close().catch(()=>{})})
const current=()=>page.evaluate(()=>{
 const store=localStorage.getItem('al_siddique_paper_store__tenant-phase3b-browser')
 const drafts=localStorage.getItem('al_siddique_canonical_working_drafts__tenant-phase3b-browser')
 return {store,drafts}
})
test('real Saved Papers card opens read-only modal, exports EXACT persisted source+overlay without storage changes', {timeout:60000},async()=>{
 const pre=await current()
 await page.getByRole('button',{name:/Capture native baseline for Phase3B Native Review/}).click()
 await page.locator('[data-paper-baseline-dialog]').waitFor()
 const exportButton=page.locator('[data-download-native-baseline]')
 assert.equal(await exportButton.isDisabled(),true)
 assert.match(await page.locator('[data-paper-baseline-dialog]').innerText(),/not a visual proof/i)
 await page.getByLabel('Confirm native paper baseline capture').check()
 const [download]=await Promise.all([page.waitForEvent('download'),exportButton.click()])
 assert.ok(download.suggestedFilename().startsWith('assps-native-baseline-paper-phase3b-native-001'))
 downloadPath=await download.path()
 downloadFilename=download.suggestedFilename()
 const bundle=JSON.parse(fs.readFileSync(downloadPath,'utf8'))
 assert.equal(bundle.identity.savedPaperId,testPaper.id)
 assert.deepEqual(bundle.sourcePaper,testPaper)
 assert.equal(bundle.canonicalWorkingDraft.key,draftKey)
 assert.deepEqual(bundle.canonicalWorkingDraft.payload,draft)
 assert.equal(bundle.approval.visualEvidenceStatus,'SCREENSHOT_AND_PDF_NOT_CAPTURED')
 assert.equal(bundle.approval.renderCutoverAllowed,false)
 assert.deepEqual(await current(),pre,'Snapshot export must not write into paper or draft storage.')
})
test('compare imported baseline on unchanged saved working copy MATCHES with no writes', {timeout:35000},async()=>{
 assert.ok(downloadPath)
 const pre=await current()
 await page.getByLabel('Compare native baseline JSON').setInputFiles(downloadedFile())
 await page.locator('[data-baseline-comparison]').waitFor({timeout:4000})
 assert.match(await page.locator('[data-baseline-comparison]').innerText(),/MATCH: exact persisted source/)
 assert.deepEqual(await current(),pre)
})
test('external current paper change flags source/appearance mismatch, and stale UI cannot export a new approved baseline', {timeout:35000},async()=>{
 await page.evaluate(()=>{
  const key='al_siddique_paper_store__tenant-phase3b-browser'
  const store=JSON.parse(localStorage.getItem(key))
  const current=store.savedPapers.find(p=>p.id==='paper-phase3b-native-001')
  current.editorSettings.pageBorder='double'
  localStorage.setItem(key,JSON.stringify(store))
 })
 await page.getByLabel('Compare native baseline JSON').setInputFiles(downloadedFile())
 const compare=page.locator('[data-baseline-comparison]')
 await compare.waitFor({timeout:4000})
 assert.match(await compare.innerText(),/CHANGED: native baseline differs/)
 assert.match(await compare.innerText(),/editorSettings/)
 await page.locator('[data-download-native-baseline]').click()
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/Displayed paper differs from persisted/)
 const changed=JSON.parse((await current()).store).savedPapers.find(p=>p.id===testPaper.id)
 assert.equal(changed.editorSettings.pageBorder,'double')
})
test('corrupted imported baseline cannot write, install, or restore a source', {timeout:35000},async()=>{
 const pre=await current()
 await page.getByLabel('Compare native baseline JSON').setInputFiles({
  name:'tampered.json',mimeType:'application/json',buffer:Buffer.from('{"format":"assps-native-saved-paper-baseline","version":1}')})
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/Comparison blocked/)
 assert.deepEqual(await current(),pre)
})

test('teacher UI cannot initiate principal/admin baseline capture', {timeout:35000},async()=>{
 const ctx=await browser.newContext({viewport:{width:1600,height:900}})
 try{
  await ctx.addInitScript(paper=>{
   const user={id:2,role:'teacher',school_id:91,tenant_id:'phase3b-teacher'}
   localStorage.setItem('al_siddique_user',JSON.stringify(user))
   localStorage.setItem('al_siddique_token','local_phase3b_teacher')
   localStorage.setItem('al_siddique_paper_store__tenant-phase3b-teacher',
    JSON.stringify({savedPapers:[paper],questions:[],subjects:[],questionTypes:[]}))
  },testPaper)
  const p=await ctx.newPage()
  await p.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
  await p.goto('http://localhost:5274/saved-paper-baseline-test.html',{waitUntil:'domcontentloaded'})
  await p.locator('input[placeholder*="Search papers"]').fill('Phase3B Native Review')
  await p.getByRole('button',{name:'Load & Preview'}).waitFor()
  assert.equal(await p.locator('[data-capture-native-baseline]').count(),0)
 }finally{await ctx.close()}
})
