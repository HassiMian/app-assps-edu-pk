'use strict'
const { isDeepStrictEqual } = require('node:util')
const {withTenantTransaction}=require('./questionBankGovernance')
const {normalizeGrade,normalizeEvidence,reviewMappingKey,error}=require('./grade910AcademicReviewGate')

async function recordIndependentAcademicReview({
  schoolId, reviewerId, publicId, expectedRevision, expectedContentHash, evidence,
}={}){
  if(!Number.isSafeInteger(Number(reviewerId))||Number(reviewerId)<1)
    throw error('REVIEWER_ID_REQUIRED','An authenticated reviewer is required.',403)
  const version=Number(expectedRevision)
  const pinned=String(expectedContentHash||'').trim().toLowerCase()
  const mappingKey=reviewMappingKey(version,pinned)
  return withTenantTransaction(schoolId,async(client,tenantId)=>{
    const user=await client.query(
      'SELECT id,role FROM users WHERE id=$1 AND school_id=$2',
      [reviewerId,tenantId]
    )
    if(user.rowCount!==1||!['admin','principal','super_admin'].includes(user.rows[0].role))
      throw error('REVIEWER_NOT_AUTHORIZED_FOR_TENANT','An authorized reviewer in this school is required.',403)
    const masters=await client.query(
      "SELECT id,public_id,current_revision,lifecycle_status,created_by,source_question_bank_id FROM question_masters WHERE school_id=$1 AND public_id=$2 FOR UPDATE",
      [tenantId,String(publicId||'')]
    )
    if(masters.rowCount!==1)throw error('QUESTION_MASTER_NOT_FOUND','Governed question not found.',404)
    const master=masters.rows[0]
    if(master.lifecycle_status!=='reviewed')
      throw error('QUESTION_NOT_READY_FOR_ACADEMIC_REVIEW','Question must first be in reviewed lifecycle.')
    if(Number(master.current_revision)!==version)
      throw error('REVIEW_REVISION_CONFLICT','Question changed; reload latest version before independent review.')
    const revisions=await client.query(
      'SELECT revision_number,content_hash,content_json,created_by FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 AND revision_number=$3',
      [tenantId,master.id,version]
    )
    if(revisions.rowCount!==1)throw error('MISSING_REVIEW_REVISION','Immutable reviewed revision is absent.')
    const revision=revisions.rows[0]
    if(String(revision.content_hash||'').trim().toLowerCase()!==pinned)
      throw error('REVIEW_CONTENT_HASH_CONFLICT','Current revision content hash changed.')
    if(!normalizeGrade(revision.content_json?.classLevel))
      throw error('REVIEW_GRADE_NOT_SUPPORTED','Only Grade 9/10 use this academic evidence gate.',422)
    const reviewer=Number(reviewerId),author=Number(master.created_by),revisionAuthor=Number(revision.created_by)
    if(!Number.isInteger(author)||author<1||!Number.isInteger(revisionAuthor)||
       revisionAuthor<1||author===reviewer||revisionAuthor===reviewer)
      throw error('ACADEMIC_REVIEW_NOT_INDEPENDENT','Reviewer must differ from original author and revision author.',403)
    if(!master.source_question_bank_id)
      throw error('REVIEW_SOURCE_QUESTION_LINK_REQUIRED','A tenant-linked legacy Question Bank record is required.')
    const priorCorrection=await client.query(
      "SELECT id FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_academic_rejection' AND mapping_key=$3 AND mapping_status='reviewed'",
      [tenantId,master.id,mappingKey]
    )
    if(priorCorrection.rowCount)
      throw error('CORRECTION_REQUIRES_NEW_REVISION','This exact revision was returned for correction; the author must submit a new revision.',409)
    const normalized=normalizeEvidence(evidence,revision.content_json)
    const existing=await client.query(
      "SELECT metadata,reviewed_by FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_independent_academic_review' AND mapping_key=$3",
      [tenantId,master.id,mappingKey]
    )
    const attestation={
      schoolId:tenantId,reviewerUserId:reviewer,currentRevision:version,
      contentHash:pinned,sourceEvidence:normalized,
    }
    if(existing.rowCount){
      if(Number(existing.rows[0].reviewed_by)!==reviewer ||
        !isDeepStrictEqual(existing.rows[0].metadata,attestation))
        throw error('REVIEW_ALREADY_LOCKED','Existing review of this exact revision cannot be silently overwritten.')
      return {publicId:master.public_id,revisionNumber:version,
        contentHash:pinned,independentReviewRecorded:true,replayed:true,
        questionBankApproved:false}
    }
    await client.query(
      `INSERT INTO question_mappings
      (school_id,question_master_id,mapping_type,mapping_key,mapping_status,
       metadata,created_by,reviewed_by,reviewed_at)
       VALUES ($1,$2,'grade910_independent_academic_review',$3,'reviewed',
       $4::jsonb,$5,$5,NOW())`,
      [tenantId,master.id,mappingKey,JSON.stringify(attestation),reviewer]
    )
    return {publicId:master.public_id,revisionNumber:version,
      contentHash:pinned,independentReviewRecorded:true,replayed:false,
      questionBankApproved:false}
  })
}
module.exports={recordIndependentAcademicReview}

