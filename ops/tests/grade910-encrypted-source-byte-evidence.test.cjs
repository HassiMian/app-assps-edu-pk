'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const {format,digest,encrypt,decryptEvidence,storeEvidence}=require('../../al-siddique-backend/src/services/grade910EvidenceObjectService')
const actor={id:4191,schoolId:1,role:'admin'}
const book=Buffer.from('%PDF-1.7\nSYNTHETIC QA SOURCE ONLY\n')
const sha=digest(book),secret=crypto.randomBytes(32).toString('hex')
function mock({stored=sha,owner=true,duplicate=false}={}){
 const calls=[]
 const query=async (sql,args)=>{
  calls.push({sql,args})
  if(sql.includes('FROM grade910_human_signoff_evidence'))
   return {rows:owner?[{evidence_sha:stored,actor_role:actor.role}]:[]}
  if(sql.includes('INSERT INTO grade910_supporting_evidence_objects'))
   return {rows:duplicate?[]:[{file_sha:sha}]}
  if(sql.includes('SELECT file_sha FROM grade910_supporting_evidence_objects'))
   return {rows:[{file_sha:sha}]}
  throw Error('UNEXPECTED_SQL')
 }
 return {query,calls}
}
test('real PDF/PNG/JPEG byte magic, MIME spoof and malformed file rejection',()=>{
 assert.equal(format(book),'application/pdf')
 assert.equal(format(Buffer.from([137,80,78,71,13,10,26,10])),'image/png')
 assert.equal(format(Buffer.from([255,216,255,225])),'image/jpeg')
 assert.equal(format(Buffer.from('FAKE!PDF-1.7')),null)
 assert.equal(format(Buffer.from('')),null)
})
test('encrypted source evidence decrypts with matching SHA and distinct per-upload nonce',()=>{
 const e=encrypt(book,secret),next=encrypt(book,secret)
 assert.notDeepEqual(e.nonce,next.nonce)
 const dec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(secret,'hex'),e.nonce)
 dec.setAuthTag(e.tag)
 assert.deepEqual(Buffer.concat([dec.update(e.ciphertext),dec.final()]),book)
 assert.throws(()=>encrypt(book,'0'),/PRIVATE_EVIDENCE_CRYPTO_NOT_CONFIGURED/)
})
test('only authenticated signer uploads SHA-matching source bytes into private immutable object',async()=>{
 const db=mock()
 const receipt=await storeEvidence({actor,submissionId:'17',body:book,query:db.query,encryptionKey:secret})
 assert.equal(receipt.evidenceStored,true)
 assert.equal(receipt.sha256,sha)
 assert.equal(receipt.academicallyApproved,false)
 assert.equal(receipt.published,false)
 const verified=db.calls[0]
 assert.deepEqual(verified.args,[17,1,4191])
 const inserted=db.calls[1]
 assert.deepEqual(inserted.args.slice(0,6),[1,17,4191,sha,'application/pdf',book.length])
 assert.ok(Buffer.isBuffer(inserted.args[6]))
 assert.equal(inserted.args[7].length,12)
 assert.equal(inserted.args[8].length,16)
 assert.equal(db.calls.length,2)
})
test('idempotent retry never rewrites existing supporting evidence',async()=>{
 const db=mock({duplicate:true})
 const receipt=await storeEvidence({actor,submissionId:17,body:book,query:db.query,encryptionKey:secret})
 assert.equal(receipt.evidenceStored,true)
 assert.match(db.calls[1].sql,/ON CONFLICT\(school_id,submission_id\) DO NOTHING/)
 assert.equal(db.calls.length,3)
})
test('mismatched claimed SHA denied before storing any evidence bytes',async()=>{
 const db=mock({stored:'a'.repeat(64)})
 await assert.rejects(storeEvidence({actor,submissionId:17,body:book,query:db.query,encryptionKey:secret}),{code:'FILE_BYTES_DO_NOT_MATCH_SIGNED_CLAIM_SHA',status:409})
 assert.equal(db.calls.length,1)
})
test('foreign actor/school cannot attach files to another signer receipt',async()=>{
 const db=mock({owner:false})
 await assert.rejects(storeEvidence({actor:{...actor,schoolId:2},submissionId:17,body:book,query:db.query,encryptionKey:secret}),{code:'SIGNOFF_RECEIPT_NOT_OWNED_BY_ACTOR',status:404})
 assert.deepEqual(db.calls[0].args,[17,2,4191])
 assert.equal(db.calls.length,1)
})
test('invalid role ID, forged receipt, absent or oversized or malformed file are rejected before SQL',async()=>{
 const db=mock()
 for(const payload of [
  {actor:{...actor,id:0},submissionId:17,body:book},
  {actor,submissionId:'no-id',body:book},
  {actor,submissionId:17,body:Buffer.from('totally fake')},
  {actor,submissionId:17,body:Buffer.alloc(0)},
  {actor,submissionId:17,body:Buffer.alloc(15*1024*1024+1)}
 ]){
  await assert.rejects(storeEvidence({...payload,query:db.query,encryptionKey:secret}))
 }
 assert.equal(db.calls.length,0)
})
test('missing real signed tenant RLS cannot be replaced by an optional browser approval switch',()=>{
 const route=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../al-siddique-backend/src/routes/grade910HumanSignoffRoutes.js'),'utf8')
 const migration=require('node:fs').readFileSync(require('node:path').resolve(__dirname,'../../al-siddique-backend/migrations/032_grade910_encrypted_supporting_evidence.js'),'utf8')
 assert.match(route,/requireSignedSchool\(a.schoolId,query\)/)
 assert.match(route,/express.raw\(\{type:'application\/octet-stream',limit:'15mb'\}\)/)
 assert.match(route,/storeEvidence\(\{actor:a/)
 assert.match(migration,/FORCE ROW LEVEL SECURITY/)
 assert.match(migration,/core_security.signed_school_allowed\(school_id\)/)
 assert.match(migration,/FOREIGN KEY\(submission_id,school_id,actor_user_id\)/)
 assert.match(migration,/GRANT SELECT,INSERT/)
 assert.doesNotMatch(migration,/GRANT SELECT,INSERT,UPDATE/)
})

test('authenticated reviewer download must verify AES-GCM tag plus immutable signed claim digest',()=>{
 const sealed=encrypt(book,secret)
 const row={...sealed,auth_tag:sealed.tag,file_sha:sha,byte_size:book.length,mime_type:'application/pdf'}
 assert.deepEqual(decryptEvidence(row,secret,sha),book)
 assert.throws(()=>decryptEvidence(row,secret,'a'.repeat(64)),/EVIDENCE_BYTES_DIGEST_OR_TYPE_MISMATCH/)
 assert.throws(()=>decryptEvidence({...row,auth_tag:Buffer.alloc(16)},secret,sha),/EVIDENCE_AUTHENTICITY_TAG_FAILED/)
 assert.throws(()=>decryptEvidence({...row,file_sha:'b'.repeat(64)},secret,sha),/EVIDENCE_BYTES_DIGEST_OR_TYPE_MISMATCH/)
})
test('reviewer retrieval requires signed tenant, exact actor role and server-side ownership join',()=>{
 const fs=require('node:fs'),path=require('node:path')
 const route=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-backend/src/routes/grade910HumanSignoffRoutes.js'),'utf8')
 assert.match(route,/router.get\('\/submissions\/:id\/evidence',handled/)
 assert.match(route,/const principal=a.role==='principal'/)
 assert.match(route,/INNER JOIN grade910_human_signoff_evidence s/)
 assert.match(route,/principal\?'':'AND e.actor_user_id=\$3'/)
 assert.match(route,/Cache-Control','private,no-store'/)
 assert.match(route,/Content-Disposition','attachment/)
 assert.doesNotMatch(route,/evidenceStored:true,academicallyApproved:true/)
})
