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
const report={consoleErrors:[]}
page.on('console',m=>{if(m.type()==='error'&&!/404|429|502|favicon/i.test(m.text()))report.consoleErrors.push(m.text())})
async function openSaved(){
 await page.goto(BASE+'/paper-generator?tab=saved',{waitUntil:'domcontentloaded'});await page.waitForTimeout(550)
 const name='First Term Examination 2026 - Class 7 - Social Studies'
 const search=page.locator('input[placeholder*="Search papers"]').first();await search.waitFor({timeout:7000});await search.fill(name);await page.waitForTimeout(160)
 const card=page.getByText(name,{exact:true}).first().locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Load & Preview")]][1]')
 await card.locator('button:has-text("Load & Preview")').first().click();await page.locator('.pts-generator-surface').waitFor({timeout:6000});await page.waitForTimeout(220)
}
await openSaved()
report.initialRows=await page.locator('[data-official-mcq-table] td[rowspan="2"]').count()
report.initialLabel=(await page.locator('[data-option-label]').first().innerText()).replace(/\s+/g,'')
await page.locator('[data-edit-paper-toggle]').click();await page.waitForTimeout(100)
const prompt=page.locator('[aria-label="Edit MCQ 1 question"]').first()
const option=page.locator('[aria-label="Edit MCQ 1 option 1"]').first()
const number=page.locator('[aria-label="Edit MCQ 1 number"]').first()
report.editable={prompt:await prompt.count(),option:await option.count(),number:await number.count()}
await prompt.click(); await page.keyboard.press('Control+A'); await page.keyboard.insertText('QA edited prompt'); report.duringPrompt=await prompt.innerText(); await prompt.blur(); await page.waitForTimeout(160); report.afterPromptOnly=await page.locator('[aria-label="Edit MCQ 1 question"]').first().innerText()
const optionNow=page.locator('[aria-label="Edit MCQ 1 option 1"]').first()
await optionNow.click(); await page.keyboard.press('Control+A'); await page.keyboard.insertText('QA edited option'); await optionNow.blur(); await page.waitForTimeout(160)
report.changedPrompt=await page.locator('[aria-label="Edit MCQ 1 question"]').first().innerText()
report.changedOption=await page.locator('[aria-label="Edit MCQ 1 option 1"]').first().innerText()
report.rowsAfter=await page.locator('[data-official-mcq-table] td[rowspan="2"]').count()
report.labelAfter=(await page.locator('[data-option-label]').first().innerText()).replace(/\s+/g,'')
await page.locator('[data-official-section]').first().click({position:{x:3,y:3}}); await page.waitForTimeout(80)
const raw=page.locator('[data-section-inspector] textarea[aria-label="Selected question raw content"]')
report.rawContains=await raw.count()?((await raw.inputValue()).includes('QA edited prompt')&&(await raw.inputValue()).includes('QA edited option')):false
report.ok=report.initialRows===10&&report.rowsAfter===10&&report.initialLabel==='الف)'&&report.labelAfter==='الف)'&&report.editable.prompt===1&&report.editable.option===1&&report.editable.number===1&&report.changedPrompt==='QA edited prompt'&&report.changedOption==='QA edited option'&&report.rawContains&&report.consoleErrors.length===0
fs.writeFileSync('../runtime/qa_structured_inplace_v3.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
await browser.close()
if(!report.ok) process.exitCode=1
