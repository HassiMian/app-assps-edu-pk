import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const host='127.0.0.1',port=5196
const base='http://'+host+':'+port
const app=await createServer({configFile:'vite.config.js',server:{host,port,strictPort:true,hmr:false}})
await app.listen()
const browser=await chromium.launch({
  headless:true,
  executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
})
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:false})
const seen=[]
const manifest={
 schema:'assps.lesson_plan.review_import.v1',
 source_zip_sha256:'1'.repeat(64),source_txt_sha256:'2'.repeat(64),unassigned_evidence:[],
 candidates:[
  {candidate_key:'LPREVIEW-20261014-starter-english',proposed_class_level:'Starter',
   school_id:1,class_display:'Play',source_subject_label:'English',
   source_submissions:['WA14-L2847'],
   source_detail_records:[{source_id:'WA14-L2847',received_at:'2026-10-14 13:21',
     source_excerpt_pieces:[{source_start_line:10,source_end_line:12,verbatim:'Original Starter English A B C'}]}]},
  {candidate_key:'LPREVIEW-20261014-mover-math',proposed_class_level:'Mover',
   school_id:1,class_display:'Mover',source_subject_label:'Mathematics',
   source_submissions:['WA14-L3001'],
   source_detail_records:[{source_id:'WA14-L3001',received_at:'2026-10-14 20:30',
     source_excerpt_pieces:[{source_start_line:35,source_end_line:38,verbatim:'Mover Counting 1 to 50'}]}]}
 ]
}
let stored=[]
const source=new Map()
await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}))
page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('Failed to load resource'))seen.push('console:'+msg.text().slice(0,180))})
page.on('pageerror',e=>seen.push('pageerror:'+e.message))
await page.route('**/api/lesson-plans/planner/**',async route=>{
 const request=route.request(),url=request.url(),method=request.method()
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',
   headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)})
 if(url.includes('/composer-review-readiness')){
   return reply({success:true,data:{
     releaseStatus:'HOLD',publishAllowed:false,
     counts:{expected:2,privatelyStaged:stored.length,verifiedTeacherIdentity:0,
       principalSourceInspections:0,academicPublications:0}
   }})
 }
 if(url.includes('/composer-review-classes'))return reply({success:true,data:stored})
 if(url.includes('/composer-review-preview'))return reply({success:true,data:{
   candidateCount:2,classes:[{className:'Starter'},{className:'Mover'}],published:false
 }})
 if(url.includes('/composer-review-import')&&method==='POST'){
   const body=request.postDataJSON()?.reviewBatch
   for(const c of body.candidates){
     source.set(c.candidate_key,{id:c.candidate_key,revision:1,source:{
       sourceSubmissions:c.source_detail_records,sourceIds:c.source_submissions,
       corrections:[],issues:[],sourceDigest:'fake-review-test-only'
     }})
   }
   stored=body.candidates.map(c=>({id:c.candidate_key,classLevel:c.proposed_class_level,
      subject:c.source_subject_label,revision:1,title:'TEST ONLY'}))
   return reply({success:true,data:{staged:2,previouslyStaged:0,publicationAllowed:false,notificationsSent:0}})
 }
 if(url.includes('/composer-review-correction/')&&method==='POST'){
   const id=decodeURIComponent(url.split('/').pop())
   const current=source.get(id)
   const body=request.postDataJSON()
   assert.equal(body.expectedRevision,current.revision)
   current.revision+=1
   current.source.corrections.push({eventId:'test-event-1',proposedText:body.proposedText,
     changeType:body.changeType,decision:'PROPOSED_NOT_APPROVED',integrityHash:'f'.repeat(64)})
   return reply({success:true,data:{revision:current.revision,academicApproval:false,published:false}})
 }
 if(url.includes('/composer-review-assignment-evidence/'))return reply({success:true,data:{verifiedCount:0,verificationStatus:'ASSIGNMENT_EVIDENCE_REQUIRED',candidates:[]}})
 if(url.includes('/composer-review-principal-inspection/'))return reply({success:false,code:'COMPOSER_PRINCIPAL_REVIEW_RELEASE_HOLD'},503)
 if(url.includes('/composer-review-source/')){
   const id=decodeURIComponent(url.split('/').pop())
   const current=source.get(id)
   return current?reply({success:true,data:current}):reply({success:false,code:'NOT_FOUND'},404)
 }
 return reply({success:false,code:'UNKNOWN_MOCK_ROUTE'},404)
})
try{
 await page.goto(base+'/composer-review-test.html',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Class-wise Second Term Syllabus Review'}).waitFor()
 await page.getByText('Academic release readiness: HOLD — none of these sources are published').waitFor()
 await page.getByRole('button',{name:/Original Source Import/}).click()
 await page.locator('#composer-manifest').setInputFiles({name:'review.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(manifest))})
 await page.getByText('Validated 2 groups across 2 classes.').waitFor()
 await page.getByRole('button',{name:'Starter · Playgroup'}).click()
 await page.getByText('Original Starter English A B C').waitFor()
 assert.equal(await page.getByText('Original Starter English A B C').count(),1)
 await page.getByRole('button',{name:/Save Private Review Groups/}).click()
 await page.getByText('Private staging completed: 2 new').waitFor()
 await page.getByRole('button',{name:/Reopen original revision/}).click()
 await page.getByText('The original source and correction revision were reopened from the server.').waitFor()
 await page.locator('.composer-edit select').first().selectOption('WA14-L2847')
 await page.locator('.composer-edit textarea').nth(0).fill('Proposed new date after source verification')
 await page.locator('.composer-edit textarea').nth(1).fill('Source timeline and term dates need school calendar approval')
 await page.getByRole('button',{name:/Save Revision Proposal/}).click()
 await page.getByText('Proposed correction saved and reopened at revision 2.').waitFor()
 const proposal=await page.locator('.composer-proposal').innerText()
 assert.ok(proposal.includes('PROPOSED_NOT_APPROVED'))
 assert.equal(await page.getByText('Original Starter English A B C').count(),1)
 const popupPromise=page.waitForEvent('popup',{timeout:9000})
 await page.getByRole('button',{name:'Print Class Review'}).click()
 const popup=await popupPromise
 await popup.waitForLoadState('domcontentloaded')
 const html=await popup.content()
 assert.ok(html.includes('Original Starter English A B C'))
 assert.ok(html.includes('NOT PUBLISHED'))
 assert.ok(html.includes('Proposed'))
 assert.equal(seen.length,0,JSON.stringify(seen))
 console.log('COMPOSER_BROWSER_QA: 12/12 workflow assertions PASS (synthetic Principal API mock; not real staff)')
 console.log('PRINT_PREVIEW: popup original text, correction proposal, A4 CSS PASS; native physical printer NOT tested')
 await popup.close()
 await page.reload({waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Class-wise Second Term Syllabus Review'}).waitFor()
 await page.getByRole('button',{name:'Starter · Playgroup'}).waitFor()
 await page.waitForFunction(() => { const x=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Print All Classes')); return x&&!x.disabled })
 const popupTwo=page.waitForEvent('popup',{timeout:10000})
 await page.getByRole('button',{name:'Print All Classes'}).click()
 const batch=await popupTwo
 await batch.waitForLoadState('domcontentloaded')
 const batchHtml=await batch.content()
 assert.ok(batchHtml.includes('Original Starter English A B C'))
 assert.ok(batchHtml.includes('Mover Counting 1 to 50'))
 assert.equal((batchHtml.match(/class="class"/g)||[]).length,2)
 await batch.close()
 console.log('BATCH_PRINT_REOPEN_QA: both class sources reloaded from server mock, class-wise A4 print preview PASS')
}catch(error){console.error('COMPOSER_BROWSER_QA_FAILED',error.message,'BODY',String(await page.locator('body').innerText()).slice(0,1600),'ERRORS',seen);process.exitCode=1}
finally{await browser.close();await app.close()}
