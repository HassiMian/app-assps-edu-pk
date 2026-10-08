'use strict'
const crypto = require('node:crypto')
const {
  withTenantTransaction,captureQuestionGovernance,buildRevisionHash,
} = require('./questionBankGovernance')
const { normalizeGrade,error } = require('./grade910AcademicReviewGate')

const MAX_QUESTION_LENGTH = 5000
const MAX_ANSWER_LENGTH = 8000
const MAX_MARKS = 25
const clean = value => String(value == null ? '' : value).trim()

/**
 * Strict Grade 9–10 correction, never publication.
 * The updated QuestionBank row + new immutable governed revision are committed
 * inside ONE tenant-bound PostgreSQL transaction. School, provenance and source
 * chapter are immutable. Editorial review is required again afterwards.
 */
async function reviseProvisionalAcademicQuestion({
  schoolId,authorId,questionId,expectedRevision,expectedContentHash,changes,
}={}){
  const actor=Number(authorId),revisionNumber=Number(expectedRevision)
  const hash=clean(expectedContentHash).toLowerCase()
  if(!Number.isSafeInteger(actor)||actor<1)
    throw error('AUTHOR_ID_REQUIRED','Authenticated question author required.',403)
  if(!Number.isSafeInteger(revisionNumber)||revisionNumber<1 ||
     !/^[a-f0-9]{64}$/.test(hash))
    throw error('SOURCE_REVISION_REQUIRED','An exact revision and hash are required.',422)
  if(!changes||typeof changes!=='object'||Array.isArray(changes))
    throw error('CORRECTION_CONTENT_REQUIRED','Correction fields are required.',422)

  return withTenantTransaction(schoolId,async(client,tenantId)=>{
    const user=await client.query(
      'SELECT role FROM users WHERE school_id=$1 AND id=$2',
      [tenantId,actor]
    )
    if(user.rowCount!==1||!['admin','principal','super_admin'].includes(user.rows[0].role))
      throw error('CORRECTION_ROLE_DENIED','Authorized school question author required.',403)

    const masters=await client.query(
      'SELECT id,public_id,current_revision,lifecycle_status,created_by,source_question_bank_id FROM question_masters WHERE school_id=$1 AND source_question_bank_id=$2 FOR UPDATE',
      [tenantId,clean(questionId)]
    )
    if(masters.rowCount!==1)throw error('CORRECTION_MASTER_NOT_FOUND','Governed question not found in this tenant.',404)
    const master=masters.rows[0]
    if(master.lifecycle_status!=='candidate'||Number(master.created_by)!==actor)
      throw error('CORRECTION_AUTHOR_OR_STATUS_DENIED','Only the revision author may correct their own candidate question.',403)
    if(Number(master.current_revision)!==revisionNumber)
      throw error('CORRECTION_REVISION_CONFLICT','Question revision changed; reload before editing.')

    const oldRev=await client.query(
      'SELECT content_hash,content_json FROM question_revisions WHERE school_id=$1 AND question_master_id=$2 AND revision_number=$3',
      [tenantId,master.id,revisionNumber]
    )
    if(oldRev.rowCount!==1||clean(oldRev.rows[0].content_hash).toLowerCase()!==hash)
      throw error('CORRECTION_HASH_CONFLICT','Question revision hash changed.')

    const source=await client.query(
      'SELECT * FROM question_bank WHERE school_id=$1 AND id=$2 FOR UPDATE',
      [tenantId,master.source_question_bank_id]
    )
    if(source.rowCount!==1)throw error('CORRECTION_SOURCE_NOT_FOUND','Linked question not found in this school.',404)
    const row=source.rows[0]
    if(row.is_approved||row.source_type!=='json_seed'||
       row.metadata?.review_state!=='provisional_internal'||
       !normalizeGrade(row.class_level))
      throw error('CORRECTION_SOURCE_NOT_PROVISIONAL','Only an unapproved provisional Grade 9–10 seed can be corrected.')
    if(buildRevisionHash(row)!==hash)
      throw error('CORRECTION_SOURCE_CONTENT_DRIFT','Legacy row no longer matches its current governed revision.')

    const question_text=clean(changes.question_text ?? row.question_text)
    const question_text_urdu=clean(changes.question_text_urdu ?? row.question_text_urdu)
    const answer=clean(changes.answer ?? row.answer)
    const explanation=clean(changes.explanation ?? row.explanation)
    const correct_option=clean(changes.correct_option ?? row.correct_option).toUpperCase()
    const marks=Number(changes.marks ?? row.marks)
    const options=changes.options ?? row.options

    if((!question_text&&!question_text_urdu) ||
       question_text.length>MAX_QUESTION_LENGTH ||
       question_text_urdu.length>MAX_QUESTION_LENGTH ||
       answer.length>MAX_ANSWER_LENGTH||explanation.length>MAX_ANSWER_LENGTH||
       !Number.isInteger(marks)||marks<1||marks>MAX_MARKS)
      throw error('INVALID_CORRECTION_CONTENT','Question, answers or marks exceed the permitted editorial bounds.',422)
    if(row.question_type==='mcq'){
      if(!Array.isArray(options)||options.length!==4 ||
         options.some(v=>clean(typeof v==='string'?v:v?.text).length<1) ||
         !['A','B','C','D'].includes(correct_option))
        throw error('INVALID_CORRECTED_MCQ','Four valid options and a correct A–D answer key are required.',422)
    }
    const corrected={...row,question_text,question_text_urdu,answer,explanation,
      correct_option,marks,options}
    const revisedHash=buildRevisionHash(corrected)
    if(revisedHash===hash)
      throw error('NO_CORRECTION_CHANGES','An unchanged question cannot bypass a recorded correction request.',409)

    const capture=await captureQuestionGovernance({
      schoolId:tenantId,userId:actor,question:corrected,
      idempotencyKey:'grade910-correction:'+crypto.randomUUID(),
      sourceQuestionBankId:row.id,expectedRevision:revisionNumber,
      tenantClient:client,
    })
    if(capture.publicId!==master.public_id ||
       Number(capture.currentRevision)!==revisionNumber+1 ||
       capture.revisionHash!==revisedHash)
      throw error('CORRECTION_CAPTURE_PARITY_FAILED','Atomic governance revision did not match the corrected source.',409)

    const changed=await client.query(
      `UPDATE question_bank SET question_text=$1,question_text_urdu=$2,
        options=$3::jsonb,correct_option=$4,answer=$5,explanation=$6,marks=$7,
        updated_at=NOW()
        WHERE school_id=$8 AND id=$9 AND is_approved IS NOT TRUE
        RETURNING id`,
      [question_text,question_text_urdu,JSON.stringify(options),correct_option,
       answer,explanation,marks,tenantId,row.id]
    )
    if(changed.rowCount!==1)
      throw error('CORRECTION_SOURCE_CAS_FAILED','Corrected Question Bank row was not updated atomically.')
    return {
      publicId:master.public_id,schoolId:tenantId,
      sourceQuestionBankId:row.id,currentRevision:capture.currentRevision,
      contentHash:revisedHash,academicApprovalGranted:false,
      lifecycleStatus:'candidate',newReviewRequired:true,
    }
  })
}
module.exports={reviseProvisionalAcademicQuestion}
