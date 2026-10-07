const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const crypto = require('node:crypto')
const { tenantContext, pool } = require('../config/database')

let server
let syntheticSchoolId = null

function request(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : JSON.stringify(body)
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: `/api/question-bank${path}`,
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let raw = ''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        let json = {}
        try { json = raw ? JSON.parse(raw) : {} } catch {}
        resolve({ status: res.statusCode, body: json, raw })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

function signUser(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' })
}

async function transition(port, publicId, status, token) {
  const r = await request(port, 'PATCH', `/governance/${publicId}/status`, { status }, token)
  assert.equal(r.status, 200, r.raw)
  assert.equal(r.body.data.lifecycle_status, status)
}

test('teacher Question Bank scope follows governed Candidate -> Ready -> Retired lifecycle', { timeout: 30000 }, async () => {
  assert.equal(process.env.NODE_ENV, 'test', 'Teacher scope integration test must run only in NODE_ENV=test')
  assert.notEqual(process.env.DB_NAME, 'apexos', 'Teacher scope integration test must never target production DB')

  const suffix = crypto.randomBytes(6).toString('hex')
  const schoolCode = `qbscope${suffix}`
  const school = await pool.query(
    `INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id`,
    [`Synthetic QBank Scope ${suffix}`, schoolCode]
  )
  syntheticSchoolId = school.rows[0].id

  const users = {}
  for (const [key, role] of [['admin','admin'], ['teacherA','teacher'], ['teacherB','teacher']]) {
    const email = `${key}-${suffix}@invalid.example`
    const result = await pool.query(
      `INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active)
       VALUES($1,$2,$3,$4,$5,'not-used',true) RETURNING id,email,role`,
      [syntheticSchoolId, schoolCode, key, email, role]
    )
    users[key] = result.rows[0]
  }

  await pool.query(
    `INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,is_active)
     VALUES($1,$2,'Seven','','Science',true),($1,$3,'Eight','','Math',true)`,
    [syntheticSchoolId, users.teacherA.id, users.teacherB.id]
  )

  const app = express()
  app.use(express.json())
  app.use((req,res,next) => tenantContext.run({ rlsEnabled:false, isSuperAdmin:false, tenantId:null }, next))
  app.use('/api/question-bank', require('../routes/questionBankRoutes'))
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const port = server.address().port
  const adminToken = signUser(users.admin)
  const teacherAToken = signUser(users.teacherA)
  const teacherBToken = signUser(users.teacherB)

  const make = (classLevel, subject, text) => ({
    class_level: classLevel,
    subject,
    question_type: 'short',
    question_text: text,
    marks: 2,
  })

  let r = await request(port, 'POST', '/', make('Seven','Science',`Science governed ${suffix}?`), adminToken)
  assert.equal(r.status, 201, r.raw)
  assert.equal(r.body.data.is_approved, false)
  assert.equal(r.body.data.governance.lifecycleStatus, 'candidate')
  const scienceId = r.body.data.id
  const sciencePublicId = r.body.data.governance.publicId

  r = await request(port, 'POST', '/', make('Eight','Math',`Math governed ${suffix}?`), adminToken)
  assert.equal(r.status, 201, r.raw)
  assert.equal(r.body.data.governance.lifecycleStatus, 'candidate')
  const mathId = r.body.data.id
  const mathPublicId = r.body.data.governance.publicId

  r = await request(port, 'GET', '?limit=50', null, teacherAToken)
  assert.equal(r.status, 200, r.raw)
  assert.ok(!(r.body.data || []).some(q => [scienceId, mathId].includes(q.id)), 'Candidate questions must be hidden from teachers')

  await transition(port, sciencePublicId, 'reviewed', adminToken)
  await transition(port, sciencePublicId, 'ready', adminToken)
  await transition(port, mathPublicId, 'reviewed', adminToken)
  await transition(port, mathPublicId, 'ready', adminToken)

  const legacyProjection = await pool.query(
    `SELECT id,is_approved FROM question_bank WHERE school_id=$1 AND id = ANY($2::text[]) ORDER BY id`,
    [syntheticSchoolId, [scienceId, mathId]]
  )
  assert.equal(legacyProjection.rows.length, 2)
  assert.ok(legacyProjection.rows.every(row => row.is_approved === true), 'Ready lifecycle must project approved=true to linked legacy rows')

  r = await request(port, 'GET', '?limit=50', null, teacherAToken)
  assert.equal(r.status, 200, r.raw)
  const teacherAIds = (r.body.data || []).map(q => q.id)
  assert.ok(teacherAIds.includes(scienceId), 'Assigned teacher must see Ready Science question')
  assert.ok(!teacherAIds.includes(mathId), 'Assigned teacher must not see unassigned Math question')

  r = await request(port, 'GET', '?limit=50', null, teacherBToken)
  assert.equal(r.status, 200, r.raw)
  const teacherBIds = (r.body.data || []).map(q => q.id)
  assert.ok(teacherBIds.includes(mathId), 'Assigned teacher must see Ready Math question')
  assert.ok(!teacherBIds.includes(scienceId), 'Assigned teacher must not see unassigned Science question')

  r = await request(port, 'POST', '/', make('Seven','Science','Teacher mutation attempt'), teacherAToken)
  assert.equal(r.status, 403, r.raw)
  r = await request(port, 'DELETE', `/${scienceId}`, null, teacherAToken)
  assert.equal(r.status, 403, r.raw)

  await transition(port, sciencePublicId, 'retired', adminToken)
  const retiredProjection = await pool.query('SELECT is_approved FROM question_bank WHERE school_id=$1 AND id=$2', [syntheticSchoolId, scienceId])
  assert.equal(retiredProjection.rows[0].is_approved, false)

  r = await request(port, 'GET', '?limit=50', null, teacherAToken)
  assert.equal(r.status, 200, r.raw)
  assert.ok(!(r.body.data || []).some(q => q.id === scienceId), 'Retired question must disappear from teacher visibility')

  r = await request(port, 'GET', '?limit=50', null, adminToken)
  assert.equal(r.status, 200, r.raw)
  const adminIds = (r.body.data || []).map(q => q.id)
  assert.ok(adminIds.includes(scienceId) && adminIds.includes(mathId), 'Admin keeps school-wide compatibility rows for history')

  console.log('QUESTION_BANK_TEACHER_LIFECYCLE_SCOPE 10/10 PASS')
})

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve))
  if (syntheticSchoolId) {
    for (const table of ['question_capture_requests','question_mappings','question_revisions','question_masters','question_bank','teacher_class_assignments','users']) {
      await pool.query(`DELETE FROM ${table} WHERE school_id=$1`, [syntheticSchoolId]).catch(() => {})
    }
    await pool.query('DELETE FROM schools WHERE id=$1', [syntheticSchoolId]).catch(() => {})
  }
  await pool.end()
})
