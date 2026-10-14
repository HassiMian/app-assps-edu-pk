'use strict'
const crypto=require('node:crypto')
function invalid(code,status=422){const e=new Error(code);e.code=code;e.status=status;return e}
const TYPES=new Set([
  'DATE_PROPOSAL','CLASS_LABEL_PROPOSAL','SUBJECT_LABEL_PROPOSAL',
  'TEXT_FIX_PROPOSAL','CHAPTER_FIX_PROPOSAL','AUTHORSHIP_FLAG','MISSING_CONTENT_FLAG'
])
const SHA=/^[a-f0-9]{64}$/
function text(v,max=2000){return typeof v==='string'&&v.trim()&&v.length<=max&&!v.includes('\u0000')?v.trim():null}
function validateChange(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw invalid('CORRECTION_BODY_REQUIRED')
 if(!TYPES.has(input.changeType))throw invalid('CORRECTION_TYPE_INVALID')
 const sourceId=text(input.sourceId,90)
 if(!sourceId||!/^WA14-(L[0-9]+|IMG-[A-Za-z0-9-]+)$/.test(sourceId))throw invalid('CORRECTION_SOURCE_REQUIRED')
 const proposedText=text(input.proposedText,2000)
 const rationale=text(input.rationale,1000)
 if(!proposedText||!rationale||rationale.length<12)throw invalid('CORRECTION_EVIDENCE_REQUIRED')
 if(input.teacherUserId!=null||input.approve===true||input.publish===true)throw invalid('CORRECTION_CANNOT_GRANT_AUTHORITY')
 return {sourceId,changeType:input.changeType,proposedText,rationale}
}
async function appendCorrection(client,{schoolId,id,revision,actorId,input}){
 if(!Number.isSafeInteger(schoolId)||schoolId<1||!Number.isSafeInteger(actorId)||actorId<1||
  !Number.isSafeInteger(revision)||revision<1)throw invalid('CORRECTION_AUTHENTICATED_SCOPE_REQUIRED',403)
 if(typeof id!=='string'||!/^LPREVIEW-[A-Za-z0-9-]{8,95}$/.test(id))throw invalid('CORRECTION_REVIEW_ID_INVALID')
 const valid=validateChange(input)
 const current=await client.query(
  "SELECT revision,payload,created_by,sent_to_portal FROM lesson_plans WHERE school_id=$1 AND public_id=$2 FOR UPDATE",
  [schoolId,id])
 if(!current.rowCount)throw invalid('CORRECTION_REVIEW_NOT_FOUND',404)
 const row=current.rows[0]
 if(!row.payload?.composerIntake||row.created_by!==null||row.sent_to_portal!==false)
  throw invalid('CORRECTION_SOURCE_INTEGRITY_FAIL',409)
 if(Number(row.revision)!==revision)throw invalid('CORRECTION_REVISION_CONFLICT',409)
 if(!Array.isArray(row.payload.sourceIds)||!row.payload.sourceIds.includes(valid.sourceId))
  throw invalid('CORRECTION_SOURCE_NOT_IN_DOCUMENT')
 const history=Array.isArray(row.payload.corrections)?row.payload.corrections:[]
 if(history.length>=50)throw invalid('CORRECTION_REGISTER_FULL',409)
 const prior=history.length?history[history.length-1].integrityHash:row.payload.sourceDigest
 if(!SHA.test(prior||''))throw invalid('CORRECTION_CHAIN_BROKEN',409)
 const event={
  eventId:crypto.randomUUID(),sourceId:valid.sourceId,changeType:valid.changeType,
  proposedText:valid.proposedText,rationale:valid.rationale,
  reviewerUserId:actorId,decision:'PROPOSED_NOT_APPROVED',
  loggedAt:new Date().toISOString(),previousHash:prior
 }
 event.integrityHash=crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex')
 const next=history.concat(event)
 // Only the corrections array is changed. Original source hashes, excerpts,
 // author/teacher identity, class/subject and published state are untouched.
 const sql=[
  'UPDATE lesson_plans SET',
  "payload=jsonb_set(payload,'{corrections}',$1::jsonb,true),",
  'revision=revision+1,updated_at=NOW()',
  "WHERE school_id=$2 AND public_id=$3 AND revision=$4 AND sent_to_portal=false AND payload->>'composerIntake'='true'",
  'RETURNING revision'
 ].join(' ')
 const written=await client.query(sql,[JSON.stringify(next),schoolId,id,revision])
 if(written.rowCount!==1)throw invalid('CORRECTION_CONCURRENT_CHANGE',409)
 return {id,revision:Number(written.rows[0].revision),correctionEventId:event.eventId,
  correctionHash:event.integrityHash,correctionCount:next.length,
  academicApproval:false,published:false}
}
module.exports={appendCorrection,validateChange}
