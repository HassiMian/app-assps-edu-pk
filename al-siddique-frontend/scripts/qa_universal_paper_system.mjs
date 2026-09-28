import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE='http://127.0.0.1:4178'
const TOKEN=fs.readFileSync('../runtime/prod_token.txt','utf8').trim()
const USER={id:1,email:'admin@assps.edu.pk',role:'admin',school_id:1,school_code:'assps',tenant_id:'assps',name:'Muhammad Haseeb Arshad',designation:'Principal',mustChangePassword:false}
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const ctx=await b.newContext({viewport:{width:1600,height:1200},storageState:{cookies:[],origins:[{origin:BASE,localStorage:[
 {name:'al_siddique_token',value:TOKEN},
 {name:'al_siddique_login_at',value:String(Date.now())},
 {name:'al_siddique_user',value:JSON.stringify(USER)}
]}]}})
const page=await ctx.newPage()
const errors=[];page.on('console',m=>{if(m.type()==='error'&&!/favicon|404|429|502/.test(m.text()))errors.push(m.text())})
const out={ok:true,issues:[],checks:{}}
const fail=msg=>{out.ok=false;out.issues.push(msg)}
await page.goto(BASE+'/paper-generator?tab=saved',{waitUntil:'domcontentloaded'})
const search=page.locator('input[placeholder*="Search papers"]').first();await search.waitFor({timeout:10000})
const expectedTabs=['Paper Workspace','Saved Papers','Question Bank','Pre Classes Papers','Daily Diary','Lesson Plans']
out.checks.tabs=[]
for(const label of expectedTabs){if(await page.getByRole('button',{name:label,exact:true}).count())out.checks.tabs.push(label);else fail('missing tab '+label)}
for(const hidden of ['AI Generator','Manual Draft','Unified Paper Generator','Board Paper Mode','AI Scan','Notes Maker'])if(await page.getByRole('button',{name:hidden,exact:true}).count())fail('legacy tab visible '+hidden)

const name='First Term Examination 2026 - Class 7 - Social Studies'
await search.fill(name);await page.waitForTimeout(150)
const title=page.getByText(name,{exact:true}).first()
const card=title.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Load & Preview")]][1]')
if(!await card.count())throw new Error('paper card missing')
await card.locator('button:has-text("Load & Preview")').first().click()
await page.locator('.pts-generator-surface').waitFor({timeout:6000});await page.waitForTimeout(200)

const totalMarks=page.locator('input[aria-label="Total Marks"]').first()
out.checks.headerControls=await page.locator('[data-paper-header-controls] input').count()
if(out.checks.headerControls<6)fail('primary header fields not editable')
if(!await totalMarks.count())fail('Total Marks missing')
const info=page.locator('[data-paper-metadata-editor]').first()
if(!await info.count())fail('metadata editor missing')
else{
 await info.locator('summary').click();await page.waitForTimeout(40)
 const labels=await info.locator('label').allInnerTexts();out.checks.metadataLabels=labels
 for(const req of ['Paper / Exam Title','Exam Type','Session','Campus / Address'])if(!labels.some(x=>x.includes(req)))fail('missing metadata '+req)
}
const ledger=page.locator('[data-marks-ledger]').first();out.checks.ledger=await ledger.innerText()
const quality=page.locator('[data-paper-quality-gate]').first();out.checks.quality=await quality.innerText()
if(!await page.locator('[data-apply-assps-rules]').count())fail('Apply ASSPS Rules missing')

const sections=page.locator('[data-official-section]')
out.checks.sectionCount=await sections.count()
if(out.checks.sectionCount!==4)fail('expected 4 sections')
const mcqTable=page.locator('[data-official-mcq-table]').first()
if(!await mcqTable.count())fail('MCQ table missing')
else{
 out.checks.mcqRows=await mcqTable.locator('td[rowspan="2"]').count()
 if(out.checks.mcqRows!==10)fail('expected 10 MCQs')
 const txt=await mcqTable.innerText()
 if(!txt.includes('قشر الارض کی کتنی بڑی پلیٹیں ہیں'))fail('MCQ1 correction missing')
 if(!txt.includes('فصلوں کی کتنی اقسام ہیں'))fail('MCQ8 correction missing')
 if(!txt.includes('بین الاقوامی تجارت کن راستوں سے ہوتی ہے'))fail('MCQ9 correction missing')
 const c=mcqTable.locator('[data-option-choice]').first()
 const l=c.locator('[data-option-label-text]'),br=c.locator('[data-option-bracket]'),t=c.locator('[data-option-text]')
 const lb=await l.boundingBox(),bb=await br.boundingBox(),tb=await t.boundingBox()
 out.checks.firstOption=(await c.innerText()).replace(/\s+/g,' ').trim()
 if((await l.innerText())!=='الف'||(await br.innerText())!==')')fail('Urdu option token wrong')
 if(lb&&bb&&tb&&!(lb.x>bb.x&&bb.x>tb.x))fail('Urdu option bracket geometry wrong')
}

