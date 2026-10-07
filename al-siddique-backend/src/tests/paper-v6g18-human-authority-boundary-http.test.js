require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env'})
const {pool}=require('/var/www/apex-backend/config/database')
const bcrypt=require('/var/www/apex-backend/node_modules/bcryptjs')
const http=require('node:http')
const crypto=require('node:crypto')
const PORT=Number(process.env.TEST_API_PORT||5018)
function req(pathname,cookie=''){return new Promise((resolve,reject)=>{const q=http.request({host:'127.0.0.1',port:PORT,path:'/api'+pathname,method:'GET',headers:{Host:'api.assps.edu.pk',...(cookie?{Cookie:cookie}:{})},timeout:7000},r=>{let t='';r.on('data',c=>t+=c);r.on('end',()=>{let j={};try{j=JSON.parse(t)}catch{}resolve({status:r.statusCode,json:j,headers:r.headers})})});q.on('error',reject);q.end()})}
function post(pathname,body){return new Promise((resolve,reject)=>{const raw=JSON.stringify(body);const q=http.request({host:'127.0.0.1',port:PORT,path:'/api'+pathname,method:'POST',headers:{Host:'api.assps.edu.pk','Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)},timeout:7000},r=>{let t='';r.on('data',c=>t+=c);r.on('end',()=>{let j={};try{j=JSON.parse(t)}catch{}resolve({status:r.statusCode,json:j,headers:r.headers})})});q.on('error',reject);q.write(raw);q.end()})}
async function login(email,password,role,code){const r=await post('/auth/login',{email,password,role,school_code:code});if(r.status!==200)throw Error(`login ${role} ${r.status}`);return(r.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')}
;(async()=>{const c=await pool.connect();let sid;try{
 const suf=crypto.randomBytes(5).toString('hex'),code=`g18${suf}`,password=crypto.randomBytes(18).toString('base64url'),hash=await bcrypt.hash(password,10)
 sid=(await c.query("insert into schools(name,code,status,tenant_id) values('Synthetic G18 QA',$1,'active',$1) returning id",[code])).rows[0].id
 const users={}
 for(const [key,role] of [['admin','admin'],['teacher','teacher']]){const email=`${key}-${suf}@invalid.example`;await c.query('insert into users(school_id,tenant_id,name,email,role,password,is_active) values($1,$2,$3,$4,$5,$6,true)',[sid,code,`G18 ${key}`,email,role,hash]);users[key]={cookie:await login(email,password,role,code)}}
 let r=await req('/portal/paper-studio/canonical-readiness/human-authority-boundary',users.teacher.cookie);if(r.status!==403)throw Error(`teacher boundary access ${r.status}`);console.log('PASS teacher cannot access G18 human-authority boundary')
 r=await req('/portal/paper-studio/canonical-readiness/human-authority-boundary',users.admin.cookie);if(r.status!==200)throw Error(`admin boundary ${r.status} ${JSON.stringify(r.json)}`)
 const d=r.json.data||{},p=r.json.policy||{};if(d.architectureVersion!=='v6-g18-human-authority-boundary-1'||d.boundaryReached!==true||d.technicalReady!==true||d.unknownPublisherIssues?.length!==0||d.technicalFailures?.length!==0||!d.humanAuthorityBlockers?.length)throw Error(`unexpected G18 boundary ${JSON.stringify(d)}`)
 if(p.readOnly!==true||p.persisted!==false||p.envChanged!==false||p.approvalChanged!==false||p.canonicalWriteChanged!==false)throw Error(`G18 route policy mutated ${JSON.stringify(p)}`)
 console.log('PASS admin sees G18 human-only boundary without mutation')
 console.log('V6G18_HUMAN_BOUNDARY_HTTP 2/2 PASS')
}finally{if(sid){await c.query('delete from users where school_id=$1',[sid]).catch(()=>{});await c.query('delete from schools where id=$1',[sid]).catch(()=>{})}c.release();await pool.end();console.log('V6G18_SYNTHETIC_FIXTURES_CLEANED')}})().catch(e=>{console.error('V6G18_FAIL',e.stack||e.message);process.exit(1)})
