import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { preview } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(here, '../../../../..')
const backendSrc = path.resolve(frontendRoot, '../al-siddique-backend/src')
const require = createRequire(import.meta.url)
const FRONTEND_PORT = Number(process.env.ASSPS_PHASE3_FRONTEND_PORT || 5411)
const BACKEND_PORT = Number(process.env.ASSPS_PHASE3_BACKEND_PORT || 5410)
const dbName = String(process.env.DB_NAME || '')

function fetchStatus(port, pathname) {
  return new Promise(resolve => {
    const req = http.get({ hostname: '127.0.0.1', port, path: pathname, timeout: 1700 }, res => {
      res.resume(); resolve(res.statusCode)
    })
    req.on('error', () => resolve(0))
    req.on('timeout', () => { req.destroy(); resolve(0) })
  })
}

test('two-school real-auth Paper Save/Reopen/Print, Diary persistence and Lesson revision/tenant boundaries', { timeout: 140000 }, async t => {
  // Never synthesize school identities against the live database or live ports.
  // These genuine-actor tests require an explicitly named disposable clone and scoped fixtures.
  // An unprovisioned build should report SKIPPED, not crash while importing pg.
  if (!dbName && !process.env.DB_PASSWORD) {
    t.skip('Disposable teacher E2E database, backend packages and scoped credentials are not provisioned')
    return
  }
  assert.match(dbName, /^assps_phase3_teacher_e2e_[a-z0-9_]+$/)
  assert.notEqual(BACKEND_PORT, 5000)
  assert.notEqual(FRONTEND_PORT, 5173)
  assert.notEqual(BACKEND_PORT, FRONTEND_PORT)
  assert.ok(process.env.DB_PASSWORD)
  assert.ok(process.env.JWT_SECRET)

  // Load backend dependencies only after the disposable-database fail-closed gates.
  const { Pool } = require(path.resolve(backendSrc, '../node_modules/pg'))
  const bcrypt = require(path.resolve(backendSrc, '../node_modules/bcryptjs'))

  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    database: dbName,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 8000,
    max: 5,
  })
  let schoolId
  let peerSchoolId
  let vite
  let backend
  let browser
  const errors = []
  t.after(async () => {
    await browser?.close().catch(() => {})
    if (vite?.httpServer) await new Promise(resolve => vite.httpServer.close(resolve))
    if (backend && backend.exitCode === null) backend.kill('SIGTERM')
    if (schoolId) {
      await pool.query('DELETE FROM users WHERE school_id=$1', [schoolId]).catch(() => {})
      await pool.query('DELETE FROM schools WHERE id=$1', [schoolId]).catch(() => {})
    }
    if (peerSchoolId) {
      await pool.query('DELETE FROM users WHERE school_id=$1', [peerSchoolId]).catch(() => {})
      await pool.query('DELETE FROM schools WHERE id=$1', [peerSchoolId]).catch(() => {})
    }
    await pool.end().catch(() => {})
  })

  const suffix = crypto.randomBytes(6).toString('hex')
  const schoolCode = `p2t${suffix}`
  const email = `teacher-${suffix}@example.invalid`
  const password = crypto.randomBytes(18).toString('base64url')
  const hash = await bcrypt.hash(password, 10)
  schoolId = (await pool.query(
    "INSERT INTO schools(name, code, status, tenant_id) VALUES('Phase2 QA School',$1,'active',$1) RETURNING id",
    [schoolCode],
  )).rows[0].id
  await pool.query(
    "INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active,must_change_password,permissions) VALUES($1,$2,'Phase2 QA Teacher',$3,'teacher',$4,true,false,$5::jsonb)",
    [schoolId, schoolCode, email, hash, JSON.stringify(['paper_generator'])],
  )

  // A second synthetic teacher has no Paper Studio permission and must fail closed.
  const deniedEmail = `restricted-${suffix}@example.invalid`
  const deniedPassword = crypto.randomBytes(18).toString('base64url')
  const deniedHash = await bcrypt.hash(deniedPassword, 10)
  await pool.query(
    "INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active,must_change_password,permissions) VALUES($1,$2,'Restricted QA Teacher',$3,'teacher',$4,true,false,$5::jsonb)",
    [schoolId, schoolCode, deniedEmail, deniedHash, JSON.stringify([])],
  )

  // Independent School2 tenant and genuine second-school teacher login.
  // All records stay in this disposable PG16 cluster, never live production.
  const peerSchoolCode = `p2x${suffix}`
  const peerEmail = `peer-${suffix}@example.invalid`
  const peerPassword = crypto.randomBytes(18).toString('base64url')
  peerSchoolId = (await pool.query(
    "INSERT INTO schools(name,code,status,tenant_id) VALUES('Phase2 QA School Two',$1,'active',$1) RETURNING id",
    [peerSchoolCode],
  )).rows[0].id
  await pool.query(
    "INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active,must_change_password,permissions) VALUES($1,$2,'School2 QA Teacher',$3,'teacher',$4,true,false,$5::jsonb)",
    [peerSchoolId, peerSchoolCode, peerEmail, await bcrypt.hash(peerPassword, 10), JSON.stringify(['paper_generator'])],
  )

  backend = spawn(process.execPath, ['server.js'], {
    cwd: backendSrc,
    env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: 'production', AUTO_MIGRATE_ON_BOOT: 'false', DB_STARTUP_PROBE: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  backend.stderr.on('data', data => {
    errors.push(String(data).slice(-280))
    if (errors.length > 12) errors.shift()
  })
  backend.stdout.on('data', () => {})
  let ready = false
  for (let i = 0; i < 75; i++) {
    if ((await fetchStatus(BACKEND_PORT, '/health')) === 200) { ready = true; break }
    if (backend.exitCode !== null) break
    await new Promise(resolve => setTimeout(resolve, 220))
  }
  assert.ok(ready, `Isolated backend health failed: ${errors.join(' ').slice(-700)}`)

  vite = await preview({
    root: frontendRoot,
    preview: {
      host: '127.0.0.1',
      port: FRONTEND_PORT,
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${BACKEND_PORT}`, changeOrigin: true } },
    },
  })

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const browserErrors = []
  page.on('pageerror', err => browserErrors.push(err.message))
  const url = `http://127.0.0.1:${FRONTEND_PORT}`
  await page.goto(`${url}/login?school_code=${schoolCode}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForFunction(() => {
    const token = window.localStorage.getItem('al_siddique_token')
    const user = JSON.parse(window.localStorage.getItem('al_siddique_user') || 'null')
    return Boolean(token && user?.role === 'teacher')
  }, null, { timeout: 25000 })
  const me = await page.evaluate(async () => {
    const token = localStorage.getItem('al_siddique_token')
    const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.json()
    return { status: res.status, role: body.user?.role }
  })
  assert.deepEqual(me, { status: 200, role: 'teacher' })
  console.log('PHASE2_TEACHER_REAL_LOGIN_PASS')

  // Genuine authenticated Daily Diary database acceptance in the SAME private
  // PG16 clone. A teacher must be able to save, reopen and edit only her draft;
  // a second same-school teacher must not read it. No production identity used.
  const diaryDate = '2026-10-16'
  const diaryDraft = {
    school_name: 'CLIENT-SUPPLIED-NAME-MUST-NOT-PERSIST',
    template_id: 1, class_level: '1', class_name: 'One', diary_date: diaryDate,
    slips_per_page: 8, footer_text: 'Synthetic QA diary', footer_is_urdu: false,
    rows: [
      { subject: 'English', homework: 'Page 21 - Learn five words.' },
      { subject: 'Urdu', homework: 'Page 22 — 【زیور، زردی】 — Learn & copy.' },
      { subject: 'Science', diary: '', homework: 'LEGACY-STALE-EXPLICIT-BLANK-NOT-VISIBLE' },
    ],
    style_settings: { subjectFontSize: 13 },
  }
  const createdDiary = await page.evaluate(async payload => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch('/api/daily-diary', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    return { status: response.status, body: await response.json() }
  }, diaryDraft)
  assert.equal(createdDiary.status, 200, `Synthetic teacher Diary create rejected: ${JSON.stringify(createdDiary.body).slice(0, 240)}`)
  assert.equal(createdDiary.body.success, true)
  const diaryId = Number(createdDiary.body.data?.id)
  assert.ok(Number.isSafeInteger(diaryId) && diaryId > 0, 'Daily Diary did not receive a persistent server ID')
  assert.equal(Number(createdDiary.body.data.school_id), Number(schoolId))
  assert.equal(createdDiary.body.data.school_name, 'Phase2 QA School', 'Untrusted browser school name was accepted')
  console.log('PHASE4_REAL_TEACHER_DIARY_SAVE_PASS')

  const reopenedDiary = await page.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/daily-diary/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    return { status: response.status, body: await response.json() }
  }, diaryId)
  assert.equal(reopenedDiary.status, 200)
  assert.equal(reopenedDiary.body.success, true)
  assert.equal(Number(reopenedDiary.body.data.id), diaryId)
  assert.equal(reopenedDiary.body.data.class_name, 'One')
  assert.equal(reopenedDiary.body.data.rows[0].homework, diaryDraft.rows[0].homework)
  assert.equal(String(reopenedDiary.body.data.diary_date).slice(0, 10), diaryDate)
  console.log('PHASE4_REAL_TEACHER_DIARY_REOPEN_PASS')

  const updatedDiary = await page.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/daily-diary/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ footer_text: 'Verified revised synthetic diary' }),
    })
    return { status: response.status, body: await response.json() }
  }, diaryId)
  assert.equal(updatedDiary.status, 200, `Synthetic teacher Diary update rejected: ${JSON.stringify(updatedDiary.body).slice(0, 240)}`)
  assert.equal(updatedDiary.body.data?.footer_text, 'Verified revised synthetic diary')
  assert.equal(updatedDiary.body.data?.rows?.[0]?.homework, diaryDraft.rows[0].homework, 'Diary update erased existing subject work')
  console.log('PHASE4_REAL_TEACHER_DIARY_PATCH_PRESERVATION_PASS')

  // Real teacher, real persisted legacy/homework rows, actual canonical Diary
  // Workspace: open the saved database record and print the same content.
  // This is NOT a mocked API or a generic screenshot-only Diary print test.
  await page.goto(`${url}/paper-generator?tab=diary`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-diary-workspace]').waitFor({ state: 'visible', timeout: 22000 })
  await page.getByRole('button', { name: /Saved Diaries Library/ }).click()
  await page.locator('.dd-library-card').first().waitFor({ timeout: 15000 })
  await page.locator('.dd-library-card').first().getByRole('button', { name: 'Load / Edit' }).click()
  await page.getByText(`Diary #${diaryId} loaded into workspace.`).waitFor({ timeout: 12000 })
  const persistedPreview = await page.locator('.dd-a4-page').first().innerText()
  assert.match(persistedPreview, /Page 21 - Learn five words\./,
    'Persisted legacy homework field disappeared in actual Diary preview')
  assert.match(persistedPreview, /زیور، زردی/,
    'Persisted Urdu homework disappeared during actual Diary reopening')
  assert.doesNotMatch(persistedPreview, /LEGACY-STALE-EXPLICIT-BLANK-NOT-VISIBLE/,
    'Explicitly blank diary content was replaced with stale legacy homework')
  await page.getByRole('button', { name: 'Print / PDF' }).click()
  const savedPrintFrame = page.locator('#dd-print-frame')
  await savedPrintFrame.waitFor({ state: 'attached', timeout: 10000 })
  const printedDiary = await savedPrintFrame.evaluate(el => {
    const doc = el.contentDocument
    const urdu = doc.querySelector('.dd-diary-cell.urdu')
    return {
      text: doc.body.innerText,
      pages: doc.querySelectorAll('.dd-a4-page').length,
      urduDirection: urdu ? doc.defaultView.getComputedStyle(urdu).direction : null,
      html: doc.documentElement.outerHTML,
    }
  })
  assert.match(printedDiary.text, /Page 21 - Learn five words\./)
  assert.match(printedDiary.text, /زیور، زردی/)
  assert.doesNotMatch(printedDiary.text, /LEGACY-STALE-EXPLICIT-BLANK-NOT-VISIBLE/)
  assert.equal(printedDiary.urduDirection, 'rtl')
  assert.ok(printedDiary.pages >= 1)
  const persistedPrintPage = await context.newPage()
  await persistedPrintPage.setContent(printedDiary.html, { waitUntil: 'domcontentloaded' })
  const persistedPdf = await persistedPrintPage.pdf({ format: 'A4', printBackground: true })
  assert.equal(persistedPdf.subarray(0, 5).toString(), '%PDF-')
  assert.ok(persistedPdf.length > 8000)
  await persistedPrintPage.close()
  console.log('PHASE7_REAL_TEACHER_LEGACY_DIARY_SAVE_REOPEN_A4_PRINT_PASS', persistedPdf.length)
  // Re-save via actual teacher-facing UI, not direct fetch. Original server
  // record identity must remain the same and the legacy rows must survive.
  await page.getByRole('button', { name: /Save Diary/ }).click()
  await page.getByText(`Daily diary saved safely (ID #${diaryId}).`).waitFor({ timeout: 15000 })
  const uiResaved = await page.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/daily-diary/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return { status: response.status, body: await response.json() }
  }, diaryId)
  assert.equal(uiResaved.status, 200)
  assert.equal(Number(uiResaved.body.data?.id), diaryId, 'Diary UI created a duplicate instead of updating its own record')
  assert.equal(uiResaved.body.data?.rows[0]?.diary, diaryDraft.rows[0].homework)
  assert.equal(uiResaved.body.data?.rows[1]?.diary, diaryDraft.rows[1].homework)
  assert.equal(uiResaved.body.data?.rows[2]?.diary, '', 'Explicit blank Diary unexpectedly gained stale homework')
  assert.equal(uiResaved.body.data?.footer_text, 'Verified revised synthetic diary')
  console.log('PHASE7_REAL_TEACHER_LEGACY_DIARY_UI_RESAVE_SAME_ID_PASS')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reopen Saved Diary' }).click()
  await page.getByText('Saved diary reopened and verified. Changes will update its original record.')
    .waitFor({ timeout: 14000 })
  const exactReopenedText = await page.locator('.dd-a4-page').first().innerText()
  assert.match(exactReopenedText, /Page 21 - Learn five words\./)
  assert.match(exactReopenedText, /زیور، زردی/)
  assert.doesNotMatch(exactReopenedText, /LEGACY-STALE-EXPLICIT-BLANK-NOT-VISIBLE/)
  console.log('PHASE7_REAL_TEACHER_DIARY_EXPLICIT_REOPEN_SAME_ID_PASS')

  // Lesson Planning must prove real tenant-scoped backend storage, optimistic
  // revision behavior and untrusted client publication-flag suppression.
  const lessonDraft = {
    title: 'Synthetic QA Plants Lesson', subject: 'Science', classLevel: '7',
    chapter: 'Plant Biology', teacher: 'Phase2 QA Teacher', date: diaryDate,
    duration: 40, planningScope: 'daily', sentToPortal: true,
    objectives: ['Understand photosynthesis'], teachingSteps: [{ activity: 'Explain sunlight role' }],
  }
  const createdLesson = await page.evaluate(async draft => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch('/api/lesson-plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(draft),
    })
    return { status: response.status, body: await response.json() }
  }, lessonDraft)
  assert.equal(createdLesson.status, 201, `Real lesson creation rejected: ${JSON.stringify(createdLesson.body).slice(0, 260)}`)
  assert.equal(createdLesson.body.success, true)
  const lessonId = String(createdLesson.body.data?.id || '')
  assert.match(lessonId, /^lp_[a-f0-9-]{36}$/)
  assert.equal(Number(createdLesson.body.data?.serverRevision), 1)
  assert.equal(createdLesson.body.data?.sentToPortal, false, 'Client was permitted to publish unreviewed lesson')
  console.log('PHASE6_REAL_TEACHER_LESSON_CREATE_PRIVATE_PASS')

  const reopenedLesson = await page.evaluate(async () => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch('/api/lesson-plans?limit=100', { headers: { Authorization: `Bearer ${token}` } })
    return { status: response.status, body: await response.json() }
  })
  assert.equal(reopenedLesson.status, 200)
  const listedLesson = reopenedLesson.body.data?.find(item => item.id === lessonId)
  assert.equal(listedLesson?.title, lessonDraft.title)
  assert.deepEqual(listedLesson?.objectives, lessonDraft.objectives)
  assert.equal(listedLesson?.sentToPortal, false)
  console.log('PHASE6_REAL_TEACHER_LESSON_REOPEN_PRIVATE_PASS')

  const updatedLesson = await page.evaluate(async current => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/lesson-plans/${encodeURIComponent(current.id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...current, title: 'Verified Revised Synthetic Lesson', expectedRevision: 1 }),
    })
    return { status: response.status, body: await response.json() }
  }, listedLesson)
  assert.equal(updatedLesson.status, 200, `Real lesson update rejected: ${JSON.stringify(updatedLesson.body).slice(0, 260)}`)
  assert.equal(updatedLesson.body.data?.title, 'Verified Revised Synthetic Lesson')
  assert.equal(Number(updatedLesson.body.data?.serverRevision), 2)
  assert.deepEqual(updatedLesson.body.data?.objectives, lessonDraft.objectives)
  console.log('PHASE6_REAL_TEACHER_LESSON_REVISION_UPDATE_PASS')

  const staleLesson = await page.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/lesson-plans/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'UNAUTHORIZED-STALE-REVISION', expectedRevision: 1 }),
    })
    return { status: response.status, body: await response.json() }
  }, lessonId)
  assert.equal(staleLesson.status, 409, 'Stale optimistic revision overwrote saved Lesson Plan')
  console.log('PHASE6_REAL_TEACHER_LESSON_STALE_REVISION_DENIED_PASS')

  await page.goto(`${url}/paper-generator`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)
  await page.getByRole('heading', { name: 'Paper Studio' }).waitFor({ timeout: 12000 })
  assert.equal(await page.locator('[data-creation-option]').count(), 4)
  assert.equal(await page.locator('.paper-generator-module-tabs button').count(), 6)
  await page.locator('.super-topbar').getByText('Teacher', { exact: true }).waitFor({ timeout: 6000 })
  assert.equal(await page.locator('.super-topbar').getByText('Principal', { exact: true }).count(), 0)
  await page.locator('[data-creation-option="early_years"]').click()
  await page.locator('.early-years-module-wrap').waitFor({ timeout: 22000 })
  assert.deepEqual(browserErrors, [])
  console.log('PHASE2_TEACHER_REAL_SESSION_PAPER_STUDIO_PASS')
  const paperTitle = `Phase 3 Science Weekly ${suffix}`
  await page.goto(`${url}/paper-generator`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-creation-option="blank"]').click()
  await page.locator('[data-create-blank-paper]').waitFor({ timeout: 20000 })
  await page.getByLabel('Blank paper class').selectOption('7')
  await page.getByLabel('Blank paper subject').fill('Science')
  await page.getByLabel('Assessment type').selectOption('Weekly Assessment')
  await page.getByLabel('Assessment scope').fill('Phase 3 QA')
  await page.getByLabel('Paper Name (optional)').fill(paperTitle)
  await page.getByLabel('Blank paper total marks').fill('10')
  await page.getByRole('button', { name: /Open Blank Paper Workspace/ }).click()
  await page.locator('#paper-canvas').waitFor({ timeout: 25000 })
  await page.getByRole('button', { name: /Type First Question/ }).click()
  await page.getByLabel('Selected question heading').fill('Q1. Answer briefly. (10)')
  await page.getByLabel('Selected question content').fill('Explain why green plants need sunlight.')
  await page.locator('[data-section-inspector] input[type="number"]').nth(1).fill('10')
  await page.getByRole('button', { name: 'Save Draft' }).click()
  await page.waitForFunction(name => {
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store'))
    return keys.some(key => {
      try { return (JSON.parse(localStorage.getItem(key))?.savedPapers || []).some(p=>
        p.name===name && p.userAuthored && p.serverRevision>=1 && p.persistenceAuthority==='SERVER_REVISION_SOURCE_OF_TRUTH') }
      catch { return false }
    })
  }, paperTitle, { timeout: 25000 })
  const saved = await page.evaluate(name => {
    const papers=Object.keys(localStorage).filter(k=>k.startsWith('al_siddique_paper_store')).flatMap(k=>{
      try { return JSON.parse(localStorage.getItem(k))?.savedPapers || [] } catch { return [] }
    })
    return papers.find(p=>p.name===name)
  }, paperTitle)
  assert.equal(saved.canonicalDocument.documentOrigin,'USER_AUTHORED')
  assert.equal(saved.canonicalDocument.sections[0].nodes[0].content, 'Explain why green plants need sunlight.')
  assert.equal(saved.canonicalDocument.scoringPlan.maximumObtainableMarks, 10)
  const serverSaved=await pool.query('SELECT current_revision, school_id FROM assessment_papers WHERE school_id=$1 AND public_id=$2', [schoolId, saved.serverPaperId])
  assert.equal(serverSaved.rowCount, 1)
  assert.equal(Number(serverSaved.rows[0].current_revision), Number(saved.serverRevision))
  console.log('PHASE3_REAL_TEACHER_SERVER_REVISION_SAVE_PASS')

  await page.goto(`${url}/paper-generator`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Saved Papers', exact: true }).click()
  await page.getByText(paperTitle, { exact: true }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'Open in Workspace', exact: true }).first().click()
  await page.locator('#paper-canvas .preview-container').waitFor({ timeout: 20000 })
  const paperCanvasText = await page.locator('#paper-canvas').innerText()
  assert.ok(paperCanvasText.includes('Explain why green plants need sunlight.'))
  console.log('PHASE3_REAL_TEACHER_SAVED_PAPER_REOPEN_PASS')
  await page.locator('[data-printer-destination-help] summary').click()
  const printerGuide=await page.locator('[data-printer-destination-help]').innerText()
  assert.match(printerGuide,/USB, Wi-Fi or shared printer/)
  assert.match(printerGuide,/Save as PDF/)
  await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click()
  const printFrame=page.locator('#__print_frame')
  await printFrame.waitFor({ state: 'attached', timeout: 12000 })
  const printable=await printFrame.evaluate(el=>({
    html:el.contentDocument?.documentElement?.outerHTML || '',
    text:el.contentDocument?.body?.innerText || '',
  }))
  assert.ok(printable.text.includes('Explain why green plants need sunlight.'), 'Printed iframe lost the assessment question')
  assert.ok(printable.html.includes('Times New Roman') || printable.html.includes('print'), 'Printed iframe missing print style source')
  const printPage=await context.newPage()
  await printPage.setContent(printable.html, { waitUntil: 'load' })
  await printPage.emulateMedia({ media:'print' })
  assert.ok((await printPage.locator('body').innerText()).includes('Explain why green plants need sunlight.'))
  const pdf=await printPage.pdf({ format:'A4', printBackground:true })
  assert.ok(pdf.length > 2500, `Chromium printable-document PDF unexpectedly small: ${pdf.length}`)
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-')
  console.log('PHASE3_REAL_TEACHER_CHROMIUM_PRINT_PDF_PASS', pdf.length)
  await printPage.close()

  // Paper-owned previously missing integration contract: an independently
  // authenticated teacher revises this actual disposable-PG server document
  // with bounded user-authored visual heading spans, then fetches it anew.
  // Unlike an in-memory JSON converter test, this verifies Express/JWT/PG
  // persistence and optimistic revision semantics without live school data.
  const richSerial = '<strong>Q1.</strong>'
  const richInstruction = '<span dir="rtl" style="text-decoration:underline">سوال نمبر ایک</span>'
  const styledDocument = JSON.parse(JSON.stringify(saved.canonicalDocument))
  styledDocument.sections[0].editorInlineRichText = {
    headingSerial: richSerial, headingInstruction: richInstruction,
  }
  const persistStyledHeading = await page.evaluate(async payload => {
    const token = localStorage.getItem('al_siddique_token')
    const endpoint = `/api/assessment-studio/papers/${encodeURIComponent(payload.paperId)}`
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    const changed = await fetch(endpoint + '/revisions', {
      method: 'POST', headers,
      body: JSON.stringify({ expectedRevision:payload.revision, title:payload.title, document:payload.document }),
    })
    const changedBody = await changed.json()
    const loaded = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
    const loadedBody = await loaded.json()
    // Reusing the already-spent revision must fail without modifying rows.
    const stale = await fetch(endpoint + '/revisions', {
      method:'POST', headers,
      body: JSON.stringify({ expectedRevision:payload.revision, title:payload.title, document:payload.document }),
    })
    const staleBody = await stale.json()
    return {
      savedStatus:changed.status, savedBody:changedBody,
      readStatus:loaded.status, readBody:loadedBody,
      staleStatus:stale.status, staleBody,
    }
  }, { paperId:saved.serverPaperId, revision:saved.serverRevision, title:paperTitle, document:styledDocument })
  assert.equal(persistStyledHeading.savedStatus, 201,
    `Server rejected safe heading revision: ${JSON.stringify(persistStyledHeading.savedBody).slice(0, 220)}`)
  assert.equal(persistStyledHeading.readStatus, 200)
  assert.equal(persistStyledHeading.staleStatus, 409)
  assert.equal(persistStyledHeading.staleBody.code, 'REVISION_CONFLICT')
  const storedHeadingPaper = persistStyledHeading.readBody.data
  assert.equal(Number(storedHeadingPaper.current_revision), Number(saved.serverRevision) + 1)
  assert.equal(storedHeadingPaper.document_json.sections[0].editorInlineRichText.headingSerial, richSerial)
  assert.equal(storedHeadingPaper.document_json.sections[0].editorInlineRichText.headingInstruction, richInstruction)
  assert.equal(storedHeadingPaper.document_json.sections[0].nodes[0].content,
    'Explain why green plants need sunlight.')
  assert.equal(storedHeadingPaper.document_json.scoringPlan.maximumObtainableMarks, 10)
  const storedStyledRevision = await pool.query(
    'SELECT document_json, revision_number FROM assessment_paper_revisions WHERE school_id=$1 AND paper_id=(SELECT id FROM assessment_papers WHERE school_id=$1 AND public_id=$2) ORDER BY revision_number DESC LIMIT 1',
    [schoolId, saved.serverPaperId])
  assert.equal(storedStyledRevision.rowCount, 1)
  assert.equal(storedStyledRevision.rows[0].document_json.sections[0].editorInlineRichText.headingSerial, richSerial)
  assert.equal(storedStyledRevision.rows[0].document_json.sections[0].editorInlineRichText.headingInstruction, richInstruction)
  console.log('PHASE3_REAL_AUTH_SERVER_RICH_HEADING_REVISION_REOPEN_CONFLICT_PASS')
  // Server rejection, not just browser sanitizer: an arbitrary client must
  // not persist unsupported rich-text HTML in a USER_AUTHORED revision.
  const unsafeDoc = JSON.parse(JSON.stringify(storedHeadingPaper.document_json))
  unsafeDoc.sections[0].editorInlineRichText.headingSerial = '<iframe></iframe>'
  const deniedMarkup = await page.evaluate(async payload => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/assessment-studio/papers/${encodeURIComponent(payload.paperId)}/revisions`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({ expectedRevision:payload.revision, title:payload.title, document:payload.document }),
    })
    return { status:response.status, body:await response.json() }
  }, {paperId:saved.serverPaperId, revision:storedHeadingPaper.current_revision,
      title:paperTitle, document:unsafeDoc})
  assert.equal(deniedMarkup.status, 400, 'Backend allowed unsupported inline HTML in paper revision')
  const afterUnsafe = await pool.query(
    'SELECT current_revision FROM assessment_papers WHERE school_id=$1 AND public_id=$2',
    [schoolId,saved.serverPaperId])
  assert.equal(Number(afterUnsafe.rows[0].current_revision), Number(storedHeadingPaper.current_revision),
    'Backend rejected unsafe markup but changed the stored revision')
  console.log('PHASE3_REAL_AUTH_SERVER_UNSAFE_HEADING_REJECTED_NO_MUTATION_PASS')

  await context.close()

  const restrictedContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const restrictedPage = await restrictedContext.newPage()
  await restrictedPage.goto(`${url}/login?school_code=${schoolCode}`, { waitUntil: 'domcontentloaded' })
  await restrictedPage.getByLabel('Email address').fill(deniedEmail)
  await restrictedPage.getByLabel('Password', { exact: true }).fill(deniedPassword)
  await restrictedPage.getByRole('button', { name: 'Sign in', exact: true }).click()
  await restrictedPage.waitForFunction(() => {
    const user = JSON.parse(localStorage.getItem('al_siddique_user') || 'null')
    return user?.role === 'teacher'
  }, null, { timeout: 25000 })
  // The second authenticated teacher belongs to the SAME synthetic school,
  // so denying the saved diary proves author isolation, not merely tenant ID.
  const forbiddenDiary = await restrictedPage.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/daily-diary/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    return { status: response.status, body: await response.json() }
  }, diaryId)
  assert.equal(forbiddenDiary.status, 404, 'Different same-school teacher read the authored diary')
  const forbiddenDiaryWrite = await restrictedPage.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/daily-diary/${id}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ footer_text: 'UNAUTHORIZED-SAME-SCHOOL-DIARY-WRITE' }),
    })
    return response.status
  }, diaryId)
  assert.equal(forbiddenDiaryWrite, 404, 'Different same-school teacher overwrote authored diary')
  console.log('PHASE4_REAL_DIARY_SAME_SCHOOL_OTHER_TEACHER_DENIED_PASS')
  const restrictedLessons = await restrictedPage.evaluate(async () => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch('/api/lesson-plans?limit=100', { headers: { Authorization: `Bearer ${token}` } })
    return { status: response.status, body: await response.json() }
  })
  assert.equal(restrictedLessons.status, 200)
  assert.ok(!restrictedLessons.body.data?.some(item => item.id === lessonId), 'Different same-school teacher saw private Lesson Plan')
  const forbiddenLessonWrite = await restrictedPage.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const response = await fetch(`/api/lesson-plans/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'UNAUTHORIZED-SAME-SCHOOL-LESSON-WRITE', expectedRevision: 2 }),
    })
    return response.status
  }, lessonId)
  assert.equal(forbiddenLessonWrite, 404, 'Different same-school teacher overwrote private Lesson Plan')
  console.log('PHASE6_REAL_LESSON_SAME_SCHOOL_OTHER_TEACHER_DENIED_PASS')
  await restrictedPage.goto(`${url}/paper-generator`, { waitUntil: 'domcontentloaded' })
  await restrictedPage.getByRole('heading', { name: 'You do not have access to this module.' }).waitFor({ timeout: 22000 })
  assert.equal(await restrictedPage.locator('[data-creation-option]').count(), 0)
  console.log('PHASE2_TEACHER_WITHOUT_PERMISSION_DENIED_PASS')
  await restrictedContext.close()

  // Authenticated cross-tenant School2 access must be denied at HTTP and
  // storage layers, independently of same-school author protection.
  const peerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const peerPage = await peerContext.newPage()
  await peerPage.goto(`${url}/login?school_code=${peerSchoolCode}`, { waitUntil: 'domcontentloaded' })
  await peerPage.getByLabel('Email address').fill(peerEmail)
  await peerPage.getByLabel('Password', { exact: true }).fill(peerPassword)
  await peerPage.getByRole('button', { name: 'Sign in', exact: true }).click()
  await peerPage.waitForFunction(() => {
    const token = localStorage.getItem('al_siddique_token')
    const user = JSON.parse(localStorage.getItem('al_siddique_user') || 'null')
    return Boolean(token && user?.role === 'teacher')
  }, null, { timeout: 25000 })
  const crossSchoolResult = await peerPage.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const headers = { Authorization: `Bearer ${token}` }
    const get = await fetch(`/api/daily-diary/${id}`, { headers })
    const list = await fetch('/api/daily-diary?limit=100', { headers })
    const put = await fetch(`/api/daily-diary/${id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ footer_text: 'UNAUTHORIZED-CROSS-SCHOOL-CHANGE' }),
    })
    return { get: get.status, list: list.status, listBody: await list.json(), put: put.status }
  }, diaryId)
  assert.equal(crossSchoolResult.get, 404, 'School2 teacher read School1 diary')
  assert.equal(crossSchoolResult.put, 404, 'School2 teacher attempted to overwrite School1 diary')
  assert.equal(crossSchoolResult.list, 200)
  assert.equal(crossSchoolResult.listBody.success, true)
  assert.equal(crossSchoolResult.listBody.data.length, 0, 'School2 diary list leaked School1 entries')
  const unchangedDiary = await pool.query('SELECT school_id,footer_text FROM daily_diaries WHERE id=$1', [diaryId])
  assert.equal(Number(unchangedDiary.rows[0]?.school_id), Number(schoolId))
  assert.equal(unchangedDiary.rows[0]?.footer_text, 'Verified revised synthetic diary', 'School2 overwrite altered stored School1 diary')
  console.log('PHASE5_REAL_DIARY_SCHOOL2_LIST_READ_WRITE_DENIED_PASS')
  const peerLessons = await peerPage.evaluate(async id => {
    const token = localStorage.getItem('al_siddique_token')
    const headers = { Authorization: `Bearer ${token}` }
    const list = await fetch('/api/lesson-plans?limit=100', { headers })
    const put = await fetch(`/api/lesson-plans/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'CROSS-SCHOOL-LESSON-MUTATION', expectedRevision: 2 }),
    })
    return { list: list.status, listBody: await list.json(), put: put.status }
  }, lessonId)
  assert.equal(peerLessons.list, 200)
  assert.ok(!peerLessons.listBody.data?.some(item => item.id === lessonId), 'School2 tenant saw School1 private Lesson Plan')
  assert.equal(peerLessons.put, 404, 'School2 tenant mutated School1 Lesson Plan')
  const unchangedPlan = await pool.query('SELECT title,revision,school_id,sent_to_portal FROM lesson_plans WHERE public_id=$1', [lessonId])
  assert.equal(unchangedPlan.rows[0]?.title, 'Verified Revised Synthetic Lesson')
  assert.equal(Number(unchangedPlan.rows[0]?.revision), 2)
  assert.equal(Number(unchangedPlan.rows[0]?.school_id), Number(schoolId))
  assert.equal(unchangedPlan.rows[0]?.sent_to_portal, false)
  console.log('PHASE6_REAL_LESSON_SCHOOL2_LIST_WRITE_DENIED_PASS')
  await peerContext.close()
})
