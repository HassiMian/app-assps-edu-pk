import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
const students=Array.from({length:302},(_,i)=>({
 student_id:1000+i,student_name:'Synthetic Student '+String(i+1),
 class:['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight'][Math.floor(i/28)%11],
 section:'Blue',roll_number:String(i+1)
}))
const subjects=['English','Mathematics','Urdu','Science','Islamiyat','Computer Science']
const results=students.flatMap((s,i)=>subjects.map((subject,j)=>({
 ...s,id:10000+i*10+j,exam_id:9,subject,total_marks:75,
 marks_obtained:i===0&&j===0?0:45+(i+j)%25,grade:'C',result_status:'SCORED'
})))
test('302 synthetic students, 1812 subject marks, one 302-card batch document without data substitution',{timeout:110000},async t=>{
 const vite=await createServer({root,server:{port:5897,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({viewport:{width:1280,height:900}})
 await context.route('**/api/**',r=>{
  const u=new URL(r.request().url());let data=[]
  if(u.pathname==='/api/exams')data=[{id:9,name:'First Term Exam',class:'All Classes',session:'2026-2027',
    subject_offerings:subjects.map(subject=>({class_name:'One',section:'Blue',subject,total_marks:75}))}]
  if(u.pathname==='/api/exams/grade-settings')data=[{label:'A',from:80,to:100},{label:'B',from:70,to:79},{label:'C',from:60,to:69},{label:'D',from:40,to:59},{label:'F',from:0,to:39}]
  if(u.pathname==='/api/exams/results/9')data=results
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})})
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:5897/resultcards-v2-test.html')
 await page.locator('#result-cards-print-target-select').selectOption('all',{timeout:16000})
 await page.getByText(/302 card\(s\) across all classes/).waitFor({timeout:20000})
 const begin=Date.now()
 await page.locator('#result-cards-generate-top-btn').click()
 await page.getByRole('button',{name:/Preview all 302 cards/}).waitFor({timeout:20000})
 const opened=context.waitForEvent('page',{timeout:35000})
 await page.getByRole('button',{name:/Preview all 302 cards/}).click()
 const doc=await opened
 await doc.waitForLoadState('domcontentloaded',{timeout:35000})
 const number=await doc.locator('.result-card-a4').count()
 const state=await doc.evaluate(()=>({nodes:document.querySelectorAll('*').length,heap:performance.memory?.usedJSHeapSize||null}))
 console.log('BATCH_302_STRESS_QA',JSON.stringify({cards:number,subjects:results.length,renderMs:Date.now()-begin,...state}))
 assert.equal(number,302)
 const txt=await doc.locator('body').innerText()
 assert.match(txt,/Synthetic Student 1\b/)
 assert.match(txt,/Synthetic Student 302\b/)
 await doc.pdf({path:'/tmp/assps-resultv3-302-cards-A4-QA.pdf',preferCSSPageSize:true,printBackground:true})
 await doc.close()
})
