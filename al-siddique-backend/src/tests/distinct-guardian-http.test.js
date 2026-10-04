require('dotenv').config()
const assert=require('node:assert/strict')
const http=require('node:http')
const crypto=require('node:crypto')
const jwt=require('jsonwebtoken')
const {pool}=require('../config/database')
function request(method,path,token,body){return new Promise((resolve,reject)=>{const b=body?JSON.stringify(body):null;const q=http.request({hostname:'127.0.0.1',port:5000,path,method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',...(b?{'Content-Length':Buffer.byteLength(b)}:{})}},r=>{let raw='';r.on('data',x=>raw+=x);r.on('end',()=>{let data={};try{data=JSON.parse(raw)}catch{}resolve({status:r.statusCode,body:data})})});q.on('error',reject);if(b)q.write(b);q.end()})}
async function main(){const db=await pool.connect();let schoolId
try{
const suffix=crypto.randomBytes(4).toString('hex'),tenant=`distinct${suffix}`,contact=`0300${crypto.randomInt(1000000,9999999)}`.slice(0,11),email=`distinct-admin-${suffix}@invalid.example`
const school=await db.query("INSERT INTO schools(name,code,status,tenant_id) VALUES('Synthetic distinct-guardian school',$1,'active',$1) RETURNING id",[tenant]);schoolId=school.rows[0].id
const admin=(await db.query("INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,'Synthetic Administrator',$3,'admin','unused',true) RETURNING id",[schoolId,tenant,email])).rows[0]
const rows=[];for(const [n,father] of [['A','Guardian One'],['B','Guardian Two']]){let s=await db.query("INSERT INTO students(school_id,tenant_id,gr_number,name,class,section,is_active,parent_phone,father_name) VALUES($1,$2,$3,$4,'1','A',true,$5,$6) RETURNING id",[schoolId,tenant,`GR-${suffix}-${n}`,`Synthetic Child ${n}`,contact,father]);rows.push(s.rows[0].id)}
const token=jwt.sign({id:admin.id,email,role:'admin'},process.env.JWT_SECRET,{expiresIn:'5m'})
let r=await request('GET','/api/auth/users/missing-portal-links',token);assert.equal(r.status,200);assert.equal(r.body.data.students.length,2);assert.ok(r.body.data.students.every(s=>s.requires_guardian_review===true));console.log('Conflicting guardian names detected: PASS')
r=await request('POST','/api/auth/users/provision-one',token,{kind:'student',entityId:rows[0]});assert.equal(r.status,409);console.log('Phone-only merge blocked: PASS')
r=await request('POST','/api/auth/users/resolve-distinct-guardian',token,{studentId:rows[0],verifiedGuardianName:'Verified Guardian One',distinctGuardianVerified:false});assert.equal(r.status,400);console.log('Explicit verification required: PASS')
for(const [id,name] of [[rows[0],'Verified Guardian One'],[rows[1],'Verified Guardian Two']]){r=await request('POST','/api/auth/users/resolve-distinct-guardian',token,{studentId:id,verifiedGuardianName:name,distinctGuardianVerified:true});assert.equal(r.status,200,JSON.stringify({status:r.status,message:r.body.message}))}
const x=await db.query('SELECT id,student_user_id,parent_user_id FROM students WHERE id=ANY($1) ORDER BY id',[rows]);assert.equal(x.rowCount,2);assert.ok(x.rows.every(s=>s.student_user_id&&s.parent_user_id));assert.notEqual(x.rows[0].parent_user_id,x.rows[1].parent_user_id)
const p=await db.query('SELECT count(*)::int n FROM users WHERE school_id=$1 AND role=$2 AND entity_type=$3',[schoolId,'parent','parent_distinct']);assert.equal(p.rows[0].n,2)
const handoffs=await db.query('SELECT count(*)::int n FROM portal_identity_handoffs WHERE school_id=$1 AND state=$2',[schoolId,'pending']);assert.equal(handoffs.rows[0].n,4)
console.log('Separate guardians never share portal identity; four private activation handoffs queued: PASS')
console.log('ALL DISTINCT-GUARDIAN HTTP CHECKS PASS')
}finally{if(schoolId){await db.query('DELETE FROM portal_identity_handoffs WHERE school_id=$1',[schoolId]).catch(()=>{});await db.query('DELETE FROM students WHERE school_id=$1',[schoolId]).catch(()=>{});await db.query('DELETE FROM users WHERE school_id=$1',[schoolId]).catch(()=>{});await db.query('DELETE FROM schools WHERE id=$1',[schoolId]).catch(()=>{})}db.release()}}
main().then(()=>process.exit(0)).catch(e=>{console.error('DISTINCT TEST FAIL:',e.message);process.exit(1)})
