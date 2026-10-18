'use strict'
// Unpublished class/section timetable drafts; does not mutate historical rows.
// This route remains unavailable in production until the additive signed-RLS
// migration and independent role/tenant acceptance have passed.
const express=require('express')
const {randomUUID}=require('node:crypto')
const {pool,query,applyTenantContext}=require('../config/database')
const {protect,requireRoles,requireScopeForServiceOnly}=require('../middleware/auth')
const {currentSchoolId}=require('../middleware/tenant')
const {validateTimetableDraft}=require('../domain/schoolTimetableDraftContract')
const router=express.Router()
const leader=requireRoles('principal','admin','school_admin','super_admin')
function scope(req,res){
 const n=Number(currentSchoolId(req))
 if(!Number.isSafeInteger(n)||n<=0){
  res.status(403).json({success:false,code:'SCHOOL_CONTEXT_REQUIRED'})
  return null
 }
 return n
}
function safeName(value,max=80){
 return typeof value==='string'&&value.trim()&&value.length<=max&&/^[\w \-]+$/u.test(value.trim())?value.trim():null
}
async function ready(){
 const r=await query("SELECT to_regclass('public.school_timetable_drafts') AS draft, to_regclass('public.school_timetable_draft_revisions') AS audit")
 return Boolean(r.rows[0]?.draft && r.rows[0]?.audit)
}
router.get('/drafts',protect,requireScopeForServiceOnly('school.timetable.read'),leader,async(req,res)=>{
 res.set('Cache-Control','private, no-store')
 const schoolId=scope(req,res);if(!schoolId)return
 const cls=safeName(req.query.class)
 const section=safeName(req.query.section)
 const session=typeof req.query.session==='string' && /^20\d{2}[–-]\d{2}$/u.test(req.query.session) ? req.query.session : null
 if(!cls||!section||!session)return res.status(422).json({success:false,code:'CLASS_SECTION_SESSION_REQUIRED'})
 try{
  if(!await ready())return res.status(503).json({success:false,code:'DRAFT_SCHEMA_NOT_READY'})
  const r=await query(`SELECT id,academic_session,class_name,section,revision,status,content,updated_at
    FROM public.school_timetable_drafts
    WHERE school_id=$1 AND academic_session=$2 AND class_name=$3 AND section=$4 LIMIT 1`,
    [schoolId,session,cls,section])
  if(!r.rowCount)return res.status(404).json({success:false,code:'DRAFT_NOT_FOUND'})
  return res.json({success:true,data:r.rows[0],reference_only:true,
    publication_authorized:false,staff_identity_reviewed:false})
 }catch(e){console.error('Draft timetable GET:',e.code||'UNAVAILABLE');
  return res.status(503).json({success:false,code:'DRAFT_UNAVAILABLE'})}
})
router.post('/drafts',protect,requireScopeForServiceOnly('school.timetable.write'),leader,async(req,res)=>{
 res.set('Cache-Control','private, no-store')
 const schoolId=scope(req,res);if(!schoolId)return
 const checked=validateTimetableDraft(req.body)
 if(checked.errors.length)return res.status(422).json({success:false,errors:checked.errors})
 const v=checked.value
 const actor=String(req.user?.id||'')
 if(!actor)return res.status(403).json({success:false,code:'ACTOR_REQUIRED'})
 let client
 try{
  if(!await ready())return res.status(503).json({success:false,code:'DRAFT_SCHEMA_NOT_READY'})
  client=await pool.connect()
  await client.query('BEGIN')
  await applyTenantContext(client)
  const prior=await client.query(`SELECT id,revision FROM public.school_timetable_drafts
   WHERE school_id=$1 AND academic_session=$2 AND class_name=$3 AND section=$4 FOR UPDATE`,
   [schoolId,v.academic_session,v.class_name,v.section])
  let saved
  if(prior.rowCount){
   if(prior.rows[0].revision!==v.revision){
    await client.query('ROLLBACK')
    return res.status(409).json({success:false,code:'DRAFT_REVISION_CONFLICT'})
   }
   const r=await client.query(`UPDATE public.school_timetable_drafts
    SET revision=revision+1, content=$1::jsonb,updated_by=$2,updated_at=now()
    WHERE school_id=$3 AND id=$4 AND revision=$5 AND status='draft'
    RETURNING id,revision,class_name,section,academic_session,content`,
    [JSON.stringify(v.content),actor,schoolId,prior.rows[0].id,v.revision])
   if(!r.rowCount){
    await client.query('ROLLBACK')
    return res.status(409).json({success:false,code:'DRAFT_REVISION_CONFLICT'})
   }
   saved=r.rows[0]
  }else{
   if(v.revision!==0){
    await client.query('ROLLBACK')
    return res.status(409).json({success:false,code:'DRAFT_REVISION_CONFLICT'})
   }
   const uuid=randomUUID()
   const r=await client.query(`INSERT INTO public.school_timetable_drafts
    (id,school_id,academic_session,class_name,section,content,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$7)
    RETURNING id,revision,class_name,section,academic_session,content`,
    [uuid,schoolId,v.academic_session,v.class_name,v.section,JSON.stringify(v.content),actor])
   saved=r.rows[0]
  }
  await client.query(`INSERT INTO public.school_timetable_draft_revisions
   (school_id,draft_id,revision,content,actor_id) VALUES($1,$2,$3,$4::jsonb,$5)`,
   [schoolId,saved.id,saved.revision,JSON.stringify(v.content),actor])
  await client.query('COMMIT')
  return res.status(200).json({success:true,data:saved,publication_authorized:false,staff_identity_reviewed:false})
 }catch(e){
  if(client)await client.query('ROLLBACK').catch(()=>{})
  console.error('Draft timetable POST:',e.code||'UNAVAILABLE')
  return res.status(e.code==='23505'?409:503).json({success:false,
   code:e.code==='23505'?'DRAFT_CONCURRENT_CREATE':'DRAFT_UNAVAILABLE'})
 }finally{if(client)client.release()}
})
module.exports=router