async function getAcademicReviewContext({schoolId,requesterId,publicId}={}){
  if(!Number.isSafeInteger(Number(requesterId))||Number(requesterId)<1)
    throw error('AUTHENTICATED_REVIEWER_REQUIRED','Requester identity is required.',403)
  return withTenantTransaction(schoolId,async(client,tenantId)=>{
    const user=await client.query('SELECT id,role FROM users WHERE id=$1 AND school_id=$2',
      [requesterId,tenantId])
    if(user.rowCount!==1||!['admin','principal','super_admin'].includes(user.rows[0].role))
      throw error('REVIEW_SCOPE_DENIED','User is not authorized for this school.',403)
    const rows=await client.query(`SELECT qm.public_id,qm.lifecycle_status,qm.current_revision,
             qm.created_by AS author_id,qm.source_question_bank_id,
             qr.content_json,qr.content_hash,qr.created_by AS revision_author_id
       FROM question_masters qm
       JOIN question_revisions qr ON qr.school_id=qm.school_id
         AND qr.question_master_id=qm.id AND qr.revision_number=qm.current_revision
      WHERE qm.school_id=$1 AND qm.public_id=$2 LIMIT 1`,[tenantId,publicId])
    if(rows.rowCount!==1)throw error('REVIEW_QUESTION_NOT_FOUND','Question not found for this school.',404)
    const row=rows.rows[0]
    const latest=String(row.content_hash||'').trim().toLowerCase()
    const proof=await client.query(
      "SELECT mapping_status,reviewed_by,reviewed_at FROM question_mappings WHERE school_id=$1 AND question_master_id=(SELECT id FROM question_masters WHERE school_id=$1 AND public_id=$2) AND mapping_type='grade910_independent_academic_review' AND mapping_key=$3 LIMIT 1",
      [tenantId,publicId,reviewMappingKey(Number(row.current_revision),latest)]
    )
    const validReview=proof.rows[0]?.mapping_status==='reviewed'
    const rejected=await client.query(
      "SELECT metadata,reviewed_by,reviewed_at FROM question_mappings WHERE school_id=$1 AND question_master_id=(SELECT id FROM question_masters WHERE school_id=$1 AND public_id=$2) AND mapping_type='grade910_academic_rejection' AND mapping_key=$3 AND mapping_status='reviewed' LIMIT 1",
      [tenantId,publicId,reviewMappingKey(Number(row.current_revision),latest)]
    )
    return {
      publicId:row.public_id,schoolId:tenantId,
      lifecycleStatus:row.lifecycle_status,
      currentRevision:Number(row.current_revision),
      currentContentHash:latest,
      question:row.content_json,
      questionBankLinked:Boolean(row.source_question_bank_id),
      requesterIsOriginalAuthor:Number(row.author_id)===Number(requesterId),
      independentReviewerRequired:true,
      independentReviewRecorded:validReview,
      returnedForCorrection:rejected.rowCount===1,
      correctionReason:rejected.rows[0]?.metadata?.reason||null,
      correctionReviewerUserId:rejected.rowCount?Number(rejected.rows[0].reviewed_by):null,
      independentReviewerUserId:validReview?Number(proof.rows[0].reviewed_by):null,
      independentReviewRecordedAt:validReview?proof.rows[0].reviewed_at:null,
      requesterIsReviewer:validReview &&
        Number(proof.rows[0].reviewed_by)===Number(requesterId),
      requesterIsAuthor:Number(row.author_id)===Number(requesterId) ||
        Number(row.revision_author_id)===Number(requesterId),
      academicApprovalGranted:row.lifecycle_status==='ready',
    }
  })
}
module.exports.getAcademicReviewContext=getAcademicReviewContext

