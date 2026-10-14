'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {lessonComposerReadiness,summarizeCandidate,hasSourceEvidence}=require('../services/lessonComposerReadiness')
const {recomputePrivateSourceDigest}=require('../services/lessonComposerReadiness')
const sha256=v=>require('node:crypto').createHash('sha256').update(v).digest('hex')
const SOURCE_SHA='a'.repeat(64)
const excerptSha=sha256(JSON.stringify([[1,2,'Synthetic classroom source']]))
const SHA=sha256(JSON.stringify([1,'Starter','English',[['WA14-L11',SOURCE_SHA,excerptSha]]]))
const REG={schoolId:1,sourceZipSha256:'2'.repeat(64),sourceTextSha256:'3'.repeat(64),
 trustedFullManifestHash:'4'.repeat(64),
 candidateHashes:{'LPREVIEW-20261014-starter-english':SHA,'LPREVIEW-20261014-mover-urdu':'5'.repeat(64)}}
const ORIGINAL={source_id:'WA14-L11',source_body_sha256:'a'.repeat(64),
 source_excerpt_pieces:[{source_start_line:1,source_end_line:2,verbatim:'Synthetic classroom source'}]}
const stored={
 school_id:1,public_id:'LPREVIEW-20261014-starter-english',revision:1,
 class_level:'Starter',subject:'English',created_by:null,sent_to_portal:false,
 payload:{
   composerIntake:true,sourceDigest:SHA,
   sourceZipSha256:REG.sourceZipSha256,sourceTextSha256:REG.sourceTextSha256,
   sourceSubmissions:[ORIGINAL],sourceIds:['WA14-L11'],actualTeacherId:null,textbookAdoption:'NOT_VERIFIED',
   issues:['SCHOOL CALENDAR REVIEW'],publicationStatus:'BLOCKED',
   principalReviews:[],corrections:[]
 }
}
test('readiness holds all 59 actual registry rows in default unimported state',async()=>{
 const actual=require('../services/data/adiba20261014TrustedHashes.json')
 const client={query:async(sql,params)=>{
   assert.match(sql,/school_id=\$1/)
   assert.deepEqual(params,[1])
   return {rows:[]}
 }}
 const result=await lessonComposerReadiness(client,1)
 assert.equal(result.counts.expected,59)
 assert.equal(result.counts.notImported,59)
 assert.equal(result.releaseStatus,'HOLD')
 assert.equal(result.publishAllowed,false)
 assert.equal(result.studentNotificationsAllowed,false)
 assert.equal(result.classes.length,12)
 assert.equal(result.sourceArchiveSha256,actual.sourceZipSha256)
 assert.ok(result.rows.every(x=>x.blockingReasons.includes('INDEPENDENT_ACADEMIC_APPROVAL_AND_LIVE_RELEASE_REQUIRED')))
})
test('genuine school1 staged original still blocks teacher ownership and adoption',async()=>{
 const client={query:async()=>({rows:[structuredClone(stored)]})}
 const result=await lessonComposerReadiness(client,1,REG,async()=>({
  verifiedCount:0,readyForAcademicApproval:false
 }))
 assert.equal(result.counts.privatelyStaged,1)
 assert.equal(result.counts.notImported,1)
 const first=result.rows.find(x=>x.staged)
 assert.equal(first.originalSourceVerified,true)
 assert.equal(first.teacherIdentityVerified,false)
 assert.deepEqual(first.blockingReasons,[
   'VERIFIED_SUBJECT_TEACHER_ASSIGNMENT_REQUIRED',
   'AUTHENTIC_TEXTBOOK_ADOPTION_REQUIRED',
   'SOURCE_DATE_CHAPTER_OR_TERM_REVIEW_REQUIRED',
   'AUTHENTIC_PRINCIPAL_SOURCE_INSPECTION_REQUIRED',
   'INDEPENDENT_ACADEMIC_APPROVAL_AND_LIVE_RELEASE_REQUIRED'
 ])
 assert.equal(JSON.stringify(result).includes('Synthetic classroom source'),false)
})
test('even verified teacher and Principal inspection cannot publish without academic approval',()=>{
 const row=structuredClone(stored)
 row.payload.issues=[]
 row.payload.textbookAdoption='VERIFIED'
 row.payload.principalReviews=[{decision:'ORIGINAL_SOURCE_INSPECTED_NOT_ACADEMICALLY_APPROVED',integrityHash:'f'.repeat(64)}]
 const output=summarizeCandidate({key:row.public_id,stored:row,registry:REG,assignment:{verifiedCount:1}})
 assert.equal(output.teacherIdentityVerified,true)
 assert.equal(output.principalSourceInspected,true)
 assert.deepEqual(output.blockingReasons,['INDEPENDENT_ACADEMIC_APPROVAL_AND_LIVE_RELEASE_REQUIRED'])
 assert.equal(output.publishAllowed,false)
})
test('tampering with any source hash or unpublished identity is detected and holds',()=>{
 const row=structuredClone(stored)
 row.payload.sourceDigest='a'.repeat(64)
 row.created_by=4191
 row.sent_to_portal=true
 const output=summarizeCandidate({key:row.public_id,stored:row,registry:REG,assignment:{verifiedCount:0}})
 assert.ok(output.blockingReasons.includes('SOURCE_PROVENANCE_NOT_VERIFIED'))
 assert.ok(output.blockingReasons.includes('UNAPPROVED_RECORD_INTEGRITY_FAILURE'))
 assert.equal(output.publishAllowed,false)
})
test('different tenant denied before DB query',async()=>{
 let queried=false
 const c={query:async()=>{queried=true;return {rows:[]}}}
 await assert.rejects(()=>lessonComposerReadiness(c,2,REG),e=>e.code==='COMPOSER_ARCHIVE_NOT_FOR_TENANT')
 assert.equal(queried,false)
})
test('unregistered candidate anomalous and never counted as verified original',async()=>{
 const bad=structuredClone(stored);bad.public_id='LPREVIEW-20261014-unregistered';bad.subject='Biology'
 const result=await lessonComposerReadiness({query:async()=>({rows:[bad]})},1,REG)
 assert.deepEqual(result.anomalies,['UNREGISTERED_SOURCE_ROW'])
 assert.equal(result.counts.privatelyStaged,0)
 assert.equal(result.counts.notImported,2)
})
test('original source verifier accepts hashed real excerpt, rejects corrupted hash',()=>{
 assert.equal(hasSourceEvidence({sourceSubmissions:[ORIGINAL]}),true)
 assert.equal(hasSourceEvidence({sourceSubmissions:[{source_id:'WA14-L11',source_body_sha256:'broken'}]}),false)
 assert.equal(hasSourceEvidence({sourceSubmissions:[]}),false)
})


test('storage-side original verbatim tampering fails pinned digest recheck',()=>{
 const row=structuredClone(stored)
 const digest=recomputePrivateSourceDigest(row)
 assert.equal(digest,SHA)
 row.payload.sourceSubmissions[0].source_excerpt_pieces[0].verbatim='Altered fabricated chapter'
 assert.notEqual(recomputePrivateSourceDigest(row),SHA)
 const output=summarizeCandidate({key:row.public_id,stored:row,registry:REG})
 assert.ok(output.blockingReasons.includes('SOURCE_PROVENANCE_NOT_VERIFIED'))
 assert.equal(output.originalSourceVerified,false)
 assert.equal(output.publishAllowed,false)
})
