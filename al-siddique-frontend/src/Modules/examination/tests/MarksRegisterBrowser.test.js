import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
test('Marks Register shows zero, absent, print and edit route', {timeout:85000},async t=>{
 const vite=await createServer({root,server:{port:5873,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 const rows=[
  {id:1,exam_id:9,student_id:101,student_name:'Amina',class:'9',section:'Girls',roll_number:'01',subject:'English',marks_obtained:0,total_marks:75,result_status:'SCORED'},
  {id:2,exam_id:9,student_id:101,student_name:'Amina',class:'9',section:'Girls',roll_number:'01',subject:'Biology',marks_obtained:65,total_marks:75,result_status:'SCORED'},
  {id:3,exam_id:9,student_id:102,student_name:'Sara',class:'9',section:'Girls',roll_number:'02',subject:'English',marks_obtained:null,total_marks:75,result_status:'ABSENT'}
 ]
 await context.route('**/api/exams/results*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:rows})}))
 await context.route('**/api/exams/results/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{revision_id:77,marks_obtained:45,grade:'F'}})}))
 await context.route('**/api/exams*',r=>{
  const isResult=new URL(r.request().url()).pathname.endsWith('/results')
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:isResult?rows:[{id:9,name:'First Term 2026',session:'2026-27'}]})})
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5873/marks-register-test.html')
 await page.getByText('Amina',{exact:true}).waitFor({timeout:8000})
 assert.equal(await page.locator('tbody tr').count(),2)
 assert.ok((await page.locator('tbody tr .mr-score').allTextContents()).includes('0'))
 assert.equal(await page.getByText('ABSENT',{exact:true}).count(),1)
 const pending=context.waitForEvent('page')
 await page.getByRole('button',{name:'Print Marks Sheet'}).click()
 const print=await pending
 await print.waitForLoadState('domcontentloaded')
 const html=await print.content()
 assert.match(html,/School Examination Office|AL SIDDIQUE SCHOLARS PUBLIC SCHOOL/)
 assert.match(html,/ABSENT/)
 assert.match(html,/Recorded Total/)
 await print.close()
 await page.getByRole('button',{name:'Edit'}).first().click()
 const dialog=page.getByRole('dialog',{name:'Principal audited marks correction'})
 await dialog.waitFor()
 await dialog.locator('input[type="number"]').fill('44')
 await dialog.locator('textarea').fill('Corrected after crosschecking original signed paper.')
 await dialog.getByRole('button',{name:'Save Audited Revision'}).click()
 await page.getByText(/Principal revision saved with audit receipt #77/).waitFor()
 console.log('MARKS_REVIEW_ZERO_ABSENT_PRINT_AUDITED_EDIT_FORM_PASS')
})

test('school API 403 denial never prints any saved marks',{timeout:75000},async t=>{
 const vite=await createServer({root,server:{port:5874,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 await context.route('**/api/exams/results*',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({success:false,message:'Exam records access denied.'})}))
 await context.route('**/api/exams*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[{id:9,name:'First Term'}]})}))
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5874/marks-register-test.html')
 await page.getByText('Exam records access denied.').waitFor({timeout:20000})
 assert.equal(await page.getByRole('button',{name:'Print Marks Sheet'}).isDisabled(),true)
 assert.equal(await page.locator('tbody tr').count(),0)
 console.log('MARKS_REVIEW_DENIED_NO_STUDENT_DATA_NO_PRINT_PASS')
})

test('switching to a denied examination clears previously visible marks before 403 response',{timeout:75000},async t=>{
 const vite=await createServer({root,server:{port:5875,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 await context.route('**/api/exams*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[{id:9,name:'First Term'},{id:10,name:'Restricted Exam'}]})}))
 await context.route('**/api/exams/results*',r=>{
  const blocked=new URL(r.request().url()).searchParams.get('exam_ids')==='10'
  return r.fulfill({status:blocked?403:200,contentType:'application/json',body:JSON.stringify(blocked?{success:false,message:'Restricted examination.'}:{success:true,data:[{id:1,exam_id:9,student_id:101,student_name:'Amina',class:'9',section:'Girls',subject:'English',marks_obtained:0,total_marks:75,result_status:'SCORED'}]})})
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5875/marks-register-test.html')
 await page.getByText('Amina',{exact:true}).waitFor({timeout:20000})
 await page.getByLabel('Examination').selectOption('10')
 await page.getByText('Restricted examination.').waitFor({timeout:20000})
 assert.equal(await page.getByText('Amina',{exact:true}).count(),0)
 assert.equal(await page.locator('tbody tr').count(),0)
 assert.equal(await page.getByRole('button',{name:'Print Marks Sheet'}).isDisabled(),true)
 console.log('MARKS_EXAM_SWITCH_DENIAL_PURGES_STALE_ROWS_PASS')
})
