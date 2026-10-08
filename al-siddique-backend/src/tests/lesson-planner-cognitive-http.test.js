const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const crypto = require('node:crypto')
const { tenantContext, pool } = require('../config/database')

let server
const cleanupSchoolIds = []

function request(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? '' : JSON.stringify(body)
    const req = http.request({
      host:'127.0.0.1', port, path:'/api/lesson-plans' + path, method,
      headers:{
        ...(token ? { authorization:`Bearer ${token}` } : {}),
        ...(data ? { 'content-type':'application/json', 'content-length':Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let raw=''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        let parsed={}
        try { parsed = raw ? JSON.parse(raw) : {} } catch {}
        resolve({ status:res.statusCode, body:parsed, raw })
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function createSchoolWithAdmin(label) {
  const run = crypto.randomBytes(5).toString('hex')
  const code = `lpc_${label}_${run}`
  const school = (await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id", [`Lesson Planner Cognitive ${label} ${run}`, code])).rows[0]
  cleanupSchoolIds.push(school.id)
  const email = `lpc-${label}-${run}@invalid.example`
  const user = (await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,'admin','not-used',true) RETURNING id,email,role", [school.id, code, `Admin ${label}`, email])).rows[0]
  return { schoolId:school.id, tenant:code, user, token:jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET, {algorithm:'HS256',expiresIn:'5m'}) }
}

async function seedPlannerEvidence(school, label, foreign=false) {
  await pool.query(
    `INSERT INTO timetable(school_id,teacher_id,day_order,day_name,start_time,end_time,subject,class_name,section,period_label)
     VALUES($1,$2,1,'Monday','08:15','08:55','Science','Eight','Blue','1st'),
           ($1,$2,3,'Wednesday','09:30','10:05','Science','Eight','Blue','3rd'),
           ($1,$2,2,'Tuesday','08:55','09:30','English','Eight','Blue','2nd')`,
    [school.schoolId, school.user.id]
  )

  const session = (await pool.query("INSERT INTO academic_sessions(school_id,public_id,created_by) VALUES($1,$2,$3) RETURNING id", [school.schoolId, `session-${label}`, school.user.id])).rows[0]
  const sessionVersion = (await pool.query("INSERT INTO academic_session_versions(school_id,academic_session_id,version_number,label,starts_on,ends_on,created_by) VALUES($1,$2,1,'2026-27','2026-08-01','2027-05-31',$3) RETURNING id", [school.schoolId, session.id, school.user.id])).rows[0]
  const offering = (await pool.query("INSERT INTO subject_offerings(school_id,public_id,class_level,subject_code,subject_name,medium,board_authority,created_by) VALUES($1,$2,'8','SCI','Science','english','NCC Pakistan',$3) RETURNING id", [school.schoolId, `off-${label}`, school.user.id])).rows[0]
  const profile = (await pool.query("INSERT INTO curriculum_profiles(school_id,public_id,subject_offering_id,created_by) VALUES($1,$2,$3,$4) RETURNING id", [school.schoolId, `profile-${label}`, offering.id, school.user.id])).rows[0]
  const profileVersion = (await pool.query("INSERT INTO curriculum_profile_versions(school_id,curriculum_profile_id,academic_session_version_id,version_number,label,curriculum_authority,status,created_by) VALUES($1,$2,$3,1,$4,'NCC Pakistan','active',$5) RETURNING id", [school.schoolId, profile.id, sessionVersion.id, foreign ? 'Foreign Curriculum' : 'Pakistan National Curriculum 2026', school.user.id])).rows[0]
  const scopeIdentity = (await pool.query("INSERT INTO learning_scope_identities(school_id,public_id,subject_offering_id,canonical_key,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id", [school.schoolId, `scope-${label}`, offering.id, foreign ? 'foreign-secret-chapter' : 'cells', school.user.id])).rows[0]
  await pool.query("INSERT INTO learning_scope_versions(school_id,learning_scope_id,curriculum_profile_version_id,scope_type,label,sort_order,metadata,created_by) VALUES($1,$2,$3,'chapter',$4,1,$5::jsonb,$6)", [school.schoolId, scopeIdentity.id, profileVersion.id, foreign ? 'FOREIGN SECRET CHAPTER' : 'Cells', JSON.stringify({estimated_periods:3,learning_outcomes:['Explain cell structure']}), school.user.id])

  await pool.query(
    `INSERT INTO question_bank(id,school_id,class_level,subject,chapter_name,topic_name,question_type,question_text,marks,priority,source_type,is_approved,is_duplicate,confidence,created_by)
     VALUES($1,$2,'8','Science',$3,'Structure','long','Explain the concept.',5,$4,$5,true,false,95,$6)`,
    [`q-${label}-${Date.now()}`, school.schoolId, foreign ? 'FOREIGN SECRET CHAPTER' : 'Cells', foreign ? 'past_board' : 'past_board', 'past_paper', school.user.id]
  )
}

test('cognitive Lesson Planner is tenant-isolated, evidence-first and deterministic without AI',{timeout:45000}, async () => {
  assert.equal(process.env.NODE_ENV,'test')
  assert.notEqual(process.env.DB_NAME,'apexos')
  await require('../../migrations/022_lesson_plans_schema').up({pool})
  await require('../config/migrations/009_curriculum_resource_model_v1').up()
  await require('../config/migrations/005_rls_policies').up()

  const a = await createSchoolWithAdmin('a')
  const b = await createSchoolWithAdmin('b')
  await seedPlannerEvidence(a,'a',false)
  await seedPlannerEvidence(b,'b',true)

  const app=express();app.use(express.json())
  app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
  app.use('/api/lesson-plans',require('../routes/lessonPlanRoutes'))
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const port=server.address().port

  let r = await request(port,'GET','/planner/context?classLevel=8&section=Blue&subjects=Science',undefined,a.token)
  assert.equal(r.status,200,r.raw)
  assert.ok(r.body.data.timetable.some(row=>row.subject==='Science'))
  assert.ok(r.body.data.curriculumScopes.some(scope=>scope.label==='Cells'))
  assert.ok(r.body.data.questionBankSignals.some(signal=>signal.chapterName==='Cells'))
  assert.equal(JSON.stringify(r.body.data).includes('FOREIGN SECRET CHAPTER'),false,'cross-school curriculum/QBank data must not leak')

  r = await request(port,'POST','/planner/parse',{text:'Science\nChapter 1: Cells\nObjectives: Explain cell structure\nHomework: Draw a labelled cell',knownSubjects:['Science','English']},a.token)
  assert.equal(r.status,200,r.raw)
  assert.equal(r.body.data.subjects[0].subject,'Science')
  assert.match(r.body.data.subjects[0].units[0].title,/Cells/)

  r = await request(port,'POST','/planner/generate',{
    planningType:'term',classLevel:'8',section:'Blue',startDate:'2026-10-05',endDate:'2026-10-16',subjects:['Science'],termLabel:'First Term',bufferRatio:0.1,useAi:false,
  },a.token)
  assert.equal(r.status,200,r.raw)
  assert.equal(r.body.data.documentType,'ASSPS_LESSON_PLAN')
  assert.equal(r.body.data.subjects.length,1)
  assert.equal(r.body.data.subjects[0].subject,'Science')
  assert.equal(r.body.data.subjects[0].units[0].label,'Cells')
  assert.ok(r.body.data.subjects[0].lessons.length >= 2)
  assert.ok(r.body.data.subjects[0].lessons.every(lesson=>lesson.date && lesson.period))
  assert.equal(r.body.data.provenance.aiEnhanced,false)
  assert.match(r.body.ai.message,/disabled/i)
  assert.equal(JSON.stringify(r.body.data).includes('FOREIGN SECRET CHAPTER'),false)

  r = await request(port,'GET','/planner/context?classLevel=8&section=Blue&subjects=Science',undefined,b.token)
  assert.equal(r.status,200,r.raw)
  assert.ok(JSON.stringify(r.body.data).includes('FOREIGN SECRET CHAPTER'))
  assert.equal(JSON.stringify(r.body.data).includes('Pakistan National Curriculum 2026'),false)

  console.log('LESSON_PLANNER_COGNITIVE_HTTP 11/11 PASS')
})

after(async()=>{
  if(server) await new Promise(resolve=>server.close(resolve))
  const client=await pool.connect().catch(()=>null)
  if(client){try{
    await client.query('BEGIN');await client.query("SELECT set_config('app.rls_enabled','true',true)");await client.query("SELECT set_config('app.is_super_admin','true',true)")
    for(const schoolId of cleanupSchoolIds){
      await client.query('DELETE FROM question_bank WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM timetable WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM resource_scope_mappings WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM learning_scope_versions WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM learning_scope_identities WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM curriculum_profile_versions WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM curriculum_profiles WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM subject_offerings WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM academic_session_versions WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM academic_sessions WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{})
      await client.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})
    }
    await client.query('COMMIT')
  }catch(error){console.error('cognitive planner cleanup error:',error);await client.query('ROLLBACK').catch(()=>{})}finally{client.release()}}
  await pool.end()
})
