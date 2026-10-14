'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const gate=require('../qbank/verify-grade910-institutional-signatures.cjs')
const H=x=>crypto.createHash('sha256').update(x).digest('hex')
const start='2026-10-01T00:00:00Z',end='2027-12-31T23:59:59Z'
const now='2026-10-11T12:00:00Z'
const roleDefs=[
 ['a','adoptionCoordinator'],['r','subjectReviewer'],
 ['u','urduReviewer'],['p','schoolApprover']]
function fixture(medium='english'){
 const mk=()=>crypto.generateKeyPairSync('ed25519')
 const root=mk()
 const trustRootPublicKeyPem=root.publicKey.export({format:'pem',type:'spki'})
 const pinnedRootFingerprint=gate.fingerprint(root.publicKey)
 const keys=Object.fromEntries(roleDefs.map(([id])=>[id,mk()]))
 const scope={subjects:['chemistry'],grades:[9],media:['english','urdu','dual']}
 const roster={schemaVersion:'assps-academic-trust-roster-v1',schoolCode:'ASSPS',
  academicSession:'2026-27',tenantId:'test-assps-school-tenant',activeFrom:start,activeUntil:end,
  actors:roleDefs.map(([id,role])=>({
   actorId:id,roles:[role],...scope,credentialEvidenceSha256:H('qualification/'+id),
   publicKeyPem:keys[id].publicKey.export({format:'pem',type:'spki'}),
   activeFrom:start,activeUntil:end,revoked:false}))}
 const sign=(key,domain,payload)=>
  crypto.sign(null,gate.envelope(domain,payload),key.privateKey).toString('base64')
 const rosterSignature=sign(root,'assps-academic-roster-v1',roster)
 const finalQuestion={text:'What distinguishes a reversible physical change?',type:'short',marks:2}
 const finalAnswer={answer:'Its original condition can be restored without forming a new substance.'}
 const base={
  schoolCode:'ASSPS',tenantId:'test-assps-school-tenant',academicSession:'2026-27',originalQuestionId:'SYNTHETIC-CHEM9-ONE',
  originalQuestionRevisionSha256:H('frozen-original'),
  originalSourceFileSha256:H('frozen-file'),
  sourceCatalogRecordId:'synthetic-chemistry-catalog',sourcePdfSha256:H('synthetic-original-source-pdf'),
  adoptedBookEdition:'SCHOOL-APPROVED-EDITION-REQUIRED',curriculumTopicId:'SYNTHETIC-9-1',
  boardExamYear:2027,finalQuestionRevisionSha256:H(gate.canonical(finalQuestion)),
  finalAnswerRevisionSha256:H(gate.canonical(finalAnswer)),bookAdoptionEvidenceSha256:H('adopted-book'),
  curriculumTopicEvidenceSha256:H('qualified-topic-proof'),
  originType:'original-conceptual',
  grade:9,subjectId:'chemistry',medium,authorId:'author-original',
  reviewedAt:'2026-10-10T12:00:00Z',approvedAt:'2026-10-10T13:00:00Z',
  checks:gate.REVIEW_CHECKS.map(name=>({name,passed:true,evidenceSha256:H('proof/'+name)}))
 }
 const packet={schemaVersion:'assps-academic-review-packet-v1',...base}
 const originalsIndex=new Map([[base.originalQuestionId,{
  originalQuestionRevisionSha256:base.originalQuestionRevisionSha256,
  sourceSha:base.originalSourceFileSha256,sourceMedium:medium,
  sourceGrade:base.grade,sourceSubjectId:base.subjectId,
  sourceCatalogRecordId:base.sourceCatalogRecordId,sourcePdfSha256:base.sourcePdfSha256}]])
 function signaturesFor(p=packet){
  const adoption={schoolCode:p.schoolCode,tenantId:p.tenantId,academicSession:p.academicSession,
   originalQuestionId:p.originalQuestionId,
   bookAdoptionEvidenceSha256:p.bookAdoptionEvidenceSha256,
   curriculumTopicEvidenceSha256:p.curriculumTopicEvidenceSha256,
   originType:p.originType,
   sourceCatalogRecordId:p.sourceCatalogRecordId,sourcePdfSha256:p.sourcePdfSha256,
   adoptedBookEdition:p.adoptedBookEdition,curriculumTopicId:p.curriculumTopicId,
   boardExamYear:p.boardExamYear,
   printedPageExerciseEvidenceSha256:p.printedPageExerciseEvidenceSha256||null}
  const approval={schoolCode:p.schoolCode,tenantId:p.tenantId,session:p.academicSession,
   reviewPacketSha256:H(gate.canonical(p)),questionSha256:p.finalQuestionRevisionSha256,
   answerSha256:p.finalAnswerRevisionSha256,approvedAt:p.approvedAt}
  return{
   adoptionCoordinator:{actorId:'a',signature:sign(keys.a,'assps-academic-adoption-v1',adoption)},
   subjectReviewer:{actorId:'r',signature:sign(keys.r,'assps-academic-subject-review-v1',p)},
   ...(medium!=='english'?{urduReviewer:{actorId:'u',signature:sign(keys.u,'assps-academic-urdu-review-v1',p)}}:{}),
   schoolApprover:{actorId:'p',signature:sign(keys.p,'assps-academic-school-approval-v1',approval)}
  }
 }
 const signatures=signaturesFor(packet)
 return {roster,rosterSignature,schoolRootPublicKeyPem:trustRootPublicKeyPem,
  trustedSchoolRootFingerprint:pinnedRootFingerprint,packet,signatures,at:now,originalsIndex,
  expectedTenantId:'test-assps-school-tenant',
  finalQuestion,finalAnswer,keys,root,signaturesFor}
}
const publicInput=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!['keys','root','signaturesFor'].includes(k)))
test('valid synthetic independent Ed25519 signatures are cryptographically checked yet NOT published',()=>{
 const f=fixture(),o=gate.verifyReview(publicInput(f))
 assert.equal(o.schoolRosterAuthenticated,true)
 assert.equal(o.independentReviewerSignaturesCryptographicallyVerified,true)
 assert.equal(o.publisherSelectable,false)
 assert.equal(o.academicallyPublished,false)
 assert.match(o.reviewPacketSha256,/^[a-f0-9]{64}$/)
})
test('real bilingual synthetic case requires independently signed Urdu review',()=>{
 const f=fixture('dual')
 assert.equal(gate.verifyReview(publicInput(f)).publisherSelectable,false)
 delete f.signatures.urduReviewer
 assert.throws(()=>gate.verifyReview(publicInput(f)),/MISSING_SIGNED_ACTOR_ATTESTATION/)
})
test('untrusted or tampered roster cannot self-authorize school faculty',()=>{
 let f=fixture();f.trustedSchoolRootFingerprint=H('fake-authority')
 assert.throws(()=>gate.verifyReview(publicInput(f)),/SCHOOL_ROOT_NOT_EXTERNALLY_PINNED/)
 f=fixture();f.roster.actors[0].revoked=true
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INVALID_SIGNATURE/)
 f=fixture();f.rosterSignature=Buffer.alloc(64).toString('base64')
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INVALID_SIGNATURE/)
})
test('cross-author role reuse and non-independent teacher are rejected',()=>{
 const f=fixture()
 f.packet.authorId='r';f.signatures=f.signaturesFor(f.packet)
 assert.throws(()=>gate.verifyReview(publicInput(f)),/NONINDEPENDENT_AUTHOR_REVIEWER_SCHOOL_ROLES/)
})
test('teacher cannot self-issue principal signature',()=>{
 const f=fixture()
 f.signatures.schoolApprover={...f.signatures.subjectReviewer}
 assert.throws(()=>gate.verifyReview(publicInput(f)),/ACTOR_ROLE_NOT_SCHOOL_AUTHORIZED/)
})
test('forged answer hash or edited final question cannot inherit old signatures',()=>{
 const f=fixture()
 f.finalAnswer={answer:'incorrect revised answer'}
 assert.throws(()=>gate.verifyReview(publicInput(f)),/UNVERIFIED_FINAL_CONTENT_REVISION/)
 f.finalAnswer={answer:'Its original condition can be restored without forming a new substance.'}
 f.packet.checks[1].evidenceSha256=H('edited-proof')
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INVALID_SIGNATURE/)
})
test('unlisted original, wrong frozen source medium and altered signed session are blocked',()=>{
 const f=fixture()
 f.originalsIndex=new Map()
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH/)
 f.originalsIndex=new Map([[f.packet.originalQuestionId,{
  originalQuestionRevisionSha256:f.packet.originalQuestionRevisionSha256,
  sourceSha:f.packet.originalSourceFileSha256,sourceMedium:'urdu',
  sourceGrade:9,sourceSubjectId:'chemistry',sourceCatalogRecordId:f.packet.sourceCatalogRecordId,
  sourcePdfSha256:f.packet.sourcePdfSha256}]])
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH/)
 f.originalsIndex=new Map([[f.packet.originalQuestionId,{
  originalQuestionRevisionSha256:f.packet.originalQuestionRevisionSha256,
  sourceSha:f.packet.originalSourceFileSha256,sourceMedium:'english',
  sourceGrade:9,sourceSubjectId:'chemistry',sourceCatalogRecordId:f.packet.sourceCatalogRecordId,
  sourcePdfSha256:f.packet.sourcePdfSha256}]])
 f.packet.academicSession='2027-28'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/SESSION_OR_SIGNATURE_SET_MISMATCH/)
})
test('exercise-origin claim requires actual separate printed source evidence hash',()=>{
 const f=fixture()
 f.packet.originType='textbook-exercise'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/REVIEW_PACKET_INCOMPLETE/)
})
test('future-dated and noncanonical time cannot pass a faculty signoff',()=>{
 const f=fixture()
 f.packet.approvedAt='2028-01-01T00:00:00Z'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FUTURE_REVIEW_OR_APPROVAL/)
 f.packet.reviewedAt='2026-10-10'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/REVIEW_PACKET_INCOMPLETE/)
})
test('revoked actor cannot use old signature after signed roster revision',()=>{
 const f=fixture()
 f.roster.actors[1].revoked=true
 f.rosterSignature=crypto.sign(null,gate.envelope('assps-academic-roster-v1',f.roster),
  f.root.privateKey).toString('base64')
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INVALID_ACTOR_AUTHORIZATION/)
})
test('an authentic signature from wrong cryptographic signing domain cannot be replayed',()=>{
 const f=fixture()
 f.signatures.subjectReviewer.signature=f.signatures.schoolApprover.signature
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INVALID_SIGNATURE/)
})
test('missing external trust and missing real school records stay blocked by default',()=>{
 assert.throws(()=>gate.rosterTrust({roster:{},rosterSignature:'',schoolRootPublicKeyPem:'',trustedSchoolRootFingerprint:'',at:now}),
  /UNACCEPTABLE_SCHOOL_ROOT_ROSTER/)
})

