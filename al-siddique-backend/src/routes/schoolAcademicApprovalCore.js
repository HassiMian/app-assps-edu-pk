'use strict'
const express=require('express')
const {pool,applyTenantContext}=require('../config/database')
const {protect}=require('../middleware/auth')
const router=express.Router()
const id=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):0
const bad=(r,s,c)=>r.status(s).json({success:false,code:c})
function evidence(b){return /^[a-f0-9]{64}$/i.test(String(b?.evidenceSha256||''))&&typeof b?.evidenceReference==='string'&&b.evidenceReference.trim().length>=12&&b.evidenceReference.length<=500&&b.reviewDeclaration==='I_VERIFIED_THE_EXACT_OFFICIAL_SOURCE'}
async function withApproval(req,res,fn){
 if(!evidence(req.body))return bad(res,422,'SOURCE_EVIDENCE_REQUIRED')
 let c;let opened=false
 try{
  c=await pool.connect()
  await c.query('BEGIN');opened=true;await applyTenantContext(c)
  const uid=id(req.user?.id),school=id(req.user?.school_id)
  if(!uid||!school||school!==id(req.school_id)||!['admin','principal','owner'].includes(String(req.user?.role))||!/^Bearer\s+\S+$/i.test(String(req.headers.authorization||''))){await c.query('ROLLBACK');opened=false;return bad(res,403,'AUTHENTIC_SCHOOL_ADMIN_REQUIRED')}
  const actor=await c.query("SELECT id FROM users WHERE id=$1 AND school_id=$2 AND role IN ('admin','principal') AND is_active=true FOR SHARE",[uid,school])
  if(actor.rowCount!==1){await c.query('ROLLBACK');opened=false;return bad(res,403,'AUTHENTIC_SCHOOL_ADMIN_REQUIRED')}
  const result=await fn(c,{uid,school})
  if(result.error){await c.query('ROLLBACK');opened=false;return bad(res,result.status||409,result.error)}
  await c.query('COMMIT');opened=false;return res.status(201).json({success:true,data:result.data})
 }catch(err){if(opened)await c.query('ROLLBACK').catch(()=>{});console.error('Academic approval transaction:',err.code||'QUERY_FAILED');return bad(res,503,'ACADEMIC_APPROVAL_UNAVAILABLE')}
 finally{if(c)c.release()}
}
async function audit(c,actor,req,action,examId,objectId,oldRevision,nextRevision){
 await c.query('INSERT INTO school_academic_approval_events(school_id,exam_id,actor_user_id,action,object_id,evidence_sha256,evidence_reference,old_revision,new_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[actor.school,examId,actor.uid,action,objectId,req.body.evidenceSha256.toLowerCase(),req.body.evidenceReference.trim(),oldRevision,nextRevision])
}
module.exports={router,protect,id,bad,withApproval,audit}
