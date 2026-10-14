'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),Module=require('node:module')
const express=require('express')
let scope=1,role='admin',returned=true,fail=false
const sourceRows=[]
for(const cls of ['Four','Five','Six','Seven','Pre-Nine'])for(let p=1;p<=8;p++)
 sourceRows.push({class_name:cls,section:'',period_label:'Period '+p,subject:'Subject',teacher_display_name:'Teacher',staff_identity_reviewed:false,academic_session:'2026–27'})
for(const subject of ['Assembly','Break'])sourceRows.push({class_name:'School-wide',section:'',period_label:subject,subject,staff_identity_reviewed:false})
const staffRows=Array.from({length:56},(_,i)=>({teacher_label:'Miss Isma',employee_id:45,
 official_employee_name:'Isma Mustafa',employee_active:true,
 class_name:'Four',section:'',period_label:'Period '+(i%8+1),
 canonical_subject:'Mathematics',teaching_department:'STEM / Mathematics',
 identity_status:'unique_active_givenname',authorization_status:'schedule_reference_only'}))
let gradeNineLoaded=false
const dbCalls=[]
const original=Module._load
Module._load=function(req,parent,isMain){
 if(parent?.filename?.endsWith('timetableReferenceRoutes.js')&&req==='../config/database')
  return {query:async(sql,args)=>{dbCalls.push(args);if(fail)throw Error('DB_DOWN');if(sql.includes('employee_teaching_subject_evidence'))return {rows:returned?staffRows:[]};return {rows:returned?(gradeNineLoaded?[...sourceRows,...Array.from({length:16},(_,i)=>({class_name:'Nine',section:i<8?'Fatima':'Usman',period_label:'Period '+(i%8+1),subject:'Mathematics',teacher_display_name:'Miss Ghulam Fatima',staff_identity_reviewed:false}))]:sourceRows):[]}}}
 if(parent?.filename?.endsWith('timetableReferenceRoutes.js')&&req==='../middleware/auth')
  return {protect:(req,res,next)=>{if(!req.headers.authorization)return res.sendStatus(401);req.user={role};req.school_id=scope;next()},requireScopeForServiceOnly:()=>(_req,_res,next)=>next()}
 return original.call(this,req,parent,isMain)
}
const r=require('../routes/timetableReferenceRoutes')
Module._load=original
const app=express();app.use('/api/timetable',r)
let server,base
test.before(async()=>{server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port})
test.after(async()=>await new Promise(resolve=>server.close(resolve)))
const request=async(auth=true)=>{const r=await fetch(base+'/api/timetable/reference',{headers:auth?{Authorization:'Bearer synthetic-qa'}:{}});return {status:r.status,body:await r.json().catch(()=>null)}}
test('authenticated school1 sees only reference 40 plus two school-wide bells',async()=>{
 scope=1;role='admin';returned=true;fail=false;dbCalls.length=0
 const r=await request()
 assert.equal(r.status,200);assert.equal(r.body.data.length,42)
 assert.equal(r.body.sourceTeacherAccountsApproved,false)
 assert.equal(r.body.fridayScheduleIncluded,false)
 assert.equal(dbCalls.at(-1)[0],1);assert.equal(dbCalls.at(-1).length,3)
})
test('no token and student role are denied',async()=>{
 scope=1;role='student'
 assert.equal((await request(false)).status,401)
 assert.equal((await request(true)).status,403)
 role='admin'
})
test('another school is never queried as school1 and receives no schedule',async()=>{
 scope=2;returned=false;dbCalls.length=0
 const r=await request();assert.equal(r.status,200);assert.equal(r.body.data.length,0)
 assert.equal(dbCalls.at(-1)[0],2);scope=1;returned=true
})
test('missing/partial reference import and DB error fail closed',async()=>{
 returned=false;assert.equal((await request()).status,503)
 returned=true;fail=true;assert.equal((await request()).status,503)
 fail=false
})

test('Class IX Fatima + Usman add exact 16 timetable periods',async()=>{
 scope=1;role='admin';returned=true;fail=false;gradeNineLoaded=true
 const r=await request()
 assert.equal(r.status,200);assert.equal(r.body.data.length,58)
 assert.equal(r.body.grade9SectionsLoaded,true)
 gradeNineLoaded=false
})
test('employee subject departments are restricted to school admins',async()=>{
 scope=1;role='teacher';returned=true;fail=false
 const bad=await fetch(base+'/api/timetable/staff-subjects',{headers:{Authorization:'Bearer fixture'}})
 assert.equal(bad.status,403)
 role='admin';dbCalls.length=0
 const res=await fetch(base+'/api/timetable/staff-subjects',{headers:{Authorization:'Bearer fixture'}})
 assert.equal(res.status,200)
 const j=await res.json()
 assert.equal(j.records.length,56)
 assert.equal(j.authorizationIssued,false)
 assert.deepEqual(dbCalls.at(-1),[1])
})
