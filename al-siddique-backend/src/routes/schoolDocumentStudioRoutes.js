'use strict'
const express=require('express')
const {randomUUID,createHash}=require('crypto')
const router=express.Router()
const {query,pool,applyTenantContext}=require('../config/database')
const {protect}=require('../middleware/auth')
const {cleanNotice,unresolvedPresetFields}=require('../services/documents/schoolDocumentContract')
const {schoolBellSchedule}=require('../domain/schoolBellSchedule')

const school=(req)=>{const u=Number(req.user?.school_id);const c=req.school_id==null?u:Number(req.school_id);return Number.isSafeInteger(u)&&u>0&&c===u?u:null}
const actor=(req)=>Number.isSafeInteger(Number(req.user?.id))&&Number(req.user?.id)>0?String(req.user.id):''
const principal=(req)=>{
 const role=String(req.user?.role||'').toLowerCase()
 return ['principal','admin','headmaster','school_admin','super_admin'].includes(role)
}
const staff=(req,res,next)=>{
 const role=String(req.user?.role||'').toLowerCase()
 if(['principal','admin','headmaster','school_admin','super_admin','teacher','staff','clerk'].includes(role))return next()
 return res.status(403).json({success:false,message:'Staff role required'})
}
const leader=(req,res,next)=>{
 if(principal(req))return next()
 return res.status(403).json({success:false,message:'Principal approval required'})
}

const clean=value=>String(value||'').slice(0,140)
const HR_KINDS=new Set(['staff_punctuality','staff_absence','duty_concern','staff_warning','show_cause','improvement_plan','staff_appreciation'])
const ready=async()=>{const r=await query("SELECT to_regclass('public.school_documents') AS docs,to_regclass('public.school_document_revisions') AS revs,to_regclass('public.school_document_events') AS events");if(!(r.rows?.[0]?.docs||r.rows?.[0]?.documents)||!(r.rows?.[0]?.revs||r.rows?.[0]?.revisions)||!r.rows?.[0]?.events){const e=new Error('STUDIO_SCHEMA_NOT_READY');e.code='STUDIO_SCHEMA_NOT_READY';throw e}}

async function resolveEmployeeId(schoolId, userId) {
  if (!userId) return null
  try {
    const res = await query('SELECT id FROM employees WHERE school_id = $1 AND user_id = $2 AND is_active=true LIMIT 1', [schoolId, userId])
    return res.rows[0]?.id || null
  } catch {
    return null
  }
}


async function appendRevision(client,schoolId,doc,actorId){
 const sha=createHash('sha256').update(JSON.stringify(doc.content)).digest('hex')
 await client.query(`INSERT INTO public.school_document_revisions
  (school_id,document_id,revision,status,title,content,content_sha256,actor_id)
  VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
  ON CONFLICT (document_id, revision) DO UPDATE
  SET content=$6::jsonb, content_sha256=$7, title=$5, status=$4`,
  [schoolId,doc.id,doc.revision,doc.status,doc.title,JSON.stringify(doc.content),sha,actorId])
}

function bindOfficialSource(value,schoolId){
 if(['academic_timetable','bell_schedule'].includes(value.document_kind)){
  const bells=schoolBellSchedule(schoolId)
  if(!bells)return null
  return {
   ...value,
   source_type:'official_bell_schedule',
   source_ref:bells.version,
   source_revision:bells.effective_date,
   content:{
    ...value.content,
    schedule_rows:bells.regular.map(r=>({label:r.label,start:r.start,end:r.end}))
   }
  }
 }
 return value
}

const errorResponse=(res,e)=>{
 console.error('SchoolDocumentStudio error:',e)
 return res.status(500).json({success:false,message:e.message})
}

router.get('/templates',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 const bells=schoolBellSchedule(id)
 return res.json({
  success:true,
  data:{
   bell_version:bells?.version||null,
   effective_date:bells?.effective_date||null,
   templates:[
    {key:'general_notice',title:'General School Notice',kind:'notice',layout:'prism'},
    {key:'circular_office',title:'Office Order & Circular',kind:'circular',layout:'authority'},
    {key:'ptm_invitation',title:'Parent-Teacher Meeting Notice',kind:'notice',layout:'prism'},
    {key:'exam_schedule',title:'Examination & Result Circular',kind:'general_datesheet',layout:'academic'},
    {key:'emergency_announcement',title:'Emergency / Weather Advisory',kind:'notice',layout:'minimal'},
    {key:'staff_punctuality',title:'Employee Punctuality & Arrival Notice',kind:'staff_punctuality',audience:'staff_private',layout:'authority'},
    {key:'staff_absence',title:'Unauthorized Absence Clarification Request',kind:'staff_absence',audience:'staff_private',layout:'authority'},
    {key:'duty_concern',title:'Duty Performance Concern Notice',kind:'duty_concern',audience:'staff_private',layout:'authority'},
    {key:'staff_warning',title:'Official Policy Warning Letter',kind:'staff_warning',audience:'staff_private',layout:'authority'},
    {key:'show_cause',title:'Formal Show-Cause Notice & Explanation Request',kind:'show_cause',audience:'staff_private',layout:'authority'},
    {key:'improvement_plan',title:'Staff Performance Improvement Plan',kind:'improvement_plan',audience:'staff_private',layout:'academic'},
    {key:'staff_appreciation',title:'Staff Recognition & Appreciation Letter',kind:'staff_appreciation',audience:'staff_private',layout:'prism'}
   ]
  }
 })
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
router.get('/employees/list',protect,leader,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 try{
  const result=await query(`SELECT id, emp_id, name, name as full_name, designation, department, email, user_id
   FROM public.employees
   WHERE school_id = $1 AND is_active = true
   ORDER BY name ASC`,[id])
  res.set('Cache-Control','private, no-store');return res.json({success:true,data:result.rows})
 }catch(e){return errorResponse(res,e)}
})

