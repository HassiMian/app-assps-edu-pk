const {test,after}=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const http=require('node:http')
const jwt=require('jsonwebtoken')
const crypto=require('node:crypto')
const {tenantContext,pool}=require('../config/database')
let server
const cleanup=[]
function req(port,method,path,body,token){return new Promise((resolve,reject)=>{const data=body===undefined?'':JSON.stringify(body);const q=http.request({host:'127.0.0.1',port,path:'/api/daily-diary'+path,method,headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(data?{'content-type':'application/json','content-length':Buffer.byteLength(data)}:{ })}},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>{let parsed={};try{parsed=raw?JSON.parse(raw):{}}catch{}resolve({status:res.statusCode,body:parsed,raw})})});q.on('error',reject);if(data)q.write(data);q.end()})}
async function makeSchool(label){const run=crypto.randomBytes(5).toString('hex');const code=`dd2_${label}_${run}`;const school=(await pool.query("INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id",[`Diary ${label} ${run}`,code])).rows[0];cleanup.push(school.id);const email=`dd2-${label}-${run}@invalid.example`;const user=(await pool.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,'admin','x',true) RETURNING id,email",[school.id,code,`Admin ${label}`,email])).rows[0];return{schoolId:school.id,tenant:code,token:jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'5m'})}}

test('daily diary persists dynamic A4 counts and remains tenant-isolated',{timeout:45000},async()=>{
 assert.notEqual(process.env.DB_NAME,'apexos')
 const a=await makeSchool('a'),b=await makeSchool('b')
 const app=express();app.use(express.json());app.use((rq,rs,next)=>tenantContext.run({rlsEnabled:false,isSuperAdmin:false,tenantId:null},next));app.use('/api/daily-diary',require('../routes/dailyDiaryRoutes'));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const port=server.address().port
 const ids=[]
 for(const count of [2,3,5]){const r=await req(port,'POST','/',{template_id:1,school_name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',class_level:'8',class_name:'Eight',diary_date:'2026-10-08',slips_per_page:count,footer_text:'Review daily.',rows:[{subject:'English',diary:'Read page 21'}],style_settings:{workspaceVersion:2,section:'Blue'}},a.token);assert.equal(r.status,200,r.raw);assert.equal(r.body.data.slips_per_page,count);ids.push(r.body.data.id)}
 let r=await req(port,'GET','?limit=50',undefined,a.token);assert.equal(r.status,200,r.raw);for(const id of ids)assert.ok(r.body.data.some(item=>Number(item.id)===Number(id)))
 r=await req(port,'GET','?limit=50',undefined,b.token);assert.equal(r.status,200,r.raw);for(const id of ids)assert.ok(!r.body.data.some(item=>Number(item.id)===Number(id)))
 r=await req(port,'GET','/'+ids[2],undefined,a.token);assert.equal(r.status,200,r.raw);assert.equal(r.body.data.slips_per_page,5);assert.equal(r.body.data.rows[0].subject,'English')
 console.log('DAILY_DIARY_LAYOUT_HTTP 9/9 PASS')
})
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));const client=await pool.connect().catch(()=>null);if(client){try{await client.query('BEGIN');await client.query("SELECT set_config('app.rls_enabled','true',true)");await client.query("SELECT set_config('app.is_super_admin','true',true)");for(const id of cleanup){await client.query('DELETE FROM daily_diaries WHERE school_id=$1',[id]).catch(()=>{});await client.query('DELETE FROM users WHERE school_id=$1',[id]).catch(()=>{});await client.query('DELETE FROM schools WHERE id=$1',[id]).catch(()=>{})}await client.query('COMMIT')}catch{await client.query('ROLLBACK').catch(()=>{})}finally{client.release()}}await pool.end()})
