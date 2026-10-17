'use strict'
const express=require('express')
const {randomUUID,createHash}=require('node:crypto')
const {pool,query,applyTenantContext}=require('../config/database')
const {protect,requireRoles}=require('../middleware/auth')
const {currentSchoolId}=require('../middleware/tenant')
const {cleanNotice,KINDS,LAYOUTS}=require('../services/documents/schoolDocumentContract')
const {schoolBellSchedule}=require('../domain/schoolBellSchedule')
const router=express.Router()
const staff=requireRoles('admin','super_admin','school_admin','principal','teacher')
const leader=requireRoles('admin','super_admin','school_admin','principal')
const actor=req=>String(req.user?.id||'')
const principal=req=>['admin','super_admin','school_admin','principal'].includes(String(req.user?.role||''))
const school=req=>{const n=Number(currentSchoolId(req));return Number.isSafeInteger(n)&&n>0?n:null}
const clean=value=>String(value||'').slice(0,140)

// Canonical source overrides client-submitted bell rows. Historical subject/teacher
// timetable data is NEVER used as the source of bell durations.
function bindOfficialSource(value, schoolId) {
 if (value.document_kind !== 'bell_schedule') return value
 const source = schoolBellSchedule(schoolId)
 if (!source) return null
 return {
  ...value,
  source_type:'bell_schedule',
  source_ref:source.academic_session,
  source_revision:source.version,
  content:{
   ...value.content,
   schedule_rows:[
    ...source.regular.map(x=>({label:'Regular · '+x.label,start:x.start,end:x.end,subject:'',date:'',class:''})),
    ...source.friday.map(x=>({label:'Friday · '+x.label,start:x.start,end:x.end,subject:'',date:'',class:''}))
   ]
  }
 }
}
async function ready(){
 const result=await query("SELECT to_regclass('public.school_documents') AS documents, to_regclass('public.school_document_events') AS events, to_regclass('public.school_document_revisions') AS revisions")
 if(!result.rows[0]?.documents || !result.rows[0]?.events || !result.rows[0]?.revisions) {
  const e=new Error('Notice Studio migration has not been verified');e.code='STUDIO_SCHEMA_NOT_READY';throw e
 }
}
async function appendRevision(client,schoolId,document,actorId){
 const payload=JSON.stringify(document.content)
 const hash=createHash('sha256').update(payload).digest('hex')
 await client.query(`INSERT INTO public.school_document_revisions
 (school_id,document_id,revision,status,title,content,content_sha256,actor_id)
 VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,[
  schoolId,document.id,document.revision,document.status,document.title,payload,hash,actorId
 ])
}
function errorResponse(res,e){
 console.error('Notice Studio request:',e.code||'UNAVAILABLE')
 return res.status(e.code==='STUDIO_SCHEMA_NOT_READY'?503:500).json({success:false,code:'STUDIO_UNAVAILABLE'})
}
router.get('/templates',protect,staff,(req,res)=>{
 if(!school(req))return res.status(403).json({success:false,code:'SCHOOL_REQUIRED'})
 return res.json({success:true,data:{kinds:KINDS,layouts:LAYOUTS}})
})
router.get('/sources/bell-schedule',protect,staff,(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 const data=schoolBellSchedule(id);if(!data)return res.status(404).json({success:false,code:'NOT_PUBLISHED'})
 res.set('Cache-Control','private, no-store');return res.json({success:true,data})
})
router.get('/sources/general-datesheet',protect,staff,async(req,res)=>{
 const id=school(req)
 if(!id)return res.status(403).json({success:false})
 const classLevel=clean(req.query.class)
 const section=clean(req.query.section)
 const session=clean(req.query.session)
 const term=clean(req.query.term)
 if(!classLevel||!term||!session)return res.status(422).json({success:false,code:'CLASS_SESSION_TERM_REQUIRED'})
 try{
  // Explicit select excludes student_id, student_name, admission number and marks.
  const result=await query(`SELECT session,term,class_level,section,
   TO_CHAR(exam_date,'YYYY-MM-DD') AS exam_date, day_label,times,subjects
   FROM public.date_sheet_records
   WHERE school_id=$1 AND LOWER(class_level)=LOWER($2) AND section=$3 AND session=$4 AND term=$5
   ORDER BY exam_date,id LIMIT 80`,[id,classLevel,section,session,term])
  res.set('Cache-Control','private, no-store')
  return res.json({success:true,data:result.rows})
 }catch(e){return errorResponse(res,e)}
})
router.get('/',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 try{
  await ready()
  const isLeader=principal(req)
  const result=await query(`SELECT id,document_kind,status,title,language,audience_kind,layout_key,
   revision,created_by,created_at,updated_at,reference_no
   FROM public.school_documents WHERE school_id=$1 AND ($2::boolean OR created_by=$3 OR (status='published' AND audience_kind='school'))
   ORDER BY created_at DESC LIMIT 100`,[id,isLeader,actor(req)])
  return res.json({success:true,data:result.rows})
 }catch(e){return errorResponse(res,e)}
})
router.get('/:id',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(400).json({success:false})
 try{
  await ready()
  const result=await query(`SELECT * FROM public.school_documents
    WHERE school_id=$1 AND id=$2 AND ($3::boolean OR created_by=$4 OR (status='published' AND audience_kind='school')) LIMIT 1`,
    [id,req.params.id,principal(req),actor(req)])
  if(!result.rowCount)return res.status(404).json({success:false})
  return res.json({success:true,data:result.rows[0]})
 }catch(e){return errorResponse(res,e)}
})
router.post('/',protect,staff,async(req,res)=>{
 const id=school(req);if(!id || !actor(req))return res.status(403).json({success:false})
 const {errors,value}=cleanNotice(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 const bound=bindOfficialSource(value,id)
 if(!bound)return res.status(409).json({success:false,code:'OFFICIAL_BELL_SOURCE_REQUIRED'})
 const uuid=randomUUID()
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  const result=await client.query(`INSERT INTO public.school_documents
    (id,school_id,document_kind,title,language,audience_kind,audience_classes,
     source_type,source_ref,source_revision,layout_key,content,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12::jsonb,$13) RETURNING *`,
    [uuid,id,bound.document_kind,bound.title,bound.language,bound.audience_kind,
    JSON.stringify(bound.audience_classes),bound.source_type,bound.source_ref,
    bound.source_revision,bound.layout_key,JSON.stringify(bound.content),actor(req)])
  await appendRevision(client,id,result.rows[0],actor(req))
  await client.query(`INSERT INTO school_document_events (school_id,document_id,revision,action,actor_id)
   VALUES ($1,$2,1,'create', $3)`,[id,uuid,actor(req)])
  await client.query('COMMIT')
  return res.status(201).json({success:true,data:result.rows[0]})
 }catch(e){await client.query('ROLLBACK').catch(()=>{});return errorResponse(res,e)}
 finally{client.release()}
})
router.patch('/:id',protect,staff,async(req,res)=>{
 const id=school(req);if(!id || !actor(req))return res.status(403).json({success:false})
 const revision=Number(req.body?.revision)
 if(!Number.isSafeInteger(revision)||revision<1)return res.status(422).json({success:false,code:'REVISION_REQUIRED'})
 const {errors,value}=cleanNotice(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 const bound=bindOfficialSource(value,id)
 if(!bound)return res.status(409).json({success:false,code:'OFFICIAL_BELL_SOURCE_REQUIRED'})
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  const r=await client.query(`UPDATE school_documents SET title=$1,document_kind=$2,language=$3,audience_kind=$4,
   audience_classes=$5::jsonb,source_type=$6,source_ref=$7,source_revision=$8,layout_key=$9,
   content=$10::jsonb,revision=revision+1,updated_at=now()
   WHERE id=$11 AND school_id=$12 AND created_by=$13 AND status='draft' AND revision=$14 RETURNING *`,
   [bound.title,bound.document_kind,bound.language,bound.audience_kind,
   JSON.stringify(bound.audience_classes),bound.source_type,bound.source_ref,
   bound.source_revision,bound.layout_key,JSON.stringify(bound.content),
   req.params.id,id,actor(req),revision])
  if(!r.rowCount){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'EDIT_CONFLICT_OR_NOT_DRAFT'})}
  await appendRevision(client,id,r.rows[0],actor(req))
  await client.query(`INSERT INTO school_document_events (school_id,document_id,revision,action,actor_id)
   VALUES ($1,$2,$3,'edit',$4)`,[id,req.params.id,r.rows[0].revision,actor(req)])
  await client.query('COMMIT');return res.json({success:true,data:r.rows[0]})
 }catch(e){await client.query('ROLLBACK').catch(()=>{});return errorResponse(res,e)}
 finally{client.release()}
})
async function transition(req,res,from,to,requiresLeader=false){
 const id=school(req)
 if(!id || !actor(req))return res.status(403).json({success:false})
 const revision=Number(req.body?.revision)
 if(!Number.isSafeInteger(revision)||revision<1)return res.status(422).json({success:false,code:'REVISION_REQUIRED'})
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  const ownerCheck=requiresLeader?'':"AND created_by=$5"
  const who=requiresLeader?[id,req.params.id,from,revision]:[id,req.params.id,from,revision,actor(req)]
  const before=await client.query(`SELECT id,created_by,approved_by FROM school_documents
   WHERE school_id=$1 AND id=$2 AND status=$3 AND revision=$4 ${ownerCheck} FOR UPDATE`,who)
  if(!before.rowCount){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'STATE_CONFLICT'})}
  if(to==='approved' && before.rows[0].created_by===actor(req)){
   await client.query('ROLLBACK');return res.status(403).json({success:false,code:'SELF_APPROVAL_NOT_ALLOWED'})
  }
  if(to==='published'){
   const sourceGate=await client.query('SELECT document_kind,source_type FROM school_documents WHERE school_id=$1 AND id=$2',[id,req.params.id])
   const kind=sourceGate.rows[0]?.document_kind
   if(kind==='general_datesheet'||kind==='academic_timetable'){
    await client.query('ROLLBACK')
    return res.status(409).json({success:false,code:'OFFICIAL_SOURCE_REATTESTATION_REQUIRED'})
   }
  }
  if(to==='published'&&!before.rows[0].approved_by){
   await client.query('ROLLBACK');return res.status(409).json({success:false,code:'APPROVAL_REQUIRED'})
  }
  const sets=to==='approved'?", approved_by=$5, approved_at=now()":to==='published'?", published_by=$5, published_at=now(), reference_no=COALESCE(reference_no,$6)":""
  const args=to==='approved'?[to,id,req.params.id,revision,actor(req)]:to==='published'?[to,id,req.params.id,revision,actor(req),`ASSPS/${new Date().getUTCFullYear()}/${req.params.id.slice(0,8).toUpperCase()}`]:[to,id,req.params.id,revision]
  const updated=await client.query(`UPDATE school_documents SET status=$1,updated_at=now(),revision=revision+1${sets}
  WHERE school_id=$2 AND id=$3 AND revision=$4 RETURNING id,status,revision,reference_no`,args)
  const fullRow=await client.query('SELECT * FROM school_documents WHERE school_id=$1 AND id=$2',[id,req.params.id])
  await appendRevision(client,id,fullRow.rows[0],actor(req))
  await client.query(`INSERT INTO school_document_events(school_id,document_id,revision,action,actor_id)
   VALUES ($1,$2,$3,$4,$5)`,[id,req.params.id,updated.rows[0].revision,to,actor(req)])
  await client.query('COMMIT');return res.json({success:true,data:updated.rows[0]})
 }catch(e){await client.query('ROLLBACK').catch(()=>{});return errorResponse(res,e)}
 finally{client.release()}
}
router.post('/:id/submit',protect,staff,(req,res)=>transition(req,res,'draft','submitted'))
router.post('/:id/approve',protect,leader,(req,res)=>transition(req,res,'submitted','approved',true))
router.post('/:id/publish',protect,leader,(req,res)=>transition(req,res,'approved','published',true))
module.exports=router
