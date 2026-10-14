'use strict'
/**
 * Operator-facing, fail-closed academic readiness matrix.
 *
 * This is INFORMATION ONLY. It never writes or publishes anything, and
 * no combination of stored flags can turn a WhatsApp draft into approval.
 */
const crypto=require('node:crypto')
const trusted = require('./data/adiba20261014TrustedHashes.json')
const {teacherAssignmentEvidence}=require('./lessonComposerPrincipalEvidence')
const NAMES=['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight','Pre-Nine']
function gateError(code,status=403){
 const e=new Error(code);e.code=code;e.status=status;return e
}
function hasSourceEvidence(payload){
 return Array.isArray(payload?.sourceSubmissions) &&
  payload.sourceSubmissions.length>0 &&
  payload.sourceSubmissions.every(s=>s && /^[a-f0-9]{64}$/.test(String(s.source_body_sha256||'')) &&
    typeof s.source_id==='string' && s.source_id.startsWith('WA14-'))
}
function sha256(text){return crypto.createHash('sha256').update(text,'utf8').digest('hex')}
function recomputePrivateSourceDigest(record){
 const payload=record?.payload
 if(!hasSourceEvidence(payload) || !Array.isArray(payload.sourceIds) ||
   payload.sourceIds.length!==payload.sourceSubmissions.length)return null
 const byId=new Map(payload.sourceSubmissions.map(src=>[src.source_id,src]))
 if(byId.size!==payload.sourceIds.length)return null
 const evidence=[]
 for(const id of payload.sourceIds){
   const source=byId.get(id)
   if(!source)return null
   const parts=Array.isArray(source.source_excerpt_pieces)?source.source_excerpt_pieces:[]
   if(!parts.length && !id.startsWith('WA14-IMG-'))return null
   const excerptSha=sha256(JSON.stringify(parts.map(p=>[
     p.source_start_line,p.source_end_line,p.verbatim
   ])))
   evidence.push([id,source.source_body_sha256,excerptSha])
 }
 return sha256(JSON.stringify([
   record.school_id,record.class_level,record.subject,evidence
 ]))
}
function summarizeCandidate({key,stored,registry=trusted,assignment=null}){
 const problems=[]
 const actual=stored?.payload||{}
 if(!stored)problems.push('ORIGINAL_GROUP_NOT_PRIVATELY_IMPORTED')
 else {
   if(stored.school_id!==registry.schoolId ||
     actual.composerIntake!==true ||
     actual.sourceDigest!==registry.candidateHashes[key] ||
     actual.sourceZipSha256!==registry.sourceZipSha256 ||
     actual.sourceTextSha256!==registry.sourceTextSha256 ||
     !hasSourceEvidence(actual) ||
     recomputePrivateSourceDigest(stored)!==registry.candidateHashes[key])
       problems.push('SOURCE_PROVENANCE_NOT_VERIFIED')
   if(stored.created_by!==null || stored.sent_to_portal!==false ||
     actual.actualTeacherId!==null || actual.publicationStatus!=='BLOCKED')
     problems.push('UNAPPROVED_RECORD_INTEGRITY_FAILURE')
   if(!assignment || assignment.verifiedCount!==1)
     problems.push('VERIFIED_SUBJECT_TEACHER_ASSIGNMENT_REQUIRED')
   if(actual.textbookAdoption!=='VERIFIED')
     problems.push('AUTHENTIC_TEXTBOOK_ADOPTION_REQUIRED')
   if(!Array.isArray(actual.issues) || actual.issues.length)
     problems.push('SOURCE_DATE_CHAPTER_OR_TERM_REVIEW_REQUIRED')
   if(Array.isArray(actual.corrections) && actual.corrections.some(c=>c.decision!=='APPROVED_BY_VERIFIED_ACADEMIC_OWNER'))
     problems.push('PENDING_CORRECTION_PROPOSALS')
   if(!Array.isArray(actual.principalReviews) || !actual.principalReviews.length)
     problems.push('AUTHENTIC_PRINCIPAL_SOURCE_INSPECTION_REQUIRED')
 }
 // No existing route or signature event is an academic publication authorization.
 problems.push('INDEPENDENT_ACADEMIC_APPROVAL_AND_LIVE_RELEASE_REQUIRED')
 return {
  id:key,staged:Boolean(stored),classLevel:stored?.class_level||null,
  subject:stored?.subject||null,revision:stored?Number(stored.revision):null,
  originalSourceVerified:Boolean(stored)&&!problems.includes('SOURCE_PROVENANCE_NOT_VERIFIED'),
  teacherIdentityVerified:!!assignment&&assignment.verifiedCount===1,
  principalSourceInspected:!!(stored && Array.isArray(actual.principalReviews) && actual.principalReviews.length),
  readiness:'HOLD',publishAllowed:false,blockingReasons:problems
 }
}
async function lessonComposerReadiness(client,schoolId,registry=trusted,lookupTeacher=teacherAssignmentEvidence){
 if(!Number.isSafeInteger(schoolId)||schoolId<1 || schoolId!==registry.schoolId)
   throw gateError('COMPOSER_ARCHIVE_NOT_FOR_TENANT')
 const q=await client.query(
   "SELECT school_id,public_id,revision,class_level,subject,payload,created_by,sent_to_portal "+
   "FROM lesson_plans WHERE school_id=$1 AND payload->>'composerIntake'='true' ORDER BY public_id",
   [schoolId])
 const stored=new Map()
 const irregular=[]
 for(const row of q.rows){
   if(!Object.prototype.hasOwnProperty.call(registry.candidateHashes,row.public_id)){
     irregular.push('UNREGISTERED_SOURCE_ROW');continue
   }
   if(stored.has(row.public_id)){irregular.push('DUPLICATE_SOURCE_ID');continue}
   stored.set(row.public_id,row)
 }
 const rows=[]
 for(const key of Object.keys(registry.candidateHashes).sort()){
   const source=stored.get(key)
   let teacher=null
   if(source)teacher=await lookupTeacher(client,schoolId,key)
   rows.push(summarizeCandidate({key,stored:source,registry,assignment:teacher}))
 }
 const counts={
   expected:Object.keys(registry.candidateHashes).length,
   privatelyStaged:rows.filter(x=>x.staged).length,
   notImported:rows.filter(x=>!x.staged).length,
   verifiedTeacherIdentity:rows.filter(x=>x.teacherIdentityVerified).length,
   principalSourceInspections:rows.filter(x=>x.principalSourceInspected).length,
   academicPublications:0
 }
 return {
  schoolId,sourceArchiveSha256:registry.sourceZipSha256,
  reviewManifestSha256:registry.trustedFullManifestHash,
  counts,anomalies:[...new Set(irregular)],
  classes:NAMES.map(name=>({
    className:name,
    staged:rows.filter(x=>x.classLevel===name).length,
    groupIds:rows.filter(x=>x.classLevel===name).map(x=>x.id)
  })),
  rows,releaseStatus:'HOLD',publishAllowed:false,studentNotificationsAllowed:false,
  nextGate:'REAL_VERIFIED_TEACHER_ASSIGNMENTS_AND_PRINCIPAL_ACADEMIC_APPROVAL'
 }
}
module.exports={lessonComposerReadiness,summarizeCandidate,hasSourceEvidence,recomputePrivateSourceDigest}