router.get('/',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 try{
  await ready()
  const isLeader=principal(req)
  const currentEmpId=await resolveEmployeeId(id, req.user?.id)
  let sql=`SELECT id,document_kind,status,title,language,audience_kind,layout_key,
   revision,created_by,approved_by,target_employee_id,employee_name,created_at,updated_at,reference_no
   FROM public.school_documents WHERE school_id=$1`
  const params=[id]
  if(!isLeader){
   sql+=` AND ($2::boolean OR created_by=$3 OR (status='published' AND audience_kind IN ('school','staff','parents','students')) OR (status='published' AND audience_kind='staff_private' AND target_employee_id=$4))`
   params.push(isLeader,actor(req),currentEmpId)
  }
  sql+=` ORDER BY created_at DESC LIMIT 150`
  const result=await query(sql,params)
  res.set('Cache-Control','private, no-store');return res.json({success:true,data:result.rows})
 }catch(e){return errorResponse(res,e)}
})

router.get('/:id',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(400).json({success:false})
 try{
  await ready()
  const isLeader=principal(req)
  const currentEmpId=await resolveEmployeeId(id, req.user?.id)
  const result=await query(`SELECT * FROM public.school_documents
    WHERE school_id=$1 AND id=$2 AND ($3::boolean OR created_by=$4 OR (status='published' AND audience_kind IN ('school','staff','parents','students')) OR (status='published' AND audience_kind='staff_private' AND target_employee_id=$5)) LIMIT 1`,
    [id,req.params.id,isLeader,actor(req),currentEmpId])
  if(!result.rowCount)return res.status(404).json({success:false})
  res.set('Cache-Control','private, no-store');return res.json({success:true,data:result.rows[0]})
 }catch(e){return errorResponse(res,e)}
})

