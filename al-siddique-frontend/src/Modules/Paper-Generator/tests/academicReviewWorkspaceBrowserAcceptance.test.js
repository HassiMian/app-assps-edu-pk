import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const jwt = require('/var/www/apex-backend/node_modules/jsonwebtoken')
const BASE_URL = process.env.ASSPS_PHASE5_BROWSER_URL || 'http://127.0.0.1:5414'
const API_URL = BASE_URL + '/api'
const sign = id => jwt.sign({ id },process.env.JWT_SECRET,{expiresIn:'5m',algorithm:'HS256'})

test('Phase5 genuine Chromium — school reviewer can inspect and safely intake an unapproved Grade9 source',
  {timeout:100000}, async t=>{
  assert.equal(process.env.NODE_ENV,'test')
  assert.match(String(process.env.DB_NAME||''),/^assps_phase5_academic_review_test_/)
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']})
  t.after(async()=>{await browser.close()})
  const errors=[]
  const ctx=await browser.newContext({viewport:{width:1440,height:930}})
  const page=await ctx.newPage()
  page.on('pageerror',err=>errors.push(err.message))
  await page.addInitScript(({token})=>{
    localStorage.setItem('al_siddique_token',token)
    localStorage.setItem('al_siddique_login_at',String(Date.now()))
  },{token:sign(1)})
  await page.goto(BASE_URL+'/question-bank/academic-review',{waitUntil:'domcontentloaded',timeout:50000})
  await page.getByRole('heading',{name:'Academic Review Workspace'}).waitFor({timeout:50000})
  await page.getByRole('heading',{name:'Review queue'}).waitFor({timeout:12000})
  assert.ok(await page.getByText('Fail-closed approval').count())
  await page.getByLabel('Filter by subject').fill('Biology')
  await page.getByRole('button',{name:'Apply subject filter'}).click()
  await page.locator('.ar-queue-item').first().waitFor({timeout:17000})
  const target=page.locator('.ar-queue-item').filter({hasText:'Needs intake'}).first()
  if(await target.count() === 0)throw Error('No ungoverned Grade9 Biology seed in disposable test clone')
  const reviewedStemSnippet=(await target.locator(':scope > span').nth(1).textContent()).trim().slice(0,60)
  const reviewQuestionId=await target.getAttribute('data-review-question-id')
  assert.match(reviewQuestionId,/^[a-zA-Z0-9_-]{3,120}$/)
  await target.click()
  await page.getByRole('heading',{name:'Question review'}).waitFor()
  await page.getByRole('button',{name:/Create governed review record/}).waitFor()
  await page.screenshot({path:'/tmp/assps_phase5_before_intake.png',fullPage:true})
  await page.getByRole('button',{name:/Create governed review record/}).click()
  await page.getByText(/existing provisional question linked to governance/i).waitFor({timeout:18000})
  assert.ok(await page.getByText('Not approved').count())
  await page.getByRole('button',{name:/Prepare for academic review/}).click()
  await page.getByText(/question moved to academic review/i).waitFor({timeout:17000})
  await page.getByText(/you authored this revision/i).waitFor({timeout:8000})
  const formSource = page.getByRole('heading',{name:/Independent academic evidence/})
  await formSource.waitFor({timeout:8000})
  assert.equal(await page.getByRole('button',{name:'Approve verified question'}).count(),0)
  await page.screenshot({path:'/tmp/assps_phase5_review_author_locked.png',fullPage:true})

  // A second school admin can view the review form, but a new reviewer never
  // autoapproves content. Test intentionally does not submit false academic attestations.
  const context=await browser.newContext({viewport:{width:1440,height:930}})
  const reviewer=await context.newPage()
  reviewer.on('pageerror',err=>errors.push(err.message))
  await reviewer.addInitScript(({token})=>{
    localStorage.setItem('al_siddique_token',token)
    localStorage.setItem('al_siddique_login_at',String(Date.now()))
  },{token:sign(999)})
  await reviewer.goto(BASE_URL+'/question-bank/academic-review',{waitUntil:'domcontentloaded',timeout:50000})
  await reviewer.getByRole('heading',{name:'Academic Review Workspace'}).waitFor({timeout:40000})
  // A reviewer must be able to access the *exact* question across pagination;
  // neither sorting nor a crowded subject queue can hide a selected revision.
  await reviewer.getByLabel('Open question ID').fill(reviewQuestionId)
  await reviewer.getByRole('button',{name:'Open exact question'}).click()
  await reviewer.getByRole('heading',{name:'Question review'}).waitFor({timeout:17000})
  await reviewer.getByRole('heading',{name:/Independent academic evidence/}).waitFor({timeout:12000})
  await reviewer.getByRole('combobox',{name:/Verified textbook source/}).waitFor({timeout:8000})
  assert.equal(await reviewer.getByRole('button',{name:'Record independent academic review'}).isDisabled(),true)
  await reviewer.screenshot({path:'/tmp/assps_phase5_review_independent_reviewer.png',fullPage:true})

  // Real reviewer returns the exact governed revision for editorial correction.
  // This proof NEVER checks academic attestations that were not really performed.
  await reviewer.getByLabel('Reason for correction').fill(
    'Please rewrite the question stem for clarity and reconfirm its answer key against the chapter before any approval.')
  await reviewer.getByRole('button',{name:/Return question to author/}).click()
  await reviewer.getByText(/Correction request audited/i).waitFor({timeout:15000})
  assert.equal(await reviewer.getByRole('button',{name:'Approve verified question'}).count(),0)

  // Author can edit exactly the same candidate, advancing immutable revision 1 -> 2.
  await page.getByLabel('Open question ID').fill(reviewQuestionId)
  await page.getByRole('button',{name:'Open exact question'}).click()
  await page.getByText(/Returned for corrections/i).waitFor({timeout:12000})
  await page.getByRole('button',{name:/Edit candidate revision/}).click()
  const revisedStem='Editorially revised for clarity — '+reviewedStemSnippet
  await page.getByLabel('Question text (English)').fill(revisedStem)
  await page.getByRole('button',{name:/Save atomic correction/}).click()
  await page.getByText(/Corrected source and canonical revision saved together/i).waitFor({timeout:18000})
  assert.ok(await page.getByText('2',{exact:true}).count())
  assert.equal(await page.getByRole('button',{name:'Approve verified question'}).count(),0)
  await page.screenshot({path:'/tmp/assps_phase5_review_revised_revision2.png',fullPage:true})
  assert.deepEqual(errors,[])
  await context.close()
  console.log('PHASE5_REAL_CHROMIUM_LOGIN_INTAKE_REVIEWER_SEPARATION_AND_NO_AUTOAPPROVAL_PASS')
})
