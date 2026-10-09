'use strict'
const { isDeepStrictEqual } = require('node:util')
const {withTenantTransaction}=require('./questionBankGovernance')
const {normalizeGrade,normalizeEvidence,reviewMappingKey,requireGrade910McqIntegrity,approvedSourceMatchesRevision,assertGrade910ReviewSignature,requireUnflaggedGrade910Source,requireGrade910MinimumQuestionIntegrity,requireGrade910ModelAnswer,requireGrade910CurriculumMapping,requireGrade910SourceClassification,assertGrade910ImmutableRevisionHash,error}=require('./grade910AcademicReviewGate')

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
      'SELECT id,role,is_active FROM users WHERE id=$1 AND school_id=$2 FOR SHARE',
      [reviewerId,tenantId]
    )
    if(user.rowCount!==1||user.rows[0].is_active!==true||
       !['admin','principal','super_admin'].includes(user.rows[0].role))
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
    assertGrade910ImmutableRevisionHash(revision)
    const reviewer=Number(reviewerId),author=Number(master.created_by),revisionAuthor=Number(revision.created_by)
    if(!Number.isInteger(author)||author<1||!Number.isInteger(revisionAuthor)||
       revisionAuthor<1||author===reviewer||revisionAuthor===reviewer)
      throw error('ACADEMIC_REVIEW_NOT_INDEPENDENT','Reviewer must differ from original author and revision author.',403)
    if(!master.source_question_bank_id)
      throw error('REVIEW_SOURCE_QUESTION_LINK_REQUIRED','A tenant-linked legacy Question Bank record is required.')
    // The linked original row creator is separate provenance from the governed wrapper author.
    const linkedSource=await client.query(
      'SELECT created_by,class_level,subject,medium,chapter_no,question_type,question_text,question_text_urdu,options,correct_option,answer,explanation,marks,is_duplicate,board,chapter_name,topic_name,difficulty,priority,source_type,source_file_id,source_page_no FROM question_bank WHERE school_id=$1 AND id=$2 FOR SHARE',
      [tenantId,master.source_question_bank_id]
    )
    if(linkedSource.rowCount!==1)
      throw error('REVIEW_SOURCE_QUESTION_NOT_FOUND','Tenant-local original Question Bank row is missing.',404)
    requireUnflaggedGrade910Source(linkedSource.rows[0])
    const sourceCreator=Number(linkedSource.rows[0].created_by)
    if(!Number.isSafeInteger(sourceCreator)||sourceCreator<1)
      throw error('ACADEMIC_REVIEW_SOURCE_CREATOR_UNKNOWN','The linked original Question Bank creator is not independently attributable.',422)
    if(sourceCreator===reviewer)
      throw error('ACADEMIC_REVIEW_SOURCE_CREATOR_CONFLICT','Reviewer must differ from linked Question Bank originator.',403)
    // Review the actual tenant-linked original content, not only the detached
    // governed revision; the publisher repeats this check before release.
    const original=linkedSource.rows[0],candidate=revision.content_json
    requireGrade910CurriculumMapping(original,candidate)
    requireGrade910SourceClassification(original,candidate)
    const equalField=(a,b)=>String(a??'').trim().toLowerCase()===String(b??'').trim().toLowerCase()
    if(normalizeGrade(original.class_level)!==normalizeGrade(candidate.classLevel)||
       !equalField(original.subject,candidate.subject)||
       !equalField(original.medium,candidate.medium)||
       String(original.chapter_no??'').trim()!==String(candidate.chapterNo??'').trim()||
       !approvedSourceMatchesRevision(original,candidate))
      throw error('REVIEW_LINKED_SOURCE_CONTENT_DRIFT',
        'Linked school Question Bank text, answer, marks or chapter differs from the revision being independently reviewed.',409)
    requireGrade910MinimumQuestionIntegrity(revision.content_json)
    requireGrade910ModelAnswer(revision.content_json)
    requireGrade910McqIntegrity(revision.content_json)
    const normalized=normalizeEvidence(evidence,revision.content_json,{tenantId})
    const existing=await client.query(
      "SELECT metadata,reviewed_by,created_by,reviewed_at FROM question_mappings WHERE school_id=$1 AND question_master_id=$2 AND mapping_type='grade910_independent_academic_review' AND mapping_key=$3",
      [tenantId,master.id,mappingKey]
    )
    const attestation={
      schoolId:tenantId,reviewerUserId:reviewer,currentRevision:version,
      contentHash:pinned,sourceEvidence:normalized,
    }
    if(existing.rowCount){
      assertGrade910ReviewSignature(existing.rows[0],reviewer)
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
    const user=await client.query('SELECT id,role,is_active FROM users WHERE id=$1 AND school_id=$2',
      [requesterId,tenantId])
    if(user.rowCount!==1||user.rows[0].is_active!==true||
       !['admin','principal','super_admin'].includes(user.rows[0].role))
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
    return {
      publicId:row.public_id,schoolId:tenantId,
      lifecycleStatus:row.lifecycle_status,
      currentRevision:Number(row.current_revision),
      currentContentHash:latest,
      question:row.content_json,
      questionBankLinked:Boolean(row.source_question_bank_id),
      independentReviewerRequired:true,
      requesterIsAuthor:Number(row.author_id)===Number(requesterId) ||
        Number(row.revision_author_id)===Number(requesterId),
      academicApprovalGranted:false,
      academicApprovalProofStatus:'NOT_EVALUATED_IN_REVIEW_CONTEXT',
    }
  })
}
module.exports.getAcademicReviewContext=getAcademicReviewContext
