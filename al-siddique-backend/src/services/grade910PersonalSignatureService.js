'use strict'
const crypto=require('node:crypto')
const MAX_PNG=120*1024
const SHA=/^[0-9a-f]{64}$/
function refuse(code,status=422){const err=new Error(code);err.code=code;err.status=status;throw err}
function validateActor(actor){
 if(!actor||!Number.isSafeInteger(actor.schoolId)||actor.schoolId<1||
 !Number.isSafeInteger(actor.id)||actor.id<1||
 !['principal','admin','school_admin','owner','teacher'].includes(actor.role))
 refuse('PERSONAL_SIGNATURE_REAL_STAFF_REQUIRED',403)
}
function validatePersonalPng(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<45||bytes.length>MAX_PNG)refuse('PERSONAL_SIGNATURE_PNG_SIZE_INVALID',413)
 const magic=Buffer.from([137,80,78,71,13,10,26,10])
 if(!bytes.subarray(0,8).equals(magic)||bytes.subarray(12,16).toString('ascii')!=='IHDR'||
 bytes.readUInt32BE(8)!==13||bytes[25]!==6&&bytes[25]!==2&&bytes[25]!==0)
 refuse('PERSONAL_SIGNATURE_PNG_INVALID')
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
 if(width<1||height<1||width>4096||height>2048)refuse('PERSONAL_SIGNATURE_IMAGE_DIMENSIONS_INVALID')
 if(bytes.readUInt32BE(bytes.length-12)!==0||bytes.subarray(bytes.length-8,bytes.length-4).toString('ascii')!=='IEND'||bytes.readUInt32BE(bytes.length-4)!==0xae426082)
  refuse('PERSONAL_SIGNATURE_PNG_END_MARKER_INVALID')
 return {sha:crypto.createHash('sha256').update(bytes).digest('hex'),width,height}
}
function encrypt(bytes,key){
 if(!SHA.test(String(key||'').toLowerCase()))refuse('PRIVATE_SIGNATURE_ENCRYPTION_KEY_NOT_CONFIGURED',503)
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv)
 const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()])
 return {ciphertext,nonce:iv,tag:cipher.getAuthTag()}
}
function decrypt(row,key){
 if(!SHA.test(String(key||'').toLowerCase()))refuse('PRIVATE_SIGNATURE_ENCRYPTION_KEY_NOT_CONFIGURED',503)
 let bytes
 try{
 const cipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),row.nonce)
 cipher.setAuthTag(row.auth_tag)
 bytes=Buffer.concat([cipher.update(row.ciphertext),cipher.final()])
 }catch(_){refuse('PERSONAL_SIGNATURE_AUTHENTICITY_FAILED',503)}
 const details=validatePersonalPng(bytes)
 if(details.sha!==String(row.signature_sha).trim()||details.width!==Number(row.width_px)||
 details.height!==Number(row.height_px))refuse('PERSONAL_SIGNATURE_DATA_HASH_MISMATCH',503)
 return bytes
}
async function requireActiveAccount(actor,query){
 validateActor(actor)
 const staff=await query('SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role=$3 AND is_active=true',
 [actor.id,actor.schoolId,actor.role])
 if(staff.rows.length!==1)refuse('PERSONAL_SIGNATURE_CURRENT_ROLE_NOT_AUTHORIZED',403)
}
async function upload({actor,bytes,query,key}){
 await requireActiveAccount(actor,query)
 const details=validatePersonalPng(bytes)
 const box=encrypt(bytes,key)
 const params=[actor.schoolId,actor.id,actor.role,details.sha,details.width,details.height,box.ciphertext,box.nonce,box.tag]
 const inserted=await query(`INSERT INTO grade910_personal_signature_assets
 (school_id,actor_user_id,actor_role,signature_sha,width_px,height_px,ciphertext,nonce,auth_tag)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
 ON CONFLICT(school_id,actor_user_id,signature_sha) DO NOTHING RETURNING id`,params)
 let id=inserted.rows[0]?.id
 if(!id){
  const previous=await query(`SELECT id FROM grade910_personal_signature_assets
  WHERE school_id=$1 AND actor_user_id=$2 AND signature_sha=$3`,params.slice(0,2).concat(details.sha))
  if(previous.rows.length!==1)refuse('PERSONAL_SIGNATURE_RETRY_CONFLICT',409)
  id=previous.rows[0].id
 }
 return {id:String(id),personalSignatureSha256:details.sha,uploadedAsRole:actor.role,
  storedEncrypted:true,canAutomaticallyApprove:false,academicallyApproved:false,
  verificationStatus:'OWN_SIGNATURE_STORED_NOT_AUTHORITY_CERTIFIED',created:inserted.rows.length===1}
}
async function list({actor,query}){
 await requireActiveAccount(actor,query)
 const found=await query(`SELECT id,signature_sha,width_px,height_px,actor_role,created_at
 FROM grade910_personal_signature_assets WHERE school_id=$1 AND actor_user_id=$2
 ORDER BY id DESC LIMIT 30`,[actor.schoolId,actor.id])
 return found.rows.map(r=>({id:String(r.id),sha256:String(r.signature_sha).trim(),
  width:r.width_px,height:r.height_px,uploadedAsRole:r.actor_role,createdAt:r.created_at,
  approvalStatus:'PERSONAL_ASSET_ONLY'}))
}
async function preview({actor,id,query,key}){
 await requireActiveAccount(actor,query)
 const receipt=String(id||'')
 if(!/^[1-9][0-9]{0,17}$/.test(receipt))refuse('INVALID_PERSONAL_SIGNATURE_ID',422)
 const found=await query(`SELECT signature_sha,width_px,height_px,ciphertext,nonce,auth_tag
 FROM grade910_personal_signature_assets WHERE school_id=$1 AND actor_user_id=$2 AND id=$3`,
 [actor.schoolId,actor.id,receipt])
 if(found.rows.length!==1)refuse('PERSONAL_SIGNATURE_NOT_FOUND',404)
 return decrypt(found.rows[0],key)
}
module.exports={validatePersonalPng,encrypt,decrypt,upload,list,preview,MAX_PNG}
