process.env.NODE_ENV='development'
process.env.DEMO_LOGIN_ENABLED='true'
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('http')
const {tenantContext,pool}=require('../config/database')

function request(port,path,body){return new Promise((resolve,reject)=>{const raw=JSON.stringify(body||{});const req=http.request({hostname:'127.0.0.1',port,path,method:'POST',headers:{authorization:'Bearer mock-jwt-token','content-type':'application/json','content-length':Buffer.byteLength(raw)}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{let json={};try{json=JSON.parse(text)}catch{}resolve({status:res.statusCode,body:json,raw:text})})});req.on('error',reject);req.write(raw);req.end()})}

test('assessment print API snapshots normalized roster and freezes duplex plan',{timeout:30000},async t=>{
  await pool.query("INSERT INTO users(id,school_id,name,email,password,role,is_active,tenant_id,must_change_password) VALUES(999,1,'Print Test Admin','print-test-999@example.invalid','test-only','admin',true,'assps',false) ON CONFLICT (id) DO NOTHING")
  const suffix=Date.now().toString(36)
  const paperPublicId='print-http-paper-'+suffix
  const releaseId='print-http-release-'+suffix
  const paper=await pool.query("INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision) VALUES(1,$1,'Print HTTP Test','FINALIZED',1) RETURNING id",[paperPublicId])
  await pool.query("INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json) VALUES(1,$1,$2,1,$3,'test-renderer','{}'::jsonb)",[paper.rows[0].id,releaseId,'a'.repeat(64)])

  const app=express();app.use(express.json());app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next));app.use('/api/assessment-print',require('../routes/assessmentPrintRoutes'))
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))});const port=server.address().port
  t.after(async()=>{await new Promise(r=>server.close(r));await pool.end()})

  const roster=await request(port,'/api/assessment-print/roster-snapshots',{className:'7'})
  assert.equal(roster.status,201,roster.raw);assert.equal(roster.body.data.class_name,'Seven');assert.ok(roster.body.data.student_count>0)
  const binding=await request(port,'/api/assessment-print/teacher-bindings',{className:'Class 7',subject:'Science',override:{teacherName:'Snapshot Teacher',reason:'route test'}})
  assert.equal(binding.status,201,binding.raw);assert.equal(binding.body.data.class_name,'Seven')
  const job=await request(port,'/api/assessment-print/jobs',{releaseId,rosterSnapshotId:roster.body.data.id,teacherBindingSnapshotId:binding.body.data.id,artifactKind:'student_batch',duplex:true,rendererVersion:'test-renderer'})
  assert.equal(job.status,201,job.raw);assert.equal(job.body.data.personalized,true)
  const pageCounts={};for(const member of roster.body.data.members)pageCounts[member.id]=1
  const plan=await request(port,'/api/assessment-print/jobs/'+encodeURIComponent(job.body.data.public_id)+'/booklets',{pageCounts})
  assert.equal(plan.status,201,plan.raw);assert.ok(plan.body.data.booklets.every(x=>x.startPage%2===1&&x.paddingPages===1))
  const attempt=await request(port,'/api/assessment-print/jobs/'+encodeURIComponent(job.body.data.public_id)+'/attempts',{note:'first'})
  assert.equal(attempt.status,201,attempt.raw)
  console.log('ASSESSMENT_PRINT_HTTP 5/5 PASS')
})
