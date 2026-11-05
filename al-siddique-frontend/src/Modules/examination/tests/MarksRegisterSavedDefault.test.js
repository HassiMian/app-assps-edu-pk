import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')

test('P0 Marks Review defaults to latest examination with saved marks and retains empty exam warning',{timeout:65000},async()=>{
 const vite=await createServer({root,server:{port:5876,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1250,height:850}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','synthetic-test-jwt');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:1,role:'principal',school_id:1}))})
 const calls=[]
 const exams=[
  {id:17,name:'Assessment 4',type:'AS',class:'All Classes',session:'2026-2027',saved_result_count:0,saved_scored_count:0},
  {id:16,name:'Assessment 3',type:'AS',class:'All Classes',session:'2026-2027',saved_result_count:0,saved_scored_count:0},
  {id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',saved_result_count:1854,saved_scored_count:1854},
 ]
 const saved=[
  {id:1,exam_id:9,student_id:101,student_name:'Amina',class:'Nine',section:'Fatima',roll_number:'01',subject:'English',marks_obtained:75,total_marks:75,result_status:'SCORED'},
  {id:2,exam_id:9,student_id:101,student_name:'Amina',class:'Nine',section:'Fatima',roll_number:'01',subject:'Biology',marks_obtained:66,total_marks:75,result_status:'SCORED'},
 ]
 await context.route('**/api/**',r=>{
  const u=new URL(r.request().url()),isResult=u.pathname.endsWith('/results')
  calls.push(u.pathname+u.search)
  const data=isResult?u.searchParams.get('exam_ids')==='9'?saved:[]:exams
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})})
 })
 const page=await context.newPage(), errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 try{
   await page.goto('http://127.0.0.1:5876/marks-register-test.html',{waitUntil:'domcontentloaded'})
   await page.getByText('Amina',{exact:true}).waitFor({timeout:20000})
   assert.equal(await page.getByLabel('Examination').inputValue(),'9')
   assert.ok((await page.getByLabel('Examination').innerText()).includes('1854 saved mark(s)'))
   assert.ok(calls.some(q=>q.includes('include_saved_counts=1')),'API must request saved counts')
   assert.ok(calls.some(q=>q.includes('exam_ids=9')),'Must only fetch saved exam results')
   assert.equal(await page.getByLabel('Class').locator('option').count(),2)
   assert.equal(await page.getByLabel('Section').locator('option').count(),2)
   assert.equal(await page.getByLabel('Subject').locator('option').count(),3)
   await page.getByLabel('Examination').selectOption('17')
   await page.getByText('This examination has no saved marks yet.',{exact:false}).waitFor({timeout:15000})
   assert.equal(await page.locator('tbody tr').count(),0)
   assert.equal(await page.getByLabel('Examination').inputValue(),'17')
   assert.equal(errors.length,0,'Client errors: '+errors.join(' | '))
   console.log('ASSPS_MARKS_VIEW_DEFAULT_SAVED_EXAM_AND_EMPTY_STATE_PASS',JSON.stringify({calls}))
 }finally{await context.close();await browser.close();await vite.close()}
})

