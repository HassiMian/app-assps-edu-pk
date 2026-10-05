require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env'})
const {pool}=require('/var/www/apex-backend/config/database')
const bcrypt=require('/var/www/apex-backend/node_modules/bcryptjs')
const http=require('node:http')
const crypto=require('node:crypto')
const PORT=Number(process.env.TEST_API_PORT||5018)
const BASE='/api'
const request=(url,method='GET',body=null,cookie='')=>new Promise((resolve,reject)=>{const raw=body?JSON.stringify(body):null;const req=http.request({hostname:'127.0.0.1',port:PORT,path:BASE+url,method,headers:{Host:'api.assps.edu.pk','Content-Type':'application/json',...(raw?{'Content-Length':Buffer.byteLength(raw)}:{}),...(cookie?{Cookie:cookie}:{})},timeout:8000},res=>{let out='';res.on('data',c=>out+=c);res.on('end',()=>{let json;try{json=JSON.parse(out)}catch{json={raw:out.slice(0,200)}}resolve({status:res.statusCode,json})})});req.on('error',reject);if(raw)req.write(raw);req.end()})
async function main(){const db=await pool.connect();let sid;try{
  const suf=crypto.randomBytes(5).toString('hex'),code='v6dhistory'+suf,password=crypto.randomBytes(18).toString('base64url'),hash=await bcrypt.hash(password,10)
  sid=(await db.query("INSERT INTO schools(name,code,status,tenant_id) VALUES('Synthetic V6D Revision QA',$1,'active',$1) RETURNING id",[code])).rows[0].id
  const actors={}
  for(const [key,role] of [['teacherA','teacher'],['teacherB','teacher'],['admin','admin']]){
    const email=`${key}-${suf}@invalid.example`
    const u=(await db.query('INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id',[sid,code,key,email,role,hash])).rows[0]
    const lr=await request('/auth/login','POST',{email,password,role,school_code:code})
    if(lr.status!==200)throw Error(`failed login ${key} ${lr.status}`)
    // login headers obtained with dedicated HTTP call below (JSON resolver does not expose headers).
    actors[key]={id:u.id,email,role}
  }
  async function login(actor){return new Promise((resolve,reject)=>{const body=JSON.stringify({email:actor.email,password,role:actor.role,school_code:code});const req=http.request({hostname:'127.0.0.1',port:PORT,path:'/api/auth/login',method:'POST',headers:{Host:'api.assps.edu.pk','Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{res.resume();res.on('end',()=>resolve((res.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')))});req.on('error',reject);req.end(body)})}
  for(const actor of Object.values(actors))actor.cookie=await login(actor)
  await db.query("INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,is_active) VALUES($1,$2,'Seven','A','Science',true),($1,$3,'Eight','B','Math',true)",[sid,actors.teacherA.id,actors.teacherB.id])
  const paper={name:'V6D Science Revision Test',config:{classLevel:'Seven',section:'A',subject:'Science',language:'dual'},numberedQuestionTypes:[{value:'mcq',questionNo:1,label:'MCQs',marks:1},{value:'short',questionNo:2,label:'Shorts',marks:2}],mcq_marks:1,short_marks:2,mcq:[{id:'m1',en:'Original first MCQ?',ur:'پہلا سوال؟',answer:'B',options:[{id:'A',text:'a'},{id:'B',text:'b'}]},{id:'m2',en:'Original second MCQ?',ur:'دوسرا سوال؟',answer:'A',options:[{id:'A',text:'واحد'},{id:'B',text:'دو'}]}],short:[{id:'s1',en:'Original short?',ur:'مختصر سوال؟',answerLines:3,answer:'Test'}],unknown:{sourceRevision:42,keep:true}}
  let r=await request('/paper/vault','POST',{paper},actors.teacherA.cookie)
  if(r.status!==201)throw Error('initial save failed '+r.status+' '+JSON.stringify(r.json))
  const id=String(r.json.paper.id)
  const {legacyPaperToWorkingDocument}=await import('file:///root/workspace/apex-release/saas-src/al-siddique-backend/src/services/papers/saasReviewedContract/losslessLegacyBridgeV6D.mjs')
  r=await request(`/portal/paper-studio/papers/${id}/document-review`,'GET',null,actors.teacherA.cookie)
  if(r.status!==200)throw Error('initial review failed')
  const beforeHash=r.json.review.snapshotHash,working=legacyPaperToWorkingDocument(paper)
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:working,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==400||r.json.code!=='REVISION_REQUIRED')throw Error('missing revision not blocked')
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:working,expectedRevision:1,expectedSnapshotHash:'f'.repeat(64)},actors.teacherA.cookie)
  if(r.status!==409)throw Error('stale hash not rejected');console.log('PASS strict revision + SHA are mandatory')
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:working,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherB.cookie)
  if(r.status!==404)throw Error('cross-teacher save leaked')
  r=await request(`/portal/paper-studio/papers/${id}/revisions`,'GET',null,actors.teacherB.cookie)
  if(r.status!==404)throw Error('cross-teacher history leaked');console.log('PASS cross-teacher save/history are non-leaking 404')
  const tampered=structuredClone(working);tampered.blocks[0].sourceType='short'
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:tampered,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==422||r.json.code!=='UNSAFE_EDIT')throw Error('source identity mutation not blocked');console.log('PASS server-side lossless bridge blocks protected source mutation')
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:working,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==200||!r.json.data.unchanged||r.json.data.revision!==1)throw Error('no-op not idempotent');console.log('PASS no-op save neither advances revision nor creates journal')
  const edit=structuredClone(working);edit.blocks[1].contentHtml='<p>First safe edit to second MCQ?</p>'
  await db.query("UPDATE teacher_class_assignments SET is_active=false WHERE school_id=$1 AND teacher_user_id=$2",[sid,actors.teacherA.id])
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:edit,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==403)throw Error('revoked assignment accepted')
  await db.query("UPDATE teacher_class_assignments SET is_active=true WHERE school_id=$1 AND teacher_user_id=$2",[sid,actors.teacherA.id]);console.log('PASS revoked teacher assignment cannot save')
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:edit,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==200||r.json.data.revision!==2||r.json.data.unchanged!==false)throw Error('first guarded save failed '+JSON.stringify(r))
  const rev2Hash=r.json.data.snapshotHash
  r=await request(`/portal/paper-studio/papers/${id}/revisions`,'GET',null,actors.teacherA.cookie)
  if(r.status!==200||r.json.data.history.length!==2||r.json.data.currentRevision!==2||r.json.data.history[0].revision!==2||r.json.data.history[1].revision!==1)throw Error('immutable history missing '+JSON.stringify(r.json));console.log('PASS atomic baseline+revision2 journal')
  r=await request(`/portal/paper-studio/papers/${id}/revisions/1`,'GET',null,actors.teacherA.cookie)
  if(r.status!==200||r.json.data.document.mcq[1].en!=='Original second MCQ?')throw Error('original history corrupted')
  r=await request(`/portal/paper-studio/papers/${id}/revisions/2`,'GET',null,actors.teacherA.cookie)
  if(r.status!==200||r.json.data.document.mcq[1].en!=='First safe edit to second MCQ?'||r.json.data.document.unknown.sourceRevision!==42||r.json.data.document.mcq[0].en!=='Original first MCQ?')throw Error('revision2 content corrupted')
  console.log('PASS previous and new immutable snapshots retain source data')
  r=await request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:edit,expectedRevision:1,expectedSnapshotHash:beforeHash},actors.teacherA.cookie)
  if(r.status!==409)throw Error('stale replay accepted')
  r=await request(`/portal/paper-studio/papers/${id}/revisions/1`,'GET',null,actors.teacherB.cookie)
  if(r.status!==404)throw Error('historical source leak')
  r=await request(`/portal/paper-studio/papers/${id}/revisions`,'GET',null,actors.admin.cookie)
  if(r.status!==200||r.json.data.history.length!==2)throw Error('admin history access broken');console.log('PASS stale replay rejected, admin history governed, foreign read blocked')
  const latest=(await db.query('SELECT payload FROM paper_vault WHERE id=$1',[id])).rows[0].payload
  const concurrentBase=legacyPaperToWorkingDocument(latest),a=structuredClone(concurrentBase),b=structuredClone(concurrentBase)
  a.blocks[0].contentHtml='<p>Concurrent variant Alpha?</p>';b.blocks[0].contentHtml='<p>Concurrent variant Beta?</p>'
  const [ra,rb]=await Promise.all([request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:a,expectedRevision:2,expectedSnapshotHash:rev2Hash},actors.teacherA.cookie),request(`/portal/paper-studio/papers/${id}`,'PATCH',{workingDocument:b,expectedRevision:2,expectedSnapshotHash:rev2Hash},actors.teacherA.cookie)])
  if([ra.status,rb.status].sort().join(',')!=='200,409')throw Error(`parallel CAS did not serialize ${ra.status},${rb.status}`)
  const final=await db.query('SELECT revision,payload FROM paper_vault WHERE id=$1',[id]);if(final.rows[0].revision!==3||!['Concurrent variant Alpha?','Concurrent variant Beta?'].includes(final.rows[0].payload.mcq[0].en))throw Error('parallel writer inconsistency');console.log('PASS concurrent writers serialize: one 200, one 409, one new revision')
  r=await request(`/portal/paper-studio/papers/${id}/revisions`,'GET',null,actors.teacherA.cookie)
  if(r.status!==200||r.json.data.history.length!==3)throw Error('parallel write created missing/duplicate history')
  console.log('V6D_REVISION_HTTP_GATE 9/9 PASS')
}finally{if(sid){await db.query('DELETE FROM paper_vault WHERE school_id=$1',[sid]).catch(()=>{});await db.query('DELETE FROM teacher_class_assignments WHERE school_id=$1',[sid]).catch(()=>{});await db.query('DELETE FROM users WHERE school_id=$1',[sid]).catch(()=>{});await db.query('DELETE FROM schools WHERE id=$1',[sid]).catch(()=>{})}db.release();await pool.end();console.log('V6D_SYNTHETIC_FIXTURES_CLEANED')}}
main().catch(e=>{console.error('V6D_GATE_FAILED',e.stack||e.message);process.exitCode=1})
