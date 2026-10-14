'use strict'
const express=require('express'),router=express.Router()
const {protect,requireRoles}=require('../middleware/auth')
const {query}=require('../config/database')
const {storeClaim,catalog}=require('../services/grade910HumanSignoffService')
const {storeEvidence,decryptEvidence}=require('../services/grade910EvidenceObjectService')
const personalSignatures=require('../services/grade910PersonalSignatureService')
const {requireSignedSchool}=require('../services/grade910SignedSchoolGate')
router.use(protect,requireRoles('teacher','principal','admin','school_admin'))
function actor(req){
 const id=Number(req.user?.id),schoolId=Number(req.user?.school_id)
 if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(schoolId)||schoolId<1||
 (req.school_id!=null&&Number(req.school_id)!==schoolId))return null
 return {id,schoolId,role:String(req.user.role||'')}
}
function handled(fn){return async(req,res)=>{
 try{
 const a=actor(req)
 if(!a)return res.status(403).json({success:false,code:'REAL_SCHOOL_STAFF_CONTEXT_REQUIRED'})
 await requireSignedSchool(a.schoolId,query)
 if(!process.env.DB_RUNTIME_ROLE||!process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY)
  return res.status(503).json({success:false,code:'SIGNED_TENANT_OR_SIGNATURE_CRYPTO_NOT_CONFIGURED'})
 await fn(req,res,a)
 }catch(e){
 const status=e.status||503
 return res.status(status).json({success:false,code:e.status?e.code:'SIGNOFF_SERVICE_UNAVAILABLE'})
 }
}}
// Private personal-signature vault: staff uploads ONLY their own signature,
// under the authenticated role. A personal asset never certifies a review or approval.
router.post('/personal-signatures',express.raw({type:'image/png',limit:'120kb'}),handled(async(req,res,a)=>{
 const result=await personalSignatures.upload({actor:a,bytes:req.body,query,
  key:process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY})
 res.set('Cache-Control','private,no-store')
 res.status(result.created?201:200).json({success:true,data:result})
}))
router.get('/personal-signatures',handled(async(req,res,a)=>{
 const rows=await personalSignatures.list({actor:a,query})
 res.set('Cache-Control','private,no-store')
 res.json({success:true,records:rows,academicallyApproved:0,published:0})
}))
router.get('/personal-signatures/:id/preview',handled(async(req,res,a)=>{
 const bytes=await personalSignatures.preview({actor:a,id:req.params.id,query,
  key:process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY})
 res.set('Cache-Control','private,no-store').set('X-Content-Type-Options','nosniff')
  .set('Content-Security-Policy','sandbox')
  .set('Content-Disposition','attachment; filename="personal-signature.png"')
  .type('image/png').send(bytes)
}))

router.get('/catalog',handled(async(req,res)=>{
 res.set('Cache-Control','private,no-store')
 res.json({success:true,rows:catalog.rows})
}))
router.post('/submissions',handled(async(req,res,a)=>{
 const out=await storeClaim({payload:req.body,actor:a,query,encryptionKey:process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY})
 res.set('Cache-Control','no-store')
 res.status(out.created?201:200).json({success:true,data:out})
}))

// Real supporting PDF/PNG/JPEG bytes: binary upload is separately bounded to 15 MB,
// SHA-bound to the signed receipt, AES-GCM encrypted, immutable and signed-RLS school-scoped.
router.post('/submissions/:id/evidence',express.raw({type:'application/octet-stream',limit:'15mb'}),handled(async(req,res,a)=>{
 const out=await storeEvidence({actor:a,submissionId:req.params.id,body:req.body,
  query,encryptionKey:process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY})
 res.set('Cache-Control','private,no-store')
 res.status(201).json({success:true,data:out})
}))

