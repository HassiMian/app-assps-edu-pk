import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('finalized manual paper creates one durable personalized duplex print job', {timeout:90000}, async t=>{
  const server=await createServer({root,server:{port:5268,strictPort:true},appType:'spa'})
  await server.listen()
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:1640,height:960}})
  await context.addInitScript(()=>{
    localStorage.setItem('al_siddique_token','local_browser_test_token')
    localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))
    window.print=()=>{ window.__asspsPrintCalled=true }
  })
  t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await server.close().catch(()=>{})})

  await context.route('**/api/auth/me',r=>r.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({user:{id:999,role:'admin',school_id:1,tenant_id:'assps'}}),
  }))

  await context.route('**/api/academic/setup',r=>r.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({success:true,data:{classes:[{level:'7',name:'Seven',active:true,sections:['Blue']}],subjects:['Science'],localities:[]}}),
  }))

  await context.route('**/api/students**',r=>r.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({data:[
      {id:7001,name:'Ali Student',class:'Seven',section:'',roll_number:'R-1',phone:'PRIVATE-1',address:'PRIVATE-A',is_active:true},
      {id:7002,name:'Sara Student',class:'7',section:'',roll_number:'R-2',phone:'PRIVATE-2',address:'PRIVATE-B',is_active:true},
      {id:8001,name:'Other Class',class:'Eight',section:'',roll_number:'X-1',phone:'PRIVATE-3',is_active:true},
    ]}),
  }))
  await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))

  let revision=0
  await context.route('**/api/assessment-studio/papers/*/revisions',r=>{
    revision+=1
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'personalized-durable-paper',currentRevision:revision,contentHash:'d'.repeat(64),status:'DRAFT'}})})
  })
  await context.route('**/api/assessment-studio/papers/*/releases',r=>r.fulfill({
    status:201,
    contentType:'application/json',
    body:JSON.stringify({success:true,data:{release_id:'server-release',revision_number:revision,content_hash:'d'.repeat(64)}}),
  }))

  const requests={job:null,statuses:[]}
  await context.route('**/api/assessment-studio/papers/*/print-jobs',async r=>{
    requests.job=await r.request().postDataJSON()
    return r.fulfill({
      status:201,
      contentType:'application/json',
      body:JSON.stringify({success:true,data:{
        printJob:{print_job_id:'print-durable-99',personalized:true,duplex:true,status:'CREATED'},
        totalPages:4,
        bookletPlan:[
          {studentId:'7001',ordinal:1,contentPages:1,paddingPages:1,startPage:1,endPage:2},
          {studentId:'7002',ordinal:2,contentPages:1,paddingPages:1,startPage:3,endPage:4},
        ],
      }}),
    })
  })
  await context.route('**/api/assessment-studio/print-jobs/*/status',async r=>{
    const body=await r.request().postDataJSON()
    requests.statuses.push(body.status)
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{print_job_id:'print-durable-99',status:body.status,attempt_count:body.status==='PRINTING'?1:0}})})
  })

  const page=await context.newPage()
  const dialogs=[]
  const pageErrors=[]
  const network=[]
  page.on('pageerror',e=>pageErrors.push(e.message))
  page.on('request',r=>{if(r.url().includes('/api/')) network.push(r.method()+' '+r.url())})
  page.on('dialog',async d=>{dialogs.push(d.message());await d.accept().catch(()=>{})})

  await page.goto('http://localhost:5268/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
  await page.locator('[data-creation-option="blank"]').click()
  await page.getByLabel('Blank paper class').selectOption('7')
  await page.getByLabel('Blank paper subject').fill('Science')
  await page.getByLabel('Blank paper total marks').fill('10')
  await page.getByLabel('Paper Name (optional)').fill('Personalized Durable Browser Test')
  await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
  await page.getByRole('button',{name:/Type First Question/}).click()
  await page.getByLabel('Selected question content').fill('Define force.')
  await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('10')
  await page.getByRole('button',{name:'Save Draft'}).click()
  await page.locator('[data-finalize-assessment]').click()
  await page.waitForTimeout(900)
  const finalizeDiagnostic=await page.evaluate(()=>{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
    const saved=keys.flatMap(k=>{try{return JSON.parse(localStorage.getItem(k)).savedPapers||[]}catch{return[]}}).find(p=>p.name==='Personalized Durable Browser Test')
    return {
      finalizeText:document.querySelector('[data-finalize-assessment]')?.textContent||'',
      controls:Boolean(document.querySelector('[data-personalized-print-controls]')),
      lifecycle:saved?.lifecycleStatus||null,
      releaseStatus:saved?.assessmentRelease?.status||null,
      persistenceAuthority:saved?.persistenceAuthority||null,
      userAuthored:saved?.userAuthored ?? null,
      hasCanvas:Boolean(document.querySelector('#paper-canvas')),
      hasWorkspace:Boolean(document.querySelector('.pts-paper-generator-shell')),
      chooseVisible:document.body.innerText.includes('Choose Creation Method'),
      buildVisible:document.body.innerText.includes('Paper Information — edit all header fields'),
      buttons:[...document.querySelectorAll('button')].map(b=>b.textContent?.trim()).filter(Boolean).slice(-20),
    }
  })
  console.log('FINALIZE_DIAGNOSTIC',JSON.stringify({finalizeDiagnostic,dialogs}))
  await page.waitForFunction(()=>document.querySelector('[data-personalized-print-controls]')!==null,null,{timeout:12000})

  await page.locator('[data-personalized-print-controls]').evaluate(el=>{el.open=true})
  const beforeClick=await page.evaluate(()=>{const d=document.querySelector('[data-personalized-print-controls]');const b=document.querySelector('[data-personalized-print]');return {open:d?.open||false,disabled:b?.disabled||false,display:b?getComputedStyle(b).display:null,visibility:b?getComputedStyle(b).visibility:null,rect:b?b.getBoundingClientRect().toJSON():null}})
  await page.locator('[data-personalized-print]').click()
  await page.waitForTimeout(1800)
  console.log('CLASS_PRINT_DIAGNOSTIC',JSON.stringify({
    dialogs,
    job:Boolean(requests.job),
    statuses:requests.statuses,
    statusText:await page.locator('[data-personalized-print-status]').textContent().catch(()=>null),
    frame:Boolean(await page.locator('#__personalized_print_frame').count()),
    beforeClick,pageErrors,network,
  }))
  await page.waitForFunction(()=>document.querySelector('[data-personalized-print-status]')?.textContent?.includes('2 students'),null,{timeout:15000})
  await page.locator('#__personalized_print_frame').waitFor({state:'attached',timeout:5000})

  const frame=page.frames().find(f=>f!==page.mainFrame() && f.url()==='about:blank')
  assert.ok(frame)
  const html=await frame.locator('body').innerText()
  assert.match(html,/Ali Student/)
  assert.match(html,/Sara Student/)
  assert.match(html,/R-1/)
  assert.match(html,/R-2/)
  assert.equal(await frame.locator('.duplex-blank-page').count(),2)

  assert.equal(requests.job.personalized,true)
  assert.equal(requests.job.roster.context.className,'Seven')
  assert.equal(requests.job.roster.students.length,2)
  assert.deepEqual(Object.keys(requests.job.roster.students[0]).sort(),['displayName','rollNo','section','studentId'].sort())
  assert.equal(JSON.stringify(requests.job.roster).includes('PRIVATE'),false)
  assert.equal(requests.job.renderSettings.duplex,true)
  assert.equal(requests.job.renderSettings.pageSize,'A4')
  assert.deepEqual(Object.keys(requests.job.renderSettings.studentPageCounts).sort(),['7001','7002'])
  assert.deepEqual(requests.statuses,['QUEUED','PRINTING'])
  assert.equal(dialogs.some(x=>x.includes('PERSONALIZED PRINT BLOCKED')),false)
  console.log('PERSONALIZED_PRINT_DURABLE_BROWSER 1/1 PASS')
})
