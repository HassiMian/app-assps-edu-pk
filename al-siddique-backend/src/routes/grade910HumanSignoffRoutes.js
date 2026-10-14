'use strict'
const express=require('express'),router=express.Router()
const {protect,requireRoles}=require('../middleware/auth')
const {query}=require('../config/database')
const {storeClaim,catalog}=require('../services/grade910HumanSignoffService')
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
router.get('/catalog',handled(async(req,res)=>{
 res.set('Cache-Control','private,no-store')
 res.json({success:true,rows:catalog.rows})
}))
router.post('/submissions',handled(async(req,res,a)=>{
 const out=await storeClaim({payload:req.body,actor:a,query,encryptionKey:process.env.ASSPS_QBANK_SIGNATURE_ENCRYPTION_KEY})
 res.set('Cache-Control','no-store')
 res.status(out.created?201:200).json({success:true,data:out})
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
