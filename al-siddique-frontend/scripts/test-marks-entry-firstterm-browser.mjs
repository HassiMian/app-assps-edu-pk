import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright'
const port=5968,host=`http://127.0.0.1:${port}`
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']})
let logs='', browser
for(const stream of [vite.stdout,vite.stderr])stream.on('data',x=>logs+=x.toString())
try{
 let ready=false
 for(let n=0;n<90;n++){try{const r=await fetch(host+'/scripts/fixtures/marks-entry-firstterm.html',{signal:AbortSignal.timeout(850)});if(r.ok){ready=true;break}}catch{}await sleep(200)}
 assert.ok(ready,logs.slice(-1000))
 browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const page=await browser.newPage({viewport:{width:1400,height:1000}})
 const posts=[]
 let failMarks=false
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
   subjects:[{name:'English',classes:['1','2']},{name:'Mathematics',classes:['1','2']}],
   sessionStart:'2026-04-01',sessionEnd:'2027-03-31'}})
  if(path==='/api/exams' && request.method()==='GET')return json(route,{success:true,data:[
   {id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33},
   {id:20,name:'Monthly Assessment',type:'AS',class:'Class One',session:'2026-2027',total_marks:20,pass_marks:7}
  ]})
  if(path==='/api/students' && request.method()==='GET'){
   const cls=url.searchParams.get('class')
   // Reproduce old backend's exact-equality failure for class query.
   return json(route,{success:true,data:cls?[]:students})
  }
  if(path==='/api/exams/results/9')return failMarks
    ? json(route,{success:false,message:'Saved marks temporarily unavailable'},503)
    : json(route,{success:true,data:[{student_id:101,subject:'English',marks_obtained:76}]})
  if(path==='/api/exams/results' && request.method()==='POST'){
   const payload=JSON.parse(request.postData()||'{}')
   posts.push(payload)
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
 await page.locator('select').nth(3).selectOption('English')
 await page.getByRole('button',{name:'Search Students'}).click()
 await page.getByText('Synthetic One A').waitFor({timeout:12000})
 assert.equal(await page.getByText('Synthetic One B').count(),1)
 assert.equal(await page.getByText('Synthetic Two C').count(),0)
 assert.equal(await page.locator('table tbody tr').count(),2)
 assert.equal(await page.locator('table tbody tr').nth(0).locator('input[type=number]').inputValue(),'76')
 console.log('MARKS_BROWSER_PASS two class-alias roster students load, other class excluded, saved 76 restored')
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
} finally {await browser?.close();vite.kill('SIGTERM')}
