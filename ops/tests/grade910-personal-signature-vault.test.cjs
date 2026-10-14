'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const fs=require('node:fs'),path=require('node:path')
const {validatePersonalPng,encrypt,decrypt,upload,list,preview}=require('../../al-siddique-backend/src/services/grade910PersonalSignatureService')
const key=crypto.randomBytes(32).toString('hex')
const actor={schoolId:1,id:2026,role:'principal'}
const png=Buffer.alloc(78)
Buffer.from([137,80,78,71,13,10,26,10]).copy(png)
png.writeUInt32BE(13,8);png.write('IHDR',12)
png.writeUInt32BE(620,16);png.writeUInt32BE(180,20);png[24]=8;png[25]=6
png.write('IEND',70);png.writeUInt32BE(0xae426082,74)
const sha=crypto.createHash('sha256').update(png).digest('hex')
test('personal signature must be actual bounded PNG and cannot be an empty/renamed file',()=>{
 assert.deepEqual(validatePersonalPng(png),{sha,width:620,height:180})
 assert.throws(()=>validatePersonalPng(Buffer.from('not a PNG')),{code:'PERSONAL_SIGNATURE_PNG_SIZE_INVALID'})
 const forged=Buffer.from(png);forged[0]=0
 assert.throws(()=>validatePersonalPng(forged),{code:'PERSONAL_SIGNATURE_PNG_INVALID'})
 const big=Buffer.alloc(122881)
 assert.throws(()=>validatePersonalPng(big),{code:'PERSONAL_SIGNATURE_PNG_SIZE_INVALID'})
})
test('AES-256-GCM protects only self-owned signature and catches alteration',()=>{
 const secret=encrypt(png,key),next=encrypt(png,key)
 assert.notDeepEqual(secret.nonce,next.nonce)
 assert.deepEqual(decrypt({signature_sha:sha,width_px:620,height_px:180,auth_tag:secret.tag,...secret},key),png)
 assert.throws(()=>decrypt({signature_sha:sha,width_px:620,height_px:180,...secret,auth_tag:Buffer.alloc(16)},key),
  {code:'PERSONAL_SIGNATURE_AUTHENTICITY_FAILED'})
})
test('authenticated school staff submit an encrypted asset, never an academic approval',async()=>{
 const calls=[]
 const query=async(sql,args)=>{
  calls.push({sql,args})
  if(sql.includes('SELECT id FROM users'))return {rows:[{id:2026}]}
  if(sql.includes('INSERT INTO'))return {rows:[{id:'77'}]}
  throw Error('Unexpected query')
 }
 const result=await upload({actor,bytes:png,query,key})
 assert.equal(result.id,'77')
 assert.equal(result.uploadedAsRole,'principal')
 assert.equal(result.academicallyApproved,false)
 assert.equal(result.canAutomaticallyApprove,false)
 assert.equal(calls[1].args[1],2026)
 assert.equal(calls[1].args[2],'principal')
 assert.equal(calls[1].args[3],sha)
 assert.ok(Buffer.isBuffer(calls[1].args[6]))
 assert.match(calls[1].sql,/ON CONFLICT\(school_id,actor_user_id,signature_sha\) DO NOTHING/)
})
test('Principal identity cannot be impersonated by an admin role claim',async()=>{
 const calls=[]
 const query=async(sql,args)=>{calls.push([sql,args]);return {rows:[{id:'7'}]}}
 const result=await upload({actor:{...actor,role:'school_admin'},bytes:png,query,key})
 assert.equal(result.uploadedAsRole,'school_admin')
 assert.equal(calls[1][1][2],'school_admin')
 await assert.rejects(upload({actor:{...actor,role:'unverified_principal'},bytes:png,query,key}),
  {code:'PERSONAL_SIGNATURE_REAL_STAFF_REQUIRED'})
})
test('only own school and own actor can access list and source file',async()=>{
 const q=[]
 const query=async(sql,args)=>{
  q.push(args)
  if(sql.includes('SELECT id FROM users'))return {rows:[{id:actor.id}]}
  if(sql.includes('signature_sha,width_px,height_px,ciphertext'))return {rows:[{
   signature_sha:sha,width_px:620,height_px:180,...encrypt(png,key),auth_tag:null
  }]}
  return {rows:[]}
 }
 const rows=await list({actor,query})
 assert.deepEqual(rows,[])
 assert.deepEqual(q[1],[1,2026])
 const source=fs.readFileSync(path.join(__dirname,'../../al-siddique-backend/src/services/grade910PersonalSignatureService.js'),'utf8')
 assert.match(source,/WHERE school_id=\$1 AND actor_user_id=\$2 AND id=\$3/)
 assert.match(source,/validateActor\(actor\)/)
 assert.match(source,/PERSONAL_SIGNATURE_NOT_FOUND/)
})
test('signed Core runtime, RLS, restricted insert-only and original actor JWT needed for routes',()=>{
 const root=path.resolve(__dirname,'../../al-siddique-backend')
 const migration=fs.readFileSync(path.join(root,'migrations/033_grade910_personal_signature_assets.js'),'utf8')
 const route=fs.readFileSync(path.join(root,'src/routes/grade910HumanSignoffRoutes.js'),'utf8')
 const ui=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/Paper-Generator/Grade910PersonalSignatureVault.jsx'),'utf8')
 assert.match(migration,/FORCE ROW LEVEL SECURITY/)
 assert.match(migration,/core_security.signed_school_allowed\(school_id\)/)
 assert.match(migration,/GRANT SELECT,INSERT/)
 assert.doesNotMatch(migration,/GRANT SELECT,INSERT,UPDATE/)
 assert.match(route,/router.post\('\/personal-signatures',express.raw/)
 assert.match(route,/requireSignedSchool\(a.schoolId,query\)/)
 assert.match(route,/personalSignatures.preview\(\{actor:a/)
 assert.match(ui,/Save My Signature Privately/)
 assert.match(ui,/uploadedAsRole!==actorRole/)
 assert.match(ui,/NOT as an independent review or publication approval/)
})

test('disabled principal or changed account role is rejected independently of stale JWT',async()=>{
 const db=async()=>({rows:[]})
 await assert.rejects(upload({actor,bytes:png,query:db,key}),{code:'PERSONAL_SIGNATURE_CURRENT_ROLE_NOT_AUTHORIZED',status:403})
 await assert.rejects(list({actor,query:db}),{code:'PERSONAL_SIGNATURE_CURRENT_ROLE_NOT_AUTHORIZED',status:403})
})
