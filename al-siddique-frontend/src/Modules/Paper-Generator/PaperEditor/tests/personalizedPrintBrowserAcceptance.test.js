import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')

test('finalized manual paper creates personalized duplex-safe class batch', {timeout:90000}, async t=>{
  const server=await createServer({root,server:{port:5264,strictPort:true},appType:'spa'})
  await server.listen()
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  const context=await browser.newContext({viewport:{width:1640,height:960}})
  await context.addInitScript(()=>{
    localStorage.setItem('al_siddique_token','mock-jwt-token')
    localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))
    window.print=()=>{ window.__asspsPrintCalled=true }
  })
  t.after(async()=>{await context.close().catch(()=>{});await browser.close().catch(()=>{});await server.close().catch(()=>{})})

  await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}))
  await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
  let revision=0
  await context.route('**/api/assessment-studio/papers/*/revisions',r=>{
    revision+=1
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{publicId:'personalized-browser-paper',currentRevision:revision,contentHash:'d'.repeat(64),status:'DRAFT'}})})
  })
  await context.route('**/api/assessment-studio/papers/*/releases',r=>r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{release_id:'server-release',revision_number:revision,content_hash:'d'.repeat(64)}})}))

  const requests={}
  await context.route('**/api/assessment-print/roster-snapshots',async r=>{
    requests.roster=await r.request().postDataJSON()
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{id:77,public_id:'roster-77',class_name:'Seven',student_count:2,members:[{id:7001,ordinal:1,displayName:'Ali Student',rollNumber:'R-1',className:'Seven',section:''},{id:7002,ordinal:2,displayName:'Sara Student',rollNumber:'R-2',className:'Seven',section:''}]}})})
  })
  await context.route('**/api/assessment-print/teacher-bindings',async r=>{
    requests.binding=await r.request().postDataJSON()
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{id:88,public_id:'teacher-88',binding_source:'assignment'}})})
  })
  await context.route('**/api/assessment-print/jobs',async r=>{
    requests.job=await r.request().postDataJSON()
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{id:99,public_id:'print-99',personalized:true,duplex:true}})})
  })
  await context.route('**/api/assessment-print/jobs/*/booklets',async r=>{
    requests.booklets=await r.request().postDataJSON()
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{booklets:[{rosterMemberId:7001,startPage:1,paddingPages:1},{rosterMemberId:7002,startPage:3,paddingPages:1}],totalPages:4}})})
  })
  await context.route('**/api/assessment-print/jobs/*/attempts',async r=>{
    requests.attempt=await r.request().postDataJSON()
    return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,data:{attempt_number:1,status:'printing'}})})
  })

  const page=await context.newPage()
  const dialogs=[]
  page.on('dialog',async d=>{dialogs.push(d.message());await d.accept().catch(()=>{})})
  await page.goto('http://localhost:5264/paper-workspace-test.html?new',{waitUntil:'domcontentloaded'})
  await page.locator('[data-creation-option="blank"]').click()
  await page.getByLabel('Blank paper class').selectOption('7')
  await page.getByLabel('Blank paper subject').fill('Science')
  await page.getByLabel('Blank paper total marks').fill('10')
  await page.getByLabel('Paper Name (optional)').fill('Personalized Browser Test')
  await page.getByRole('button',{name:/Open Blank Paper Workspace/}).click()
  await page.getByRole('button',{name:/Type First Question/}).click()
  await page.getByLabel('Selected question content').fill('Define force.')
  await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('10')
  await page.getByRole('button',{name:'Save Draft'}).click()
  await page.locator('[data-finalize-assessment]').click()
  await page.waitForFunction(()=>document.querySelector('[data-personalized-print-options]')!==null,null,{timeout:12000})

  await page.locator('[data-personalized-print-options]').evaluate(el=>{el.open=true})
  await page.locator('[data-personalized-print-action]').click()
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
  assert.equal(requests.roster.className,'Seven')
  assert.equal(requests.job.releaseId.startsWith('release-'),true)
  assert.equal(requests.job.artifactKind,'student_batch')
  assert.equal(requests.job.duplex,true)
  assert.equal(requests.job.settings.answerKey,false)
  assert.deepEqual(Object.keys(requests.booklets.pageCounts).sort(),['7001','7002'])
  assert.equal(Boolean(requests.attempt.note),true)
  assert.equal(dialogs.some(x=>x.includes('PERSONALIZED PRINT BLOCKED')),false)
  console.log('PERSONALIZED_PRINT_BROWSER 1/1 PASS')
})
