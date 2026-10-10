import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright'
const port=Number(process.env.MARKS_BROWSER_PORT||5968),host=`http://127.0.0.1:${port}`
const vite=process.env.MARKS_BROWSER_REUSE==='1' ? null : spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']})
let logs='', browser
for(const stream of (vite?[vite.stdout,vite.stderr]:[]))stream.on('data',x=>logs+=x.toString())
try{
 let ready=false
 for(let n=0;n<90;n++){try{const r=await fetch(host+'/scripts/fixtures/marks-entry-firstterm.html',{signal:AbortSignal.timeout(850)});if(r.ok){ready=true;break}}catch{}await sleep(200)}
 assert.ok(ready,logs.slice(-1000))
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const page=await browser.newPage({viewport:{width:1400,height:1000}})
 const posts=[]
 let failMarks=false
 let emptyMode=false
 const enteredInEmpty=new Map()
 const students=[
  {id:101,name:'Synthetic One A',class:'One',gr_number:'SYN-101',father_name:'Synthetic F'},
  {id:102,name:'Synthetic One B',class:'Class One',gr_number:'SYN-102',father_name:'Synthetic F'},
  {id:203,name:'Synthetic Two C',class:'Two',gr_number:'SYN-203',father_name:'Synthetic F'}
 ]
 const json=(r,data,status=200)=>r.fulfill({status,contentType:'application/json',
 headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'},
 body:JSON.stringify(data)})
 await page.route('**/*', async route=>{
  const request=route.request(),url=new URL(request.url())
  if(url.hostname==='127.0.0.1' && !url.pathname.startsWith('/api/'))return route.continue()
  if(request.method()==='OPTIONS')return json(route,{})
  const path=url.pathname
  if(path==='/api/academic/setup')return json(route,{success:true,configured:true,data:{
   classes:[{name:'Class One',level:'1',active:true,sections:['A']},{name:'Two',level:'2',active:true,sections:['A']}],
   subjects:[],
   sessionStart:'2026-04-01',sessionEnd:'2027-03-31'}})
  if(path==='/api/exams' && request.method()==='GET')return json(route,{success:true,data:[
   {id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33},
   {id:20,name:'Monthly Assessment',type:'AS',class:'Class One',session:'2026-2027',total_marks:20,pass_marks:7}
  ]})
  if(path==='/api/students' && request.method()==='GET'){
   const cls=url.searchParams.get('class')
   // Reproduce legacy admissions mixed class storage. Unfiltered roster
   // access is intentionally forbidden; all four exact aliases are scoped.
   if(!cls)return json(route,{success:false,message:'Unfiltered roster forbidden'},403)
   if(cls==='One')return json(route,{success:true,data:[students[0]]})
   if(cls==='Class One')return json(route,{success:true,data:[students[1]]})
   if(cls==='1')return json(route,{success:true,data:[students[0]]})
   if(cls==='Class 1')return json(route,{success:true,data:[students[1]]})
   return json(route,{success:true,data:[]})
  }
  if(path==='/api/exams/results/9')return failMarks
    ? json(route,{success:false,message:'Saved marks temporarily unavailable'},503)
    : json(route,{success:true,data:emptyMode ? [...enteredInEmpty].map(([student_id,marks_obtained])=>({student_id,subject:'English',marks_obtained})) : [{student_id:101,subject:'English',marks_obtained:76}]})
  if(path==='/api/exams/results' && request.method()==='POST'){
   const payload=JSON.parse(request.postData()||'{}')
   posts.push(payload)
   if(emptyMode)for(const row of payload.results||[])enteredInEmpty.set(row.student_id,row.marks_obtained)
   return json(route,{success:true,savedCount:payload.results?.length||0})
  }
  return json(route,{success:false,message:'Unauthorized synthetic endpoint '+path},404)
 })
 await page.goto(host+'/scripts/fixtures/marks-entry-firstterm.html',{waitUntil:'domcontentloaded'})
 await page.getByText('Marks Sheet',{exact:true}).waitFor({timeout:20000})
 const examSelect=page.locator('select[name=savedExam]')
 await examSelect.locator('option',{hasText:'First Term Exam'}).waitFor({state:'attached',timeout:12000})
 assert.equal(await examSelect.inputValue(),'9')
 assert.ok((await examSelect.innerText()).includes('First Term Exam'))
 console.log('MARKS_BROWSER_PASS First Term Exam is visible and selected by persisted ID')
 await page.locator('select').nth(1).selectOption('One')
const subjectSelect=page.locator('select').nth(3)
const listed=await subjectSelect.locator('option').allTextContents()
assert.deepEqual(listed.filter(x=>x!=='Select subject'),[
 'English','Mathematics','Urdu','Science','Islamiyat','Quran / Nazra'
])
console.log('MARKS_BROWSER_PASS official First Term 2026-2027 subjects visible despite empty academic setup')
 await page.locator('select').nth(3).selectOption('English')
 await page.getByRole('button',{name:'Search Students'}).click()
 await page.getByText('Synthetic One A').waitFor({timeout:12000})
 assert.equal(await page.getByText('Synthetic One B').count(),1)
 assert.equal(await page.getByText('Synthetic Two C').count(),0)
 assert.equal(await page.locator('table tbody tr').count(),2)
 assert.equal(await page.locator('table tbody tr').nth(0).locator('input[type=number]').inputValue(),'76')
 console.log('MARKS_BROWSER_PASS union of partial class-specific alias rosters loads both, other class excluded, saved 76 restored')
 await page.locator('table tbody tr').nth(1).locator('input[type=number]').fill('101')
 await page.getByRole('button',{name:'Save All Marks'}).click()
 await page.getByText(/Invalid marks for Synthetic One B/).waitFor()
 assert.equal(posts.length,0)
 console.log('MARKS_BROWSER_PASS invalid over-maximum marks cannot be saved')
 await page.locator('table tbody tr').nth(1).locator('input[type=number]').fill('0')
 await page.getByRole('button',{name:'Save All Marks'}).click()
 await page.getByText(/Saved 1 edited student mark in First Term Exam/).waitFor()
 assert.equal(posts.length,1)
 assert.deepEqual(posts[0].results.map(r=>r.marks_obtained),[0])
 assert.ok(posts[0].results.every(r=>r.exam_id===9 && r.subject==='English'))
 console.log('MARKS_BROWSER_PASS save uses exact First Term ID9 and writes only edited zero, existing 76 untouched')
 await page.getByRole('button',{name:'Save All Marks'}).click()
 await page.getByText(/Enter at least one student mark/).waitFor()
 assert.equal(posts.length,1)
 console.log('MARKS_BROWSER_PASS second save without edits cannot rewrite any previous mark')
 await page.locator('select').nth(3).selectOption('Mathematics')
 failMarks=true
 await page.getByRole('button',{name:'Search Students'}).click()
 await page.getByText(/saved marks could not be verified/).waitFor({timeout:15000})
 assert.equal(await page.locator('table tbody tr').count(),2)
 assert.equal(await page.getByRole('button',{name:'Save All Marks'}).isDisabled(),true)
 assert.equal(posts.length,1)
 console.log('MARKS_BROWSER_PASS marks-read failure keeps roster visible and blocks unsafe save')
 // Tomorrow-morning exact workflow: no marks yet -> roster -> one zero -> save -> reopen.
 failMarks=false
 emptyMode=true
 const baseline=posts.length
 await page.goto(host+'/scripts/fixtures/marks-entry-firstterm.html',{waitUntil:'domcontentloaded'})
 await page.locator('select[name=savedExam] option',{hasText:'First Term Exam'}).waitFor({state:'attached'})
 await page.locator('select').nth(1).selectOption('One')
 await page.locator('select').nth(3).selectOption('English')
 await page.getByRole('button',{name:'Search Students'}).click()
 await page.getByText('Synthetic One A').waitFor()
 await page.getByText(/0 marks saved, 2 pending/).waitFor()
 const progress=page.getByRole('status')
 assert.match(await progress.innerText(),/0 saved/)
 assert.match(await progress.innerText(),/2 pending/)
 const marksInput=page.locator('table tbody tr').nth(0).locator('input[type=number]')
 assert.equal(await marksInput.inputValue(),'')
 await page.getByRole('button',{name:'Save All Marks'}).click()
 await page.getByText(/Enter at least one student mark/).waitFor()
 assert.equal(posts.length,baseline,'Never save an empty roster as zero')
 console.log('MARKS_BROWSER_ZERO_PASS all saved marks empty but 2 students visible and zero submissions')
 // Blank paper for offline recording: school logo never replaced with fake A crest.
 const [popup]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:'Print Blank Subject Sheet'}).click()])
 await popup.locator('table tbody tr').first().waitFor()
 assert.equal(await popup.locator('table tbody tr').count(),2)
 assert.ok((await popup.locator('table').innerText()).includes('Synthetic One A'))
 assert.equal(await popup.locator('img[alt="Official school logo"]').count(),0)
 assert.ok((await popup.locator('.logo-fallback').innerText()).includes('Logo not configured'))
 await popup.close()
 const [allSubjectsPopup]=await Promise.all([page.waitForEvent('popup'),page.getByRole('button',{name:'Print Blank All Subjects'}).click()])
 await allSubjectsPopup.locator('table tbody tr').first().waitFor()
 const actualHeadings=await allSubjectsPopup.locator('table thead th').allTextContents()
 for(const official of ['English','Mathematics','Urdu','Science','Islamiyat','Quran / Nazra'])
  assert.ok(actualHeadings.some(text=>text.includes(official)),'Official subject missing from blank sheet: '+official)
 assert.equal(await allSubjectsPopup.locator('table tbody tr').count(),2)
 const blankCss=await allSubjectsPopup.locator('style').first().textContent()
 assert.match(blankCss,/thead\{display:table-header-group\}/)
 await allSubjectsPopup.close()
 console.log('MARKS_BROWSER_ZERO_PASS blank All Subjects uses authentic six official First Term papers, repeatable table headers')
 console.log('MARKS_BROWSER_ZERO_PASS blank sheet printable for 2 students, no generated school crest')
 await marksInput.fill('0')
 await page.getByRole('button',{name:'Save All Marks'}).click()
 await page.getByText(/Saved 1 edited student mark/).waitFor()
 assert.equal(posts.length,baseline+1)
 assert.deepEqual(posts.at(-1).results.map(r=>r.marks_obtained),[0])
 assert.match(await progress.innerText(),/1 saved/)
 assert.match(await progress.innerText(),/1 pending/)
 await page.getByRole('button',{name:'Search Students'}).click()
 await page.getByText(/1 marks saved, 1 pending/).waitFor()
 assert.equal(await page.locator('table tbody tr').nth(0).locator('input[type=number]').inputValue(),'0')
 assert.equal(await page.locator('table tbody tr').nth(1).locator('input[type=number]').inputValue(),'')
 console.log('MARKS_BROWSER_ZERO_PASS first real zero saved once, reloaded from read API, other student remains blank')

} finally {await browser?.close();vite?.kill('SIGTERM')}
