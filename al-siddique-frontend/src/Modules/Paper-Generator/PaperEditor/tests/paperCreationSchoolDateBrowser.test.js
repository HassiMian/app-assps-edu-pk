import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {createBlankPaperDraft} from '../../paperCreationDraft.js'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5542
const mockClock=(iso,fn)=>{
 const ActualDate=globalThis.Date
 globalThis.Date=class DateOnPakistanMidnight extends ActualDate {constructor(...a){super(...(a.length?a:[iso]))}static now(){return Number(new ActualDate(iso))}}
 try{return fn()}finally{globalThis.Date=ActualDate}
}

test('new blank paper content defaults to Pakistani school date at 00:30, preserving explicit exam date',()=>{
 const input={classLevel:'7',subjectName:'Science',targetMarks:50}
 const blank=mockClock('2026-10-08T19:30:00.000Z',()=>createBlankPaperDraft(input))
 console.log('BLANK_PAPER_DOMAIN_PAKISTAN_MIDNIGHT',blank.config.examDate)
 assert.equal(blank.config.examDate,'2026-10-09')
 const selected=mockClock('2026-10-08T19:30:00.000Z',()=>createBlankPaperDraft({...input,examDate:'2026-09-29'}))
 assert.equal(selected.config.examDate,'2026-09-29')
 assert.deepEqual(blank.official_section,[])
})

test('canonical Paper Workspace Blank Paper setup chooses school calendar day after PK midnight',{timeout:95000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({timezoneId:'Asia/Karachi',viewport:{width:1440,height:950}})
 await context.clock.install({time:new Date('2026-10-08T19:30:00.000Z')})
 const page=await context.newPage()
 try{
  await page.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
  await page.goto(`http://127.0.0.1:${PORT}/paper-workspace-test.html?new`,{waitUntil:'domcontentloaded',timeout:40000})
  await page.locator('[data-create-paper-home]').waitFor({timeout:18000})
  await page.getByText('Create a Blank Paper',{exact:false}).first().click()
  const input=page.getByLabel('Blank paper date');await input.waitFor({state:'visible',timeout:12000})
  const actual=await input.inputValue();console.log('BLANK_PAPER_WORKSPACE_PAKISTAN_MIDNIGHT',actual)
  assert.equal(actual,'2026-10-09','New paper creation must not silently backdate an exam in Pakistan')
  await input.fill('2026-09-28');assert.equal(await input.inputValue(),'2026-09-28','Teacher-picked exam date must remain editable and unchanged')
 }finally{await context.close()}
})
