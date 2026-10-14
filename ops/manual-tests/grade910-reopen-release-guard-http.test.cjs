'use strict'
process.env.DB_STARTUP_PROBE='false'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const path=require('node:path')
const base=path.resolve(__dirname,'../../al-siddique-backend')
const express=require(require.resolve('express',{paths:[base]}))
const mock=(file,exports)=>{const key=require.resolve(file);require.cache[key]={id:key,filename:key,loaded:true,exports}}
let active=true,checked=[]
const doc={format:'assps-canonical-paper',documentModel:'PaperDocumentV2',schemaVersion:3,
 academicVerifiedSelections:{schemaVersion:'assps-grade910-canonical-approved-revisions-v1',rows:[{id:'QA'}]},
 sections:[]}
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v
const hash=crypto.createHash('sha256').update(JSON.stringify(stable(doc))).digest('hex')
function look(sql){
 const str=String(sql).replace(/\s+/g,' ')
 if(str.includes('LEFT JOIN assessment_paper_revisions'))
  return {rowCount:1,rows:[{public_id:'qapaper',current_revision:1,document_json:doc,content_hash:hash}]}
 if(str.includes('JOIN assessment_papers p')&&str.includes('ORDER BY ar.released_at'))
  return {rowCount:1,rows:[{release_id:'qarelease',snapshot_json:doc,content_hash:hash}]}
 if(str.includes('j.personalized')&&str.includes('ar.snapshot_json'))return {rowCount:1,rows:[{snapshot_json:doc,content_hash:hash,personalized:false}]}
 if(str.includes('FROM assessment_print_jobs j')&&str.includes('LEFT JOIN assessment_roster_snapshots'))
  return {rowCount:1,rows:[{print_job_id:'qajob',release_id:'qarelease',status:'PENDING'}]}
 if(str.includes('FROM assessment_print_jobs j JOIN assessment_releases'))
  return {rowCount:1,rows:[{snapshot_json:doc,content_hash:hash}]}
 if(str.includes('SELECT status,attempt_count FROM assessment_print_jobs'))
  return {rowCount:1,rows:[{status:'PENDING',attempt_count:0}]}
 if(str.includes('UPDATE assessment_print_jobs'))
  return {rowCount:1,rows:[{print_job_id:'qajob',status:'PRINTED'}]}
 return {rowCount:0,rows:[]}
}
mock(base+'/src/config/database',{pool:{connect:async()=>({
 query:async(sql)=>look(sql),release(){}})},query:async(sql)=>look(sql)})
mock(base+'/src/middleware/auth',{protect:(req,res,next)=>{
 const role=req.get('X-QA-Role')
 if(!role)return res.status(401).json({success:false})
 req.user={id:42,school_id:11,role};next()
},requireRoles:(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).end()})
mock(base+'/src/middleware/tenant',{currentSchoolId:req=>req.user?.school_id,tenantClause:async()=>true})
mock(base+'/src/services/grade910PaperWorkspaceReleaseGuard',{
 assertVerifiedPaperDocument:async(args)=>{
  checked.push({schoolId:args.schoolId,actorRole:args.actor.role})
  if(!active){const e=Error('CERTIFIED_QUESTION_REVOKED');e.status=409;e.code='CERTIFIED_QUESTION_REVOKED';throw e}
  return {verifiedReferences:1}
 }})
const route=require(base+'/src/routes/assessmentStudioRoutes')
test('canonical reopen/release and print-job GET fail closed after verified publication revocation',async t=>{
 const app=express();app.use(express.json());app.use('/api/assessment-studio',route)
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close())
 await new Promise(resolve=>server.once('listening',resolve))
 const url='http://127.0.0.1:'+server.address().port+'/api/assessment-studio'
 const fetchQa=(where,options={})=>fetch(url+where,{headers:{'X-QA-Role':'principal'},...options})
 assert.equal((await fetch(url+'/papers/qapaper')).status,401)
 for(const routeName of ['/papers/qapaper','/papers/qapaper/releases/latest','/print-jobs/qajob']){
  active=true;checked=[]
  const ok=await fetchQa(routeName);assert.equal(ok.status,200,routeName)
  assert.equal(checked.length,1,routeName+' must verify exactly once')
  assert.equal(checked[0].schoolId,11)
  active=false;checked=[]
  const revoked=await fetchQa(routeName);assert.equal(revoked.status,409,routeName)
  assert.equal((await revoked.json()).code,'CERTIFIED_QUESTION_REVOKED')
  assert.equal(checked.length,1)
 }
 // Revocation must also block existing print-job status changes and any
 // projected answer/student printable material.
 for (const [where,options] of [
  ['/print-jobs/qajob/status',{method:'PATCH',headers:{'X-QA-Role':'principal','content-type':'application/json'},body:JSON.stringify({status:'PRINTING'})}],
  ['/print-jobs/qajob/answer-key',{}],
  ['/print-jobs/qajob/student-projection/student1',{}]
 ]){
  active=false;checked=[]
  const revoked=await fetchQa(where,options)
  assert.equal(revoked.status,409,where)
  assert.equal(checked.length,1,where)
 }

})
