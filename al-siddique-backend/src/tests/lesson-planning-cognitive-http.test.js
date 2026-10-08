const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const {tenantContext,pool}=require('../config/database')
let server
const cleanup=[]
function req(port,method,path,body,token){return new Promise((resolve,reject)=>{const data=body===undefined?'':JSON.stringify(body);const q=http.request({host:'127.0.0.1',port,path:'/api/lesson-plans'+path,method,headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{ })}},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let parsed={};try{parsed=raw?JSON.parse(raw):{}}catch{}resolve({status:res.statusCode,body:parsed,raw})})});q.on('error',reject);if(data)q.write(data);q.end()})}
async function makeSchool(label){const run=crypto.randomBytes(5).toString('hex');const code=`lp2_${label}_${run}`;const school=(await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id",[`Cognitive ${label} ${run}`,code])).rows[0];cleanup.push(school.id);const email=`lp2-${label}-${run}@invalid.example`;const user=(await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,'admin','x',true) RETURNING id,email",[school.id,code,`Admin ${label}`,email])).rows[0];return{schoolId:school.id,tenant:code,token:jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})}}

test('cognitive planner context, parse and deterministic generation are tenant-scoped',{timeout:45000},async()=>{
 assert.notEqual(process.env.DB_NAME,'apexos')
 const a=await makeSchool('a'),b=await makeSchool('b')
 await pool.query("INSERT INTO timetable(school_id,day_order,day_name,start_time,end_time,subject,class_name,section,period_label) VALUES($1,1,'Monday','08:00','08:40','Science','Eight','Blue','1st')",[a.schoolId])
 await pool.query("INSERT INTO question_bank(id,school_id,class_level,subject,chapter_name,question_type,question_text,marks,is_approved,is_duplicate,source_type,priority) VALUES($1,$2,'8','Science','Cells','long','Explain cell structure',5,true,false,'past_paper','past')",[`q_${Date.now()}`,a.schoolId])
 const app=express();app.use(express.json());app.use((rq,rs,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next));app.use('/api/lesson-plans',require('../routes/lessonPlanRoutes'));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const port=server.address().port
 let r=await req(port,'GET','/planner/context?classLevel=8&section=Blue&subjects=Science',undefined,a.token)
 assert.equal(r.status,200,r.raw);assert.ok(r.body.data.availableSubjects.includes('Science'));assert.equal(r.body.data.questionBankSignals.length,1);assert.equal(r.body.data.timetable.length,1)
 r=await req(port,'GET','/planner/context?classLevel=8&section=Blue&subjects=Science',undefined,b.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.questionBankSignals.length,0);assert.equal(r.body.data.timetable.length,0)
 r=await req(port,'POST','/planner/parse',{text:'Science\nChapter 1: Cells\nObjectives: Explain cell structure\nHomework: Draw a cell',knownSubjects:['Science','Math']},a.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.subjects[0].subject,'Science');assert.match(r.body.data.subjects[0].units[0].title,/Cells/)
 r=await req(port,'POST','/planner/generate',{planningType:'daily',classLevel:'8',section:'Blue',startDate:'2026-10-05',endDate:'2026-10-05',subjects:['Science'],bufferRatio:0,useAi:false},a.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.subjects[0].subject,'Science');assert.equal(r.body.data.subjects[0].capacityPeriods,1);assert.equal(r.body.data.subjects[0].lessons[0].date,'2026-10-05');assert.equal(r.body.data.subjects[0].lessons[0].period,'1st');assert.equal(r.body.ai.used,false)
 r=await req(port,'POST','/planner/generate',{planningType:'daily',classLevel:'8',section:'Blue',startDate:'2026-10-05',endDate:'2026-10-05',subjects:['Science'],bufferRatio:0,useAi:false},b.token)
 assert.equal(r.status,200,r.raw);assert.equal(r.body.data.subjects[0].capacityPeriods,0);assert.ok(r.body.data.analysis.warnings.some(x=>/No timetable slots/i.test(x)))
 console.log('LESSON_PLANNING_COGNITIVE_HTTP 10/10 PASS')
})
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));const client=await pool.connect().catch(()=>null);if(client){try{await client.query('BEGIN');await client.query("SELECT set_config('app.rls_enabled','true',true)");await client.query("SELECT set_config('app.is_super_admin','true',true)");for(const id of cleanup){await client.query('DELETE FROM question_bank WHERE school_id=$1',[id]).catch(()=>{});await client.query('DELETE FROM timetable WHERE school_id=$1',[id]).catch(()=>{});await client.query('DELETE FROM users WHERE school_id=$1',[id]).catch(()=>{});await client.query('DELETE FROM schools WHERE id=$1',[id]).catch(()=>{})}await client.query('COMMIT')}catch{await client.query('ROLLBACK').catch(()=>{})}finally{client.release()}}await pool.end()})
