const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('http')
const {tenantContext,pool}=require('../config/database')

function req(port,method,path,body,token='mock-jwt-token'){
  return new Promise((resolve,reject)=>{
    const payload=body==null?'':JSON.stringify(body)
    const r=http.request({
      hostname:'127.0.0.1',port,path,method,
      headers:{
        'content-type':'application/json',
        ...(token?{authorization:`Bearer ${token}`}:{}),
        ...(payload?{'content-length':Buffer.byteLength(payload)}:{}),
      },
    },res=>{
      let raw=''
      res.on('data',c=>raw+=c)
      res.on('end',()=>{
        let json=null
        try{json=JSON.parse(raw)}catch{}
        resolve({status:res.statusCode,body:json,raw})
      })
    })
    r.on('error',reject)
    if(payload)r.write(payload)
    r.end()
  })
}

test('Assessment result revisions are release-bound, immutable and CAS-safe',{timeout:30000},async t=>{
  assert.equal(process.env.NODE_ENV,'test')
  assert.notEqual(process.env.DB_NAME,'apexos')

  await pool.query(`INSERT INTO users(id,school_id,name,email,password,role,is_active)
    VALUES(999,1,'Result Fixture','result-fixture@invalid.local','x','admin',true)
    ON CONFLICT(id) DO NOTHING`)

  const student=(await pool.query(`SELECT id FROM students WHERE school_id=1 ORDER BY id LIMIT 1`)).rows[0]
  assert.ok(student?.id,'school 1 needs at least one student fixture')

  const paper=(await pool.query(`INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision)
    VALUES(1,'result-http-paper','Result HTTP','FINALIZED',1)
    ON CONFLICT(school_id,public_id) DO UPDATE SET title=EXCLUDED.title
    RETURNING id`)).rows[0]

  const snapshot={
    scoringPlan:{maximumObtainableMarks:20},
    sections:[
      {id:'sec-1',sectionIndex:1,authoritativeSectionTotal:10,nodes:[{id:'q-1',marks:10}]},
      {id:'sec-2',sectionIndex:2,nodes:[
        {id:'q-2a',authoritativeNodeMarks:5},
        {id:'q-2b',authoritativeNodeMarks:5},
      ]},
    ],
  }

  await pool.query(`INSERT INTO assessment_paper_revisions(school_id,paper_id,revision_number,document_json,content_hash)
    VALUES(1,$1,1,$2,$3) ON CONFLICT DO NOTHING`,[paper.id,JSON.stringify(snapshot),'d'.repeat(64)])

  await pool.query(`INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json)
    VALUES(1,$1,'result-http-release',1,$2,'result-http-test',$3)
    ON CONFLICT(school_id,release_id) DO NOTHING`,[paper.id,'d'.repeat(64),JSON.stringify(snapshot)])

  const app=express()
  app.use(express.json())
  app.use((q,s,n)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},n))
  app.use('/api/assessment-studio',require('../routes/assessmentStudioRoutes'))
  const server=await new Promise(ok=>{const s=app.listen(0,'127.0.0.1',()=>ok(s))})
  const port=server.address().port
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end()})

  const base=`/api/assessment-studio/papers/result-http-paper/releases/result-http-release/results`
  let read=await req(port,'GET',base+`/latest?studentId=${student.id}`)
  assert.equal(read.status,404,read.raw)

  const draft=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:0,
    resultStatus:'DRAFT',
    entries:[
      {questionInstanceId:'q-1',state:'SCORED',score:8,comment:'good'},
      {questionInstanceId:'q-2a',state:'SCORED',score:4},
      {questionInstanceId:'q-2b',state:'NOT_CHECKED'},
    ],
  })
  assert.equal(draft.status,201,draft.raw)
  assert.equal(draft.body.data.revision_number,1)
  assert.equal(Number(draft.body.data.total_score),12)
  assert.equal(Number(draft.body.data.maximum_score),20)

  const stale=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:0,
    resultStatus:'DRAFT',
    entries:[],
  })
  assert.equal(stale.status,409,stale.raw)
  assert.equal(stale.body.code,'RESULT_REVISION_CONFLICT')
  assert.equal(stale.body.currentRevision,1)

  const finalized=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:1,
    resultStatus:'FINALIZED',
    reason:'approved exemption after recheck',
    entries:[
      {questionInstanceId:'q-1',state:'SCORED',score:8},
      {questionInstanceId:'q-2a',state:'SCORED',score:4},
      {questionInstanceId:'q-2b',state:'EXEMPT'},
    ],
  })
  assert.equal(finalized.status,201,finalized.raw)
  assert.equal(finalized.body.data.revision_number,2)
  assert.equal(finalized.body.data.result_status,'FINALIZED')
  assert.equal(Number(finalized.body.data.total_score),12)
  assert.equal(Number(finalized.body.data.maximum_score),20)
  assert.equal(Number(finalized.body.data.effective_maximum_score),15)
  assert.equal(finalized.body.data.reason,'approved exemption after recheck')

  const missingReason=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:2,
    resultStatus:'FINALIZED',
    entries:[
      {questionInstanceId:'q-1',state:'SCORED',score:9},
      {questionInstanceId:'q-2a',state:'SCORED',score:4},
      {questionInstanceId:'q-2b',state:'EXEMPT'},
    ],
  })
  assert.equal(missingReason.status,422,missingReason.raw)
  assert.equal(missingReason.body.code,'RESULT_REVISION_REASON_REQUIRED')

  const regrade=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:2,
    resultStatus:'FINALIZED',
    reason:'score corrected after moderation',
    entries:[
      {questionInstanceId:'q-1',state:'SCORED',score:9},
      {questionInstanceId:'q-2a',state:'SCORED',score:4},
      {questionInstanceId:'q-2b',state:'EXEMPT'},
    ],
  })
  assert.equal(regrade.status,201,regrade.raw)
  assert.equal(regrade.body.data.revision_number,3)
  assert.equal(Number(regrade.body.data.total_score),13)
  assert.equal(regrade.body.data.reason,'score corrected after moderation')

  read=await req(port,'GET',base+`/latest?studentId=${student.id}`)
  assert.equal(read.status,200,read.raw)
  assert.equal(read.body.data.revision_number,3)
  assert.equal(read.body.data.entries.length,3)
  assert.equal(read.body.data.entries.find(x=>x.question_instance_id==='q-2b').state,'EXEMPT')

  const unknown=await req(port,'POST',base,{
    studentId:student.id,
    expectedRevision:3,
    resultStatus:'DRAFT',
    reason:'invalid instance test',
    entries:[{questionInstanceId:'not-in-release',state:'SCORED',score:1}],
  })
  assert.equal(unknown.status,422,unknown.raw)
  assert.equal(unknown.body.code,'UNKNOWN_QUESTION_INSTANCE')

  const wrongStudent=await req(port,'POST',base,{
    studentId:2147483647,
    expectedRevision:0,
    resultStatus:'DRAFT',
    entries:[],
  })
  assert.equal(wrongStudent.status,404,wrongStudent.raw)
  assert.equal(wrongStudent.body.code,'ASSESSMENT_STUDENT_NOT_FOUND')

  const unauth=await req(port,'GET',base+`/latest?studentId=${student.id}`,null,null)
  assert.equal(unauth.status,401,unauth.raw)

  const revisions=await pool.query(`SELECT revision_number,result_status,reason,created_by_key
    FROM assessment_result_revisions
    WHERE school_id=1 AND release_id='result-http-release' AND student_id=$1
    ORDER BY revision_number`,[student.id])
  assert.deepEqual(revisions.rows.map(x=>Number(x.revision_number)),[1,2,3])
  assert.equal(revisions.rows[1].reason,'approved exemption after recheck')
  assert.equal(String(revisions.rows[1].created_by_key),'999')
  assert.equal(revisions.rows[2].reason,'score corrected after moderation')
  assert.equal(String(revisions.rows[2].created_by_key),'999')

  console.log('ASSESSMENT_RESULTS_HTTP 11/11 PASS')
})
