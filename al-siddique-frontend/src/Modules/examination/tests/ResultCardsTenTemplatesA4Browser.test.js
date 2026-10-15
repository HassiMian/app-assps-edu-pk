import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
const exams=[{id:9,name:'First Term Exam',class:'All Classes',school_id:1,session:'2026-2027',total_marks:75,type:'TE'},{id:6,name:'Smoke Test Exam 123',class:'All Classes',school_id:1},{id:7,name:'Assessment - Class 1',class:'One',school_id:1}]
const students=[
 {student_id:101,student_name:'Amina',class:'One',section:'A',roll_number:'01'},
 {student_id:102,student_name:'Sara',class:'One',section:'A',roll_number:'02'},
 {student_id:103,student_name:'Usman',class:'One',section:'B',roll_number:'03'},
 {student_id:104,student_name:'Ali',class:'Two',section:'A',roll_number:'04'}
]
const subjectNames=['English','Mathematics','Urdu','General Knowledge','Science','Islamiyat','Computer Science','Social Studies']
const results=students.flatMap((s,i)=>subjectNames.map((subject,j)=>({
 ...s,id:800+i*100+j,exam_id:9,subject,marks_obtained:(i===0&&j===0)?0:53+i+j,
 total_marks:75,grade:'B',result_status:'SCORED'
})))

test('First Term 8-subject A4 print ten distinct themes page and overflow integrity',{timeout:90000},async t=>{
 const server=await createServer({root,server:{port:5895,strictPort:true}})
 await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await server.close()})
 const ctx=await browser.newContext({viewport:{width:1370,height:900}})
 await ctx.route('**/api/**',r=>{
  const uri=new URL(r.request().url())
  let data=[]
  if(uri.pathname==='/api/exams')data=exams
  if(uri.pathname==='/api/exams/grade-settings')data=[{label:'A',from:80,to:100},{label:'B',from:60,to:79},{label:'F',from:0,to:59}]
  if(uri.pathname==='/api/exams/results/9')data=results
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})})
 })
 const page=await ctx.newPage()
 page.on('pageerror',e=>console.log('RESULTCARD_PAGE_ERROR',e.message))
 await page.goto('http://127.0.0.1:5895/resultcards-v2-test.html')
 await page.waitForFunction(()=>!!document.querySelector('#result-cards-exam-select option[value="9"]'),null,{timeout:20000})
 assert.equal(await page.getByRole('option',{name:/Smoke Test/}).count(),0)
 await page.locator('#result-cards-exam-select').selectOption('9')
 await page.getByText(/card\(s\) for Class One/).waitFor({timeout:3500})
 assert.equal(await page.locator('#result-cards-student-select').inputValue(),'')
 assert.equal(await page.getByRole('option',{name:/All 3 students in selected class/}).count(),1)
 await page.locator('#result-cards-section-select').selectOption('A')
 await page.getByText(/2 card\(s\) for Class One/).waitFor({timeout:15000})
 await page.locator('#result-cards-generate-top-btn').click()
 const modal=page.getByText('Professional Result Card Designer')
 await modal.waitFor()
 assert.equal(await page.locator('.premium-featured-tile').count(),10)
 assert.equal(await page.getByRole('button',{name:/Scholars Archive/}).count(),1)
 const themes=[
  'Signature Editorial','Swiss Grid','Data Atelier','Regal Linework',
  'Young Scholars','Academic Heritage','Airframe Geometry','Corporate Ledger',
  'Examination Dossier','Scholars Archive']
 for(const title of themes){
  await page.getByRole('button',{name:new RegExp(title)}).click()
  const pre=await page.locator('.result-preview-panel .result-card-a4').evaluate(node=>({
   height:node.scrollHeight,clientHeight:node.clientHeight,
   width:node.scrollWidth,clientWidth:node.clientWidth,
   overflowY:node.scrollHeight>node.clientHeight+2,
   overflowX:node.scrollWidth>node.clientWidth+2
  }))
  assert.equal(pre.overflowY,false,title+' preview clipped vertically '+JSON.stringify(pre))
  assert.equal(pre.overflowX,false,title+' preview clipped horizontally '+JSON.stringify(pre))
 }
 await page.getByRole('button',{name:/Scholars Archive/}).click()
assert.equal(await page.getByRole('button',{name:/Preview all 2 cards/}).count(),1)
 const popupP=ctx.waitForEvent('page')
 await page.getByRole('button',{name:/Preview all 2 cards/}).click()
 const full=await popupP
 await full.waitForLoadState('domcontentloaded')
 assert.equal(await full.locator('.result-card-a4').count(),2)
 const content=await full.content()
 assert.match(content,/Amina/)
 assert.match(content,/Sara/)
 assert.doesNotMatch(content,/Usman/)
 assert.doesNotMatch(content,/Ali/)
 assert.match(content,/font-size:9.1pt/)
 await full.pdf({path:'/tmp/assps-resultcard-v2-eight-subject-QA.pdf',format:'A4',preferCSSPageSize:true,printBackground:true})
 await full.close()
 await page.getByRole('button',{name:'Close'}).click()
 await page.locator('#result-cards-student-select').selectOption('101')
 await page.getByText(/1 card\(s\) for Class One/).waitFor()
 await page.locator('#result-cards-generate-top-btn').click()
 await page.getByText('Professional Result Card Designer').waitFor()
 assert.equal(await page.locator('.result-batch-pagination').count(),0)
 await page.getByRole('button',{name:'Close'}).click()
 await page.locator('#result-cards-print-target-select').selectOption('all')
 await page.getByText(/4 card\(s\) across all classes/).waitFor()
 await page.locator('#result-cards-generate-top-btn').click()
 await page.getByRole('button',{name:/Preview all 4 cards/}).waitFor()
 const allPromise=ctx.waitForEvent('page')
 await page.getByRole('button',{name:/Preview all 4 cards/}).click()
 const all=await allPromise
 await all.waitForLoadState('domcontentloaded')
 assert.equal(await all.locator('.result-card-a4').count(),4)
 const allMarkup=await all.content()
 assert.match(allMarkup,/Amina/)
 assert.match(allMarkup,/Sara/)
 assert.match(allMarkup,/Usman/)
 assert.match(allMarkup,/Ali/)
 await all.close()
 console.log('FIRST_TERM_CLASS_SECTION_BATCH_TWO_SINGLE_STUDENT_ONE_ALL_CLASSES_FOUR_PASS')
})
