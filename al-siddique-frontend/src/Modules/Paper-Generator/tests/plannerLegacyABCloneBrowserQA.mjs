import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {buildWeeklyServerPayload} from '../weeklyServerPayload.js'
import {buildTermServerPayload} from '../termPlanningModel.js'

const source=JSON.parse(fs.readFileSync(
  '/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json','utf8'))
const digest=source.source_zip_sha256
assert.match(digest,/^[a-f0-9]{64}$/)
const klass='Two'
const originalPartKeys=Object.fromEntries(
 source.candidates.filter(c=>c.class_display===klass&&
  (c.source_subject_label==='English-A'||c.source_subject_label==='English-B'))
  .map(c=>[c.source_subject_label,c.candidate_key])
)
assert.deepEqual(Object.keys(originalPartKeys).sort(),['English-A','English-B'])
const week={start:'2026-10-15',end:'2026-10-17',index:1}
const oldRows=[
 {id:originalPartKeys['English-A'],subject:'English-A',task:'Previously saved unique lesson A',originalSourceIds:['WA-original-A'],assessments:[]},
 {id:originalPartKeys['English-B'],subject:'English-B',task:'Previously saved unique lesson B',originalSourceIds:['WA-original-B'],assessments:[]}
]
const weekPayload=buildWeeklyServerPayload({
 klass,section:'',week,rows:oldRows,sourceZipSha256:digest
})
const legacyWeekly={...weekPayload.plannerDocument,
 id:'lp_legacy_ab_week_001',revision:1,serverRevision:1}
const termRows=oldRows.map(x=>({id:x.id,subject:x.subject,detail:x.task,
 pageFrom:'',pageTo:'',sourceStatus:'SOURCE DATED / REVIEW',
 originalSourceIds:x.originalSourceIds,needsReview:true}))
const termPayload=buildTermServerPayload({
 klass,section:'',term:'Second Term',start:'2026-10-15',end:'2027-02-15',
 rows:termRows,assessments:[],sourceZipSha256:digest
})
const legacyTerm={...termPayload.plannerDocument,
 id:'lp_legacy_ab_term_001',revision:1,serverRevision:1}
const initialWeek=JSON.stringify(legacyWeekly)
const initialTerm=JSON.stringify(legacyTerm)
const host='127.0.0.1'
const dev=await createServer({configFile:'vite.config.js',
 server:{host,port:0,strictPort:false,hmr:false}})
await dev.listen()
const port=dev.httpServer.address().port
const browser=await chromium.launch({headless:true,
 executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
 args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1440,height:940}})
await page.addInitScript(()=>localStorage.setItem('al_siddique_user',
 JSON.stringify({id:92001,role:'admin',designation:'Principal',school_id:1})))
const writes=[]
const docs=[legacyWeekly,legacyTerm]
const pageerrors=[]
page.on('pageerror',e=>pageerrors.push(e.message))
await page.route('**/api/**',route=>{
 const url=new URL(route.request().url())
 const method=route.request().method()
 const reply=(data,status=200)=>route.fulfill({
  status,contentType:'application/json',body:JSON.stringify({success:status<400,data})
 })
 if(url.pathname.endsWith('/planner/private-source-bundle'))return reply(source)
 if(url.pathname.endsWith('/api/lesson-plans')){
  if(method==='GET')return reply(docs)
  if(method==='POST'){
   const body=route.request().postDataJSON()
   writes.push({method,body})
   const draft={...body.plannerDocument,
    id:'lp_grouped_'+writes.length,revision:1,serverRevision:1}
   docs.push(draft)
   return reply(draft,201)
  }
 }
 if(method!=='GET') {
  writes.push({method,unexpected:true,url:url.pathname})
  return reply({error:'NEVER MUTATE HISTORICAL A/B DRAFT'},403)
 }
 return reply([])
})
try{
 await page.goto('http://'+host+':'+port+'/weekly-notebook-test.html',{waitUntil:'domcontentloaded'})
 await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:30000})
 await page.locator('[data-wn-class]').selectOption(klass)
 const saved=page.locator('.wn-panel').filter({has:page.getByRole('heading',{name:/Server Saved Weeks/})}).locator('.wn-saved button')
 await saved.first().waitFor({timeout:14000})
 await saved.first().click()
 const a=await page.locator('.wn-editline').filter({has:page.locator('label').getByText('English',{exact:false})}).locator('textarea').inputValue()
 assert(a.includes('[A] Previously saved unique lesson A'))
 assert(a.includes('[B] Previously saved unique lesson B'))
 await page.getByRole('button',{name:'Save Week to School Server'}).click()
 await page.getByText('Saved to the authenticated school server.').waitFor({timeout:12000})
 assert.equal(writes.length,1)
 assert.equal(writes[0].method,'POST')
 assert.deepEqual(writes[0].body.plannerDocument.subjects
  .filter(x=>x.subject==='English').length,1)
 assert.equal(JSON.stringify(legacyWeekly),initialWeek)
 console.log('LEGACY_WEEK_CLONED_POST_NOT_PUT','SOURCE_A_B_BOTH_PRESERVED')

 await page.getByRole('button',{name:'1. Term Syllabus'}).click()
 const termSaved=page.locator('.term-saved button')
 await termSaved.first().waitFor({timeout:12000})
 await termSaved.first().click()
 await page.getByText('Old separate A/B draft loaded as a new unified draft.',{exact:false}).waitFor({timeout:9000})
 const coverage=await page.getByRole('textbox',{name:'English term coverage'}).inputValue()
 assert(coverage.includes('[A] Previously saved unique lesson A'))
 assert(coverage.includes('[B] Previously saved unique lesson B'))
 await page.getByRole('button',{name:'Save Term',exact:true}).click()
 await page.getByText('Saved term draft to the school server (not published).').waitFor({timeout:14000})
 assert.equal(writes.length,2)
 assert.equal(writes[1].method,'POST')
 assert.equal(JSON.stringify(legacyTerm),initialTerm)
 assert(!writes.some(x=>x.method==='PUT'))
 assert.equal(pageerrors.length,0)
 console.log('LEGACY_TERM_CLONED_POST_NOT_PUT','SOURCE_A_B_BOTH_PRESERVED')
 console.log('NO_HISTORICAL_REVISION_OVERWRITE_NO_PUBLICATION')
}catch(err){
 console.error('LEGACY_AB_CLONE_BROWSER_FAIL',err.message)
 console.error((await page.locator('body').innerText()).slice(0,850))
 throw err
}finally{
 await browser.close()
 await dev.close()
}