// Download requires an explicit authenticated request by the original signer or real Principal.
// School admins may inspect only their own records. Neither drafts nor a download imply approval.
router.get('/submissions/:id/evidence',handled(async(req,res,a)=>{
 const id=String(req.params.id||'')
 if(!/^[1-9][0-9]{0,17}$/.test(id))
  return res.status(400).json({success:false,code:'INVALID_EVIDENCE_RECEIPT'})
 const principal=a.role==='principal'
 const found=await query(`SELECT e.file_sha,e.mime_type,e.byte_size,e.ciphertext,e.nonce,e.auth_tag,
   s.evidence_sha FROM grade910_supporting_evidence_objects e
   INNER JOIN grade910_human_signoff_evidence s
    ON s.id=e.submission_id AND s.school_id=e.school_id AND s.actor_user_id=e.actor_user_id
   WHERE e.school_id=$1 AND e.submission_id=$2 `+(principal?'':'AND e.actor_user_id=$3'),
   principal?[a.schoolId,id]:[a.schoolId,id,a.id])
 if(found.rows.length!==1)return res.status(404).json({success:false,code:'EVIDENCE_NOT_FOUND_OR_ACCESS_DENIED'})
 const row=found.rows[0],bytes=decryptEvidence(row,process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY,row.evidence_sha)
 const extension=row.mime_type==='application/pdf'?'pdf':row.mime_type==='image/png'?'png':'jpg'
 return res.set('Cache-Control','private,no-store').set('X-Content-Type-Options','nosniff')
  .set('Content-Security-Policy',"sandbox").set('Content-Disposition','attachment; filename="grade910-evidence-'+id+'.'+extension+'"')
  .type('application/octet-stream').send(bytes)
}))

router.get('/submissions',handled(async(req,res,a)=>{
 const principal=a.role==='principal'
 const sql=`SELECT id,actor_user_id,actor_role,action,catalog_id,question_id,question_sha,answer_sha,
 image_sha,claim_sha,verification_status,created_at
 FROM grade910_human_signoff_evidence WHERE school_id=$1
 ${principal?'':'AND actor_user_id=$2'} ORDER BY created_at DESC LIMIT 100`
 const found=await query(sql,principal?[a.schoolId]:[a.schoolId,a.id])
 res.set('Cache-Control','private,no-store')
 res.json({success:true,records:found.rows,academicallyApproved:0,published:0})
}))

router.get('/publication-readiness',handled(async(req,res,a)=>{
 const records=await query('SELECT action,count(*)::int AS total FROM grade910_human_signoff_evidence WHERE school_id=$1 GROUP BY action',[a.schoolId])
 res.set('Cache-Control','private,no-store')
 res.json({success:true,submittedClaimCounts:records.rows,academicallyApproved:0,published:0,paperStudioSelectable:false,releaseDecision:'HOLD_AUTHENTIC_SIGNED_SCHOOL_ROSTER_AND_CORE_SECURITY'})
}))
router.get('/submissions/:id/image',handled(async(req,res,a)=>{
 const id=String(req.params.id||'')
 if(!/^[0-9]{1,18}$/.test(id))return res.status(400).json({success:false,code:'INVALID_SIGNOFF_ID'})
 const principal=a.role==='principal'
 const q=await query(
  'SELECT image_ciphertext,image_nonce,image_tag,image_sha FROM grade910_human_signoff_evidence WHERE school_id=$1 AND id=$2 '+(principal?'':'AND actor_user_id=$3'),
  principal?[a.schoolId,id]:[a.schoolId,id,a.id]
 )
 if(!q.rows.length)return res.status(404).json({success:false,code:'SIGNOFF_NOT_FOUND'})
 const key=String(process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY||'')
 if(!/^[a-f0-9]{64}$/i.test(key))return res.status(503).json({success:false,code:'ENCRYPTION_KEY_NOT_CONFIGURED'})
 const crypto=require('node:crypto'),row=q.rows[0]
 const dec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),row.image_nonce)
 dec.setAuthTag(row.image_tag)
 const bytes=Buffer.concat([dec.update(row.image_ciphertext),dec.final()])
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==row.image_sha)
   return res.status(503).json({success:false,code:'SIGNATURE_IMAGE_DIGEST_MISMATCH'})
 return res.set('Cache-Control','no-store').set('Content-Type','image/png')
   .set('X-Content-Type-Options','nosniff').send(bytes)
}))
module.exports=router
