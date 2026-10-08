const assert = require('assert')
const crypto = require('crypto')
const express = require('express')
const http = require('http')
const jwt = require('jsonwebtoken')
const { tenantContext, pool } = require('../config/database')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  return value
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex') }
let TEST_TOKEN = ''
const TEST_RUN = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
const TEST_USER_ID = 900000 + crypto.randomInt(1, 99999)
const TEST_USER_EMAIL = `assessment-persistence-${TEST_RUN}@invalid.local`
function request(port, method, path, body, token = TEST_TOKEN, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : JSON.stringify(body)
    const req = http.request({ hostname:'127.0.0.1', port, path, method, headers:{
      'content-type':'application/json', ...(token ? { authorization:`Bearer ${token}` } : {}), ...extraHeaders,
      ...(payload ? { 'content-length':Buffer.byteLength(payload) } : {}),
    }}, res => {
      let raw=''; res.on('data', c => raw += c); res.on('end', () => {
        let json=null; try { json=JSON.parse(raw) } catch (_) {}
        resolve({ status:res.statusCode, body:json, raw })
      })
    })
    req.on('error', reject); if (payload) req.write(payload); req.end()
  })
}

async function main() {
  assert.equal(process.env.NODE_ENV, 'test')
  assert.notEqual(process.env.DB_NAME, 'apexos')
  await pool.query(`INSERT INTO users(id,school_id,name,email,password,role,is_active) VALUES($1,1,'Assessment Persistence Fixture',$2,'x','admin',true)`, [TEST_USER_ID, TEST_USER_EMAIL])
  TEST_TOKEN = jwt.sign({ id:TEST_USER_ID, email:TEST_USER_EMAIL }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'1h' })
  const paperId = `paper-test-${TEST_RUN}`
  const releaseId = `release-${paperId}-r1`
  const app = express()
  app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({ rlsEnabled:false, isSuperAdmin:false, tenantId:null }, next))
  app.use('/api/assessment-studio', require('../routes/assessmentStudioRoutes'))
  const server = await new Promise(resolve => { const s=app.listen(0,'127.0.0.1',()=>resolve(s)) })
  const port = server.address().port
  const doc = {
    format:'assps-canonical-paper', documentModel:'PaperDocumentV2', schemaVersion:3,
    documentOrigin:'USER_AUTHORED', sourceIdentity:null, id:paperId,
    metadata:{ title:'Weekly Assessment' }, sections:[{ id:'s1', nodes:[{ id:'n1', content:'What is photosynthesis?' }] }],
    scoringPlan:{ version:1, maximumObtainableMarks:10, questionMarksTotal:10, balanced:true },
  }
  try {
    const unauth = await request(port,'GET','/api/assessment-studio/papers',null,null)
    assert.equal(unauth.status,401)
    const expired = await request(port,'GET','/api/assessment-studio/papers',null,'definitely.invalid.token')
    assert.equal(expired.status,401)

    const first = await request(port,'POST',`/api/assessment-studio/papers/${paperId}/revisions`,{ expectedRevision:0, title:'Weekly Assessment', document:doc })
    assert.equal(first.status,201, first.raw); assert.equal(first.body.data.currentRevision,1); assert.equal(first.body.data.contentHash,hash(doc))

    const conflict = await request(port,'POST',`/api/assessment-studio/papers/${paperId}/revisions`,{ expectedRevision:0, title:'stale tab', document:{...doc, metadata:{title:'stale'}} })
    assert.equal(conflict.status,409, conflict.raw); assert.equal(conflict.body.code,'REVISION_CONFLICT'); assert.equal(conflict.body.currentRevision,1)

    const read = await request(port,'GET',`/api/assessment-studio/papers/${paperId}`,null)
    assert.equal(read.status,200,read.raw); assert.equal(read.body.data.current_revision,1); assert.equal(read.body.data.document_json.metadata.title,'Weekly Assessment')

    const forgedTenant = await request(port,'GET','/api/assessment-studio/papers/tenant-b-only?school_id=2',null,TEST_TOKEN,{ 'x-school-id':'2' })
    assert.equal(forgedTenant.status,404,forgedTenant.raw)

    const contentHash = hash(doc)
    const release = { releaseId, contentHash, rendererVersion:'manual-weekly-v1', releasedAt:new Date().toISOString(), snapshot:doc }
    const finalized = await request(port,'POST',`/api/assessment-studio/papers/${paperId}/releases`,{ expectedRevision:1, release })
    assert.equal(finalized.status,201, finalized.raw); assert.equal(finalized.body.data.content_hash,contentHash)

    const latest = await request(port,'GET',`/api/assessment-studio/papers/${paperId}/releases/latest`,null)
    assert.equal(latest.status,200,latest.raw); assert.equal(latest.body.data.content_hash,contentHash)

    const afterFinal = {...doc, metadata:{title:'Changed after final'}}
    const second = await request(port,'POST',`/api/assessment-studio/papers/${paperId}/revisions`,{ expectedRevision:1, title:'Changed after final', document:afterFinal })
    assert.equal(second.status,201,second.raw); assert.equal(second.body.data.currentRevision,2)
    const latestStillImmutable = await request(port,'GET',`/api/assessment-studio/papers/${paperId}/releases/latest`,null)
    assert.equal(latestStillImmutable.body.data.content_hash,contentHash)

    console.log('ASSESSMENT_STUDIO_ROUTE_ACCEPTANCE 9/9 PASS')
  } finally {
    await new Promise(resolve=>server.close(resolve))
    await pool.end()
  }
}
main().catch(async e=>{ console.error(e); try { await pool.end() } catch (_) {} process.exit(1) })
