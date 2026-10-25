import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const port=5261,host='127.0.0.1'
const source=JSON.parse(fs.readFileSync('/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json','utf8'))
const dev=await createServer({configFile:'vite.config.js',server:{host,port,strictPort:true,hmr:false}})
await dev.listen()
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1480,height:900}})
const errors=[],rosterRequests=[]
page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{
 localStorage.setItem('al_siddique_token','synthetic')
 localStorage.setItem('al_siddique_login_at',String(Date.now()))
 localStorage.setItem('al_siddique_user',JSON.stringify({id:92001,role:'admin',designation:'Principal',school_id:1}))
})
await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname
 const fulfill=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,data})})
 if(path==='/api/auth/me')return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({user:{id:92001,role:'admin',designation:'Principal',school_id:1,is_active:true}})})
 if(path==='/api/school/settings/current')return fulfill({schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',school_id:1,logoUrl:'/school-logo.svg'})
 if(path.includes('/api/students')){rosterRequests.push(path);return fulfill([
  ...Array.from({length:5},(_,i)=>({id:10000+i,name:'QA Student '+(i+1),roll_number:'T'+(i+1),class:'Starter',section:'Blue'})),
  {id:10008,name:'Other School Scope',class:'Nine',section:'Blue'}
 ])}
 if(path.endsWith('/planner/private-source-bundle'))return fulfill(source)
 if(path==='/api/lesson-plans')return fulfill([])
 return fulfill(null,401)
})
try{
 await page.goto('http://'+host+':'+port+'/term-planner-branded-test.html',{waitUntil:'networkidle'})
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:15000})
 await page.locator('[data-wn-class]').selectOption('Four')
 await page.locator('[data-wn-class]').selectOption('Starter')
 await page.getByRole('button',{name:'1. Term Syllabus'}).click()
 await page.getByLabel('Academic term').selectOption('Second Term')
 await page.locator('.term-roster-list').getByText('QA Student 5').waitFor({timeout:15000})
 assert.equal(await page.locator('.term-roster-list').getByText('Other School Scope').count(),0)
 assert.equal(await page.locator('.term-print-document').count(),5)
 assert.equal(await page.locator('[data-term-schedule-hold]').count(),0)
 for(const [cards,expectedSheets] of [[2,3],[3,2],[4,2]]){
  await page.getByLabel('Term students per page').selectOption(String(cards))
  assert.equal(await page.locator('[data-term-print-sheet]').count(),expectedSheets)
  const studentNames=await page.locator('.term-student-identification strong').allInnerTexts()
  assert.equal(studentNames.length,5)
  assert.equal(new Set(studentNames).size,5)
  assert.ok(studentNames.every(n=>n.startsWith('Student: QA Student ')))
  const cardsOnEachSheet=await page.locator('[data-term-print-sheet]').evaluateAll(nodes=>
    nodes.map(n=>n.querySelectorAll('.term-print-document').length))
  assert.deepEqual(cardsOnEachSheet,cards===2?[2,2,1]:cards===3?[3,2]:[4,1])
  assert.ok(await page.locator('.term-subject-assessments').first().count())
  console.log('TERM_CARDS_LAYOUT',cards,expectedSheets,'PASS')
 }
 assert.deepEqual(errors,[])
 console.log('FIVE_SYNTHETIC_STUDENTS_NO_LIVE_PII_PASS')
}catch(e){console.error('TERM_CARDS_LAYOUT_FAIL',e.message,'consoleErrors',errors,'rosterRequests',rosterRequests,
 'rosterCount',await page.locator('.term-roster-list label').count(),
 'classValue',await page.locator('[data-wn-class]').inputValue(),
 'rosterMsgs',await page.locator('.wn-roster-status').allInnerTexts());process.exitCode=1}
finally{await browser.close();await dev.close()}