/**
 * Return a reviewed Grade 9/10 question to its author for corrections.
 * The action is revision/hash bound and written to the same tenant's
 * immutable mapping/audit ledger; it NEVER grants academic approval.
 */
async function returnAcademicReviewForCorrection({
  schoolId,reviewerId,publicId,expectedRevision,expectedContentHash,reason,
}={}){
  if(!Number.isSafeInteger(Number(reviewerId))||Number(reviewerId)<1)
    throw error('REVIEWER_ID_REQUIRED','Authenticated reviewer identity is required.',403)
  const explanation=String(reason||'').trim()
  if(explanation.length<35||explanation.length>2000)
    throw error('CORRECTION_REASON_REQUIRED','Record a specific correction reason of 35–2000 characters.',422)
  const revision=Number(expectedRevision)
  const sha=String(expectedContentHash||'').trim().toLowerCase()
  const key=reviewMappingKey(revision,sha)
  return withTenantTransaction(schoolId,async(client,tenantId)=>{
    const user=await client.query('SELECT role FROM users WHERE school_id=$1 AND id=$2',
      [tenantId,reviewerId])
    if(user.rowCount!==1||!['admin','principal','super_admin'].includes(user.rows[0].role))
      throw error('REVIEWER_NOT_AUTHORIZED_FOR_TENANT','Authorized school reviewer required.',403)
    const masterRows=await client.query(
      'SELECT id,public_id,current_revision,lifecycle_status,created_by,source_question_bank_id FROM question_masters WHERE school_id=$1 AND public_id=$2 FOR UPDATE',
      [tenantId,publicId])
    if(masterRows.rowCount!==1)throw error('QUESTION_NOT_FOUND','Question was not found in the current school.',404)
    const master=masterRows.rows[0]
    if(master.lifecycle_status!=='reviewed')
      throw error('REVIEW_STATUS_CONFLICT','Only a reviewed, unpublished question can be returned for correction.')
    if(Number(master.current_revision)!==revision)
      throw error('REVIEW_REVISION_CONFLICT','Question revision changed since it was opened.')
    if(Number(master.created_by)===Number(reviewerId))
      throw error('INDEPENDENT_REJECTION_REQUIRED','Another school reviewer must assess author corrections.',403)
    const revisionRows=await client.query(
      'SELECT content_hash,content_json,created_by FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 AND revision_number=$3',
      [tenantId,master.id,revision])
    if(revisionRows.rowCount!==1||String(revisionRows.rows[0].content_hash).toLowerCase()!==sha)
      throw error('REVIEW_HASH_CONFLICT','Question content changed since it was reviewed.')
    const rev=revisionRows.rows[0]
    if(Number(rev.created_by)===Number(reviewerId)||
      !normalizeGrade(rev.content_json?.classLevel)||!master.source_question_bank_id)
      throw error('INDEPENDENT_ACADEMIC_REVIEW_REQUIRED','Independent Grade 9–10 revision and source are required.')
    const previous=await client.query(
      "SELECT id FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_academic_rejection' AND mapping_key=$3",
      [tenantId,master.id,key])
    if(previous.rowCount)throw error('CORRECTION_ALREADY_RECORDED','A correction request already exists for this revision.')
    const record={
      kind:'return_for_correction',reason:explanation,currentRevision:revision,
      contentHash:sha,sourceQuestionBankId:String(master.source_question_bank_id),
      reviewerUserId:Number(reviewerId),schoolId:tenantId,
      academicApprovalGranted:false,
    }
    await client.query(
      `INSERT INTO question_mappings
       (school_id,question_master_id,mapping_type,mapping_key,mapping_status,
        metadata,created_by,reviewed_by,reviewed_at)
       VALUES ($1,$2,'grade910_academic_rejection',$3,'reviewed',$4::jsonb,$5,$5,NOW())`,
      [tenantId,master.id,key,JSON.stringify(record),reviewerId]
    )
    await client.query(
      "UPDATE question_mappings SET mapping_status='retired' WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_independent_academic_review' AND mapping_key=$3",
      [tenantId,master.id,key])
    await client.query(
      "UPDATE question_masters SET lifecycle_status='candidate',updated_by=$1,updated_at=NOW() WHERE school_id=$2 AND id=$3",
      [reviewerId,tenantId,master.id])
    return {publicId:master.public_id,currentRevision:revision,
      academicApprovalGranted:false,status:'candidate',
      correctionRecorded:true}
  })
}
module.exports.returnAcademicReviewForCorrection=returnAcademicReviewForCorrection
