const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const {tenantContext,pool}=require('../config/database')

let server
const cleanupSchoolIds=[]

function request(port,method,path,body,token){
 return new Promise((resolve,reject)=>{
  const data=body===undefined?'':JSON.stringify(body)
  const req=http.request({host:'127.0.0.1',port,path:'/api/lesson-plans'+path,method,headers:{
   ...(token?{authorization:`Bearer ${token}`}:{ }),
   ...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{ }),
  }},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let parsed={};try{parsed=raw?JSON.parse(raw):{}}catch{}resolve({status:res.statusCode,body:parsed,raw})})})
  req.on('error',reject);if(data)req.write(data);req.end()
 })
}

async function createSchoolWithAdmin(label){
 const run=crypto.randomBytes(5).toString('hex')
 const code=`lp_${label}_${run}`
 const school=(await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id",[`Lesson Plan ${label} ${run}`,code])).rows[0]
 cleanupSchoolIds.push(school.id)
 const email=`lp-${label}-${run}@invalid.example`
 const user=(await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,'admin','not-used',true) RETURNING id,email,role",[school.id,code,`Admin ${label}`,email])).rows[0]
 return {schoolId:school.id,tenant:code,user,token:jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})}
}

test('lesson plans are durable, revision-bound, tenant-isolated and portal-shared',{timeout:45000},async()=>{
 assert.equal(process.env.NODE_ENV,'test')
 assert.notEqual(process.env.DB_NAME,'apexos')
 await require('../../migrations/022_lesson_plans_schema').up({pool})
 await require('../config/migrations/005_rls_policies').up()
 const a=await createSchoolWithAdmin('a')
 const b=await createSchoolWithAdmin('b')
 const student=(await pool.query("INSERT INTO students(school_id,tenant_id,gr_number,name,class,section,is_active) VALUES($1,$2,$3,'Lesson Plan Student','Seven','A',true) RETURNING id",[a.schoolId,a.tenant,`GR-${Date.now()}`])).rows[0]

 const app=express();app.use(express.json())
 app.use((req,res,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next))
 app.use('/api/lesson-plans',require('../routes/lessonPlanRoutes'))
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const port=server.address().port

 const planId=`lp_http_${Date.now()}`
 const payload={id:planId,title:'Science — Water',subject:'Science',classLevel:'Seven',chapter:'Water',teacher:'Miss Test',date:'2026-10-08',duration:40,objectives:['Understand water cycle'],sentToPortal:false}
 let r=await request(port,'POST','/',payload,a.token)
 assert.equal(r.status,201,r.raw);assert.equal(r.body.data.id,planId);assert.equal(r.body.data.serverRevision,1)

 r=await request(port,'GET','?limit=50',undefined,a.token)
 assert.equal(r.status,200,r.raw);assert.ok(r.body.data.some(item=>item.id===planId))
 r=await request(port,'GET','?limit=50',undefined,b.token)
 assert.equal(r.status,200,r.raw);assert.ok(!r.body.data.some(item=>item.id===planId),'cross-tenant list must not expose plan')

 r=await request(port,'PUT','/'+encodeURIComponent(planId),{...payload,title:'Changed without revision'},a.token)
 assert.equal(r.status,428,r.raw);assert.equal(r.body.code,'LESSON_PLAN_REVISION_REQUIRED')
 r=await request(port,'PUT','/'+encodeURIComponent(planId),{...payload,title:'Science — Water Cycle',expectedRevision:1},a.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.serverRevision,2);assert.equal(r.body.data.title,'Science — Water Cycle')
 r=await request(port,'PUT','/'+encodeURIComponent(planId),{...payload,title:'Stale save',expectedRevision:1},a.token)
 assert.equal(r.status,409,r.raw);assert.equal(r.body.code,'LESSON_PLAN_REVISION_CONFLICT')

 r=await request(port,'POST','/'+encodeURIComponent(planId)+'/share',{expectedRevision:2},a.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.sentToPortal,true);assert.equal(r.body.data.serverRevision,3);assert.equal(r.body.delivery.students,1);assert.equal(r.body.delivery.notifications,2)
 const notices=await pool.query("SELECT recipient_role FROM notification_log WHERE school_id=$1 AND student_id=$2 AND type='lesson_plan' ORDER BY recipient_role",[a.schoolId,student.id])
 assert.deepEqual(notices.rows.map(row=>row.recipient_role),['parent','student'])

 r=await request(port,'DELETE','/'+encodeURIComponent(planId)+'?expectedRevision=2',undefined,a.token)
 assert.equal(r.status,409,r.raw)
 r=await request(port,'DELETE','/'+encodeURIComponent(planId)+'?expectedRevision=3',undefined,a.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.deleted,true)
 r=await request(port,'GET','?limit=50',undefined,a.token)
 assert.equal(r.status,200,r.raw);assert.ok(!r.body.data.some(item=>item.id===planId))
 // Canonical merged English/Urdu A+B private draft: true Express+PostgreSQL
 // roundtrip, peer-school denial and immutable source/publication protection.
 const mergedId = 'lp_grouped_ab_'+Date.now()
 const combined = {
  id:mergedId,title:'Lesson A+B synthetic acceptance',
  classLevel:'Two',subject:'All Subjects',planningScope:'weekly',
  date:'2026-10-15',sentToPortal:true,
  plannerDocument:{
   schoolId:undefined,classLevel:'Two',startDate:'2026-10-15',
   subjects:[{subject:'English',lessons:[{
    title:'English A and B',homework:'[A] Lesson A\n[B] Lesson B'
   }]},{subject:'Urdu',lessons:[{
    title:'Urdu A and B',homework:'[A] Urdu A\n[B] Urdu B'
   }]}],
   provenance:{
    marker:'ASSPS_WEEKLY_NOTEBOOK_V1',
    sourceZipSha256:'a'.repeat(64),academicPublication:'BLOCKED',
    weeklyKey:'Two||2026-10-15',
    sourcePartsBySubject:{
     'ASSPS_AB_MERGE:Two:English':[
      {part:'A',candidateKey:'test-English-A',originalSourceIds:['WA-A']},
      {part:'B',candidateKey:'test-English-B',originalSourceIds:['WA-B']}
     ],
     'ASSPS_AB_MERGE:Two:Urdu':[
      {part:'A',candidateKey:'test-Urdu-A',originalSourceIds:['WA-U-A']},
      {part:'B',candidateKey:'test-Urdu-B',originalSourceIds:['WA-U-B']}
     ]
    }
   }
  }
 }
 r=await request(port,'POST','/',combined,a.token)
 assert.equal(r.status,201,r.raw)
 assert.equal(r.body.data.id,mergedId)
 assert.equal(r.body.data.serverRevision,1)
 assert.equal(r.body.data.sentToPortal,false,'user cannot publish through POST')
 const afterSave=r.body.data.plannerDocument
 assert.equal(afterSave.subjects.length,2,'one canonical English and Urdu row')
 assert.match(afterSave.subjects[0].lessons[0].homework,/\[A\].*\[B\]/s)
 assert.deepEqual(afterSave.provenance.sourcePartsBySubject['ASSPS_AB_MERGE:Two:English']
   .map(x=>x.part),['A','B'])
 assert.deepEqual(afterSave.provenance.sourcePartsBySubject['ASSPS_AB_MERGE:Two:Urdu']
   .map(x=>x.originalSourceIds[0]),['WA-U-A','WA-U-B'])
 r=await request(port,'GET','?limit=50',undefined,a.token)
 assert.equal(r.status,200,r.raw)
 const saved=r.body.data.find(item=>item.id===mergedId)
 assert(saved,'Private merged draft missing on actual HTTP GET')
 assert.deepEqual(saved.plannerDocument,afterSave,'JSONB A/B provenance drift')
 r=await request(port,'GET','?limit=50',undefined,b.token)
 assert.equal(r.status,200,r.raw)
 assert(!r.body.data.some(item=>item.id===mergedId),'peer school can read grouped draft')
 r=await request(port,'POST','/'+encodeURIComponent(mergedId)+'/share',
   {expectedRevision:1},a.token)
 assert.equal(r.status,409,r.raw)
 assert.equal(r.body.code,'LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED')
 r=await request(port,'PUT','/'+encodeURIComponent(mergedId),
   {...combined,expectedRevision:1,plannerDocument:{
    ...combined.plannerDocument,provenance:{
     ...combined.plannerDocument.provenance,academicPublication:'APPROVED'
    }
   }},a.token)
 assert.equal(r.status,409,r.raw)
 assert.equal(r.body.code,'LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
 r=await request(port,'GET','?limit=50',undefined,a.token)
 assert.equal(r.status,200,r.raw)
 const final=r.body.data.find(item=>item.id===mergedId)
 assert.equal(final.serverRevision,1,'rejected academic mutation changed revision')
 assert.equal(final.sentToPortal,false)
 assert.equal(final.plannerDocument.provenance.academicPublication,'BLOCKED')
 console.log('REAL_PG16_TWO_SCHOOL_AB_SAVE_GET_PRIVATE_PROVENANCE_14_CHECKS_PASS')
 console.log('LESSON_PLANS_HTTP 12/12 PASS')
})

after(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve))
 const client=await pool.connect().catch(()=>null)
 if(client){try{
  await client.query('BEGIN');await client.query("SELECT set_config('app.rls_enabled','true',true)");await client.query("SELECT set_config('app.is_super_admin','true',true)")
  for(const schoolId of cleanupSchoolIds){
   await client.query('DELETE FROM notification_log WHERE school_id=$1',[schoolId]).catch(()=>{})
   await client.query('DELETE FROM lesson_plans WHERE school_id=$1',[schoolId]).catch(()=>{})
   await client.query('DELETE FROM students WHERE school_id=$1',[schoolId]).catch(()=>{})
   await client.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{})
   await client.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})
  }
  await client.query('COMMIT')
 }catch{await client.query('ROLLBACK').catch(()=>{})}finally{client.release()}}
 await pool.end()
})
