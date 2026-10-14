'use strict'
const {prepareReviewBatch} = require('./lessonComposerIntake')
const trusted20261014 = require('./data/adiba20261014TrustedHashes.json')
function err(code){const e=new Error(code);e.code=code;e.status=409;return e}
// Pinned hashes of the independently inspected, privately-held original archive.
// Import cannot rely only on hashes self-asserted by the uploading client.
function enforceTrustedSource(validated, registry = trusted20261014) {
  if (!registry || validated.schoolId !== registry.schoolId ||
      validated.originalZipHash !== registry.sourceZipSha256 ||
      validated.originalTextHash !== registry.sourceTextSha256) {
    throw err('SOURCE_NOT_FROM_TRUSTED_EXPORT')
  }
  for (const candidate of validated.candidates) {
    const expected = registry.candidateHashes?.[candidate.reviewKey]
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
      throw err('UNREGISTERED_SOURCE_CANDIDATE')
    }
    if (candidate.digest !== expected) throw err('TRUSTED_SOURCE_DIGEST_MISMATCH')
  }
}
function toRow(candidate,schoolId,manifest){
  const verified=prepareReviewBatch({
    schema:'assps.lesson_plan.review_import.v1',
    source_zip_sha256:manifest.source_zip_sha256,
    source_txt_sha256:manifest.source_txt_sha256,
    candidates:[candidate],unassigned_evidence:manifest.unassigned_evidence||[]
  },schoolId).candidates[0]
  return {
    id:verified.reviewKey, schoolId, className:verified.className, subject:verified.subject,
    sourceDigest:verified.digest, title:verified.className+' — '+verified.subject+' (Source Review Only)',
    payload:{
      composerIntake:true,reviewKey:verified.reviewKey,sourceDigest:verified.digest,
      sourceZipSha256:manifest.source_zip_sha256,sourceTextSha256:manifest.source_txt_sha256,
      sourceSubmissions:JSON.parse(JSON.stringify(candidate.source_detail_records)),
      sourceIds:[...candidate.source_submissions],
      collectedBy:'Miss Adiba',collectedRole:'COMPOSER_ONLY',
      actualTeacherId:null,actualTeacherVerification:'NOT_VERIFIED',
      sourceClassLabel:candidate.class_display,sourceSubjectLabel:candidate.source_subject_label,
      sectionId:null,termId:null,textbookAdoption:'NOT_VERIFIED',
      academicReview:'PENDING',publicationStatus:'BLOCKED',sentToPortal:false,
      corrections:[],issues:[...(candidate.blocking_reasons||[])]
    }
  }
}
async function persistReviewBatch(client,manifest,schoolId,registry=trusted20261014){
  if(!manifest||!Array.isArray(manifest.candidates))throw err('REVIEW_BATCH_REQUIRED')
  if(manifest.candidates.length>12)throw err('REVIEW_BATCH_MAX_TWELVE')
  const validated=prepareReviewBatch(manifest,schoolId)
  enforceTrustedSource(validated,registry)
  const rows=manifest.candidates.map(c=>toRow(c,schoolId,manifest))
  const receipts=[]
  let staged=0,previouslyStaged=0
  for(const row of rows){
    const current=await client.query(
      'SELECT revision,payload,sent_to_portal,created_by FROM lesson_plans WHERE school_id=$1 AND public_id=$2 FOR UPDATE',
      [schoolId,row.id]
    )
    if(current.rowCount){
      const old=current.rows[0]
      if(!old.payload?.composerIntake||old.payload.sourceDigest!==row.sourceDigest||
         old.payload.sourceZipSha256!==manifest.source_zip_sha256||
         old.created_by!==null||old.sent_to_portal!==false)throw err('REVIEW_IMPORT_CONFLICT_NO_OVERWRITE')
      previouslyStaged++
      receipts.push({id:row.id,status:'ALREADY_PRESENT',revision:Number(old.revision)})
      continue
    }
    const sql=[
      'INSERT INTO lesson_plans',
      '(school_id,public_id,revision,title,class_level,subject,teacher,plan_date,planning_scope,sent_to_portal,payload,created_by)',
      "VALUES($1,$2,1,$3,$4,$5,NULL,DATE '2026-10-14','term',FALSE,$6::jsonb,NULL)",
      'ON CONFLICT(school_id,public_id) DO NOTHING RETURNING id'
    ].join(' ')
    const result=await client.query(sql,
      [schoolId,row.id,row.title,row.className,row.subject,JSON.stringify(row.payload)])
    if(result.rowCount!==1)throw err('REVIEW_IMPORT_CONCURRENT_CONFLICT')
    staged++
    receipts.push({id:row.id,status:'STAGED_UNAPPROVED',revision:1})
  }
  return {classes:validated.classes.map(g=>g.className),sourceFingerprint:validated.originalZipHash,
    staged,previouslyStaged,total:rows.length,publicationAllowed:false,notificationsSent:0,receipts}
}
async function listReviewGroups(client,schoolId){
  const sql=[
    'SELECT public_id,title,class_level,subject,revision,',
    "payload->>'sourceDigest' AS source_digest FROM lesson_plans",
    "WHERE school_id=$1 AND payload->>'composerIntake'='true'",
    'ORDER BY class_level,subject,public_id'
  ].join(' ')
  const q=await client.query(sql,[schoolId])
  return q.rows.map(r=>({id:r.public_id,title:r.title,classLevel:r.class_level,
    subject:r.subject,revision:Number(r.revision),sourceDigest:r.source_digest,
    teacherUserId:null,publicationStatus:'BLOCKED'}))
}
async function readReviewSource(client,schoolId,id){
  if(!/^LPREVIEW-[A-Za-z0-9-]{8,95}$/.test(String(id)))throw err('REVIEW_ID_INVALID')
  const q=await client.query([
    'SELECT public_id,revision,payload FROM lesson_plans',
    "WHERE school_id=$1 AND public_id=$2 AND payload->>'composerIntake'='true'"
  ].join(' '),[schoolId,id])
  if(!q.rowCount)return null
  return {id:q.rows[0].public_id,revision:Number(q.rows[0].revision),
    reviewStatus:'PENDING_ACADEMIC_REVIEW',source:q.rows[0].payload}
}
module.exports={toRow,persistReviewBatch,listReviewGroups,readReviewSource,enforceTrustedSource}
