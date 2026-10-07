const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')

const schoolId = Number(process.env.ASSPS_SMOKE_SCHOOL_ID || 0)
const baseUrl = String(process.env.ASSPS_SMOKE_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')
const frontendUrl = String(process.env.ASSPS_SMOKE_FRONTEND_URL || 'https://app.assps.edu.pk').replace(/\/$/, '')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function getJson(url, token) {
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  let body = null
  try { body = await response.json() } catch { body = null }
  return { response, body }
}

async function expectJson(name, pathName, token, validate) {
  const started = Date.now()
  const { response, body } = await getJson(`${baseUrl}${pathName}`, token)
  assert(response.ok, `${name} returned HTTP ${response.status}`)
  if (validate) validate(body)
  console.log(`PASS ${name}: ${response.status} ${Date.now() - started}ms`)
  return body
}

async function expectPage(name, pathName) {
  const started = Date.now()
  const response = await fetch(`${frontendUrl}${pathName}`, { redirect: 'follow' })
  assert(response.ok, `${name} returned HTTP ${response.status}`)
  const html = await response.text()
  assert(/<script[^>]+src="\/assets\/index-[^"]+\.js"/.test(html), `${name} missing production app bundle`)
  console.log(`PASS ${name}: ${response.status} ${Date.now() - started}ms`)
}

async function main() {
  assert(Number.isInteger(schoolId) && schoolId > 0, 'ASSPS_SMOKE_SCHOOL_ID must be an explicit positive integer')
  assert(process.env.JWT_SECRET, 'JWT_SECRET is required')

  const userResult = await pool.query(
    `SELECT id, email, role
       FROM users
      WHERE school_id = $1
        AND is_active = true
        AND role IN ('principal','admin','school_admin')
      ORDER BY CASE role WHEN 'principal' THEN 0 WHEN 'school_admin' THEN 1 ELSE 2 END, id
      LIMIT 1`,
    [schoolId],
  )
  assert(userResult.rowCount === 1, `No active leadership user found for school ${schoolId}`)
  const user = userResult.rows[0]
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '2m' })

  await expectJson('backend health', '/health', null, body => assert(body?.success === true || body?.status === 'ok', 'health payload is not healthy'))
  const setup = await expectJson('academic setup', '/api/academic/setup', token, body => {
    assert(body?.success === true && body?.configured === true, 'academic setup is not configured')
    assert(Array.isArray(body?.data?.classes) && body.data.classes.length > 0, 'academic setup has no classes')
  })

  const activeClass = setup.data.classes.find(item => item?.active !== false && item?.name && Array.isArray(item?.sections) && item.sections[0])
  assert(activeClass, 'No active class with a section is available for roster smoke')
  const cls = encodeURIComponent(activeClass.name)
  const section = encodeURIComponent(activeClass.sections[0])
  const today = new Date().toISOString().slice(0, 10)

  await expectJson('dashboard stats', '/api/dashboard/stats', token, body => assert(body?.success === true, 'dashboard stats success=false'))
  await expectJson('student roster', `/api/students?class=${cls}&section=${section}`, token, body => {
    assert(body?.success === true && Array.isArray(body?.data), 'student roster payload invalid')
  })
  await expectJson('attendance read', `/api/attendance?class=${cls}&section=${section}&date=${today}`, token, body => {
    assert(body?.success === true && Array.isArray(body?.data), 'attendance payload invalid')
  })
  await expectJson('fee summary', '/api/fees/summary', token, body => assert(body?.success === true, 'fee summary success=false'))
  await expectJson('daily diary', '/api/daily-diary?limit=1', token, body => assert(body?.success === true && Array.isArray(body?.data), 'daily diary payload invalid'))

  await expectPage('dashboard page', '/dashboard')
  await expectPage('attendance page', '/attendance/mark')
  await expectPage('paper generator page', '/paper-generator')

  console.log(`PRODUCTION_SCHOOL_SMOKE_PASS school=${schoolId} class=${activeClass.name} section=${activeClass.sections[0]}`)
}

main().catch(err => {
  console.error(`PRODUCTION_SCHOOL_SMOKE_FAIL ${err.message}`)
  process.exitCode = 1
}).finally(async () => {
  await pool.end().catch(() => {})
})
