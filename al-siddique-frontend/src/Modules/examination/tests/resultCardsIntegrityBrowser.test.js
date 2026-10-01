import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const port=5239
let server,browser,context,page
let scenario='partial'
const exam = { id:9,school_id:1,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33 }
const scheduledSubjects=[
 {class_name:'One',section:'Yellow',subject:'English',total_marks:50,pass_marks:20,pass_percentage:40,sort_order:1},
 {class_name:'One',section:'Yellow',subject:'Mathematics',total_marks:60,pass_marks:20,pass_percentage:33,sort_order:2},
]
function resultsForScenario() {
 const base={student_id:21,name:'Local Test Student',gr_number:'TEST-001',class:'One',section:'Yellow',father_name:'Test Parent'}
 const english={...base,id:1001,subject:'English',marks_obtained:scenario==='zero'?0:scenario==='complete-fail'?19:25,total_marks:50,grade:scenario==='zero'||scenario==='complete-fail'?'F':'D'}
 const maths={...base,id:1002,subject:'Mathematics',marks_obtained:60,total_marks:60,grade:'A+'}
 return scenario==='partial'?[english]:[english,maths]
}

before(async ()=>{
 const executablePath=[
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 (process.env.LOCALAPPDATA||'')+'/Google/Chrome/Application/chrome.exe',
 ].find(fs.existsSync)
 server=await createServer({root,server:{port,strictPort:true}})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']})
 context=await browser.newContext({viewport:{width:1366,height:950}})
 await context.route('**/api/settings/public*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})}))
 await context.route('**/api/exams',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[exam]})}))
 await context.route('**/api/exams/results/9',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  success:true,data:resultsForScenario(),scheduledSubjects,
 })}))
 page=await context.newPage()
})
beforeEach(async ()=>{
 await page.goto('about:blank')
 await page.goto(`http://localhost:${port}/result-cards-integrity-test.html`,{waitUntil:'domcontentloaded'})
 await page.getByText('Result Cards',{exact:true}).waitFor({state:'visible',timeout:20000})
 await page.getByText('Result Card Preview').waitFor({state:'visible',timeout:20000})
})
after(async ()=>{ await context?.close(); await browser?.close(); await server?.close() })

test('partial First Term cannot print an incomplete final card, with pending subject visible',async ()=>{
 scenario='partial'
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByText(/Result Incomplete:/).waitFor({state:'visible',timeout:20000})
 assert.match(await page.locator('[role="status"]').first().textContent(),/1\/2 scheduled papers verified/)
 assert.match(await page.locator('[role="status"]').first().textContent(),/Mathematics/)
 assert.equal(await page.getByRole('button',{name:'Generate Report Cards'}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:/Print \/ Export Card/}).isDisabled(),true)
})

test('selected 40% pass threshold makes English 19/50 a Fail despite high total',async ()=>{
 scenario='complete-fail'
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByText('Result Card Preview').waitFor({state:'visible',timeout:20000})
 assert.equal(await page.getByRole('button',{name:'Generate Report Cards'}).isEnabled(),true)
 assert.match(await page.getByText(/Status: Fail/).last().textContent(),/Grade: F/)
 assert.ok((await page.locator('body').innerText()).includes('19 / 50 (Pass: 20)'))
})

test('recorded zero remains a recorded mark, yields Fail, and does not masquerade as missing',async ()=>{
 scenario='zero'
 await page.reload({waitUntil:'domcontentloaded'})
 await page.getByText('Result Card Preview').waitFor({state:'visible',timeout:20000})
 assert.equal(await page.getByRole('button',{name:'Generate Report Cards'}).isEnabled(),true)
 assert.ok((await page.locator('body').innerText()).includes('0 / 50 (Pass: 20)'))
 assert.equal(await page.getByText(/Result Incomplete:/).count(),0)
})