test('wrong tenant school roster cannot cross-publish signed academic evidence',()=>{
 const f=fixture()
 f.expectedTenantId='another-school'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INSTITUTIONAL_TENANT_MISMATCH/)
 f.expectedTenantId='test-assps-school-tenant'
 f.packet.tenantId='other-campus'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/INSTITUTIONAL_TENANT_MISMATCH/)
})
test('batch processor rejects a repeated question/revision and does not grant publication',()=>{
 const f=fixture()
 const {packet,signatures,finalQuestion,finalAnswer}=f
 const common=publicInput(f)
 delete common.packet;delete common.signatures;delete common.finalQuestion;delete common.finalAnswer
 const once=gate.verifyBatch({...common,records:[{packet,signatures,finalQuestion,finalAnswer}]})
 assert.equal(once.signedReviewsCryptographicallyVerified,1)
 assert.equal(once.publisherSelectable,false)
 assert.equal(once.academicallyPublished,0)
 assert.throws(()=>gate.verifyBatch({...common,records:[
  {packet,signatures,finalQuestion,finalAnswer},{packet,signatures,finalQuestion,finalAnswer}
 ]}),/DUPLICATE_OR_REPLAYED_QUESTION_REVISION/)
 assert.throws(()=>gate.verifyBatch({...common,records:[]}),/EMPTY_OR_OVERSIZED_SIGNED_BATCH/)
})
test('synthetic signed reviewer fixture can bind to one REAL frozen Chemistry IX original revision but never publish it',()=>{
 const seal=require('../qbank/attest-grade910-all-original-candidate-revisions.cjs')
 const intake=require('../qbank/validate-grade910-independent-review-evidence.cjs')
 const input=seal.loadInputs(),frozen=seal.assertFrozen(input)
 const source=gate.indexForInstitutionalSignatures(frozen,input.documents)
 const original=[...source.values()].find(q=>
  q.originalFile.startsWith('chemistry9')&&q.sourceMedium==='english')
 assert.ok(original)
 const f=fixture('english')
 f.packet.originalQuestionId=original.originalQuestionId
 f.packet.originalQuestionRevisionSha256=original.originalQuestionRevisionSha256
 f.packet.originalSourceFileSha256=original.sourceSha
 f.packet.grade=original.sourceGrade
 f.packet.subjectId=original.sourceSubjectId
 f.packet.sourceCatalogRecordId=original.sourceCatalogRecordId
 f.packet.sourcePdfSha256=original.sourcePdfSha256
 f.signatures=f.signaturesFor(f.packet)
 f.originalsIndex=source
 const receipt=gate.verifyReview(publicInput(f))
 assert.equal(receipt.originalQuestionId,original.originalQuestionId)
 assert.equal(receipt.schoolRosterAuthenticated,true)
 assert.equal(receipt.publisherSelectable,false)
})

test('source grade, subject and PDF provenance cannot be altered by a school signature packet',()=>{
 const f=fixture()
 f.packet.grade=10
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH/)
 f.packet.grade=9
 f.packet.sourceCatalogRecordId='faked-catalog-id'
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH/)
 f.packet.sourceCatalogRecordId='synthetic-chemistry-catalog'
 f.packet.sourcePdfSha256=H('wrong-source-book')
 assert.throws(()=>gate.verifyReview(publicInput(f)),/FROZEN_ORIGINAL_ID_REVISION_MEDIUM_MISMATCH/)
})

test('signed batch row cannot overwrite externally trusted institution root or tenant',()=>{
 const f=fixture()
 const common=publicInput(f)
 delete common.packet;delete common.signatures;delete common.finalQuestion;delete common.finalAnswer
 assert.doesNotThrow(()=>gate.verifyBatch({...common,records:[{
  packet:f.packet,signatures:f.signatures,finalQuestion:f.finalQuestion,finalAnswer:f.finalAnswer,
  expectedTenantId:'attacker-campus',trustedSchoolRootFingerprint:H('evil-root'),
  schoolRootPublicKeyPem:'attacker-self-signed-key'
 }]}))
})