if(await totalMarks.count()){
 const original=await totalMarks.inputValue();await totalMarks.fill('51');await page.waitForTimeout(60)
 if(!/Header\s*51/.test(await ledger.innerText()))fail('header marks edit not reflected')
 await totalMarks.fill(original);await page.waitForTimeout(50)
}

const editToggle=page.locator('[data-edit-paper-toggle]').first()
if(!await editToggle.count())fail('Edit Paper toggle missing')
else await editToggle.click()
await page.waitForTimeout(80)
out.checks.editGeometrySections=await page.locator('[data-edit-guide]').count()
if(out.checks.editGeometrySections!==0)fail('legacy edit panels still in paper flow')
const inspector=page.locator('[data-section-inspector]').first()
if(!await inspector.count())fail('floating section inspector missing')
await sections.first().click();await page.waitForTimeout(60)
if(await sections.first().getAttribute('data-edit-selected')!=='true')fail('section selection failed')
for(const label of ['Question No.','Marks','Question Type','Section Divider','Answer Lines','Lines / Item']){
 if(!await inspector.locator('label').filter({hasText:label}).count())fail('inspector control missing '+label)
}
for(const action of ['↑ Up','↓ Down','Duplicate','Delete','+ Add Question'])if(!await inspector.getByRole('button',{name:action,exact:true}).count())fail('action missing '+action)

const marksInput=inspector.locator('label').filter({hasText:'Marks'}).locator('input').first()
if(await marksInput.count()){
 const original=await marksInput.inputValue();await marksInput.fill('11');await page.waitForTimeout(70)
 if(!/Questions\s*51/.test(await ledger.innerText()))fail('section marks edit not reflected in ledger')
 await marksInput.fill(original);await page.waitForTimeout(70)
}
const heading=sections.first().locator('[data-edit-field="question-heading"]').first()
if(await heading.getAttribute('contenteditable')!=='true')fail('heading not editable in place')
const number=sections.first().locator('[data-edit-field="question-number"]').first()
const marks=sections.first().locator('[data-edit-field="marks"]').first()
if(await number.getAttribute('contenteditable')!=='true')fail('question number not editable in place')
if(await marks.getAttribute('contenteditable')!=='true')fail('marks badge not editable in place')

// Add -> select -> delete
const beforeAdd=await sections.count()
await inspector.getByRole('button',{name:'+ Add Question',exact:true}).click();await page.waitForTimeout(80)
if(await sections.count()!==beforeAdd+1)fail('add question failed')
else{await sections.last().click();await page.waitForTimeout(40);await inspector.getByRole('button',{name:'Delete',exact:true}).click();await page.waitForTimeout(80);if(await sections.count()!==beforeAdd)fail('delete question failed')}

// Duplicate -> delete duplicate
await sections.first().click();await page.waitForTimeout(40)
const beforeDup=await sections.count()
await inspector.getByRole('button',{name:'Duplicate',exact:true}).click();await page.waitForTimeout(80)
if(await sections.count()!==beforeDup+1)fail('duplicate failed')
else{await sections.nth(1).click();await page.waitForTimeout(40);await inspector.getByRole('button',{name:'Delete',exact:true}).click();await page.waitForTimeout(80);if(await sections.count()!==beforeDup)fail('duplicate cleanup failed')}

// Move first down then restore up
await sections.first().click();await page.waitForTimeout(40)
const firstBefore=(await sections.first().innerText()).trim()
await inspector.getByRole('button',{name:'↓ Down',exact:true}).click();await page.waitForTimeout(220)
const firstAfter=(await sections.first().innerText()).trim()
if(firstBefore===firstAfter)fail('move down failed')
else{await sections.nth(1).click();await page.waitForTimeout(60);await inspector.getByRole('button',{name:'↑ Up',exact:true}).click();await page.waitForTimeout(120)}

out.consoleErrors=[...new Set(errors)]
if(out.consoleErrors.length)fail('console errors '+out.consoleErrors.join(' | '))
fs.writeFileSync('../runtime/qa_universal_paper_system_v2.json',JSON.stringify(out,null,2))
console.log(JSON.stringify(out,null,2))
await b.close()
if(!out.ok)process.exitCode=1
