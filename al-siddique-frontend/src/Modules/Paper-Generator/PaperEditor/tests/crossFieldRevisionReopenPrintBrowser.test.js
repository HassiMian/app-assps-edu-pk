import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')

test('cross-field English format: mouse selection > revision-bound saved document > reopen > print', {timeout:90000}, async t=>{
 const vite=await createServer({root:frontend,server:{port:5407,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close().catch(()=>{});await vite.close().catch(()=>{})})
 const context=await browser.newContext({viewport:{width:1650,height:1100}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_token','test-session-token')
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
  localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))
 })
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await context.route('**/api/auth/me',r=>r.fulfill({status:200,contentType:'application/json',body:'{"user":{"id":999,"role":"admin","school_id":1,"tenant_id":"assps"}}'}))
 let revision=0, received=[]
 await context.route('**/api/assessment-studio/papers/*/revisions',async route=>{
  const body=route.request().postDataJSON()
  received.push(body)
  revision++
  await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'phase9-cross-field',currentRevision:revision,contentHash:'b'.repeat(64),status:'DRAFT'}})})
 })
 const page=await context.newPage()
 page.on('dialog',d=>d.accept().catch(()=>{}))
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5407/paper-workspace-test.html?nestedScoring',{waitUntil:'domcontentloaded'})
 await page.locator('[data-paper-style-root]').waitFor({timeout:12000})
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const headingRoot=page.locator('[data-question-heading]').first()
 const serial=headingRoot.locator('[data-edit-field="question-number"]')
 const instruction=headingRoot.locator('[data-edit-field="question-heading"]')
 const serialText=await serial.textContent(),instructionText=await instruction.textContent()
 const beforeMarks=await page.locator('[data-marks-badge]').first().textContent()
 const a=await serial.boundingBox(),b=await instruction.boundingBox()
 assert.ok(a&&b)
 await page.mouse.move(a.x+a.width*.30,a.y+a.height*.55)
 await page.mouse.down()
 await page.mouse.move(b.x+Math.min(b.width*.33,115),b.y+b.height*.55,{steps:19})
 await page.mouse.up()
 const selection=await page.evaluate(()=>window.getSelection()?.toString()||'')
 assert.ok(selection.includes(serialText.slice(-1))&&selection.includes(instructionText.slice(0,3)),selection)
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 await toolbar.getByRole('button',{name:'B',exact:true}).click()
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 assert.match(await serial.innerHTML(),/font-weight:\s*bold|<b>/i)
 assert.match(await instruction.innerHTML(),/text-decoration(?:-line)?:\s*underline|<u>/i)
 await page.getByRole('button',{name:'Done Editing'}).click()
 await page.getByRole('button',{name:'Save Draft'}).click()
 await page.waitForFunction(()=>Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')).some(k=>{
  try{return JSON.parse(localStorage.getItem(k)).savedPapers?.some(p=>p.name==='Nested Scoring Browser Paper')}catch{return false}
 }),null,{timeout:15000})
 const saved=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')).flatMap(k=>{
  try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}
 }).find(p=>p.name==='Nested Scoring Browser Paper'))
 assert.ok(saved)
 const section=saved.official_section?.find(x=>x.id==='nested-choice')
 assert.ok(section,'Saved original section retained')
 assert.ok(section.richText?.questionSerial,'Serial richHTML should be saved')
 assert.ok(section.richText?.headingInstruction,'Instruction richHTML should be saved')
 assert.match(section.richText.questionSerial,/font-weight:\s*bold|<b>/i)
 assert.match(section.richText.headingInstruction,/text-decoration(?:-line)?:\s*underline|<u>/i)
 assert.equal(Number(section.marks),9)
 assert.equal(received.length,1,'Exactly one server revision mock accepted')
 assert.match(received[0].document.sections[0].headingFormatting?.questionSerial||'',/font-weight:\s*bold|<b>/i,'Authoritative document must contain selected serial style')
 assert.match(received[0].document.sections[0].headingFormatting?.headingInstruction||'',/text-decoration(?:-line)?:\s*underline|<u>/i,'Authoritative document must contain selected instruction style')
 assert.equal(received[0].expectedRevision,0)
 assert.equal(saved.persistenceAuthority,'SERVER_REVISION_SOURCE_OF_TRUTH')
 const serverView=await page.evaluate(async ({doc,paper})=>{
   const module=await import('/src/Modules/Paper-Generator/AssessmentStudio/core/manualAssessmentDocument.js')
   const serverOnly={...paper,official_section:paper.official_section.map(section=>{
     const {richText,...plain}=section
     return plain
   })}
   return module.mergeServerDocumentIntoLocalPaper(serverOnly,doc,{current_revision:1})
 },{doc:received[0].document,paper:saved})
 assert.match(serverView.official_section[0].richText.questionSerial,/font-weight:\s*bold|<b>/i)
 assert.match(serverView.official_section[0].richText.headingInstruction,/text-decoration(?:-line)?:\s*underline|<u>/i)
 assert.equal(serverView.serverRevision,1)
 assert.equal(serverView.persistenceAuthority,'SERVER_REVISION_SOURCE_OF_TRUTH')

 await page.goto('http://127.0.0.1:5407/paper-workspace-test.html?reopen&reopenId='+encodeURIComponent(saved.id),{waitUntil:'domcontentloaded'})
 await page.locator('[data-paper-style-root]').waitFor({timeout:12000})
 const reopenRoot=page.locator('[data-question-heading]').first()
 assert.equal(await reopenRoot.locator('[data-edit-field="question-number"]').textContent(),serialText)
 assert.equal(await reopenRoot.locator('[data-edit-field="question-heading"]').textContent(),instructionText)
 assert.match(await reopenRoot.locator('[data-edit-field="question-number"]').innerHTML(),/font-weight:\s*bold|<b>/i)
 assert.match(await reopenRoot.locator('[data-edit-field="question-heading"]').innerHTML(),/text-decoration(?:-line)?:\s*underline|<u>/i)
 assert.equal(Number((await page.locator('[data-marks-badge]').first().textContent()).match(/\d+/)?.[0]),Number(beforeMarks.match(/\d+/)?.[0]))
 await page.getByRole('button',{name:'Print / Save PDF'}).click()
 const iframe=page.locator('iframe').first()
 await iframe.waitFor({state:'attached',timeout:15000})
 const printed=await iframe.evaluate(el=>({serial:el.contentDocument?.querySelector('[data-edit-field="question-number"]')?.innerHTML||'',heading:el.contentDocument?.querySelector('[data-edit-field="question-heading"]')?.innerHTML||'',text:el.contentDocument?.body?.textContent||''}))
 assert.match(printed.serial,/font-weight:\s*bold|<b>/i)
 assert.match(printed.heading,/text-decoration(?:-line)?:\s*underline|<u>/i)

 // DOM sanitizer is shared by the visual editor and server-authoritative
 // document projection. Inline styles not on the allowlist are removed.
 const safeHtml=await page.evaluate(async()=>{
  const {sanitizeInlineHtml}=await import('/src/Modules/Paper-Generator/inlineHtmlSanitizer.js')
  return sanitizeInlineHtml('<b data-note="not-persisted">Bold</b><span style="color:#123456;position:absolute">Safe</span>')
 })
 assert.match(safeHtml,/<b>Bold<\/b>/i)
 assert.match(safeHtml,/color:\s*(?:#123456|rgb\(18,\s*52,\s*86\))/i)
 assert.doesNotMatch(safeHtml,/data-note|position:/i)
 const urduModel=await page.evaluate(async()=>{
  const source=await import('/src/Modules/Paper-Generator/AssessmentStudio/core/manualAssessmentDocument.js')
  const paper={id:'urdu-stage-fixture',userAuthored:true,official_section:[{
   id:'urdu-1',heading:'سوال نمبر 1: درست جواب لکھیں۔ (5)',content:'اردو جملہ',marks:5,
   richText:{questionSerial:'<b>سوال نمبر 1:</b>',headingInstruction:'<u>درست جواب لکھیں۔</u>'},
  }]}
  const doc=source.createManualAssessmentDocument({paper,config:{language:'urdu',subject:'Urdu',classLevel:'7',totalMarks:5}})
  const restored=source.mergeServerDocumentIntoLocalPaper({...paper,official_section:[]},doc,{current_revision:2})
  return {direction:doc.sections[0].direction,format:doc.sections[0].headingFormatting,section:restored.official_section[0]}
 })
 assert.equal(urduModel.direction,'rtl')
 assert.match(urduModel.format.questionSerial,/<b>سوال نمبر 1:<\/b>/)
 assert.match(urduModel.section.richText.headingInstruction,/<u>درست جواب لکھیں۔<\/u>/)
 assert.equal(Number(urduModel.section.marks),5)
 console.log('URDU_SERVER_CANONICAL_FORMATTING_REOPEN_PASS')

 assert.deepEqual(errors,[])
 console.log('CROSS_FIELD_SAVE_REOPEN_PRINT_MOCKED_REVISION_PASS')
})
