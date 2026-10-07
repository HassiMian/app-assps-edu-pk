require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env'})
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { pool } = require('/var/www/apex-backend/config/database')
const bcrypt = require('/var/www/apex-backend/node_modules/bcryptjs')
const http = require('node:http')
const crypto = require('node:crypto')
const PORT = Number(process.env.TEST_API_PORT || 5056)

const request=(path,method='GET',body=null,cookie='')=>new Promise((resolve,reject)=>{const raw=body?JSON.stringify(body):null;const q=http.request({host:'127.0.0.1',port:PORT,path:'/api'+path,method,headers:{Host:'api.assps.edu.pk','Content-Type':'application/json',...(raw?{'Content-Length':Buffer.byteLength(raw)}:{}),...(cookie?{Cookie:cookie}:{})},timeout:8000},r=>{let out='';r.on('data',c=>out+=c);r.on('end',()=>{let json={};try{json=JSON.parse(out)}catch{}resolve({status:r.statusCode,json,headers:r.headers})})});q.on('error',reject);if(raw)q.write(raw);q.end()})
async function login(email,password,role,code){const r=await request('/auth/login','POST',{email,password,role,school_code:code});assert.equal(r.status,200);const set=r.headers['set-cookie']||[];const cookie=Array.isArray(set)?set.map(x=>x.split(';')[0]).join('; '):'';assert.ok(cookie);return cookie}

let client, sid, teacherId, cookie, createdId
const assignedPaper={name:'G40 Assigned Draft',config:{className:'6',section:'A',subject:'Science',language:'english'},selectedMCQ:[],selectedShort:[],selectedLong:[],creationMethod:'blank',userAuthored:true,documentFormat:'pts-native-v13'}

before(async()=>{
  client=await pool.connect()
  const suffix=crypto.randomBytes(5).toString('hex'), code=`g40${suffix}`, email=`teacher-${suffix}@invalid.example`, password=crypto.randomBytes(18).toString('base64url'), hash=await bcrypt.hash(password,10)
  sid=(await client.query("INSERT INTO schools(name,code,status,tenant_id) VALUES('Synthetic G40 QA',$1,'active',$1) RETURNING id",[code])).rows[0].id
  teacherId=(await client.query('INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id',[sid,code,'G40 Teacher',email,'teacher',hash])).rows[0].id
  await client.query("INSERT INTO teacher_class_assignments(school_id,teacher_user_id,class_name,section,subject,source,is_active) VALUES($1,$2,'6','A','Science','g40-test',true)",[sid,teacherId])
  cookie=await login(email,password,'teacher',code)
})

after(async()=>{
  if(sid){
    await client.query('DELETE FROM paper_vault_revision_history WHERE school_id=$1',[sid]).catch(()=>{})
    await client.query('DELETE FROM paper_vault WHERE school_id=$1',[sid]).catch(()=>{})
    await client.query('DELETE FROM teacher_class_assignments WHERE school_id=$1',[sid]).catch(()=>{})
    await client.query('DELETE FROM users WHERE school_id=$1',[sid]).catch(()=>{})
    await client.query('DELETE FROM schools WHERE id=$1',[sid]).catch(()=>{})
  }
  client?.release(); await pool.end()
  console.log('G40_SYNTHETIC_FIXTURES_CLEANED')
})

test('G40 assigned teacher creates through portal boundary',async()=>{
  const r=await request('/portal/paper-studio/papers','POST',{paper:assignedPaper},cookie)
  assert.equal(r.status,201)
  assert.equal(r.json.success,true)
  assert.ok(r.json.data?.id)
  assert.equal(r.json.data.revision,1)
  assert.equal(r.json.data.author?.userId,String(teacherId))
  assert.equal(r.json.data.document?.name,assignedPaper.name)
  createdId=String(r.json.data.id)
})

test('G40 portal list is owner-scoped payload-free projection',async()=>{
  assert.ok(createdId)
  const r=await request('/portal/paper-studio/papers','GET',null,cookie)
  assert.equal(r.status,200)
  assert.equal(r.json.scope,'own')
  const row=(r.json.data||[]).find(x=>String(x.id)===createdId)
  assert.ok(row)
  assert.equal(row.className,'6')
  assert.equal(row.subjectName,'Science')
  assert.equal(Object.prototype.hasOwnProperty.call(row,'document'),false)
  assert.equal(Object.prototype.hasOwnProperty.call(row,'payload'),false)
})

test('G40 current detail returns server-owned document',async()=>{
  assert.ok(createdId)
  const r=await request(`/portal/paper-studio/papers/${createdId}`,'GET',null,cookie)
  assert.equal(r.status,200)
  assert.equal(String(r.json.data?.id),createdId)
  assert.equal(r.json.data?.document?.name,assignedPaper.name)
  assert.equal(r.json.data?.revision,1)
})

test('G40 teacher cannot create outside assigned class',async()=>{
  const r=await request('/portal/paper-studio/papers','POST',{paper:{...assignedPaper,name:'Denied',config:{...assignedPaper.config,className:'8'}}},cookie)
  assert.equal(r.status,403)
  assert.equal(r.json.code,'TEACHER_PAPER_SCOPE_DENIED')
})
