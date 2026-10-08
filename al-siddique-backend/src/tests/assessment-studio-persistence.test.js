const assert = require('assert')
const crypto = require('crypto')
const express = require('express')
const http = require('http')
const { tenantContext, pool } = require('../config/database')

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  return value
}
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex') }
function request(port, method, path, body, token = 'mock-jwt-token', extraHeaders = {}) {
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
  const app = express()
  app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({ rlsEnabled:false, isSuperAdmin:false, tenantId:null }, next))
  app.use('/api/assessment-studio', require('../routes/assessmentStudioRoutes'))
  const server = await new Promise(resolve => { const s=app.listen(0,'127.0.0.1',()=>resolve(s)) })
  const port = server.address().port
  const suffix = crypto.randomBytes(5).toString('hex')
  const paperId = 'paper-test-' + suffix
  const doc = {
    format:'assps-canonical-paper', documentModel:'PaperDocumentV2', schemaVersion:3,
    documentOrigin:'USER_AUTHORED', sourceIdentity:null, id:'browser-manual-weekly',
    metadata:{ title:'Weekly Assessment', classLevel:'3', subject:'Science', language:'english' },
    assessment:{ creationMode:'MANUAL', scope:{ chapterId:'ch-' + suffix, label:'Photosynthesis', learningScopeIds:['slo-' + suffix] } },
    sections:[{ id:'s1', nodes:[{
      id:'n1', type:'short_question', stemText:'What is photosynthesis? ' + suffix,
      authoritativeNodeMarks:10, operationalNodeMarks:10, answer:'Food making process in green plants.',
    }] }],
    scoringPlan:{ version:1, maximumObtainableMarks:10, questionMarksTotal:10, balanced:true },
  }
  try {
    await pool.query("INSERT INTO users(id,school_id,name,email,password,role,is_active,tenant_id,must_change_password) VALUES(999,1,'Assessment Capture Test','assessment-capture-999@example.invalid','test-only','admin',true,'assps',false) ON CONFLICT (id) DO NOTHING")
    const unauth = await request(port,'GET','/api/assessment-studio/papers',null,null)
    assert.equal(unauth.status,401)
    const expired = await request(port,'GET','/api/assessment-studio/papers',null,'definitely.invalid.token')
    assert.equal(expired.status,401)

    const first = await request(port,'POST','/api/assessment-studio/papers/' + paperId + '/revisions',{ expectedRevision:0, title:'Weekly Assessment', document:doc })
    assert.equal(first.status,201, first.raw); assert.equal(first.body.data.currentRevision,1); assert.equal(first.body.data.contentHash,hash(doc))

    const conflict = await request(port,'POST','/api/assessment-studio/papers/' + paperId + '/revisions',{ expectedRevision:0, title:'stale tab', document:{...doc, metadata:{title:'stale'}} })
    assert.equal(conflict.status,409, conflict.raw); assert.equal(conflict.body.code,'REVISION_CONFLICT'); assert.equal(conflict.body.currentRevision,1)

    const read = await request(port,'GET','/api/assessment-studio/papers/' + paperId,null)
    assert.equal(read.status,200,read.raw); assert.equal(read.body.data.current_revision,1); assert.equal(read.body.data.document_json.metadata.title,'Weekly Assessment')

    const forgedTenant = await request(port,'GET','/api/assessment-studio/papers/tenant-b-only?school_id=2',null,'mock-jwt-token',{ 'x-school-id':'2' })
    assert.equal(forgedTenant.status,404,forgedTenant.raw)

    const contentHash = hash(doc)
    const release = { releaseId:'release-' + paperId + '-r1', contentHash, rendererVersion:'manual-weekly-v1', releasedAt:new Date().toISOString(), snapshot:doc }
    const finalized = await request(port,'POST','/api/assessment-studio/papers/' + paperId + '/releases',{ expectedRevision:1, release })
    assert.equal(finalized.status,201, finalized.raw); assert.equal(finalized.body.data.content_hash,contentHash)
    assert.equal(finalized.body.data.questionBankCapture.captured,1,finalized.raw)
    assert.equal(finalized.body.data.questionBankCapture.failed,0,finalized.raw)
    assert.equal(finalized.body.data.questionBankCapture.created,1,finalized.raw)

    const finalizedReplay = await request(port,'POST','/api/assessment-studio/papers/' + paperId + '/releases',{ expectedRevision:1, release })
    assert.equal(finalizedReplay.status,201, finalizedReplay.raw)
    assert.equal(finalizedReplay.body.data.questionBankCapture.replayed,1,finalizedReplay.raw)
    assert.equal(finalizedReplay.body.data.questionBankCapture.created,0,finalizedReplay.raw)

    const latest = await request(port,'GET','/api/assessment-studio/papers/' + paperId + '/releases/latest',null)
    assert.equal(latest.status,200,latest.raw); assert.equal(latest.body.data.content_hash,contentHash)

    const afterFinal = {...doc, metadata:{title:'Changed after final'}}
    const second = await request(port,'POST','/api/assessment-studio/papers/' + paperId + '/revisions',{ expectedRevision:1, title:'Changed after final', document:afterFinal })
    assert.equal(second.status,201,second.raw); assert.equal(second.body.data.currentRevision,2)
    const latestStillImmutable = await request(port,'GET','/api/assessment-studio/papers/' + paperId + '/releases/latest',null)
    assert.equal(latestStillImmutable.body.data.content_hash,contentHash)

    console.log('ASSESSMENT_STUDIO_ROUTE_ACCEPTANCE 11/11 PASS')
  } finally {
    await new Promise(resolve=>server.close(resolve)); await pool.end()
  }
}
main().catch(async e=>{ console.error(e); try { await pool.end() } catch (_) {} process.exit(1) })
