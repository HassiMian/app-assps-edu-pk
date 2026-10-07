const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const http=require('node:http')
const crypto=require('node:crypto')
const {spawn}=require('node:child_process')
const dotenv=require('dotenv')
dotenv.config({path:path.resolve(__dirname,'../.env')})
const bcrypt=require('bcryptjs')
const {pool}=require('../config/database')

const PORT=Number(process.env.TEST_G21_PORT||5021)
function req(pathname,{method='GET',body=null,cookie=''}={}){
 return new Promise((resolve,reject)=>{
  const raw=body?JSON.stringify(body):null
  const request=http.request({
   host:'127.0.0.1',port:PORT,path:pathname,method,
   headers:{Host:'api.assps.edu.pk','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(raw?{'Content-Length':Buffer.byteLength(raw)}:{})},
   timeout:7000,
  },res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,buffer:Buffer.concat(chunks)}))})
  request.on('error',reject);if(raw)request.write(raw);request.end()
 })
}
const json=r=>{try{return JSON.parse(r.buffer.toString('utf8'))}catch{return{}}}
async function waitHealth(){
 for(let i=0;i<40;i++){try{const r=await req('/health');if(r.status===200)return}catch{}await new Promise(r=>setTimeout(r,150))}
 throw Error('G21 test server did not become healthy')
}
async function login(email,password,role,code){
 const r=await req('/api/auth/login',{method:'POST',body:{email,password,role,school_code:code}})
 assert.equal(r.status,200,'login failed: '+r.buffer.toString('utf8'))
 return (r.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')
}
function canonicalFixture(){
 const file=path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
 const raw=JSON.parse(fs.readFileSync(file,'utf8'))
 const papers=Array.isArray(raw)?raw:(raw.papers||raw.documents||[])
 const doc=papers.find(x=>x?.metadata?.language==='urdu')||papers[0]
 assert.ok(doc&&doc.format==='assps-canonical-paper')
 return doc
}

test('G21 canonical DOCX HTTP is tenant-safe and fail-closed', {timeout:30000}, async t=>{
 assert.notEqual(process.env.DB_NAME,'apexos','G21 HTTP test must not run on production DB')
 const suffix=crypto.randomBytes(5).toString('hex')
 const password=crypto.randomBytes(18).toString('base64url')
 const hash=await bcrypt.hash(password,10)
 const codeA='g21a'+suffix,codeB='g21b'+suffix
 let sidA,sidB,userA,userB,eligibleId,legacyId
 const c=await pool.connect()
 let child
 try{
  sidA=(await c.query("insert into schools(name,code,status,tenant_id) values('G21 A',$1,'active',$1) returning id",[codeA])).rows[0].id
  sidB=(await c.query("insert into schools(name,code,status,tenant_id) values('G21 B',$1,'active',$1) returning id",[codeB])).rows[0].id
  const emailA='a-'+suffix+'@invalid.example',emailB='b-'+suffix+'@invalid.example'
  userA=(await c.query("insert into users(school_id,tenant_id,name,email,role,password,is_active) values($1,$2,'G21 Admin A',$3,'admin',$4,true) returning id",[sidA,codeA,emailA,hash])).rows[0].id
  userB=(await c.query("insert into users(school_id,tenant_id,name,email,role,password,is_active) values($1,$2,'G21 Admin B',$3,'admin',$4,true) returning id",[sidB,codeB,emailB,hash])).rows[0].id
  const canonical=canonicalFixture()
  eligibleId=(await c.query("insert into paper_vault(school_id,owner_user_id,name,class_name,subject_name,status,revision,payload) values($1,$2,'G21 Canonical','Seven','Urdu','finalized',3,$3::jsonb) returning id",[sidA,userA,JSON.stringify(canonical)])).rows[0].id
  legacyId=(await c.query("insert into paper_vault(school_id,owner_user_id,name,class_name,subject_name,status,revision,payload) values($1,$2,'G21 Legacy','Seven','Science','draft',1,$3::jsonb) returning id",[sidA,userA,JSON.stringify({name:'Legacy',config:{classLevel:'Seven',subject:'Science'}})])).rows[0].id

  child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(PORT),NODE_ENV:'production',AUTO_MIGRATE_ON_BOOT:'false'},stdio:['ignore','pipe','pipe']})
  let serverErr='';child.stderr.on('data',d=>{serverErr+=d.toString()})
  t.after(()=>{try{child?.kill('SIGTERM')}catch{}})
  await waitHealth()

  let r=await req('/api/portal/paper-studio/papers/'+eligibleId+'/docx')
  assert.equal(r.status,401)

  const cookieA=await login(emailA,password,'admin',codeA)
  const cookieB=await login(emailB,password,'admin',codeB)

  r=await req('/api/portal/paper-studio/papers/not-a-number/docx',{cookie:cookieA})
  assert.equal(r.status,400);assert.equal(json(r).code,'INVALID_PAPER_ID')

  r=await req('/api/portal/paper-studio/papers/'+legacyId+'/docx',{cookie:cookieA})
  assert.equal(r.status,409);assert.equal(json(r).code,'CANONICAL_DOCX_NOT_ELIGIBLE')

  r=await req('/api/portal/paper-studio/papers/'+eligibleId+'/docx',{cookie:cookieB})
  assert.equal(r.status,404);assert.equal(json(r).code,'PAPER_NOT_FOUND')

  r=await req('/api/portal/paper-studio/papers/'+eligibleId+'/docx',{cookie:cookieA})
  assert.equal(r.status,200,'eligible export failed '+r.buffer.toString('utf8').slice(0,300)+' serverErr='+serverErr.slice(-500))
  assert.equal(r.buffer.subarray(0,2).toString(),'PK')
  assert.ok(r.buffer.length>5000)
  assert.match(String(r.headers['content-type']||''),/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/)
  assert.match(String(r.headers['content-disposition']||''),/attachment;/)
  assert.equal(r.headers['cache-control'],'private, no-store')
  assert.equal(r.headers['x-assps-paper-family'],'historical-v13')
  assert.equal(r.headers['x-assps-paper-revision'],'3')
  assert.match(String(r.headers['x-assps-snapshot-sha256']||''),/^[a-f0-9]{64}$/)
  console.log('G21_DOCX_HTTP 5/5 PASS')
 } finally {
  try{child?.kill('SIGTERM')}catch{}
  if(sidA)await c.query('delete from paper_vault where school_id=$1',[sidA]).catch(()=>{})
  if(sidB)await c.query('delete from paper_vault where school_id=$1',[sidB]).catch(()=>{})
  if(sidA)await c.query('delete from users where school_id=$1',[sidA]).catch(()=>{})
  if(sidB)await c.query('delete from users where school_id=$1',[sidB]).catch(()=>{})
  if(sidA)await c.query('delete from schools where id=$1',[sidA]).catch(()=>{})
  if(sidB)await c.query('delete from schools where id=$1',[sidB]).catch(()=>{})
  c.release();await pool.end()
 }
})
