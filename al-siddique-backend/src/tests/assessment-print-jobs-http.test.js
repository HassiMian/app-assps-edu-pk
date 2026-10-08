const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('http')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { tenantContext, pool } = require('../config/database')

const RUN = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
const TEST_USER_ID = 900000 + crypto.randomInt(1, 99999)
const TEST_USER_EMAIL = `assessment-print-${RUN}@invalid.local`
let TEST_TOKEN = ''

function req(port, method, path, body, token = TEST_TOKEN) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : JSON.stringify(body)
    const request = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let raw = ''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(raw) } catch {}
        resolve({ status: res.statusCode, body: json, raw })
      })
    })
    request.on('error', reject)
    if (payload) request.write(payload)
    request.end()
  })
}

test('Assessment PrintJob HTTP lifecycle and reprint', { timeout: 30000 }, async t => {
  assert.equal(process.env.NODE_ENV, 'test')
  assert.notEqual(process.env.DB_NAME, 'apexos')

  const paperPublicId = `print-http-paper-${RUN}`
  const releaseId = `print-http-release-${RUN}`
  const job1 = `print-http-job-1-${RUN}`
  const job2 = `print-http-job-2-${RUN}`
  const rosterId = `roster-${job1}`

  await pool.query(
    `INSERT INTO users(id,school_id,name,email,password,role,is_active) VALUES($1,1,'Print Fixture',$2,'x','admin',true)`,
    [TEST_USER_ID, TEST_USER_EMAIL],
  )
  TEST_TOKEN = jwt.sign(
    { id: TEST_USER_ID, email: TEST_USER_EMAIL },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' },
  )

  const paper = (await pool.query(
    `INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision) VALUES(1,$1,'Print HTTP','FINALIZED',1) RETURNING id`,
    [paperPublicId],
  )).rows[0]
  await pool.query(
    `INSERT INTO assessment_paper_revisions(school_id,paper_id,revision_number,document_json,content_hash) VALUES(1,$1,1,'{}',$2)`,
    [paper.id, 'c'.repeat(64)],
  )
  await pool.query(
    `INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json) VALUES(1,$1,$2,1,$3,'test','{}')`,
    [paper.id, releaseId, 'c'.repeat(64)],
  )

  const app = express()
  app.use(express.json())
  app.use((request, response, next) => tenantContext.run({ rlsEnabled:false, isSuperAdmin:false, tenantId:null }, next))
  app.use('/api/assessment-studio', require('../routes/assessmentStudioRoutes'))
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  const port = server.address().port
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await pool.end()
  })

  const created = await req(port, 'POST', `/api/assessment-studio/papers/${paperPublicId}/print-jobs`, {
    printJobId: job1,
    releaseId,
    personalized: true,
    roster: {
      context: { classId:'7', section:'A' },
      students: [{ id:'s1', name:'One', roll_no:'1', phone:'private' }, { id:'s2', name:'Two' }],
    },
    teacherBinding: { id:'t1', name:'Teacher', subject:'Science', classId:'7', section:'A' },
    renderSettings: {
      duplex:true, copyCount:1, rendererVersion:'http-test', browserEngineVersion:'chromium-test',
      studentPageCounts:{ s1:3, s2:2 },
    },
  })
  assert.equal(created.status, 201, created.raw)
  assert.equal(created.body.data.printJob.student_boundary_policy, 'START_EACH_STUDENT_ON_FRONT')
  assert.match(created.body.data.rosterHash, /^[a-f0-9]{64}$/)
  assert.equal(created.body.data.totalPages, 6)
  assert.equal(created.body.data.bookletPlan[1].startPage, 5)

  const storedPlan = (await pool.query(
    `SELECT render_settings_json FROM assessment_print_jobs WHERE school_id=1 AND print_job_id=$1`, [job1],
  )).rows[0].render_settings_json
  assert.equal(storedPlan.totalPages, 6)
  assert.deepEqual(
    storedPlan.bookletPlan.map(x => [x.studentId, x.contentPages, x.paddingPages, x.startPage]),
    [['s1',3,1,1],['s2',2,0,5]],
  )

  const read = await req(port, 'GET', `/api/assessment-studio/print-jobs/${job1}`)
  assert.equal(read.status, 200, read.raw)
  assert.equal(read.body.data.student_count, 2)
  assert.equal('students_json' in read.body.data, false)

  let step = await req(port, 'PATCH', `/api/assessment-studio/print-jobs/${job1}/status`, { status:'QUEUED' })
  assert.equal(step.status, 200, step.raw)
  assert.equal(step.body.data.attempt_count, 0)
  step = await req(port, 'PATCH', `/api/assessment-studio/print-jobs/${job1}/status`, { status:'PRINTING' })
  assert.equal(step.status, 200, step.raw)
  assert.equal(step.body.data.attempt_count, 1)
  step = await req(port, 'PATCH', `/api/assessment-studio/print-jobs/${job1}/status`, { status:'COMPLETED' })
  assert.equal(step.status, 200, step.raw)
  const invalid = await req(port, 'PATCH', `/api/assessment-studio/print-jobs/${job1}/status`, { status:'QUEUED' })
  assert.equal(invalid.status, 409, invalid.raw)
  assert.equal(invalid.body.code, 'INVALID_PRINT_JOB_TRANSITION')

  const reprint = await req(port, 'POST', `/api/assessment-studio/papers/${paperPublicId}/print-jobs`, {
    printJobId: job2, reprintMode:'REPRINT_ORIGINAL', parentPrintJobId:job1,
  })
  assert.equal(reprint.status, 201, reprint.raw)
  assert.equal(reprint.body.data.printJob.release_id, releaseId)
  assert.equal(reprint.body.data.printJob.roster_snapshot_id, rosterId)
  assert.equal(reprint.body.data.printJob.parent_print_job_id, job1)
  console.log('ASSESSMENT_PRINT_JOBS_HTTP 8/8 PASS')
})
