import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const host='127.0.0.1',port=5199
const dev=await createServer({configFile:'vite.config.js',server:{host,port,strictPort:true,hmr:false}})
await dev.listen()
const browser=await chromium.launch({headless:true,
 executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
 args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1460,height:940},acceptDownloads:true})
const errors=[]
const source='/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json'
const bundle=JSON.parse(fs.readFileSync(source,'utf8'))
const serverRows=[]
const writes=[]
await page.addInitScript(()=>{
 localStorage.setItem('al_siddique_user',JSON.stringify({id:92001,role:'admin',designation:'Principal',school_id:1}))
})
const students=[
 {id:9001,name:'QA Student Alpha',roll_number:'QA01',section:'Blue',class:'Four'},
 {id:9002,name:'QA Student Beta',roll_number:'QA02',section:'Blue',class:'Four'},
 {id:9003,name:'QA Student Gamma',roll_number:'QA03',section:'Blue',class:'Four'}
]
page.on('pageerror',e=>errors.push(e.message))
await page.route('**/api/students*',route=>route.fulfill({status:200,
 contentType:'application/json',body:JSON.stringify({data:students})}))
await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname
 const method=route.request().method()
 if(path.includes('/api/students'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:students})})
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',
   body:JSON.stringify({success:status<400,data})})
 if(path.endsWith('/planner/private-source-bundle')){
   assert.equal(method,'GET')
   return reply(bundle)
 }
 if(path.endsWith('/api/lesson-plans')){
   if(method==='GET')return reply(serverRows)
   if(method==='POST'){
     const body=route.request().postDataJSON()
     writes.push(body)
     assert.equal(body.planningScope,'weekly')
     assert.equal(body.plannerDocument?.provenance?.academicPublication,'BLOCKED')
     assert.equal(body.plannerDocument?.layoutSettings?.fontFamily,'Times New Roman')
     assert.ok(!JSON.stringify(body).includes('QA Student'))
     assert.equal(body.sentToPortal,undefined)
     const saved={...body,id:'lp_qa_weekly_server_0001',revision:1,serverRevision:1}
     serverRows.push(saved)
     return reply(saved,201)
   }
 }
 if(path.includes('/api/lesson-plans/lp_qa_weekly_server_0001')&&method==='PUT'){
   const body=route.request().postDataJSON()
   assert.equal(Number(body.expectedRevision),1)
   const saved={...body,id:'lp_qa_weekly_server_0001',revision:2,serverRevision:2}
   serverRows.splice(0,1,saved)
   writes.push(body)
   return reply(saved)
 }
 return reply([])
})
try{
 await page.goto('http://'+host+':'+port+'/weekly-notebook-test.html',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Weekly Lesson Planning'}).waitFor()
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:18000})
 await page.locator('[data-wn-class]').selectOption('Four')
 await page.getByRole('button',{name:'1. Term Syllabus'}).click()
 assert.equal(await page.locator('[data-term-edit-subject]').count(),6)
 await page.getByRole('button',{name:'2. Weekly Plan'}).click()

 await page.getByText('3 authorized students loaded').waitFor()
 await page.waitForFunction(()=>document.querySelectorAll('[data-lesson-student-card]').length===3)
 assert.equal(await page.locator('[data-lesson-student-card]').count(),3)
 const beforeWeekSize=Number((await page.locator('[data-lesson-student-card]').first().evaluate(
    x=>getComputedStyle(x).getPropertyValue('--wn-subject-name-size').trim())).replace('px',''))
 await page.getByRole('button',{name:'Increase planner subject size'}).click()
 const afterWeekSize=Number((await page.locator('[data-lesson-student-card]').first().evaluate(
    x=>getComputedStyle(x).getPropertyValue('--wn-subject-name-size').trim())).replace('px',''))
 assert.equal(afterWeekSize,beforeWeekSize+1)
 await page.getByRole('button',{name:'Toggle planner subject bold'}).click()
 assert.equal(await page.getByRole('button',{name:'Toggle planner subject bold'}).getAttribute('aria-pressed'),'false')
 await page.getByLabel('Student cards / page').selectOption('1')
 assert.equal(await page.locator('.wn-paper').count(),3)
 await page.getByLabel('Student cards / page').selectOption('2')
 assert.equal(await page.locator('.wn-paper').count(),2)
 await page.getByLabel('Student cards / page').selectOption('3')
 assert.equal(await page.locator('.wn-paper').count(),1)
 assert.equal(await page.locator('[data-wn-pages] .wn-paper').count(),1)
 assert.equal(await page.locator('.wn-subjects label').count(),6)
 assert.ok((await page.locator('.wn-card-identity').first().innerText()).includes('QA Student Alpha'))
 const weekOptions=await page.locator('[data-wn-week] option').allTextContents()
 const i=weekOptions.findIndex(x=>x.includes('09 Nov'))
 assert.ok(i>=0)
 await page.locator('[data-wn-week]').selectOption(String(i))
 await page.waitForTimeout(200)
 assert.ok((await page.locator('.wn-assess-chip').first().innerText()).includes('14 Nov 2026'))
 const task=page.locator('.wn-editline').first().locator('textarea')
 await task.fill('Unit #7 — Verb; pages #29–32. Practise briefly.')
 await page.getByRole('button',{name:'Save Week to School Server'}).click()
 await page.getByText('Saved to the authenticated school server.').waitFor()
 assert.equal(serverRows.length,1)
 await page.reload({waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Weekly Lesson Planning'}).waitFor()
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:18000})
 await page.locator('[data-wn-class]').selectOption('Four')
 const item=page.locator('.wn-panel').filter({has:page.getByText('Server Saved Weeks')}).locator('.wn-saved button').first()
 await item.waitFor()
 await item.click()
 await page.locator('.wn-editline').first().locator('textarea').waitFor()
 assert.equal(await page.getByRole('button',{name:'Toggle planner subject bold'}).getAttribute('aria-pressed'),'false')
 assert.equal(await page.locator('.wn-card').first().evaluate(n=>
   getComputedStyle(n).getPropertyValue('--wn-subject-name-size').trim()),afterWeekSize+'px')
 assert.equal(await page.locator('.wn-editline').first().locator('textarea').inputValue(),
  'Unit #7 — Verb; pages #29–32. Practise briefly.')
 await page.locator('.wn-editline').first().locator('textarea').fill('Unit #7 — Verb; pages #29–32. Revised weekly work.')
 await page.getByRole('button',{name:'Save Week to School Server'}).click()
 await page.getByText('Saved to the authenticated school server.').waitFor()
 assert.equal(writes.length,2)
 assert.equal(serverRows[0].serverRevision,2)
 assert.equal(await page.locator('[data-lesson-student-card]').count(),3)
 await page.getByText('Class in-charge (Principal-provided):').waitFor()
 // Six full-length subjects and a separate assessment table correctly block
 // the overloaded three-card page rather than silently shrinking user fonts.
 await page.getByRole('button',{name:'Print Selected Students'}).click()
 await page.getByText('Some student cards are too long for this A4 layout.').waitFor()
 await page.getByLabel('Student cards / page').selectOption('1')
 const popupPromise=page.waitForEvent('popup',{timeout:8000})
 await page.getByRole('button',{name:'Print Selected Students'}).click()
 const popup=await popupPromise
 await popup.waitForLoadState('domcontentloaded')
 const printed=await popup.content()
 assert.ok(printed.includes('QA Student Alpha'))
 assert.ok((await popup.locator('body').innerText()).includes('Unit #7'))
 assert.ok(printed.includes('ASSESSMENT'))
 assert.ok(printed.includes('school-logo.svg'))
 const printedSubjectStyle=await popup.locator('.wn-card').first().evaluate(n=>({
   size:getComputedStyle(n).getPropertyValue('--wn-subject-name-size').trim(),
   weight:getComputedStyle(n).getPropertyValue('--wn-subject-name-weight').trim()
 }))
 assert.equal(printedSubjectStyle.size,afterWeekSize+'px')
 assert.equal(Number(printedSubjectStyle.weight),450)
 const layout=await popup.evaluate(()=>{
   const p=document.querySelector('.wn-paper'),cards=[...document.querySelectorAll('.wn-card')]
   return {paper:p?{offsetW:p.offsetWidth,offsetH:p.offsetHeight,scrollH:p.scrollHeight,
     display:getComputedStyle(p).display,height:getComputedStyle(p).height,
     transform:getComputedStyle(p).transform}:null,
     cardSizes:cards.map(c=>({h:c.offsetHeight,scroll:c.scrollHeight})),
     styleCount:document.querySelectorAll('style').length,
     linkCount:document.querySelectorAll('link[rel=stylesheet]').length}
 })
 console.log('PDF_LAYOUT_DIAGNOSTIC',JSON.stringify(layout))
 const pdf='/tmp/assps-weekly-notebook-qa-20261015.pdf'
 await popup.pdf({path:pdf,format:'A4',printBackground:true})
 console.log('WEEKLY_NOTEBOOK_PDF_BYTES',fs.statSync(pdf).size)
 await page.locator('[data-wn-class]').selectOption('One')
 await page.waitForTimeout(200)
 assert.equal(await page.locator('.wn-card-identity').filter({hasText:'QA Student Alpha'}).count(),0)
 assert.equal(await page.locator('.wn-card-identity').filter({hasText:'QA Student Beta'}).count(),0)
 assert.equal(await page.locator('.wn-card-identity').filter({hasText:'QA Student Gamma'}).count(),0)
 await page.waitForTimeout(160)
 assert.equal(await page.locator('[data-wn-week] option').count(),18)
 const firstWeek=await page.locator('.wn-editline').allInnerTexts()
 assert.ok(firstWeek.some(x=>x.includes('English-A')))
 assert.ok((await page.locator('.wn-editline').first().locator('textarea').inputValue()).includes('Pages 36–38'))
 assert.ok((await page.locator('.wn-panel').first().innerText()).includes('Miss Amna'))
 await page.locator('[data-wn-week]').selectOption('16')
 await page.waitForTimeout(160)
 assert.ok((await page.locator('.wn-assess-chip').first().innerText()).includes('10 Feb 2027'))
 console.log('CLASS_ONE_IMAGE_REVIEW: verified 18 weeks, visual source W1 pages and W17 test review PASS')
 assert.equal(errors.length,0,JSON.stringify(errors))
 await popup.close()
 await page.getByRole('button',{name:'3. Daily Student Cards'}).click()
 assert.equal(await page.locator('.wn-card').first().evaluate(n=>
   getComputedStyle(n).getPropertyValue('--wn-subject-name-size').trim()),afterWeekSize+'px')
 await page.locator('.wn-daily-date input[type=date]').fill('2026-11-10')
 await page.waitForTimeout(90)
 assert.ok((await page.locator('.wn-card-week').first().innerText()).includes('10 Nov 2026'))
 const dailyPopup=page.waitForEvent('popup')
 await page.getByRole('button',{name:'Print Selected Students'}).click()
 const daily=await dailyPopup
 await daily.waitForLoadState('domcontentloaded')
 assert.ok((await daily.locator('body').innerText()).includes('DAILY LEARNING NOTE'))
 await daily.close()
 await page.getByRole('button',{name:'2. Weekly Plan'}).click()
 assert.equal(writes.length,2)
 console.log('WEEKLY_NOTEBOOK_CHROMIUM: auto-original59 + server Save/Reopen + roster3 + 3card overflow safe-block + 1card A4 + assessed14Nov + print PASS')
 console.log('NO_PRODUCTION_DB_WRITES: mock actor and synthetic students only')
}catch(e){
 console.error('WEEKLY_NOTEBOOK_BROWSER_FAILED',e.message)
 console.error('TEXT',String(await page.locator('body').innerText()).slice(0,1700))
 console.error('JS_ERRORS',errors)
 process.exitCode=1
}finally{await browser.close();await dev.close()}
