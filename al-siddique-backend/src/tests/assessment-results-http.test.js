process.env.NODE_ENV='development'
process.env.DEMO_LOGIN_ENABLED='true'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const crypto=require('node:crypto')
const {pool,tenantContext}=require('../config/database')

function request(port,path,{method='GET',body=null}={}){
 return new Promise((resolve,reject)=>{
  const raw=body?Buffer.from(JSON.stringify(body)):null
  const req=http.request({host:'127.0.0.1',port,path,method,headers:{Authorization:'Bearer mock-jwt-token',...(raw?{'Content-Type':'application/json','Content-Length':raw.length}:{})}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let json={};try{json=JSON.parse(text)}catch{};resolve({status:res.statusCode,json,text})})
  })
  req.on('error',reject);if(raw)req.write(raw);req.end()
 })
}

test('assessment result revisions are release-bound, optimistic and immutable',{timeout:30000},async t=>{
 const app=express();app.use(express.json());app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next));app.use('/api/assessment-results',require('../routes/assessmentResultRoutes'))
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s))})
 const port=server.address().port
 const suffix=crypto.randomBytes(5).toString('hex')
 const paperPublic=`result-http-${suffix}`
 const releaseId=`release-result-http-${suffix}`
 let paperId=null,resultRecordId=null
 t.after(async()=>{
  await new Promise(resolve=>server.close(resolve))
  if(resultRecordId){await pool.query('DELETE FROM assessment_result_revisions WHERE result_record_id=$1',[resultRecordId]).catch(()=>{});await pool.query('DELETE FROM assessment_result_records WHERE id=$1',[resultRecordId]).catch(()=>{})}
  if(paperId){await pool.query('DELETE FROM assessment_releases WHERE paper_id=$1',[paperId]).catch(()=>{});await pool.query('DELETE FROM assessment_papers WHERE id=$1',[paperId]).catch(()=>{})}
  await pool.end()
 })
 const p=await pool.query("INSERT INTO assessment_papers(school_id,public_id,title,status,current_revision) VALUES(1,$1,'Result HTTP','FINALIZED',1) RETURNING id",[paperPublic])
 paperId=p.rows[0].id
 const snapshot={format:'assps-canonical-paper',scoringPlan:{maximumObtainableMarks:20},sections:[{id:'q1',authoritativeSectionTotal:10},{id:'q2',authoritativeSectionTotal:10}]}
 await pool.query("INSERT INTO assessment_releases(school_id,paper_id,release_id,revision_number,content_hash,renderer_version,snapshot_json) VALUES(1,$1,$2,1,$3,'test',$4::jsonb)",[paperId,releaseId,'a'.repeat(64),JSON.stringify(snapshot)])

 let r=await request(port,'/api/assessment-results',{method:'POST',body:{releaseId,studentKey:'student-1',expectedRevision:0,entries:[{questionInstanceId:'q1',state:'SCORED',score:0},{questionInstanceId:'q2',state:'NOT_ATTEMPTED'}]}})
 assert.equal(r.status,201,r.text);assert.equal(r.json.data.currentRevision,1);assert.equal(r.json.data.obtainedMarks,0)
 const resultId=r.json.data.resultId
 const rr=await pool.query('SELECT id FROM assessment_result_records WHERE school_id=1 AND result_id=$1',[resultId]);resultRecordId=rr.rows[0].id

 r=await request(port,'/api/assessment-results',{method:'POST',body:{resultId,releaseId,studentKey:'student-1',expectedRevision:0,entries:[{questionInstanceId:'q1',state:'SCORED',score:4},{questionInstanceId:'q2',state:'EXEMPT'}]}})
 assert.equal(r.status,409,r.text);assert.equal(r.json.currentRevision,1)

 r=await request(port,'/api/assessment-results',{method:'POST',body:{resultId,releaseId,studentKey:'student-1',expectedRevision:1,reason:'Recheck',entries:[{questionInstanceId:'q1',state:'SCORED',score:5},{questionInstanceId:'q2',state:'EXEMPT'}]}})
 assert.equal(r.status,200,r.text);assert.equal(r.json.data.currentRevision,2);assert.equal(r.json.data.obtainedMarks,5)

 r=await request(port,`/api/assessment-results/${resultId}`)
 assert.equal(r.status,200,r.text);assert.equal(Number(r.json.data.obtained_marks),5);assert.equal(r.json.data.current_revision,2);assert.equal(r.json.data.revision_reason,'Recheck')

 r=await request(port,'/api/assessment-results',{method:'POST',body:{releaseId,studentKey:'student-2',expectedRevision:0,entries:[{questionInstanceId:'unknown',state:'SCORED',score:1}]}})
 assert.equal(r.status,400,r.text)

 await assert.rejects(()=>pool.query("UPDATE assessment_result_revisions SET revision_reason='tamper' WHERE result_record_id=$1 AND revision_number=1",[resultRecordId]),/immutable assessment result revision/)
})
