'use strict'
const crypto=require('node:crypto')
const MAX_BYTES=15*1024*1024
function refusal(code,status=422){const error=new Error(code);error.code=code;error.status=status;throw error}
function format(bytes){
 if(!Buffer.isBuffer(bytes))return null
 if(bytes.subarray(0,5).equals(Buffer.from('%PDF-')))return 'application/pdf'
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png'
 if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg'
 return null
}
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function encrypt(bytes,key){
 if(!/^[0-9a-f]{64}$/i.test(String(key||'')))refusal('PRIVATE_EVIDENCE_CRYPTO_NOT_CONFIGURED',503)
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv)
 return {ciphertext:Buffer.concat([cipher.update(bytes),cipher.final()]),nonce:iv,tag:cipher.getAuthTag()}
}
async function storeEvidence({actor,submissionId,body,query,encryptionKey}){
 if(!actor||!Number.isSafeInteger(actor.id)||actor.id<=0||
  !Number.isSafeInteger(actor.schoolId)||actor.schoolId<=0)refusal('REAL_SCHOOL_STAFF_REQUIRED',403)
 const id=Number(submissionId)
 if(!Number.isSafeInteger(id)||id<=0)refusal('INVALID_SIGNOFF_RECEIPT',422)
 if(!Buffer.isBuffer(body)||!body.length||body.length>MAX_BYTES)refusal('SUPPORTING_BYTES_REQUIRED_OR_TOO_LARGE',413)
 const mime=format(body)
 if(!mime)refusal('INVALID_SUPPORTING_EVIDENCE_MAGIC')
 const sha=digest(body)
 const owned=await query(`SELECT evidence_sha,actor_role FROM grade910_human_signoff_evidence
  WHERE id=$1 AND school_id=$2 AND actor_user_id=$3`,[id,actor.schoolId,actor.id])
 if(owned.rows.length!==1)refusal('SIGNOFF_RECEIPT_NOT_OWNED_BY_ACTOR',404)
 if(sha!==String(owned.rows[0].evidence_sha||'').trim())refusal('FILE_BYTES_DO_NOT_MATCH_SIGNED_CLAIM_SHA',409)
 const obj=encrypt(body,encryptionKey)
 const inserted=await query(`INSERT INTO grade910_supporting_evidence_objects
  (school_id,submission_id,actor_user_id,file_sha,mime_type,byte_size,ciphertext,nonce,auth_tag)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT(school_id,submission_id) DO NOTHING RETURNING file_sha`,
  [actor.schoolId,id,actor.id,sha,mime,body.length,obj.ciphertext,obj.nonce,obj.tag])
 if(!inserted.rows.length){
  const existing=await query(`SELECT file_sha FROM grade910_supporting_evidence_objects
    WHERE school_id=$1 AND submission_id=$2 AND actor_user_id=$3`,[actor.schoolId,id,actor.id])
  if(existing.rows.length!==1||existing.rows[0].file_sha.trim()!==sha)
   refusal('EVIDENCE_RETRY_RECEIPT_CONFLICT',409)
 }
 return {evidenceStored:true,sha256:sha,byteLength:body.length,mimeType:mime,
   status:'ENCRYPTED_PENDING_INDEPENDENT_SOURCE_AND_SCHOOL_REVIEW',academicallyApproved:false,published:false}
}
function decryptEvidence(row,key,expectedSha){
 if(!row||!Buffer.isBuffer(row.ciphertext)||!Buffer.isBuffer(row.nonce)||
    !Buffer.isBuffer(row.auth_tag)||!String(row.file_sha||'').trim())refusal('EVIDENCE_STORAGE_INCOMPLETE',503)
 if(!/^[a-f0-9]{64}$/i.test(String(key||'')))refusal('PRIVATE_EVIDENCE_CRYPTO_NOT_CONFIGURED',503)
 const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),row.nonce)
 decipher.setAuthTag(row.auth_tag)
 let bytes
 try{bytes=Buffer.concat([decipher.update(row.ciphertext),decipher.final()])}
 catch(_){refusal('EVIDENCE_AUTHENTICITY_TAG_FAILED',503)}
 const sha=digest(bytes)
 if(sha!==String(row.file_sha).trim()||sha!==String(expectedSha||'').trim()||
    bytes.length!==Number(row.byte_size)||format(bytes)!==row.mime_type)
   refusal('EVIDENCE_BYTES_DIGEST_OR_TYPE_MISMATCH',503)
 return bytes
}
module.exports={format,digest,encrypt,decryptEvidence,storeEvidence}
