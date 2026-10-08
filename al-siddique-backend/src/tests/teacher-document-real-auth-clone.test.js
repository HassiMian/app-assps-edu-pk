'use strict'
process.env.NODE_ENV = 'test'
process.env.DB_STARTUP_PROBE = 'false'
const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const { pool, tenantContext } = require('../config/database')

const dbName = String(process.env.DB_NAME || '')
assert.match(dbName, /^assps_paper_phase7_clone_[0-9]{8}$/, 'Refuse any non-paper-phase7 clone')
assert.equal(String(process.env.DB_PORT), '55447', 'Never use a live PostgreSQL port')
assert.equal(String(process.env.DB_HOST), '127.0.0.1', 'Clone must be on loopback')
assert.ok(process.env.JWT_SECRET, 'Isolated signing secret required')
let server

function request(port, method, route, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? '' : JSON.stringify(body)
    const req = http.request({ host: '127.0.0.1', port, path: route, method, headers: {
      ...(token ? {authorization: `Bearer ${token}`} : {}),
      ...(data ? {'content-type':'application/json','content-length':Buffer.byteLength(data)} : {}),
    } }, res => {
      let raw = ''
      res.on('data',c => raw += c)
      res.on('end', () => {
        let body = null
        try { body = JSON.parse(raw) } catch {}
        resolve({status:res.statusCode,body,raw})
      })
    })
    req.on('error',reject)
    if (data) req.write(data)
    req.end()
  })
}
async function school(label) {
  const code = `p7_${label}_${process.pid}`
  const result = await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id,tenant_id", [`Phase7 ${label}`,code])
  return result.rows[0]
}
async function user(school,role,label) {
  const email = `p7_${label}_${process.pid}@invalid.example`
  const r = await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,$5,'unused',true) RETURNING id,email",[school.id,school.tenant_id,label,email,role])
  const actor = r.rows[0]
  return { ...actor, role, school_id:school.id, token:jwt.sign({id:actor.id,email:actor.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'}) }
}

test('real signed teacher sessions isolate authored Diary and Lesson Plans and require management publication',{timeout:30000}, async () => {
  const alpha = await school('a')
  const beta = await school('b')
  const author = await user(alpha,'teacher','author')
  const peer = await user(alpha,'teacher','peer')
  const principal = await user(alpha,'principal','principal')
  const outsider = await user(beta,'teacher','outsider')
  const app = express(); app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
  app.use('/api/lesson-plans',require('../routes/lessonPlanRoutes'))
  app.use('/api/daily-diary',require('../routes/dailyDiaryRoutes'))
  server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve))
  const port=server.address().port
  const call=(method,route,body,actor)=>request(port,method,route,body,actor?.token)

  let r=await call('GET','/api/lesson-plans/',undefined,null)
  assert.equal(r.status,401,r.raw)

  const planId=`lp_p7_${process.pid}`
  const plan={ id:planId,title:'Lesson Plan Alpha',subject:'English',classLevel:'Eight',date:'2026-10-08',sentToPortal:true,teacher:'Author',chapter:'Paragraphs' }
  r=await call('POST','/api/lesson-plans/',plan,author)
  assert.equal(r.status,201,r.raw)
  assert.equal(r.body.data.sentToPortal,false,'Teacher cannot publish directly in create payload')
  const savedDraft = (await pool.query('SELECT sent_to_portal, payload FROM lesson_plans WHERE school_id=$1 AND public_id=$2',[alpha.id,planId])).rows[0]
  assert.equal(savedDraft.sent_to_portal,false)
  assert.equal(savedDraft.payload.sentToPortal,false,'Persisted payload cannot advertise unauthorized publication')
  r=await call('GET','/api/lesson-plans/',undefined,peer)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,0)
  r=await call('GET','/api/lesson-plans/',undefined,principal)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,1)
  r=await call('GET','/api/lesson-plans/',undefined,outsider)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,0)
  r=await call('POST','/api/lesson-plans/',{...plan,title:'Secret edited by author'},peer)
  assert.equal(r.status,409,r.raw);assert.equal(r.body.data,null,'Duplicate public ID must not leak protected paper')
  r=await call('PUT',`/api/lesson-plans/${planId}`,{...plan,title:'Approved later?',expectedRevision:1,sentToPortal:true},peer)
  assert.equal(r.status,404,r.raw)
  r=await call('PUT',`/api/lesson-plans/${planId}`,{...plan,title:'Author revision',expectedRevision:1,sentToPortal:true},author)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.sentToPortal,false)
  r=await call('POST',`/api/lesson-plans/${planId}/share`,{expectedRevision:2},author)
  assert.equal(r.status,403,r.raw)
  r=await call('POST',`/api/lesson-plans/${planId}/share`,{expectedRevision:2},principal)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.sentToPortal,true)
  r=await call('PUT',`/api/lesson-plans/${planId}`,{...plan,title:'Unreviewed after release',expectedRevision:3},author)
  assert.equal(r.status,404,r.raw)
  r=await call('DELETE',`/api/lesson-plans/${planId}`,{expectedRevision:3},author)
  assert.equal(r.status,404,r.raw)
  r=await call('PUT',`/api/lesson-plans/${planId}`,{...plan,title:'Principal corrected lesson',expectedRevision:3,sentToPortal:true},principal)
  assert.equal(r.status,200,r.raw)
  assert.equal(r.body.data.sentToPortal,false,'Any new edit must revoke previous published revision')
  r=await call('POST',`/api/lesson-plans/${planId}/share`,{expectedRevision:4},principal)
  assert.equal(r.status,200,r.raw)
  assert.equal(r.body.data.sentToPortal,true)

  const diary={classLevel:'Eight',className:'Eight',diaryDate:'2026-10-08',rows:[{subject:'English',diary:'Read page 20'}],slipsPerPage:4}
  r=await call('POST','/api/daily-diary/',{diaryDate:'2026-02-30'},author)
  assert.equal(r.status,422,r.raw)
  r=await call('POST','/api/daily-diary/',diary,author)
  assert.equal(r.status,200,r.raw)
  const diaryId=r.body.data.id
  r=await call('GET','/api/daily-diary/?limit=50',undefined,peer)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,0)
  r=await call('GET','/api/daily-diary/?limit=50',undefined,principal)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,1)
  r=await call('GET','/api/daily-diary/?limit=50',undefined,outsider)
  assert.equal(r.status,200,r.raw);assert.equal(r.body.data.length,0)
  r=await call('GET',`/api/daily-diary/${diaryId}`,undefined,peer)
  assert.equal(r.status,404,r.raw)
  r=await call('PUT',`/api/daily-diary/${diaryId}`,{rows:[{subject:'English',diary:'Altered'}]},peer)
  assert.equal(r.status,404,r.raw)
  r=await call('DELETE',`/api/daily-diary/${diaryId}`,undefined,outsider)
  assert.equal(r.status,404,r.raw)
  r=await call('PUT',`/api/daily-diary/${diaryId}`,{diaryDate:'2026-02-30'},author)
  assert.equal(r.status,422,r.raw)
  r=await call('PUT',`/api/daily-diary/${diaryId}`,{...diary,rows:[{subject:'English',diary:'Read page 21'}]},author)
  assert.equal(r.status,200,r.raw);assert.match(r.body.data.rows[0].diary,/21/)
  r=await call('PUT',`/api/daily-diary/${diaryId}`,{footerText:'Take homework diary home',slipsPerPage:6,styleSettings:{contrast:'high'}},author)
  assert.equal(r.status,200,r.raw)
  assert.equal(new Date(r.body.data.diary_date).toISOString().slice(0,10),'2026-10-08')
  assert.equal(r.body.data.footer_text,'Take homework diary home')
  assert.equal(r.body.data.slips_per_page,6)
  assert.equal(r.body.data.style_settings.contrast,'high')
  r=await call('GET',`/api/daily-diary/${diaryId}`,undefined,principal)
  assert.equal(r.status,200,r.raw)
  console.log('PAPER_PHASE7_AUTHOR_SCOPED_REAL_HTTP PASS')
})
test('real clone G43 metadata list hides answer keys and detail remains school/owner scoped', {timeout:15000}, async () => {
  const {listProjectedPapers,getProjectedPaper}=require('../services/paperStudioProjectionService')
  const ownerSchool=await school('vault')
  const anotherSchool=await school('foreignVault')
  const owner=await user(ownerSchool,'teacher','vaultOwner')
  const peer=await user(ownerSchool,'teacher','vaultPeer')
  const privateAnswer=`SECRET_PHASE7_${process.pid}`
  const row=(await pool.query(`INSERT INTO paper_vault
    (school_id,owner_user_id,name,class_name,subject_name,status,revision,payload)
    VALUES ($1,$2,'Teacher Draft','Eight','Science','draft',1,$3::jsonb)
    RETURNING id`,[ownerSchool.id,owner.id,JSON.stringify({name:'Teacher Draft',questions:[{answer:privateAnswer}],config:{totalMarks:20}})])).rows[0]
  const ownList=await listProjectedPapers({schoolId:ownerSchool.id,userId:owner.id,role:'teacher'})
  assert.equal(ownList.length,1)
  assert.equal(ownList[0].name,'Teacher Draft')
  assert.ok(!JSON.stringify(ownList).includes(privateAnswer))
  assert.equal(ownList[0].document,undefined)
  const peerList=await listProjectedPapers({schoolId:ownerSchool.id,userId:peer.id,role:'teacher'})
  assert.deepEqual(peerList,[])
  const adminList=await listProjectedPapers({schoolId:ownerSchool.id,userId:owner.id,role:'principal'})
  assert.equal(adminList.length,1)
  assert.ok(!JSON.stringify(adminList).includes(privateAnswer))
  const deniedStudent=await listProjectedPapers({schoolId:ownerSchool.id,userId:owner.id,role:'student'})
  assert.deepEqual(deniedStudent,[])
  const ownDetail=await getProjectedPaper({schoolId:ownerSchool.id,userId:owner.id,role:'teacher',paperId:row.id})
  assert.equal(ownDetail.document.questions[0].answer,privateAnswer)
  assert.equal(await getProjectedPaper({schoolId:ownerSchool.id,userId:peer.id,role:'teacher',paperId:row.id}),null)
  assert.equal(await getProjectedPaper({schoolId:anotherSchool.id,userId:owner.id,role:'teacher',paperId:row.id}),null)
  console.log('PAPER_PHASE7_G43_METADATA_AND_OWNER_HTTP_DB PASS')
})
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await pool.end()})
