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
function request(port, method, path, body, token = 'mock-jwt-token', headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? '' : JSON.stringify(body)
    const req = http.request({hostname:'127.0.0.1',port,path,method,headers:{
      'content-type':'application/json',
      ...(token ? {authorization:'Bearer ' + token} : {}),
      ...headers,
      ...(payload ? {'content-length':Buffer.byteLength(payload)} : {}),
    }}, res => {
      let raw=''
      res.on('data', c => raw += c)
      res.on('end', () => {
        let json=null
        try { json=JSON.parse(raw) } catch (_) {}
        resolve({status:res.statusCode,body:json,raw})
      })
    })
    req.on('error',reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function seed() {
  const client=await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id','1',true)")
    await client.query("INSERT INTO users(id,school_id,name,email,password,role,is_active) VALUES(999,1,'Print Test Admin','print-test-999@example.invalid','x','admin',true) ON CONFLICT (id) DO UPDATE SET school_id=EXCLUDED.school_id,name=EXCLUDED.name,role='admin',is_active=true")
    await client.query("DELETE FROM students WHERE school_id=1 AND gr_number IN ('PRINT-TEST-1','PRINT-TEST-2')")
    await client.query("INSERT INTO students(school_id,gr_number,name,class,section,roll_number,is_active) VALUES (1,'PRINT-TEST-1','Ali Test','Seven','A','1',true),(1,'PRINT-TEST-2','Sara Test','Seven','A','2',true)")
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  await seed()
  const app=express()
  app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
  app.use('/api/assessment-studio/print',require('../routes/assessmentPrintRoutes'))
  app.use('/api/assessment-studio',require('../routes/assessmentStudioRoutes'))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
  const port=server.address().port
  const doc={
    format:'assps-canonical-paper',
    documentModel:'PaperDocumentV2',
    schemaVersion:3,
    documentOrigin:'USER_AUTHORED',
    metadata:{title:'Print Pipeline Test',className:'Seven',subject:'Science'},
    sections:[{id:'s1',title:'MCQs',nodes:[{id:'q1',type:'mcq',stemText:'Water is?',answer:'Liquid',explanation:'secret',options:[{label:'A',text:'Solid',isCorrect:false},{label:'B',text:'Liquid',isCorrect:true}]}]}],
    scoringPlan:{version:1,maximumObtainableMarks:1,questionMarksTotal:1,balanced:true},
  }
  try {
    const unauth=await request(port,'POST','/api/assessment-studio/print/roster-snapshots',{className:'Seven'},null)
    assert.equal(unauth.status,401,unauth.raw)

    const revision=await request(port,'POST','/api/assessment-studio/papers/print-route-paper/revisions',{expectedRevision:0,title:'Print Pipeline Test',document:doc})
    assert.equal(revision.status,201,revision.raw)

    const releaseId='release-print-route-r1'
    const release={releaseId,contentHash:hash(doc),rendererVersion:'paper-workspace-v1',releasedAt:new Date().toISOString(),snapshot:doc}
    const finalized=await request(port,'POST','/api/assessment-studio/papers/print-route-paper/releases',{expectedRevision:1,release})
    assert.equal(finalized.status,201,finalized.raw)

    const roster=await request(port,'POST','/api/assessment-studio/print/roster-snapshots',{className:'Seven',section:'A'})
    assert.equal(roster.status,201,roster.raw)
    assert.match(roster.body.data.public_id,/^roster-/)
    assert.equal(roster.body.data.members.length,2)
    assert.deepEqual(roster.body.data.members.map(x=>x.studentKey),['PRINT-TEST-1','PRINT-TEST-2'])
    assert.equal(Object.hasOwn(roster.body.data.members[0],'id'),false)

    const teacher=await request(port,'POST','/api/assessment-studio/print/teacher-binding-snapshots',{
      className:'Seven',section:'A',subject:'Science',
      override:{teacherUserId:999,teacherName:'Test Teacher',reason:'HTTP acceptance fixture'},
    })
    assert.equal(teacher.status,201,teacher.raw)
    assert.match(teacher.body.data.public_id,/^teacher-binding-/)

    const job=await request(port,'POST','/api/assessment-studio/print/jobs',{
      releaseId,
      rosterSnapshotPublicId:roster.body.data.public_id,
      teacherBindingPublicId:teacher.body.data.public_id,
      artifactKind:'student_batch',
      duplex:true,
      copyCount:1,
      rendererVersion:'paper-workspace-v1',
      browserEngineVersion:'chromium-test',
    })
    assert.equal(job.status,201,job.raw)
    assert.match(job.body.data.public_id,/^print-/)
    const printJobId=job.body.data.public_id

    const projection=await request(port,'POST','/api/assessment-studio/print/releases/'+releaseId+'/student-projection',{
      rosterSnapshotPublicId:roster.body.data.public_id,
      teacherBindingPublicId:teacher.body.data.public_id,
      studentKey:'PRINT-TEST-1',
    })
    assert.equal(projection.status,200,projection.raw)
    assert.equal(projection.body.data.projectionType,'STUDENT_SAFE')
    assert.equal(projection.body.data.personalization.student.displayName,'Ali Test')
    assert.equal(projection.body.data.personalization.teacher.displayName,'Test Teacher')
    assert.equal(projection.body.data.paper.sections[0].nodes[0].answer,undefined)
    assert.equal(projection.body.data.paper.sections[0].nodes[0].options[1].isCorrect,undefined)

    const answerKey=await request(port,'GET','/api/assessment-studio/print/releases/'+releaseId+'/answer-key',null)
    assert.equal(answerKey.status,200,answerKey.raw)
    assert.equal(answerKey.body.data.paper.sections[0].nodes[0].answer,'Liquid')

    const plan=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/booklets',{
      pageCounts:{'PRINT-TEST-1':3,'PRINT-TEST-2':2},
    })
    assert.equal(plan.status,201,plan.raw)
    assert.equal(plan.body.data.totalPages,6)
    assert.deepEqual(plan.body.data.booklets.map(x=>({start:x.startPage,pad:x.paddingPages})),[{start:1,pad:1},{start:5,pad:0}])

    const replay=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/booklets',{
      pageCounts:{'PRINT-TEST-1':3,'PRINT-TEST-2':2},
    })
    assert.equal(replay.status,201,replay.raw)
    assert.equal(replay.body.data.idempotentReplay,true)

    const changedPlan=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/booklets',{
      pageCounts:{'PRINT-TEST-1':2,'PRINT-TEST-2':2},
    })
    assert.equal(changedPlan.status,409,changedPlan.raw)
    assert.equal(changedPlan.body.code,'PRINT_BOOKLET_PLAN_ALREADY_FROZEN')

    const attempt1=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/attempts',{operatorConfirmed:false,note:'first attempt'})
    assert.equal(attempt1.status,201,attempt1.raw)
    assert.equal(attempt1.body.data.attempt_number,1)

    const retryBlocked=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/attempts',{operatorConfirmed:false})
    assert.equal(retryBlocked.status,409,retryBlocked.raw)
    assert.equal(retryBlocked.body.code,'PRINT_RETRY_CONFIRMATION_REQUIRED')

    const attempt2=await request(port,'POST','/api/assessment-studio/print/jobs/'+printJobId+'/attempts',{operatorConfirmed:true,note:'approved retry'})
    assert.equal(attempt2.status,201,attempt2.raw)
    assert.equal(attempt2.body.data.attempt_number,2)

    const read=await request(port,'GET','/api/assessment-studio/print/jobs/'+printJobId,null)
    assert.equal(read.status,200,read.raw)
    assert.equal(read.body.data.job.public_id,printJobId)
    assert.equal(read.body.data.attempts.length,2)
    assert.equal(read.body.data.booklets.length,2)

    console.log('ASSESSMENT_PRINT_ROUTE_ACCEPTANCE 14/14 PASS')
  } finally {
    await new Promise(resolve=>server.close(resolve))
    await pool.end()
  }
}

main().catch(async error=>{console.error(error);try{await pool.end()}catch(_){}process.exit(1)})