router.post('/',protect,staff,async(req,res)=>{
 const id=school(req);if(!id || !actor(req))return res.status(403).json({success:false})
 const {errors,value}=cleanNotice(req.body)
 if(errors.length)return res.status(422).json({success:false,errors})
 const bound=bindOfficialSource(value,id)
 if(bound && (bound.audience_kind==='staff_private'||HR_KINDS.has(bound.document_kind)) && !principal(req))return res.status(403).json({success:false,code:'HR_PRINCIPAL_ONLY'})
 if(!bound)return res.status(409).json({success:false,code:'OFFICIAL_BELL_SOURCE_REQUIRED'})
 const uuid=randomUUID()
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  if(bound.audience_kind==='staff_private'){
   const e=await client.query('SELECT name FROM public.employees WHERE school_id=$1 AND id=$2 AND is_active=true',[id,bound.target_employee_id])
   if(e.rowCount!==1){await client.query('ROLLBACK');return res.status(403).json({success:false,code:'HR_RECIPIENT_NOT_VERIFIED'})}
   bound.employee_name=e.rows[0].name
   bound.content.employee_name=e.rows[0].name
  }
  const result=await client.query(`INSERT INTO public.school_documents
    (id,school_id,document_kind,title,language,audience_kind,audience_classes,
     source_type,source_ref,source_revision,layout_key,target_employee_id,employee_name,
     content,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8,$9,$10,$11,$12,$13,$14::jsonb,$15) RETURNING *`,
    [uuid,id,bound.document_kind,bound.title,bound.language,bound.audience_kind,
    bound.audience_classes,bound.source_type,bound.source_ref,
    bound.source_revision,bound.layout_key,bound.target_employee_id||null,
    bound.employee_name||null,JSON.stringify(bound.content),actor(req)])
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
 if(bound && (bound.audience_kind==='staff_private'||HR_KINDS.has(bound.document_kind)) && !principal(req))return res.status(403).json({success:false,code:'HR_PRINCIPAL_ONLY'})
 if(!bound)return res.status(409).json({success:false,code:'OFFICIAL_BELL_SOURCE_REQUIRED'})
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  if(bound.audience_kind==='staff_private'){
   const e=await client.query('SELECT name FROM public.employees WHERE school_id=$1 AND id=$2 AND is_active=true',[id,bound.target_employee_id])
   if(e.rowCount!==1){await client.query('ROLLBACK');return res.status(403).json({success:false,code:'HR_RECIPIENT_NOT_VERIFIED'})}
   bound.employee_name=e.rows[0].name
   bound.content.employee_name=e.rows[0].name
  }
  const r=await client.query(`UPDATE school_documents SET title=$1,document_kind=$2,language=$3,audience_kind=$4,
   audience_classes=$5::text[],source_type=$6,source_ref=$7,source_revision=$8,layout_key=$9,
   target_employee_id=$10,employee_name=$11,content=$12::jsonb,revision=revision+1,updated_at=now()
   WHERE id=$13 AND school_id=$14 AND created_by=$15 AND status='draft' AND revision=$16 RETURNING *`,
   [bound.title,bound.document_kind,bound.language,bound.audience_kind,
   bound.audience_classes,bound.source_type,bound.source_ref,
   bound.source_revision,bound.layout_key,bound.target_employee_id||null,
   bound.employee_name||null,JSON.stringify(bound.content),
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
  const before=await client.query(`SELECT id,created_by,approved_by,content FROM school_documents
   WHERE school_id=$1 AND id=$2 AND status=$3 AND revision=$4 ${ownerCheck} FOR UPDATE`,who)
  if(!before.rowCount){await client.query('ROLLBACK');return res.status(409).json({success:false,code:'STATE_CONFLICT'})}
  if(to==='approved' && before.rows[0].created_by===actor(req)){
   await client.query('ROLLBACK');return res.status(403).json({success:false,code:'SELF_APPROVAL_NOT_ALLOWED'})
  }
  if(to==='published'){
   // Validate the same locked revision; drafting and review remain unaffected.
   const unresolved=unresolvedPresetFields(before.rows[0].content)
   if(unresolved.length){
    await client.query('ROLLBACK')
    return res.status(409).json({success:false,code:'UNRESOLVED_NOTICE_TEMPLATE_FIELDS',fields:unresolved})
   }
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

router.post('/:id/acknowledge',protect,staff,async(req,res)=>{
 const id=school(req);if(!id)return res.status(403).json({success:false})
 const {written_response}=req.body||{}
 const client=await pool.connect()
 try{
  await ready();await client.query('BEGIN');await applyTenantContext(client)
  const currentEmpId=await resolveEmployeeId(id, req.user?.id)
  const doc=await client.query(`SELECT * FROM public.school_documents WHERE school_id=$1 AND id=$2 FOR UPDATE`,[id,req.params.id])
  if(!doc.rowCount){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Document not found'})}
  const row=doc.rows[0]
  const userEmpId = Number(currentEmpId || await resolveEmployeeId(id, req.user?.id));
  if(row.audience_kind!=='staff_private'||row.status!=='published'||!row.target_employee_id||Number(row.target_employee_id)!==userEmpId){
   await client.query('ROLLBACK');return res.status(403).json({success:false,code:'HR_ONLY_PUBLISHED_INTENDED_RECIPIENT'})
  }
  if(row.content?.acknowledged_at){
   await client.query('ROLLBACK');return res.status(409).json({success:false,code:'HR_RECEIPT_ALREADY_ACKNOWLEDGED'})
  }
  const verifiedEmp=await client.query('SELECT name FROM public.employees WHERE id=$1 AND school_id=$2 AND is_active=true',[userEmpId,id])
  if(verifiedEmp.rowCount!==1){
   await client.query('ROLLBACK');return res.status(403).json({success:false,code:'HR_RECIPIENT_NOT_VERIFIED'})
  }
  const updatedContent={
   ...row.content,
   acknowledged_at:new Date().toISOString(),
   acknowledged_by_employee:verifiedEmp.rows[0].name,
   employee_response:written_response?String(written_response).trim().slice(0,8000):(row.content.employee_response||'')
  }
  const updated=await client.query(`UPDATE public.school_documents SET content=$1::jsonb, updated_at=now() WHERE school_id=$2 AND id=$3 RETURNING *`,[JSON.stringify(updatedContent),id,req.params.id])
  await client.query(`INSERT INTO public.school_document_events (school_id,document_id,event_type,actor_id,event_meta) VALUES ($1,$2,'acknowledge',$3,$4::jsonb)`,[id,req.params.id,actor(req),JSON.stringify({acknowledged_at:updatedContent.acknowledged_at})])
  await client.query('COMMIT');return res.json({success:true,message:'Document receipt acknowledged',data:updated.rows[0]})
 }catch(e){await client.query('ROLLBACK').catch(()=>{});return errorResponse(res,e)}
 finally{client.release()}
})

module.exports=router
