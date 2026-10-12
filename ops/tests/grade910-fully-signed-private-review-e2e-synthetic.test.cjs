'use strict'
// Synthetic keys and invented answers are created ONLY inside private disposable test dirs.
// Successful cryptographic evidence verification NEVER grants production publication.
const test=require('node:test'),assert=require('node:assert/strict'),
 crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os')
const institution=require('../qbank/verify-grade910-institutional-signatures.cjs')
const frozen=require('../qbank/attest-grade910-all-original-candidate-revisions.cjs')
const bridge=require('../qbank/reconcile-grade910-teacher-response-to-signed-school-packet.cjs')
const H=x=>crypto.createHash('sha256').update(x).digest('hex')
const pem=k=>k.publicKey.export({format:'pem',type:'spki'})
const signature=(k,domain,body)=>crypto.sign(null,institution.envelope(domain,body),k.privateKey).toString('base64')
const NOW='2026-10-12T13:00:00Z',FROM='2026-10-01T00:00:00Z',UNTIL='2027-12-31T23:59:59Z'
const roles=[['coordinator','adoptionCoordinator'],['teacher','subjectReviewer'],['principal','schoolApprover']]
let chosen
function original(){
 if(!chosen){
  const inputs=frozen.loadInputs(),locked=frozen.assertFrozen(inputs)
  const index=institution.indexForInstitutionalSignatures(locked,inputs.documents)
  chosen=[...index.values()].find(x=>x.sourceGrade===9&&x.sourceSubjectId==='chemistry'&&
   x.sourceMedium==='english'&&x.originalQuestionType==='short')
  assert.ok(chosen)
 }
 return chosen
}
function make(){
 const originalQ=original(),keys=Object.fromEntries(roles.map(([id])=>[id,crypto.generateKeyPairSync('ed25519')]))
 const root=crypto.generateKeyPairSync('ed25519')
 const actorScope={grades:[9],subjects:['chemistry'],media:['english']}
 const roster={schemaVersion:'assps-academic-trust-roster-v1',schoolCode:'ASSPS',
  tenantId:'SYNTHETIC-LOCAL-ONLY-NOT-ASSPS',academicSession:'2026-27',
  activeFrom:FROM,activeUntil:UNTIL,
  actors:roles.map(([id,role])=>({actorId:id,roles:[role],...actorScope,
   credentialEvidenceSha256:H('SYNTHETIC qualification '+id),
   publicKeyPem:pem(keys[id]),activeFrom:FROM,activeUntil:UNTIL,revoked:false}))}
 const docs=new Map()
 const evidence=value=>{const digest=H(value);docs.set(digest,value);return digest}
 const finalQuestion={type:'short',marks:2,text:'SYNTHETIC TEST DATA ONLY: Identify a change that can be reversed.'}
 const finalAnswer={answer:'SYNTHETIC TEST RESPONSE ONLY: The system returns to its original state.'}
 const checks=institution.REVIEW_CHECKS.map(name=>({name,passed:true,
  evidenceSha256:evidence('SYNTHETIC_EVIDENCE_CRITERION_'+name)}))
 const p={schemaVersion:'assps-academic-review-packet-v1',schoolCode:'ASSPS',
  tenantId:roster.tenantId,academicSession:roster.academicSession,
  originalQuestionId:originalQ.originalQuestionId,
  originalQuestionRevisionSha256:originalQ.originalQuestionRevisionSha256,
  originalSourceFileSha256:originalQ.sourceSha,
  sourceCatalogRecordId:originalQ.sourceCatalogRecordId,
  sourcePdfSha256:originalQ.sourcePdfSha256,
  grade:9,subjectId:'chemistry',medium:'english',
  adoptedBookEdition:'SYNTHETIC-2026-27',
  curriculumTopicId:'SYNTHETIC-CHEMISTRY-TOPIC',
  boardExamYear:2027,authorId:'ASSPS-SYNTHETIC-AUTHOR-NOT-TEACHER',
  finalQuestionRevisionSha256:H(institution.canonical(finalQuestion)),
  finalAnswerRevisionSha256:H(institution.canonical(finalAnswer)),
  bookAdoptionEvidenceSha256:evidence('SYNTHETIC_SCHOOL_ADOPTION_DOCUMENT'),
  curriculumTopicEvidenceSha256:evidence('SYNTHETIC_TOPIC_SOURCE'),
  originType:'original-conceptual',
  reviewedAt:'2026-10-12T12:00:00Z',approvedAt:'2026-10-12T12:30:00Z',checks}
 const adoption={schoolCode:p.schoolCode,tenantId:p.tenantId,academicSession:p.academicSession,
  originalQuestionId:p.originalQuestionId,bookAdoptionEvidenceSha256:p.bookAdoptionEvidenceSha256,
  curriculumTopicEvidenceSha256:p.curriculumTopicEvidenceSha256,originType:p.originType,
  sourceCatalogRecordId:p.sourceCatalogRecordId,sourcePdfSha256:p.sourcePdfSha256,
  adoptedBookEdition:p.adoptedBookEdition,curriculumTopicId:p.curriculumTopicId,
  boardExamYear:p.boardExamYear,printedPageExerciseEvidenceSha256:null}
 const approval={schoolCode:p.schoolCode,tenantId:p.tenantId,session:p.academicSession,
  reviewPacketSha256:H(institution.canonical(p)),questionSha256:p.finalQuestionRevisionSha256,
  answerSha256:p.finalAnswerRevisionSha256,approvedAt:p.approvedAt}
 const signatures={
  adoptionCoordinator:{actorId:'coordinator',signature:signature(keys.coordinator,'assps-academic-adoption-v1',adoption)},
  subjectReviewer:{actorId:'teacher',signature:signature(keys.teacher,'assps-academic-subject-review-v1',p)},
  schoolApprover:{actorId:'principal',signature:signature(keys.principal,'assps-academic-school-approval-v1',approval)}}
 const teacher={schemaVersion:'assps-grade910-offline-subject-review-v1',
  originalQuestionId:p.originalQuestionId,
  originalQuestionRevisionSha256:p.originalQuestionRevisionSha256,
  originalSourceFileSha256:p.originalSourceFileSha256,
  reviewerClaimId:'teacher',academicSessionClaim:p.academicSession,
  completedAt:'2026-10-12T11:30:00Z',
  disposition:'recommend-independent-verification',
  independentAnswerBeforeReference:'SYNTHETIC independent answer (not an ASSPS teacher review)',
  adoptedTextbookTitleClaim:'SYNTHETIC mock book',
  adoptedTextbookEditionClaim:p.adoptedBookEdition,
  applicableExamYearClaim:p.boardExamYear,
  schoolAdoptionProofHashClaim:p.bookAdoptionEvidenceSha256,
  finalQuestionRevisionSha256Claim:p.finalQuestionRevisionSha256,
  finalAnswerRevisionSha256Claim:p.finalAnswerRevisionSha256,
  checks:checks.map(x=>({name:x.name,status:'passed',evidenceSha256:x.evidenceSha256})),
  academicallyApproved:false,published:false,signatureAuthenticated:false,
  verifiedPaperStudioSelectable:false}
 const record={packet:p,signatures,finalQuestion,finalAnswer}
 const bundle={schemaVersion:'assps-grade910-signed-faculty-batch-v1',roster,
  rosterSignature:signature(root,'assps-academic-roster-v1',roster),records:[record]}
 return {docs,teacher,bundle,record,root}
}
function prepare(){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-synthetic-signed-e2e-'))
 fs.chmodSync(home,0o700)
 const dirs={home,objects:path.join(home,'objects'),teachers:path.join(home,'teachers')}
 for(const p of [dirs.objects,dirs.teachers])fs.mkdirSync(p,{mode:0o700})
 const x=make()
 const save=(file,text)=>fs.writeFileSync(file,text,{mode:0o600})
 for(const [digest,bytes] of x.docs)save(path.join(dirs.objects,digest+'.evidence'),bytes)
 dirs.pub=path.join(home,'school-root-public.pem');save(dirs.pub,pem(x.root))
 dirs.bundle=path.join(home,'school-bundle.json');save(dirs.bundle,JSON.stringify(x.bundle))
 dirs.teacher=path.join(dirs.teachers,'qualified-subject-synthetic.faculty-review.json')
 save(dirs.teacher,JSON.stringify(x.teacher))
 const options={privateTeacherDirectory:dirs.teachers,
  rootPublicKeyFile:dirs.pub,reviewBundleFile:dirs.bundle,
  rootFingerprint:institution.fingerprint(x.root.publicKey),
  tenantId:x.bundle.roster.tenantId,at:NOW,evidenceObjectDirectory:dirs.objects}
 return{...dirs,fixture:x,options,cleanup:()=>fs.rmSync(home,{recursive:true,force:true})}
}
test('complete ORIGINAL-source pinned school Ed25519 proof + physical evidence + teacher response passes, but publication HOLD',()=>{
 const f=prepare()
 try{
  const result=bridge.loadReconciled(f.options)
  assert.equal(result.signedSchoolPacketsCryptographicallyAndEvidenceByteVerified,1)
  assert.equal(result.actualSignedReviewReceiptCount,1)
  assert.equal(result.reconciledResponses,1)
  assert.equal(result.rows[0].teacherClaimMatchesSignedPacket,true)
  assert.equal(result.paperStudioVerifiedSelectable,false)
  assert.equal(result.academicallyPublished,0)
  assert.match(result.releaseDecision,/HOLD/)
 }finally{f.cleanup()}
})
test('synthetic school roster is rejected on wrong externally PINNED trust root and tenant',()=>{
 const f=prepare()
 try{
  assert.throws(()=>bridge.loadReconciled({...f.options,rootFingerprint:H('attacker root')}),/SCHOOL_ROOT_NOT_EXTERNALLY_PINNED/)
  assert.throws(()=>bridge.loadReconciled({...f.options,tenantId:'OTHER-TENANT'}),/TENANT|SCHOOL/)
 }finally{f.cleanup()}
})
test('valid signed packet cannot use real missing or tampered private supporting evidence bytes',()=>{
 const f=prepare()
 try{
  const [digest]=f.fixture.docs.keys()
  const filename=path.join(f.objects,digest+'.evidence')
  fs.unlinkSync(filename)
  assert.throws(()=>bridge.loadReconciled(f.options),/ENOENT/)
  fs.writeFileSync(filename,'SYNTHETIC-BAD-REPLACEMENT',{mode:0o600})
  assert.throws(()=>bridge.loadReconciled(f.options),/PHYSICAL_EVIDENCE_BYTES_SHA256_MISMATCH/)
 }finally{f.cleanup()}
})
test('original teacher reply content tampering, review SHA mismatch and false publication cannot transfer signed proof',()=>{
 const f=prepare()
 try{
  const broken={...f.fixture.teacher,finalAnswerRevisionSha256Claim:H('changed final answer')}
  fs.writeFileSync(f.teacher,JSON.stringify(broken),{mode:0o600})
  assert.throws(()=>bridge.loadReconciled(f.options),/QUESTION_ANSWER_ADOPTION_OR_BOARD_VERSION_MISMATCH/)
  broken.finalAnswerRevisionSha256Claim=f.fixture.teacher.finalAnswerRevisionSha256Claim
  broken.academicallyApproved=true
  fs.writeFileSync(f.teacher,JSON.stringify(broken),{mode:0o600})
  assert.throws(()=>bridge.loadReconciled(f.options),/UNSIGNED_TEACHER_CANNOT_CLAIM_INSTITUTIONAL_APPROVAL/)
 }finally{f.cleanup()}
})
test('valid signed school bundle cannot silently outvote real teacher negative or absent submission',()=>{
 const f=prepare()
 try{
  const negative={...f.fixture.teacher,disposition:'needs-answer-revision'}
  fs.writeFileSync(f.teacher,JSON.stringify(negative),{mode:0o600})
  assert.throws(()=>bridge.loadReconciled(f.options),/INDEPENDENT_TEACHER_DID_NOT_RECOMMEND_VERIFICATION/)
  fs.unlinkSync(f.teacher)
  assert.throws(()=>bridge.loadReconciled(f.options),/MISSING_INDEPENDENT_REAL_TEACHER_RESPONSE/)
 }finally{f.cleanup()}
})
