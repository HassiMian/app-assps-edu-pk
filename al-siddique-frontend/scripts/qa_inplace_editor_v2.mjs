import { chromium } from 'playwright'
import fs from 'node:fs'
const BASE='http://127.0.0.1:4178'
const TOKEN=fs.readFileSync('../runtime/prod_token.txt','utf8').trim()
const USER={id:1,email:'admin@assps.edu.pk',role:'admin',school_id:1,school_code:'assps',tenant_id:'assps',name:'Muhammad Haseeb Arshad',designation:'Principal',mustChangePassword:false}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const ctx=await browser.newContext({viewport:{width:1600,height:1100},storageState:{cookies:[],origins:[{origin:BASE,localStorage:[
 {name:'al_siddique_token',value:TOKEN},{name:'al_siddique_login_at',value:String(Date.now())},{name:'al_siddique_user',value:JSON.stringify(USER)}
]}]}})
const page=await ctx.newPage()
const report={urdu:{},edit:{},math:{},consoleErrors:[]}
page.on('console',m=>{if(m.type()==='error'&&!/404|429|502|favicon/i.test(m.text()))report.consoleErrors.push(m.text())})
async function openSaved(name){
 await page.goto(BASE+'/paper-generator?tab=saved',{waitUntil:'domcontentloaded'});await page.waitForTimeout(550)
 const search=page.locator('input[placeholder*="Search papers"]').first();await search.waitFor({timeout:7000});await search.fill(name);await page.waitForTimeout(150)
 const title=page.getByText(name,{exact:true}).first()
 const card=title.locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Load & Preview")]][1]')
 if(!await card.count()) throw new Error('Missing saved paper '+name)
 await card.locator('button:has-text("Load & Preview")').first().click()
 await page.locator('.pts-generator-surface').waitFor({timeout:6000});await page.waitForTimeout(220)
}
function near(a,b,t=2){return Math.abs(a-b)<=t}
await openSaved('First Term Examination 2026 - Class 1 - Islamiyat')
const fill=page.locator('[data-official-section][data-section-kind="fill_blank"]').first()
const firstRow=fill.locator('[data-numbered-response-row]').first()
const serial=firstRow.locator('[data-item-serial]')
const body=firstRow.locator('[data-paper-inline-editable], div').last()
const sb=await serial.boundingBox(), bb=await body.boundingBox()
report.urdu.serialText=(await serial.innerText()).trim()
report.urdu.sameLine=!!(sb&&bb&&Math.max(sb.y,bb.y)<Math.min(sb.y+sb.height,bb.y+bb.height))
const choice=page.locator('[data-option-choice]').first()
const lb=await choice.locator('[data-option-label-text]').boundingBox()
const rb=await choice.locator('[data-option-bracket]').boundingBox()
const tb=await choice.locator('[data-option-text]').boundingBox()
report.urdu.optionOrder=!!(lb&&rb&&tb&&lb.x>rb.x&&rb.x>tb.x)
report.urdu.optionLabel=(await choice.locator('[data-option-label]').innerText()).replace(/\s+/g,'')
const root=page.locator('[data-premium-template]').first()
const before=await root.boundingBox()
const sectionBefore=await page.locator('[data-official-section]').first().boundingBox()
await page.locator('[data-edit-paper-toggle]').click();await page.waitForTimeout(120)
const after=await root.boundingBox()
const sectionAfter=await page.locator('[data-official-section]').first().boundingBox()
report.edit.geometryStable=!!(before&&after&&sectionBefore&&sectionAfter&&near(before.width,after.width)&&near(sectionBefore.y,sectionAfter.y)&&near(sectionBefore.width,sectionAfter.width))
report.edit.inspector=await page.locator('[data-section-inspector]').count()===1
report.edit.legacyPanels=await page.locator('[data-edit-guide]').count()
const firstSection=page.locator('[data-official-section]').first()
await firstSection.click();await page.waitForTimeout(70)
report.edit.selected=await firstSection.getAttribute('data-edit-selected')
const heading=firstSection.locator('[data-edit-field="question-heading"]').first()
report.edit.headingEditable=await heading.getAttribute('contenteditable')
await heading.focus(); await page.waitForTimeout(80)
report.edit.selectionImmediate=await heading.evaluate(el=>{
 const node=el.firstChild||el
 const text=node.textContent||''
 const range=document.createRange();range.setStart(node,0);range.setEnd(node,Math.min(4,text.length))
 const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)
 document.dispatchEvent(new Event('selectionchange'))
 return {text:sel.toString(),collapsed:sel.isCollapsed,inside:el.contains(range.commonAncestorContainer)}
})
await page.waitForTimeout(80)
report.edit.selectionBefore=await heading.evaluate(el=>{const s=window.getSelection();return {text:s?.toString()||'',ranges:s?.rangeCount||0,collapsed:s?.isCollapsed,inside:!!(s&&s.rangeCount&&el.contains(s.getRangeAt(0).commonAncestorContainer))}})
const toolbar=page.locator('[data-inline-selection-toolbar]')
report.edit.selectionSaved=await toolbar.getAttribute('data-selection-saved')
const bold=toolbar.locator('button[title="B"]')
report.edit.boldEnabled=!(await bold.isDisabled())
await bold.click();await page.waitForTimeout(80)
report.edit.richHtml=await heading.innerHTML()
report.edit.partialBold=/(font-weight:\s*(?:bold|700)|<b>|<strong>)/i.test(report.edit.richHtml)
const divider=page.locator('[data-section-inspector] label').filter({hasText:'Section Divider'}).locator('select')
await divider.selectOption('hide');await page.waitForTimeout(70)
report.edit.dividerHidden=(await firstSection.locator('[data-section-heading]').evaluate(el=>getComputedStyle(el).borderBottomStyle))==='none'
await page.locator('[data-edit-paper-toggle]').click();await page.waitForTimeout(80)
report.edit.richPersists=/(font-weight:\s*(?:bold|700)|<b>|<strong>)/i.test(await firstSection.locator('[data-edit-field="question-heading"]').innerHTML())
await openSaved('First Term Examination 2026 - Class 1 - Countdown (Mathematics)')
const stack=page.locator('[data-place-value-stack]').first()
const nums=await stack.locator('span').evaluateAll(spans=>spans.map(s=>({text:(s.textContent||'').trim(),box:s.getBoundingClientRect()})).filter(x=>/^\d+$/.test(x.text)).map(x=>({text:x.text,right:x.box.right,left:x.box.left})))
report.math.numbers=nums.slice(0,3)
report.math.placeValueAligned=nums.length>=2&&near(nums[0].right,nums[1].right,1.5)
report.math.stacks=await page.locator('[data-place-value-stack]').count()
report.math.operationCells=await page.locator('[data-math-operation-matrix] [data-place-value-stack]').count()
report.ok=report.urdu.serialText==='الف)'&&report.urdu.sameLine&&report.urdu.optionOrder&&report.edit.geometryStable&&report.edit.inspector&&report.edit.legacyPanels===0&&report.edit.selected==='true'&&report.edit.headingEditable==='true'&&report.edit.boldEnabled&&report.edit.partialBold&&report.edit.dividerHidden&&report.edit.richPersists&&report.math.placeValueAligned&&report.consoleErrors.length===0
fs.writeFileSync('../runtime/qa_inplace_editor_v2.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close()
if(!report.ok)process.exitCode=1
