import { test } from 'node:test'
import process from 'node:process'
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
const FRONTEND_PORT = Number(process.env.ASSPS_PHASE2_FRONTEND_PORT || 5389)
const BACKEND_PORT = Number(process.env.ASSPS_PHASE2_BACKEND_PORT || 5388)
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

test('genuine teacher login reaches canonical Paper Studio without mock authentication', { timeout: 140000 }, async t => {
  // An unauthenticated/default environment is not an isolated database.
  if (!dbName) { t.skip('Requires an explicitly named disposable teacher E2E database and credentials.'); return }
  // Never synthesize school identities against the live database or live ports.
  assert.match(dbName, /^assps_phase2_teacher_e2e_[a-z0-9_]+$/)
  assert.notEqual(BACKEND_PORT, 5000)
  assert.notEqual(FRONTEND_PORT, 5173)
  assert.notEqual(BACKEND_PORT, FRONTEND_PORT)
  assert.ok(process.env.DB_PASSWORD)
  assert.ok(process.env.JWT_SECRET)
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
  await restrictedPage.goto(`${url}/paper-generator`, { waitUntil: 'domcontentloaded' })
  await restrictedPage.getByRole('heading', { name: 'You do not have access to this module.' }).waitFor({ timeout: 22000 })
  assert.equal(await restrictedPage.locator('[data-creation-option]').count(), 0)
  console.log('PHASE2_TEACHER_WITHOUT_PERMISSION_DENIED_PASS')
  await restrictedContext.close()
})
